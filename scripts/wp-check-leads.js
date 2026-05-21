#!/usr/bin/env node
// Checks if Elementor Pro stored any form submissions in the WordPress DB
// (the "Save Submissions" action). Exports them to CSV if found.

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

const SNIPPET_PHP = `
global $wpdb;
$out = [];

// Elementor Pro stores submissions in these tables (if Save Submissions action enabled)
$tables = $wpdb->get_col("SHOW TABLES LIKE '%elementor%submission%'");
$out['elementor_submission_tables'] = $tables;

// Check the standard Elementor submissions table
$subs_table  = $wpdb->prefix . 'e_submissions';
$vals_table  = $wpdb->prefix . 'e_submissions_values';
$out['has_e_submissions']        = (bool) $wpdb->get_var("SHOW TABLES LIKE '$subs_table'");
$out['has_e_submissions_values'] = (bool) $wpdb->get_var("SHOW TABLES LIKE '$vals_table'");

$out['submissions'] = [];
if ($out['has_e_submissions']) {
  $submissions = $wpdb->get_results(
    "SELECT * FROM $subs_table ORDER BY created_at DESC LIMIT 500",
    ARRAY_A
  );
  foreach ($submissions as $s) {
    $values = [];
    if ($out['has_e_submissions_values']) {
      $rows = $wpdb->get_results($wpdb->prepare(
        "SELECT \`key\`, value FROM $vals_table WHERE submission_id = %d",
        $s['id']
      ), ARRAY_A);
      foreach ($rows as $r) $values[$r['key']] = $r['value'];
    }
    $s['values'] = $values;
    $out['submissions'][] = $s;
  }
}

// Also check for any 'wpforms_entries' table (in case WPForms Pro was active before)
$wpforms_entries = $wpdb->get_var("SHOW TABLES LIKE '{$wpdb->prefix}wpforms_entries'");
$out['has_wpforms_entries'] = (bool) $wpforms_entries;
if ($wpforms_entries) {
  $out['wpforms_entries_count'] = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}wpforms_entries");
  $out['wpforms_entries_sample'] = $wpdb->get_results(
    "SELECT * FROM {$wpdb->prefix}wpforms_entries ORDER BY date DESC LIMIT 200",
    ARRAY_A
  );
}

// Check counts only first to know what we're dealing with
$out['e_submissions_count'] = $out['has_e_submissions']
  ? (int) $wpdb->get_var("SELECT COUNT(*) FROM $subs_table")
  : 0;
$out['e_submissions_values_count'] = $out['has_e_submissions_values']
  ? (int) $wpdb->get_var("SELECT COUNT(*) FROM $vals_table")
  : 0;

update_option('_claude_leads', json_encode($out), false);
`;

(async () => {
  console.log("→ Creating snippet to check stored leads...");
  const create = await req("/wp-json/code-snippets/v1/snippets", {
    method: "POST",
    body: { name: "_claude_leads_" + Date.now(), code: SNIPPET_PHP, scope: "php-functions", active: false, priority: 1 },
  });
  const snippetId = create.json?.id;
  console.log("   snippet id:", snippetId);

  await req(`/wp-json/code-snippets/v1/snippets/${snippetId}`, { method: "POST", body: { active: true } });
  await req("/");
  await new Promise((r) => setTimeout(r, 5000));

  const expose = await req("/wp-json/code-snippets/v1/snippets", {
    method: "POST",
    body: {
      name: "_claude_expose4_" + Date.now(),
      code: `register_setting('general', '_claude_leads', ['show_in_rest' => true, 'type' => 'string', 'default' => '']);`,
      scope: "php-functions", active: false, priority: 1,
    },
  });
  const exposeId = expose.json?.id;
  await req(`/wp-json/code-snippets/v1/snippets/${exposeId}`, { method: "POST", body: { active: true } });
  await req("/");
  await new Promise((r) => setTimeout(r, 2000));

  const settings = await req("/wp-json/wp/v2/settings");
  const raw = settings.json?._claude_leads;

  // Cleanup
  for (const id of [snippetId, exposeId].filter(Boolean)) {
    await req(`/wp-json/code-snippets/v1/snippets/${id}`, { method: "DELETE" });
  }
  const cleanup = await req("/wp-json/code-snippets/v1/snippets", {
    method: "POST",
    body: { name: "_cleanup_" + Date.now(), code: `delete_option('_claude_leads');`, scope: "php-functions", active: true, priority: 1 },
  });
  const cleanId = cleanup.json?.id;
  await req("/");
  await new Promise((r) => setTimeout(r, 1000));
  if (cleanId) await req(`/wp-json/code-snippets/v1/snippets/${cleanId}`, { method: "DELETE" });

  // Write output
  const date = new Date().toISOString().slice(0, 10);
  const dir = path.join("diagnostics", date);
  fs.mkdirSync(dir, { recursive: true });

  if (!raw) {
    fs.writeFileSync(path.join(dir, "stored-leads.md"), "# Stored Leads — could not read result\n");
    return;
  }

  let parsed = {};
  try { parsed = JSON.parse(raw); } catch {}

  let md = `# Stored Leads Check — ${date}\n\n`;
  md += `## Tables present\n\n`;
  md += `- Elementor submission tables found: ${JSON.stringify(parsed.elementor_submission_tables)}\n`;
  md += `- \`e_submissions\` table exists: ${parsed.has_e_submissions}\n`;
  md += `- \`e_submissions_values\` table exists: ${parsed.has_e_submissions_values}\n`;
  md += `- \`wpforms_entries\` table exists: ${parsed.has_wpforms_entries}\n\n`;

  md += `## Counts\n\n`;
  md += `- Total Elementor submissions: **${parsed.e_submissions_count || 0}**\n`;
  md += `- Total Elementor submission values: ${parsed.e_submissions_values_count || 0}\n`;
  if (parsed.has_wpforms_entries) {
    md += `- Total WPForms entries: **${parsed.wpforms_entries_count || 0}**\n`;
  }
  md += "\n";

  if (parsed.submissions?.length) {
    md += `## Elementor submissions (up to 500 most recent)\n\n`;
    // Redact emails/phones partially in display, but write full CSV separately
    md += `| ID | Created | Form name | Page | Fields |\n|---|---|---|---|---|\n`;
    parsed.submissions.slice(0, 100).forEach((s) => {
      const fields = Object.entries(s.values || {}).map(([k, v]) => `${k}=${String(v).slice(0, 30)}`).join("; ");
      md += `| ${s.id} | ${s.created_at} | ${s.form_name || ""} | ${s.post_id || ""} | ${fields} |\n`;
    });

    // Write full CSV
    const allKeys = new Set();
    parsed.submissions.forEach((s) => Object.keys(s.values || {}).forEach((k) => allKeys.add(k)));
    const keys = ["id", "created_at", "form_name", "post_id", "user_ip", ...Array.from(allKeys)];
    const csv = [keys.join(",")];
    parsed.submissions.forEach((s) => {
      const row = keys.map((k) => {
        let v = k in s ? s[k] : s.values?.[k] || "";
        v = String(v).replace(/"/g, '""');
        return `"${v}"`;
      });
      csv.push(row.join(","));
    });
    fs.writeFileSync(path.join(dir, "stored-leads.csv"), csv.join("\n"));
    md += `\nFull CSV: \`diagnostics/${date}/stored-leads.csv\` (${parsed.submissions.length} rows)\n`;
  } else {
    md += `## No Elementor submissions stored\n\nThis means Elementor's "Save Submissions" action is NOT enabled on the forms. Any leads that were submitted but failed to reach Scalla are likely lost (unless email notifications captured them).\n`;
  }

  fs.writeFileSync(path.join(dir, "stored-leads.md"), md);
  console.log("Wrote " + path.join(dir, "stored-leads.md"));
})();
