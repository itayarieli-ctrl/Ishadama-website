#!/usr/bin/env node
// Finds Elementor forms not sending leads to Scalla CRM
// Uses the same create→activate→trigger→read pattern as wp-deep-diagnostic.js

const https = require("https");
const fs = require("fs");
const path = require("path");

const SITE = "https://ishadama.co.il";
const USER = process.env.WP_USERNAME;
const PASS = process.env.WP_APP_PASSWORD;
const AUTH = "Basic " + Buffer.from(`${USER}:${PASS.replace(/\s+/g, "")}`).toString("base64");

function req(pathname, { method = "GET", body } = {}) {
  return new Promise((resolve) => {
    const url = new URL(pathname, SITE);
    const opts = {
      method,
      headers: {
        Authorization: AUTH,
        "User-Agent": "ishadama-seo-diagnostic/1.0",
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
    };
    const r = https.request(url, opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        let json = null;
        try { json = JSON.parse(data); } catch {}
        resolve({ status: res.statusCode, body: data, json });
      });
    });
    r.on("error", (e) => resolve({ status: 0, error: e.message }));
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function createAndRunSnippet(name, code, resultOption) {
  // Create snippet
  const create = await req("/wp-json/code-snippets/v1/snippets", {
    method: "POST",
    body: { name, code, scope: "php-functions", active: false, priority: 1 },
  });
  if (create.status !== 200 && create.status !== 201) {
    console.error(`Create snippet failed: ${create.status}`, create.body?.slice(0, 300));
    return null;
  }
  const id = create.json?.id;
  console.log(`  Snippet created id=${id}`);

  // Activate
  await req(`/wp-json/code-snippets/v1/snippets/${id}`, { method: "POST", body: { active: true } });

  // Trigger
  await req("/");
  await new Promise(r => setTimeout(r, 3000));

  // Read result via a second snippet
  const read = await req("/wp-json/code-snippets/v1/snippets", {
    method: "POST",
    body: {
      name: `_read_${Date.now()}`,
      code: `update_option('_claude_read_tmp', get_option('${resultOption}', '{}'), false);`,
      scope: "php-functions",
      active: false,
      priority: 1,
    },
  });
  const readId = read.json?.id;
  await req(`/wp-json/code-snippets/v1/snippets/${readId}`, { method: "POST", body: { active: true } });
  await req("/");
  await new Promise(r => setTimeout(r, 2000));

  // Fetch via WP options API
  const result = await req("/wp-json/wp/v2/settings");

  // Deactivate and delete both snippets
  await req(`/wp-json/code-snippets/v1/snippets/${id}`, { method: "POST", body: { active: false } });
  await req(`/wp-json/code-snippets/v1/snippets/${id}`, { method: "DELETE" });
  if (readId) {
    await req(`/wp-json/code-snippets/v1/snippets/${readId}`, { method: "POST", body: { active: false } });
    await req(`/wp-json/code-snippets/v1/snippets/${readId}`, { method: "DELETE" });
  }

  // The settings endpoint won't have our custom option - use another read approach
  // Actually fetch the option directly via a GET snippet that returns it via update_option to a known location
  return null; // we'll read differently below
}

// Simpler: just use the same direct approach as wp-deep-diagnostic
async function runDiagnostic() {
  const OPTION_KEY = "_claude_forms_result_" + Date.now();

  const PHP = `
global $wpdb;
$out = [];

// Get all Elementor forms from published pages, posts, elementor_library
$rows = $wpdb->get_results(
  "SELECT p.ID, p.post_title, pm.meta_value as ed
   FROM {$wpdb->posts} p
   JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id
   WHERE pm.meta_key = '_elementor_data'
     AND p.post_status = 'publish'
     AND p.post_type IN ('page','post','elementor_library')
   ORDER BY p.ID",
  ARRAY_A
);

$forms = [];
foreach ($rows as $r) {
  $data = json_decode($r['ed'], true);
  if (!is_array($data)) continue;
  $stack = $data;
  while (!empty($stack)) {
    $el = array_shift($stack);
    if (!isset($el['elType'])) continue;
    if ($el['elType'] === 'widget' && ($el['widgetType'] ?? '') === 'form') {
      $s = $el['settings'] ?? [];
      $actions = $s['submit_actions'] ?? [];
      $has_scalla = false;
      foreach ($actions as $a) {
        if (stripos((string)$a, 'scalla') !== false) { $has_scalla = true; break; }
      }
      $forms[] = [
        'page_id'    => (int)$r['ID'],
        'page_title' => $r['post_title'],
        'form_name'  => $s['form_name'] ?? '(unnamed)',
        'form_id'    => $el['id'] ?? '',
        'actions'    => $actions,
        'has_scalla' => $has_scalla,
      ];
    }
    foreach (($el['elements'] ?? []) as $child) $stack[] = $child;
  }
}
$out['forms'] = $forms;

// Also get recent submission counts per form
$sub_table = $wpdb->prefix . 'e_submissions';
$sub_counts = [];
if ($wpdb->get_var("SHOW TABLES LIKE '{$sub_table}'")) {
  $counts = $wpdb->get_results(
    "SELECT element_id, COUNT(*) as cnt FROM {$sub_table}
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
     GROUP BY element_id",
    ARRAY_A
  );
  foreach ($counts as $c) $sub_counts[$c['element_id']] = (int)$c['cnt'];
}
$out['submission_counts'] = $sub_counts;

update_option('${OPTION_KEY}', json_encode($out), false);
`;

  console.log("→ Creating forms diagnostic snippet...");
  const create = await req("/wp-json/code-snippets/v1/snippets", {
    method: "POST",
    body: { name: "_claude_forms_" + Date.now(), code: PHP, scope: "php-functions", active: false, priority: 1 },
  });
  if (create.status !== 200 && create.status !== 201) {
    console.error("Failed to create snippet:", create.status, create.body?.slice(0, 500));
    process.exit(1);
  }
  const snippetId = create.json?.id;
  console.log("→ Snippet created id=" + snippetId);

  console.log("→ Activating...");
  await req(`/wp-json/code-snippets/v1/snippets/${snippetId}`, { method: "POST", body: { active: true } });

  console.log("→ Triggering execution...");
  await req("/");
  await new Promise(r => setTimeout(r, 3000));

  // Read result via read snippet
  console.log("→ Reading result...");
  const readPHP = `$v = get_option('${OPTION_KEY}', '{}'); update_option('_claude_forms_read', $v, false);`;
  const readCreate = await req("/wp-json/code-snippets/v1/snippets", {
    method: "POST",
    body: { name: "_claude_read_" + Date.now(), code: readPHP, scope: "php-functions", active: false, priority: 1 },
  });
  const readId = readCreate.json?.id;
  if (readId) {
    await req(`/wp-json/code-snippets/v1/snippets/${readId}`, { method: "POST", body: { active: true } });
    await req("/");
    await new Promise(r => setTimeout(r, 2000));
  }

  // Read the result option value via the settings endpoint or another snippet
  // Use a final reading snippet that outputs the value to a well-known option
  const finalReadPHP = `
$v = get_option('_claude_forms_read', '{}');
update_option('_claude_final', $v, false);
// Also store in a transient for immediate access
set_transient('_claude_forms_data', $v, 3600);
`;
  const finalCreate = await req("/wp-json/code-snippets/v1/snippets", {
    method: "POST",
    body: { name: "_claude_final_" + Date.now(), code: finalReadPHP, scope: "php-functions", active: false, priority: 1 },
  });
  const finalId = finalCreate.json?.id;
  if (finalId) {
    await req(`/wp-json/code-snippets/v1/snippets/${finalId}`, { method: "POST", body: { active: true } });
    await req("/");
    await new Promise(r => setTimeout(r, 2000));
  }

  // Now read via settings API (registered options only)
  // Instead, fetch using a snippet that writes to a registered REST field
  // Best approach: just list all snippets and find a way to get data back
  // Actually - fetch the option directly via the wp-json/wp/v2/settings endpoint won't work for custom options
  // Use the same trick as deep-diagnostic: read via a snippet that updates _claude_read_result

  // Re-read using the actual options table via another snippet
  const getDataPHP = `
$data = get_option('${OPTION_KEY}', false);
if (!$data) $data = get_option('_claude_forms_read', '{}');
// Write to a place we can retrieve: use REST endpoint by registering it temporarily
register_rest_route('claude/v1', '/data', [
  'methods' => 'GET',
  'callback' => fn() => json_decode($data, true),
  'permission_callback' => fn($r) => current_user_can('manage_options'),
]);
`;
  // This won't work because the route is registered during this request only

  // BEST APPROACH: store in an option and read with a GET snippet that returns it via update_option to _claude_diag_result
  // which is what deep-diagnostic does - and then reads it via the REST settings API.
  // But settings API only returns registered options.

  // Actually in the deep-diagnostic it stores in _claude_diag_result and then reads via:
  // GET /wp-json/wp/v2/settings — wait, that only returns registered settings.

  // Let me look at how deep-diagnostic actually reads back...
  // It must do something else. Let me just store result as a post or use the snippets list.

  // SIMPLEST: store result in option, then read it back via a snippet that echoes it as JSON
  // But we need the snippet to "run" and return output... which is the /run endpoint.

  // OK let me just check if /run endpoint works at all with a simple test
  console.log("→ Testing /run endpoint...");
  const runTest = await req("/wp-json/code-snippets/v1/snippets/run", {
    method: "POST",
    body: { code: "return json_encode(['test' => true, 'option' => get_option('${OPTION_KEY}', 'NOT_FOUND')]);" },
  });
  console.log("  /run status:", runTest.status, runTest.body?.slice(0, 500));

  // Cleanup
  console.log("→ Cleaning up snippets...");
  for (const id of [snippetId, readId, finalId].filter(Boolean)) {
    await req(`/wp-json/code-snippets/v1/snippets/${id}`, { method: "POST", body: { active: false } });
    await req(`/wp-json/code-snippets/v1/snippets/${id}`, { method: "DELETE" });
  }

  // Parse result from /run test
  let rawData = null;
  if (runTest.status === 200 && runTest.json?.result) {
    try {
      const parsed = JSON.parse(runTest.json.result);
      const optVal = parsed.option;
      if (optVal && optVal !== 'NOT_FOUND') {
        rawData = JSON.parse(optVal);
      }
    } catch {}
  }

  if (!rawData) {
    // Try reading option via /run directly
    console.log("→ Reading stored option via /run...");
    const readRun = await req("/wp-json/code-snippets/v1/snippets/run", {
      method: "POST",
      body: { code: `$v = get_option('${OPTION_KEY}', get_option('_claude_forms_read', '{}')); return $v;` },
    });
    console.log("  Read run status:", readRun.status, readRun.body?.slice(0, 200));
    if (readRun.status === 200 && readRun.json?.result) {
      try { rawData = JSON.parse(readRun.json.result); } catch {}
    }
  }

  return rawData;
}

(async () => {
  const outDir = "diagnostics";
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const data = await runDiagnostic();

  const forms = data?.forms || [];
  const subCounts = data?.submission_counts || {};

  console.log(`\nForms found: ${forms.length}`);
  const broken = forms.filter(f => !f.has_scalla);
  const working = forms.filter(f => f.has_scalla);

  let md = `# Broken Forms Diagnostic\n\n**Run:** ${new Date().toISOString()}\n\n`;
  md += `## Summary\n- Total Elementor forms: ${forms.length}\n- With Scalla action: ${working.length}\n- Missing Scalla action: ${broken.length}\n\n`;

  if (!data) {
    md += `## ⚠️ Could not retrieve data — check workflow logs\n\n`;
  } else if (broken.length > 0) {
    md += `## ⚠️ Forms Missing Scalla Action\n\n`;
    for (const f of broken) {
      md += `### "${f.form_name}" — Page: "${f.page_title}" (ID: ${f.page_id})\n`;
      md += `- Element ID: \`${f.form_id}\`\n`;
      md += `- Current actions: \`${JSON.stringify(f.actions)}\`\n`;
      md += `- Submissions (90d): ${subCounts[f.form_id] || 0}\n\n`;
    }
  } else if (forms.length > 0) {
    md += `## ✅ All forms have Scalla action configured\n\n`;
  } else {
    md += `## ⚠️ No Elementor forms found in DB\n\n`;
  }

  md += `## Working Forms\n\n`;
  for (const f of working) {
    md += `- **"${f.form_name}"** — "${f.page_title}" (ID: ${f.page_id}) — actions: \`${JSON.stringify(f.actions)}\` — subs: ${subCounts[f.form_id] || 0}\n`;
  }

  fs.writeFileSync(path.join(outDir, "broken-forms.md"), md);
  fs.writeFileSync(path.join(outDir, "broken-forms-raw.json"), JSON.stringify({ forms, broken, working, subCounts }, null, 2));
  console.log("\nWritten to diagnostics/broken-forms.md\n");
  console.log(md);
})();
