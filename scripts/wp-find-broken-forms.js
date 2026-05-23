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
  console.log(`Snippet response status: ${res.status}`);
  if (!res.ok) {
    console.error('Snippet error body:', JSON.stringify(res.data).slice(0, 500));
    throw new Error(`Snippet failed: ${res.status}`);
  }
  const result = res.data?.result ?? res.data;
  if (typeof result === 'string') {
    try { return JSON.parse(result); }
    catch { return result; }
  }
  return result;
}

async function main() {
  const fs = (await import('fs')).default;
  if (!fs.existsSync('diagnostics')) fs.mkdirSync('diagnostics', { recursive: true });

  // Step 1: verify Code Snippets endpoint works
  console.log('Testing Code Snippets API...');
  const ping = await runSnippet(`return json_encode(['ok' => true, 'time' => current_time('mysql')]);`);
  console.log('Ping result:', ping);

  // Step 2: get all Elementor forms with their actions
  console.log('\nFetching all Elementor forms...');
  const forms = await runSnippet(`
global $wpdb;
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
$out = [];
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
      $out[] = [
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
return json_encode($out);
`);

  const formList = Array.isArray(forms) ? forms : [];
  console.log(`\nForms found: ${formList.length}`);

  const broken = formList.filter(f => !f.has_scalla);
  const working = formList.filter(f => f.has_scalla);

  let md = `# Broken Forms Diagnostic\n\n**Run:** ${new Date().toISOString()}\n\n`;
  md += `## Summary\n- Total forms: ${formList.length}\n- With Scalla: ${working.length}\n- Missing Scalla: ${broken.length}\n\n`;

  if (broken.length) {
    md += `## ⚠️ Forms Missing Scalla Action\n\n`;
    for (const f of broken) {
      md += `### "${f.form_name}" — Page: "${f.page_title}" (ID: ${f.page_id})\n`;
      md += `- Element ID: \`${f.form_id}\`\n`;
      md += `- Current actions: \`${JSON.stringify(f.actions)}\`\n\n`;
    }
  } else if (formList.length > 0) {
    md += `## ✅ All forms have Scalla action\n\n`;
  } else {
    md += `## ⚠️ No forms found\n\n`;
  }

  md += `## Working Forms\n\n`;
  for (const f of working) {
    md += `- **"${f.form_name}"** — "${f.page_title}" (ID: ${f.page_id}) — actions: ${JSON.stringify(f.actions)}\n`;
  }

  fs.writeFileSync('diagnostics/broken-forms.md', md);
  fs.writeFileSync('diagnostics/broken-forms-raw.json', JSON.stringify({ formList, broken, working }, null, 2));
  console.log('\nDone. Written to diagnostics/broken-forms.md');
  console.log(md);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
