#!/usr/bin/env node
// Use /run endpoint directly - simpler and more reliable

const https = require("https");
const fs = require("fs");

const SITE = "https://ishadama.co.il";
const AUTH = "Basic " + Buffer.from(`${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD.replace(/\s+/g, "")}`).toString("base64");

function req(pathname, { method = "GET", body } = {}) {
  return new Promise((resolve) => {
    const u = new URL(pathname, SITE);
    const opts = { method, headers: { Authorization: AUTH, Accept: "application/json", ...(body ? { "Content-Type": "application/json; charset=utf-8" } : {}) } };
    const r = https.request(u, opts, (res) => {
      let data = ""; res.on("data", c => data += c);
      res.on("end", () => { let j = null; try { j = JSON.parse(data); } catch {}; resolve({ status: res.statusCode, body: data, json: j }); });
    });
    r.on("error", e => resolve({ status: 0, error: e.message }));
    if (body) r.write(Buffer.from(JSON.stringify(body), "utf-8"));
    r.end();
  });
}

async function runPhp(code) {
  const r = await req("/wp-json/code-snippets/v1/snippets/run", { method: "POST", body: { code } });
  return r;
}

(async () => {
  // 1. Check page 5096
  console.log("=== Page 5096 ===");
  const r1 = await runPhp(`
$p = get_post(5096);
if (!$p) return json_encode(['exists' => false]);
return json_encode([
  'id' => 5096,
  'title' => $p->post_title,
  'status' => $p->post_status,
  'type' => $p->post_type,
  'slug' => $p->post_name,
  'permalink' => get_permalink(5096),
], JSON_UNESCAPED_UNICODE);
`);
  console.log("status:", r1.status, "result:", r1.json?.result || r1.body?.slice(0, 300));

  // 2. List all Elementor templates (footers especially)
  console.log("\n=== Elementor footer templates ===");
  const r2 = await runPhp(`
global $wpdb;
$rows = $wpdb->get_results(
  "SELECT p.ID, p.post_title, p.post_status,
     (SELECT meta_value FROM {$wpdb->postmeta} WHERE post_id = p.ID AND meta_key = '_elementor_template_type' LIMIT 1) as tt
   FROM {$wpdb->posts} p
   WHERE p.post_type = 'elementor_library'
   ORDER BY p.ID",
  ARRAY_A
);
return json_encode($rows, JSON_UNESCAPED_UNICODE);
`);
  let templates = [];
  try { templates = JSON.parse(r2.json?.result || '[]'); } catch {}
  console.log(`Found ${templates.length} elementor templates:`);
  for (const t of templates) console.log(`  #${t.ID} [${t.tt || '?'}] ${t.post_status}: ${t.post_title}`);

  // 3. For each FOOTER template, dump all <a href> patterns from _elementor_data
  console.log("\n=== Links in footer templates ===");
  const footers = templates.filter(t => t.tt === 'footer' || /footer|פוטר|פוטוטר/i.test(t.post_title));
  for (const f of footers) {
    const r3 = await runPhp(`
$ed = get_post_meta(${f.ID}, '_elementor_data', true);
if (!$ed) return '[]';
$data = json_decode($ed, true);
if (!is_array($data)) return '[]';
$links = [];
$stack = $data;
while (!empty($stack)) {
  $el = array_shift($stack);
  if (!is_array($el)) continue;
  if (isset($el['settings'])) {
    $s = $el['settings'];
    // Buttons with links
    if (isset($s['link']) && is_array($s['link']) && !empty($s['link']['url'])) {
      $links[] = ['type' => 'button_link', 'element_id' => $el['id'] ?? '', 'widget' => $el['widgetType'] ?? '', 'url' => $s['link']['url'], 'text' => $s['text'] ?? $s['title'] ?? ''];
    }
    // Heading widget link
    if (isset($s['header_link']) && is_array($s['header_link']) && !empty($s['header_link']['url'])) {
      $links[] = ['type' => 'heading_link', 'element_id' => $el['id'] ?? '', 'widget' => $el['widgetType'] ?? '', 'url' => $s['header_link']['url'], 'title' => $s['title'] ?? ''];
    }
    // Text editor / heading - search for <a href in any string value
    foreach ($s as $key => $val) {
      if (is_string($val) && stripos($val, '<a ') !== false) {
        if (preg_match_all('/<a[^>]+href=\\"([^\\"]+)\\"[^>]*>([^<]+)<\\/a>/i', $val, $matches, PREG_SET_ORDER)) {
          foreach ($matches as $m) {
            $links[] = ['type' => 'inline_link', 'element_id' => $el['id'] ?? '', 'widget' => $el['widgetType'] ?? '', 'in_field' => $key, 'url' => $m[1], 'text' => $m[2]];
          }
        }
      }
    }
    // Icon list items
    if (isset($s['icon_list']) && is_array($s['icon_list'])) {
      foreach ($s['icon_list'] as $item) {
        if (!empty($item['link']['url'])) {
          $links[] = ['type' => 'icon_list_item', 'element_id' => $el['id'] ?? '', 'url' => $item['link']['url'], 'text' => $item['text'] ?? ''];
        }
      }
    }
  }
  foreach (($el['elements'] ?? []) as $c) $stack[] = $c;
}
return json_encode($links, JSON_UNESCAPED_UNICODE);
`);
    let links = [];
    try { links = JSON.parse(r3.json?.result || '[]'); } catch {}
    console.log(`\n--- Footer #${f.ID} "${f.post_title}": ${links.length} links ---`);
    for (const l of links) {
      console.log(`  [${l.type}] text="${l.text || l.title || ''}" url=${l.url}`);
    }
  }

  // 4. Save full results to markdown so we can read them after commit
  if (!fs.existsSync("diagnostics")) fs.mkdirSync("diagnostics", { recursive: true });

  let md = `# Find Terms Link\n\n**Run:** ${new Date().toISOString()}\n\n`;
  md += `## Page 5096\n\n\`\`\`json\n${r1.json?.result || r1.body?.slice(0, 500)}\n\`\`\`\n\n`;
  md += `## All Elementor templates (${templates.length})\n\n`;
  for (const t of templates) md += `- #${t.ID} [${t.tt || '?'}] ${t.post_status}: ${t.post_title}\n`;
  md += `\n## Footer templates with all their links\n\n`;
  for (const f of footers) {
    const r3 = await runPhp(`
$ed = get_post_meta(${f.ID}, '_elementor_data', true);
if (!$ed) return '[]';
$data = json_decode($ed, true);
if (!is_array($data)) return '[]';
$links = [];
$stack = $data;
while (!empty($stack)) {
  $el = array_shift($stack);
  if (!is_array($el)) continue;
  if (isset($el['settings'])) {
    $s = $el['settings'];
    if (isset($s['link']) && is_array($s['link']) && !empty($s['link']['url'])) {
      $links[] = ['type' => 'button_link', 'element_id' => $el['id'] ?? '', 'widget' => $el['widgetType'] ?? '', 'url' => $s['link']['url'], 'text' => $s['text'] ?? $s['title'] ?? ''];
    }
    if (isset($s['header_link']) && is_array($s['header_link']) && !empty($s['header_link']['url'])) {
      $links[] = ['type' => 'heading_link', 'element_id' => $el['id'] ?? '', 'widget' => $el['widgetType'] ?? '', 'url' => $s['header_link']['url'], 'title' => $s['title'] ?? ''];
    }
    foreach ($s as $key => $val) {
      if (is_string($val) && stripos($val, '<a ') !== false) {
        if (preg_match_all('/<a[^>]+href=\\"([^\\"]+)\\"[^>]*>([^<]+)<\\/a>/i', $val, $matches, PREG_SET_ORDER)) {
          foreach ($matches as $m) {
            $links[] = ['type' => 'inline_link', 'element_id' => $el['id'] ?? '', 'widget' => $el['widgetType'] ?? '', 'in_field' => $key, 'url' => $m[1], 'text' => $m[2]];
          }
        }
      }
    }
    if (isset($s['icon_list']) && is_array($s['icon_list'])) {
      foreach ($s['icon_list'] as $item) {
        if (!empty($item['link']['url'])) {
          $links[] = ['type' => 'icon_list_item', 'element_id' => $el['id'] ?? '', 'url' => $item['link']['url'], 'text' => $item['text'] ?? ''];
        }
      }
    }
  }
  foreach (($el['elements'] ?? []) as $c) $stack[] = $c;
}
return json_encode($links, JSON_UNESCAPED_UNICODE);
`);
    let links = [];
    try { links = JSON.parse(r3.json?.result || '[]'); } catch {}
    md += `\n### Footer #${f.ID} "${f.post_title}" — ${links.length} links\n\n`;
    for (const l of links) {
      md += `- [${l.type}] element=\`${l.element_id}\` widget=\`${l.widget || ''}\` text="**${l.text || l.title || ''}**" url=\`${l.url}\`\n`;
    }
  }

  fs.writeFileSync("diagnostics/footer-terms-link.md", md);
  console.log("\nWritten to diagnostics/footer-terms-link.md");
})();
