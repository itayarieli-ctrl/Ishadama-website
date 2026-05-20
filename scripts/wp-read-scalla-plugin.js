#!/usr/bin/env node
// Reads the Scalla plugin PHP source files so we can understand
// its API endpoint and how to call it from an Elementor hook.

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
$out = [];

// Read all PHP files in the Scalla plugin directory
$plugin_dir = WP_PLUGIN_DIR . '/wp-scalla';
$out['plugin_dir'] = $plugin_dir;
$out['plugin_dir_exists'] = is_dir($plugin_dir);

if (is_dir($plugin_dir)) {
  $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($plugin_dir));
  $out['files'] = [];
  foreach ($files as $file) {
    if ($file->isFile() && $file->getExtension() === 'php') {
      $rel  = str_replace($plugin_dir . '/', '', $file->getPathname());
      $content = file_get_contents($file->getPathname());
      $out['files'][$rel] = $content;
    }
  }
}

update_option('_claude_scalla_src', json_encode($out), false);
`;

(async () => {
  console.log("→ Creating snippet to read Scalla plugin source...");
  const create = await req("/wp-json/code-snippets/v1/snippets", {
    method: "POST",
    body: { name: "_claude_scalla_src_" + Date.now(), code: SNIPPET_PHP, scope: "php-functions", active: false, priority: 1 },
  });
  const snippetId = create.json?.id;
  console.log("   snippet id:", snippetId);

  await req(`/wp-json/code-snippets/v1/snippets/${snippetId}`, { method: "POST", body: { active: true } });
  await req("/");
  await new Promise((r) => setTimeout(r, 3000));

  // Register and expose the result
  const expose = await req("/wp-json/code-snippets/v1/snippets", {
    method: "POST",
    body: {
      name: "_claude_expose2_" + Date.now(),
      code: `register_setting('general', '_claude_scalla_src', ['show_in_rest' => true, 'type' => 'string', 'default' => '']);`,
      scope: "php-functions", active: false, priority: 1,
    },
  });
  const exposeId = expose.json?.id;
  await req(`/wp-json/code-snippets/v1/snippets/${exposeId}`, { method: "POST", body: { active: true } });
  await req("/");
  await new Promise((r) => setTimeout(r, 2000));

  const settings = await req("/wp-json/wp/v2/settings");
  const raw = settings.json?._claude_scalla_src;

  // Cleanup
  for (const id of [snippetId, exposeId].filter(Boolean)) {
    await req(`/wp-json/code-snippets/v1/snippets/${id}`, { method: "DELETE" });
  }
  const cleanup = await req("/wp-json/code-snippets/v1/snippets", {
    method: "POST",
    body: { name: "_cleanup_" + Date.now(), code: `delete_option('_claude_scalla_src');`, scope: "php-functions", active: true, priority: 1 },
  });
  const cleanId = cleanup.json?.id;
  await req("/");
  await new Promise((r) => setTimeout(r, 1000));
  if (cleanId) await req(`/wp-json/code-snippets/v1/snippets/${cleanId}`, { method: "DELETE" });

  // Write output
  const date = new Date().toISOString().slice(0, 10);
  const dir = path.join("diagnostics", date);
  fs.mkdirSync(dir, { recursive: true });

  if (raw) {
    let parsed = {};
    try { parsed = JSON.parse(raw); } catch {}

    let md = `# Scalla Plugin Source — ${date}\n\nPlugin dir: \`${parsed.plugin_dir}\`\nDir exists: ${parsed.plugin_dir_exists}\n\n`;
    const files = parsed.files || {};
    for (const [name, content] of Object.entries(files)) {
      // Redact any API keys or tokens in source
      const safe = content.replace(/(key|token|secret|password)\s*=\s*['"][^'"]{8,}['"]/gi, '$1 = "***REDACTED***"');
      md += `## ${name}\n\n\`\`\`php\n${safe.slice(0, 8000)}\n\`\`\`\n\n`;
    }
    fs.writeFileSync(path.join(dir, "scalla-plugin-source.md"), md);
    console.log("Wrote scalla-plugin-source.md");
  } else {
    fs.writeFileSync(path.join(dir, "scalla-plugin-source.md"), `# Scalla Plugin Source\n\nCould not retrieve. Settings response HTTP ${settings.status}.\n`);
    console.log("Fallback written");
  }
})();
