#!/usr/bin/env node
// Find all footer Elementor templates and list their links - identify where "תנאי שימוש" link lives

const https = require("https");
const fs = require("fs");
const path = require("path");

const SITE = "https://ishadama.co.il";
const AUTH = "Basic " + Buffer.from(`${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD.replace(/\s+/g, "")}`).toString("base64");

function req(pathname, { method = "GET", body } = {}) {
  return new Promise((resolve) => {
    const u = new URL(pathname, SITE);
    const opts = { method, headers: { Authorization: AUTH, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) } };
    const r = https.request(u, opts, (res) => {
      let data = ""; res.on("data", c => data += c);
      res.on("end", () => { let j = null; try { j = JSON.parse(data); } catch {}; resolve({ status: res.statusCode, body: data, json: j }); });
    });
    r.on("error", e => resolve({ status: 0, error: e.message }));
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

const OPT_KEY = "_claude_footer_" + Date.now();
const PHP = `
global $wpdb;

// Get all elementor_library posts (templates) and pages, look for "תנאי שימוש" anywhere
$rows = $wpdb->get_results(
  "SELECT p.ID, p.post_title, p.post_type, p.post_status, pm.meta_value as ed
   FROM {$wpdb->posts} p
   LEFT JOIN {$wpdb->postmeta} pm ON pm.post_id = p.ID AND pm.meta_key = '_elementor_data'
   WHERE p.post_status IN ('publish','draft')
     AND p.post_type IN ('elementor_library','page','post')
     AND pm.meta_value LIKE '%תנאי שימוש%'",
  ARRAY_A
);

$out = [];
foreach ($rows as $r) {
  $data = json_decode($r['ed'], true);
  if (!is_array($data)) continue;

  // Recursively find all elements that mention "תנאי שימוש"
  $matches = [];
  $stack = [['path' => '', 'el' => $data]];
  while (!empty($stack)) {
    $item = array_shift($stack);
    $el = $item['el'];
    if (!is_array($el)) continue;

    if (isset($el['elType'])) {
      // Check editor (button widget, text-editor, heading) for "תנאי שימוש"
      $serialized = json_encode($el['settings'] ?? [], JSON_UNESCAPED_UNICODE);
      if (strpos($serialized, 'תנאי שימוש') !== false) {
        $matches[] = [
          'id' => $el['id'] ?? '',
          'widget_type' => $el['widgetType'] ?? $el['elType'],
          'settings_snippet' => substr($serialized, 0, 1500),
        ];
      }
      foreach (($el['elements'] ?? []) as $child) $stack[] = ['path' => '', 'el' => $child];
    } else {
      // It's the root array
      foreach ($el as $child) $stack[] = ['path' => '', 'el' => $child];
    }
  }

  if (!empty($matches)) {
    $out[] = [
      'post_id' => (int)$r['ID'],
      'post_title' => $r['post_title'],
      'post_type' => $r['post_type'],
      'matches' => $matches,
    ];
  }
}

update_option('${OPT_KEY}', json_encode($out, JSON_UNESCAPED_UNICODE), false);
`;

(async () => {
  console.log("Creating diagnostic snippet...");
  const create = await req("/wp-json/code-snippets/v1/snippets", {
    method: "POST",
    body: { name: "_claude_footer_find_" + Date.now(), code: PHP, scope: "php-functions", active: false, priority: 1 },
  });
  if (create.status !== 200 && create.status !== 201) {
    console.error("Create failed:", create.status, create.body?.slice(0, 400)); process.exit(1);
  }
  const id = create.json?.id;
  await req(`/wp-json/code-snippets/v1/snippets/${id}`, { method: "POST", body: { active: true } });
  await req("/");
  await new Promise(r => setTimeout(r, 3000));

  // Read via /run endpoint
  const read = await req("/wp-json/code-snippets/v1/snippets/run", {
    method: "POST",
    body: { code: `return get_option('${OPT_KEY}', '[]');` },
  });

  // Cleanup
  await req(`/wp-json/code-snippets/v1/snippets/${id}`, { method: "POST", body: { active: false } });
  await req(`/wp-json/code-snippets/v1/snippets/${id}`, { method: "DELETE" });

  let result = [];
  if (read.json?.result) {
    try { result = JSON.parse(read.json.result); } catch (e) { console.error("Parse error:", e.message); }
  }

  console.log(`\nFound ${result.length} posts containing "תנאי שימוש":\n`);
  for (const r of result) {
    console.log(`\n=== ${r.post_type} #${r.post_id}: "${r.post_title}" ===`);
    for (const m of r.matches) {
      console.log(`  Widget: ${m.widget_type} (id=${m.id})`);
      console.log(`  Settings: ${m.settings_snippet.slice(0, 800)}...\n`);
    }
  }

  if (!fs.existsSync("diagnostics")) fs.mkdirSync("diagnostics", { recursive: true });
  fs.writeFileSync("diagnostics/footer-terms-link.json", JSON.stringify(result, null, 2));
})();
