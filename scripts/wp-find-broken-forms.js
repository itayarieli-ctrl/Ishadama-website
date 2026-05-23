#!/usr/bin/env node
// Finds Elementor forms not sending leads to Scalla CRM

const WP_BASE = 'https://ishadama.co.il/wp-json';
const AUTH = Buffer.from(`${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD}`).toString('base64');

async function wpFetch(path, opts = {}) {
  const res = await fetch(`${WP_BASE}${path}`, {
    headers: { Authorization: `Basic ${AUTH}`, 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  });
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, data: JSON.parse(text) }; }
  catch { return { ok: res.ok, status: res.status, data: text }; }
}

async function runSnippet(code) {
  const res = await wpFetch('/code-snippets/v1/snippets/run', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error(`Snippet failed ${res.status}: ${JSON.stringify(res.data).slice(0, 200)}`);
  const result = res.data?.result ?? res.data;
  if (typeof result === 'string') return JSON.parse(result);
  return result;
}

// Recursive walk of Elementor elements looking for form widgets
function findForms(elements, pageId, pageTitle) {
  const forms = [];
  const stack = [...(elements || [])];
  while (stack.length) {
    const el = stack.shift();
    if (!el) continue;
    if (el.elType === 'widget' && el.widgetType === 'form') {
      const s = el.settings || {};
      forms.push({
        page_id: pageId,
        page_title: pageTitle,
        form_name: s.form_name || '(unnamed)',
        form_id: el.id || '',
        submit_actions: s.submit_actions || [],
        fields: (s.form_fields || []).map(f => `${f.field_label || ''}:${f.field_type || ''}`),
      });
    }
    if (el.elements?.length) stack.push(...el.elements);
  }
  return forms;
}

async function main() {
  const fs = (await import('fs')).default;

  // 1. Get all published pages
  console.log('Fetching published pages...');
  let allPages = [];
  for (let page = 1; page <= 10; page++) {
    const r = await wpFetch(`/wp/v2/pages?per_page=100&page=${page}&_fields=id,title,meta`);
    if (!r.ok || !Array.isArray(r.data) || r.data.length === 0) break;
    allPages.push(...r.data);
    if (r.data.length < 100) break;
  }
  console.log(`Found ${allPages.length} pages`);

  // 2. Find all Elementor forms via PHP
  console.log('Scanning for Elementor forms...');
  const formsData = await runSnippet(`
global $wpdb;
$rows = $wpdb->get_results("
  SELECT p.ID, p.post_title, pm.meta_value as ed
  FROM {$wpdb->posts} p
  JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id
  WHERE pm.meta_key = '_elementor_data'
    AND p.post_status = 'publish'
    AND p.post_type IN ('page','post','elementor_library')
  ORDER BY p.ID
", ARRAY_A);
$out = [];
foreach ($rows as $r) {
  $data = json_decode($r['ed'], true);
  if (!$data) continue;
  $stack = $data;
  while (!empty($stack)) {
    $el = array_shift($stack);
    if (!isset($el['elType'])) continue;
    if ($el['elType'] === 'widget' && ($el['widgetType'] ?? '') === 'form') {
      $s = $el['settings'] ?? [];
      $out[] = [
        'page_id'        => (int)$r['ID'],
        'page_title'     => $r['post_title'],
        'form_name'      => $s['form_name'] ?? '(unnamed)',
        'form_id'        => $el['id'] ?? '',
        'submit_actions' => $s['submit_actions'] ?? [],
        'fields'         => array_map(fn($f) => ($f['field_label'] ?? '') . ':' . ($f['field_type'] ?? ''), $s['form_fields'] ?? []),
      ];
    }
    foreach (($el['elements'] ?? []) as $child) $stack[] = $child;
  }
}
return json_encode($out);
`);

  const forms = Array.isArray(formsData) ? formsData : [];
  console.log(`Found ${forms.length} Elementor forms`);

  // 3. Get recent submission stats per form
  console.log('Checking recent submissions...');
  const subData = await runSnippet(`
global $wpdb;
$t = $wpdb->prefix . 'e_submissions';
if (!$wpdb->get_var("SHOW TABLES LIKE '{$t}'")) return json_encode([]);
$rows = $wpdb->get_results("
  SELECT element_id, COUNT(*) as cnt
  FROM {$t}
  WHERE created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
  GROUP BY element_id
", ARRAY_A);
$out = [];
foreach ($rows as $r) $out[$r['element_id']] = (int)$r['cnt'];
return json_encode($out);
`);
  const submissionCounts = (typeof subData === 'object' && !Array.isArray(subData)) ? subData : {};

  // 4. Get Scalla options
  console.log('Reading Scalla config...');
  const scallaOpts = await runSnippet(`
global $wpdb;
$rows = $wpdb->get_results(
  "SELECT option_name, option_value FROM {$wpdb->options} WHERE option_name LIKE 'scalla%' ORDER BY option_name",
  ARRAY_A
);
$out = [];
foreach ($rows as $r) $out[$r['option_name']] = $r['option_value'];
return json_encode($out);
`);

  // 5. Analyze
  const broken = [], working = [];
  for (const f of forms) {
    const hasScalla = (f.submit_actions || []).some(a =>
      typeof a === 'string'
        ? a.toLowerCase().includes('scalla')
        : JSON.stringify(a).toLowerCase().includes('scalla')
    );
    const recentSubs = submissionCounts[f.form_id] || 0;
    const entry = { ...f, recent_submissions: recentSubs, has_scalla_action: hasScalla };
    if (hasScalla) working.push(entry);
    else broken.push(entry);
  }

  // 6. Report
  let md = `# Broken Forms Diagnostic\n\n**Run:** ${new Date().toISOString()}\n\n`;
  md += `## Summary\n- Total forms: ${forms.length}\n- Working (has Scalla action): ${working.length}\n- Missing Scalla action: ${broken.length}\n\n`;

  if (broken.length) {
    md += `## Forms Missing Scalla Action\n\n`;
    for (const f of broken) {
      md += `### "${f.form_name}" — Page: "${f.page_title}" (ID: ${f.page_id})\n`;
      md += `- Element ID: \`${f.form_id}\`\n`;
      md += `- Current actions: ${JSON.stringify(f.submit_actions)}\n`;
      md += `- Recent submissions (90d): ${f.recent_submissions}\n\n`;
    }
  } else {
    md += `## All forms have Scalla action configured!\n\n`;
  }

  if (working.length) {
    md += `## Working Forms\n\n`;
    for (const f of working) {
      md += `- **"${f.form_name}"** on "${f.page_title}" (page ${f.page_id}) — ${f.recent_submissions} recent submissions\n`;
    }
    md += '\n';
  }

  md += `## Scalla WP Options\n\n\`\`\`json\n${JSON.stringify(scallaOpts, null, 2)}\n\`\`\`\n`;

  if (!fs.existsSync('diagnostics')) fs.mkdirSync('diagnostics', { recursive: true });
  fs.writeFileSync('diagnostics/broken-forms.md', md);
  fs.writeFileSync('diagnostics/broken-forms-raw.json', JSON.stringify({ forms, broken, working, submissionCounts, scallaOpts }, null, 2));

  console.log('\n' + md);
  console.log('Written to diagnostics/broken-forms.md');
}

main().catch(e => { console.error(e); process.exit(1); });
