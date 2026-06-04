#!/usr/bin/env node
// Broad search for any link/text related to terms of use across Elementor + WP menus + widgets

const https = require("https");
const fs = require("fs");

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

const OPT_KEY = "_claude_terms_" + Date.now();
const PHP = `
global $wpdb;
$out = ['elementor' => [], 'nav_menu_items' => [], 'widgets' => [], 'page_5096' => null];

// 1. Search Elementor data for any Hebrew terms phrasing
$patterns = ['תנאי שימוש','תנאי השימוש','תקנון','תנאים והגבלות','terms','התקנון'];
foreach ($patterns as $p) {
  $rows = $wpdb->get_results($wpdb->prepare(
    "SELECT p.ID, p.post_title, p.post_type, pm.meta_value
     FROM {$wpdb->posts} p
     JOIN {$wpdb->postmeta} pm ON pm.post_id = p.ID
     WHERE pm.meta_key = '_elementor_data'
       AND p.post_status = 'publish'
       AND pm.meta_value LIKE %s",
    '%' . $wpdb->esc_like($p) . '%'
  ), ARRAY_A);
  foreach ($rows as $r) {
    $data = json_decode($r['meta_value'], true);
    if (!is_array($data)) continue;
    $stack = $data;
    while (!empty($stack)) {
      $el = array_shift($stack);
      if (!is_array($el)) continue;
      if (isset($el['elType'])) {
        $s = json_encode($el['settings'] ?? [], JSON_UNESCAPED_UNICODE);
        if (strpos($s, $p) !== false) {
          $out['elementor'][] = [
            'pattern_matched' => $p,
            'post_id' => (int)$r['ID'],
            'post_title' => $r['post_title'],
            'post_type' => $r['post_type'],
            'element_id' => $el['id'] ?? '',
            'widget_type' => $el['widgetType'] ?? $el['elType'],
            'settings' => substr($s, 0, 2000),
          ];
        }
        foreach (($el['elements'] ?? []) as $c) $stack[] = $c;
      }
    }
  }
}

// 2. WordPress nav menu items
$menu_items = $wpdb->get_results(
  "SELECT p.ID, p.post_title, p.post_status,
   (SELECT meta_value FROM {$wpdb->postmeta} WHERE post_id = p.ID AND meta_key = '_menu_item_url' LIMIT 1) as url,
   (SELECT meta_value FROM {$wpdb->postmeta} WHERE post_id = p.ID AND meta_key = '_menu_item_object_id' LIMIT 1) as object_id,
   (SELECT meta_value FROM {$wpdb->postmeta} WHERE post_id = p.ID AND meta_key = '_menu_item_object' LIMIT 1) as object_type,
   (SELECT meta_value FROM {$wpdb->postmeta} WHERE post_id = p.ID AND meta_key = '_menu_item_type' LIMIT 1) as item_type
   FROM {$wpdb->posts} p
   WHERE p.post_type = 'nav_menu_item'
     AND p.post_status = 'publish'",
  ARRAY_A
);
foreach ($menu_items as $mi) {
  $title = $mi['post_title'];
  // The title is often empty - get_post_meta for _menu_item_xfn, or join with terms
  if (empty($title)) {
    // Try the linked object's title
    $oid = $mi['object_id'];
    if ($oid) {
      $linked = $wpdb->get_var($wpdb->prepare("SELECT post_title FROM {$wpdb->posts} WHERE ID = %d", $oid));
      $title = $linked;
    }
  }
  if (preg_match('/(תנאי|תקנון|תנאים|terms)/iu', $title) || (!empty($mi['url']) && preg_match('/(term|takan|tnaim)/i', $mi['url']))) {
    $out['nav_menu_items'][] = [
      'id' => (int)$mi['ID'],
      'title' => $title,
      'url' => $mi['url'],
      'object_id' => $mi['object_id'],
      'object_type' => $mi['object_type'],
      'item_type' => $mi['item_type'],
    ];
  }
}

// 3. Look at page 5096 to confirm
$p5096 = get_post(5096);
if ($p5096) {
  $out['page_5096'] = [
    'id' => 5096,
    'title' => $p5096->post_title,
    'status' => $p5096->post_status,
    'type' => $p5096->post_type,
    'slug' => $p5096->post_name,
    'permalink' => get_permalink(5096),
  ];
}

// 4. Theme mods / widgets that might link to terms
$widgets = get_option('widget_block', []);
$widget_text = get_option('widget_text', []);
$widget_custom_html = get_option('widget_custom_html', []);
foreach (['widget_block' => $widgets, 'widget_text' => $widget_text, 'widget_custom_html' => $widget_custom_html] as $name => $w) {
  if (is_array($w)) {
    foreach ($w as $idx => $inst) {
      if (!is_array($inst)) continue;
      $content = ($inst['content'] ?? '') . ' ' . ($inst['text'] ?? '');
      if (preg_match('/(תנאי שימוש|תנאי השימוש|תקנון|תנאים והגבלות)/iu', $content)) {
        $out['widgets'][] = [
          'widget_type' => $name,
          'instance_id' => $idx,
          'content' => substr($content, 0, 2000),
        ];
      }
    }
  }
}

update_option('${OPT_KEY}', json_encode($out, JSON_UNESCAPED_UNICODE), false);
`;

(async () => {
  console.log("Creating diagnostic snippet...");
  const create = await req("/wp-json/code-snippets/v1/snippets", {
    method: "POST",
    body: { name: "_claude_terms_find_" + Date.now(), code: PHP, scope: "php-functions", active: false, priority: 1 },
  });
  if (create.status !== 200 && create.status !== 201) {
    console.error("Create failed:", create.status, create.body?.slice(0, 400)); process.exit(1);
  }
  const id = create.json?.id;
  await req(`/wp-json/code-snippets/v1/snippets/${id}`, { method: "POST", body: { active: true } });
  await req("/");
  await new Promise(r => setTimeout(r, 4000));

  const read = await req("/wp-json/code-snippets/v1/snippets/run", {
    method: "POST",
    body: { code: `return get_option('${OPT_KEY}', '{}');` },
  });

  await req(`/wp-json/code-snippets/v1/snippets/${id}`, { method: "POST", body: { active: false } });
  await req(`/wp-json/code-snippets/v1/snippets/${id}`, { method: "DELETE" });

  let result = {};
  if (read.json?.result) {
    try { result = JSON.parse(read.json.result); } catch (e) { console.error("Parse error:", e.message, "raw:", read.json.result?.slice(0, 500)); }
  }

  console.log("\n=== Page 5096 (the target URL) ===");
  console.log(JSON.stringify(result.page_5096, null, 2));

  console.log(`\n=== Elementor matches: ${result.elementor?.length || 0} ===`);
  for (const m of (result.elementor || [])) {
    console.log(`\n[${m.pattern_matched}] ${m.post_type} #${m.post_id} "${m.post_title}"`);
    console.log(`  Widget: ${m.widget_type} (id=${m.element_id})`);
    // Extract URL from settings
    const urlMatch = m.settings.match(/"url":"([^"]+)"|"link":\{"url":"([^"]+)"/);
    if (urlMatch) console.log(`  Current URL: ${urlMatch[1] || urlMatch[2]}`);
    console.log(`  Settings: ${m.settings.slice(0, 500)}`);
  }

  console.log(`\n=== Nav menu matches: ${result.nav_menu_items?.length || 0} ===`);
  for (const m of (result.nav_menu_items || [])) {
    console.log(`  Menu item #${m.id}: title="${m.title}" url=${m.url} object_id=${m.object_id} type=${m.item_type}`);
  }

  console.log(`\n=== Widget matches: ${result.widgets?.length || 0} ===`);
  for (const w of (result.widgets || [])) {
    console.log(`  ${w.widget_type} #${w.instance_id}: ${w.content.slice(0, 500)}`);
  }

  if (!fs.existsSync("diagnostics")) fs.mkdirSync("diagnostics", { recursive: true });
  fs.writeFileSync("diagnostics/footer-terms-link.json", JSON.stringify(result, null, 2));
})();
