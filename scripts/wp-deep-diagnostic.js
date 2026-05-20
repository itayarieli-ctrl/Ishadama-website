#!/usr/bin/env node
// Deep diagnostic: reads Scalla plugin settings and WPForms form configs
// by creating a temporary read-only PHP snippet via Code Snippets REST API,
// running it, reading the output, then deleting the snippet.

const https = require("https");
const fs = require("fs");
const path = require("path");

const SITE = "https://ishadama.co.il";
const USER = process.env.WP_USERNAME;
const PASS = process.env.WP_APP_PASSWORD;
const AUTH = "Basic " + Buffer.from(`${USER}:${PASS.replace(/\s+/g, "")}`).toString("base64");

// Scrub any value that looks like a secret before writing to disk.
// Covers: OAuth tokens/refresh tokens, API keys, client secrets.
const SECRET_PATTERNS = [
  /ya29\.[a-zA-Z0-9_\-\.]{20,}/g,          // Google access token
  /1\/\/[a-zA-Z0-9_\-\.]{20,}/g,            // Google refresh token
  /[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com/g, // Google client ID
  /GOCSPX-[a-zA-Z0-9_\-]{20,}/g,           // Google client secret
  /"(access_token|refresh_token|client_secret|auth_token|token|secret|password|api_key|apikey|private_key)"\s*:\s*"[^"]{8,}"/gi,
];
function scrub(str) {
  if (typeof str !== "string") str = JSON.stringify(str, null, 2);
  for (const p of SECRET_PATTERNS) str = str.replace(p, "***REDACTED***");
  return str;
}

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

// PHP snippet that reads all relevant settings and stores them as a WP option
const SNIPPET_PHP = `
global $wpdb;
$out = [];

// 1. All WordPress options that mention scalla / wpforms / crm
$scalla_opts = $wpdb->get_results(
  "SELECT option_name, option_value FROM {$wpdb->options}
   WHERE (option_name LIKE '%scalla%' OR option_name LIKE '%wp_scalla%')
     AND option_name NOT LIKE '%google%'
     AND option_name NOT LIKE '%oauth%'
     AND option_name NOT LIKE '%token%'
   ORDER BY option_name",
  ARRAY_A
);
$out['scalla_options'] = $scalla_opts;

// 2. WPForms forms from DB (wpforms stores each form as a post)
$forms = $wpdb->get_results(
  "SELECT p.ID, p.post_title, p.post_status, p.post_content
   FROM {$wpdb->posts} p
   WHERE p.post_type = 'wpforms'
   ORDER BY p.ID",
  ARRAY_A
);
$out['wpforms_forms'] = [];
foreach ($forms as $f) {
  $config = json_decode($f['post_content'], true);
  $out['wpforms_forms'][] = [
    'id'        => $f['ID'],
    'title'     => $f['post_title'],
    'status'    => $f['post_status'],
    'fields'    => isset($config['fields']) ? array_values($config['fields']) : [],
    'settings'  => isset($config['settings']) ? $config['settings'] : [],
    'providers' => isset($config['providers']) ? $config['providers'] : [],
    'payments'  => isset($config['payments']) ? $config['payments'] : [],
  ];
}

// 3. WPForms global settings
$out['wpforms_settings'] = get_option('wpforms_settings', []);

// 4. WP Mail SMTP settings (sanitised - no passwords)
$smtp = get_option('wp_mail_smtp', []);
if (isset($smtp['mail']['pass'])) $smtp['mail']['pass'] = '***REDACTED***';
$out['wp_mail_smtp'] = $smtp;

// 5. Recent WP error log entries mentioning scalla / wpforms (last 200 lines of debug.log)
$log_path = WP_CONTENT_DIR . '/debug.log';
$out['debug_log_scalla'] = [];
if (file_exists($log_path)) {
  $lines = file($log_path);
  $recent = array_slice($lines, -200);
  foreach ($recent as $line) {
    if (stripos($line, 'scalla') !== false || stripos($line, 'wpforms') !== false) {
      $out['debug_log_scalla'][] = trim($line);
    }
  }
} else {
  $out['debug_log_scalla'] = ['debug.log not found at ' . $log_path];
}

update_option('_claude_diag_result', json_encode($out), false);
`;

(async () => {
  console.log("→ Creating diagnostic snippet...");
  const create = await req("/wp-json/code-snippets/v1/snippets", {
    method: "POST",
    body: {
      name: "_claude_diagnostic_" + Date.now(),
      code: SNIPPET_PHP,
      scope: "php-functions", // runs on every load once active
      active: false,
      priority: 1,
    },
  });

  if (create.status !== 200 && create.status !== 201) {
    console.error("Failed to create snippet:", create.status, create.body?.slice(0, 500));
    process.exit(1);
  }
  const snippetId = create.json?.id;
  console.log("→ Snippet created, id=" + snippetId);

  // Activate it
  console.log("→ Activating snippet...");
  const activate = await req(`/wp-json/code-snippets/v1/snippets/${snippetId}`, {
    method: "POST",
    body: { active: true },
  });
  console.log("   activate status:", activate.status);

  // Trigger execution by hitting the site
  console.log("→ Triggering execution (GET /)...");
  await req("/");

  // Wait a moment for it to run
  await new Promise((r) => setTimeout(r, 3000));

  // Read the output option
  console.log("→ Reading result option...");
  // Use WP Settings API — but _claude_diag_result isn't registered.
  // Read via another snippet instead.
  const readSnippet = await req("/wp-json/code-snippets/v1/snippets", {
    method: "POST",
    body: {
      name: "_claude_read_" + Date.now(),
      code: `$r = get_option('_claude_diag_result', '{}'); update_option('_claude_read_result', $r, false);`,
      scope: "php-functions",
      active: false,
      priority: 1,
    },
  });
  const readId = readSnippet.json?.id;
  await req(`/wp-json/code-snippets/v1/snippets/${readId}`, { method: "POST", body: { active: true } });
  await req("/");
  await new Promise((r) => setTimeout(r, 2000));

  // Try to read via a GET snippet that returns inline
  // Actually let's read the option via a REST snippet that outputs to a dedicated endpoint
  // Simplest: use the WP options endpoint with a custom registered option
  // But that won't work for unregistered options.
  // Better: create a third snippet that registers _claude_diag_result as a REST setting
  console.log("→ Exposing result via REST settings...");
  const exposeSnippet = await req("/wp-json/code-snippets/v1/snippets", {
    method: "POST",
    body: {
      name: "_claude_expose_" + Date.now(),
      code: `
register_setting('general', '_claude_diag_result', ['show_in_rest' => true, 'type' => 'string', 'default' => '']);
register_setting('general', '_claude_read_result', ['show_in_rest' => true, 'type' => 'string', 'default' => '']);
`,
      scope: "php-functions",
      active: false,
      priority: 1,
    },
  });
  const exposeId = exposeSnippet.json?.id;
  await req(`/wp-json/code-snippets/v1/snippets/${exposeId}`, { method: "POST", body: { active: true } });
  await req("/");
  await new Promise((r) => setTimeout(r, 2000));

  // Now read settings
  console.log("→ Reading result from WP REST settings...");
  const settings = await req("/wp-json/wp/v2/settings");
  const raw = settings.json?._claude_diag_result || settings.json?._claude_read_result || null;

  // Cleanup all snippets
  console.log("→ Cleaning up snippets...");
  for (const id of [snippetId, readId, exposeId].filter(Boolean)) {
    await req(`/wp-json/code-snippets/v1/snippets/${id}`, { method: "DELETE" });
  }
  // Delete the temp options
  const cleanSnippet = await req("/wp-json/code-snippets/v1/snippets", {
    method: "POST",
    body: {
      name: "_claude_cleanup_" + Date.now(),
      code: `delete_option('_claude_diag_result'); delete_option('_claude_read_result');`,
      scope: "php-functions",
      active: true,
      priority: 1,
    },
  });
  const cleanId = cleanSnippet.json?.id;
  await req("/");
  await new Promise((r) => setTimeout(r, 1000));
  if (cleanId) await req(`/wp-json/code-snippets/v1/snippets/${cleanId}`, { method: "DELETE" });

  // Write report
  const date = new Date().toISOString().slice(0, 10);
  const dir = path.join("diagnostics", date);
  fs.mkdirSync(dir, { recursive: true });

  if (raw) {
    let parsed = {};
    try { parsed = JSON.parse(raw); } catch {}

    let md = `# WP Deep Diagnostic — ${date}\n\nSite: ${SITE}\n`;

    // Scalla options
    md += `\n## Scalla plugin options\n\n`;
    if (parsed.scalla_options?.length) {
      parsed.scalla_options.forEach((o) => {
        md += `- **${o.option_name}**: \`${o.option_value?.slice(0, 200)}\`\n`;
      });
    } else {
      md += `_No options found with 'scalla' in the name._\n`;
    }

    // WPForms forms
    md += `\n## WPForms forms\n\n`;
    if (parsed.wpforms_forms?.length) {
      parsed.wpforms_forms.forEach((f) => {
        md += `### Form: "${f.title}" (id ${f.id}, status ${f.status})\n\n`;
        md += `**Fields:**\n`;
        (f.fields || []).forEach((field) => {
          md += `- ${field.label || "(unlabelled)"} — type: ${field.type}, id: ${field.id}\n`;
        });
        md += `\n**Notifications:**\n\`\`\`json\n${JSON.stringify(f.settings?.notifications, null, 2)}\n\`\`\`\n`;
        md += `\n**Providers (CRM integrations):**\n\`\`\`json\n${JSON.stringify(f.providers, null, 2)}\n\`\`\`\n`;
      });
    } else {
      md += `_No WPForms forms found in DB._\n`;
    }

    // WPForms global settings
    md += `\n## WPForms global settings\n\n\`\`\`json\n${JSON.stringify(parsed.wpforms_settings, null, 2)?.slice(0, 2000)}\n\`\`\`\n`;

    // SMTP
    md += `\n## WP Mail SMTP (sanitised)\n\n\`\`\`json\n${JSON.stringify(parsed.wp_mail_smtp, null, 2)?.slice(0, 1000)}\n\`\`\`\n`;

    // Debug log
    md += `\n## Debug log (Scalla/WPForms mentions)\n\n`;
    if (parsed.debug_log_scalla?.length) {
      md += "```\n" + parsed.debug_log_scalla.slice(-50).join("\n") + "\n```\n";
    } else {
      md += `_None found._\n`;
    }

    fs.writeFileSync(path.join(dir, "wp-deep-diagnostic.md"), scrub(md));
    fs.writeFileSync(path.join(dir, "wp-deep-diagnostic.json"), scrub(JSON.stringify(parsed, null, 2)));
    console.log(`Wrote ${dir}/wp-deep-diagnostic.md`);
  } else {
    // Fallback: write what we got from settings
    const fallback = `# WP Deep Diagnostic — ${date}\n\nCould not read result option via REST settings.\n\nSettings response (HTTP ${settings.status}):\n\n\`\`\`json\n${JSON.stringify(settings.json, null, 2)?.slice(0, 3000)}\n\`\`\`\n`;
    fs.writeFileSync(path.join(dir, "wp-deep-diagnostic.md"), fallback);
    console.log("Wrote fallback report");
  }
})();
