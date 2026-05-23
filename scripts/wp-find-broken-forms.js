#!/usr/bin/env node
// Finds Elementor forms not sending leads to Scalla CRM
// Compares all forms vs recent e_submissions with scalla data

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
  return res;
}

async function main() {
  const results = { timestamp: new Date().toISOString(), forms: [], broken: [], working: [] };

  // 1. Get all Elementor forms from all published pages/posts
  console.log('Fetching all pages with Elementor content...');
  const snippet1 = `
global $wpdb;
$rows = $wpdb->get_results("
  SELECT p.ID, p.post_title, pm.meta_value as elementor_data
  FROM {$wpdb->posts} p
  JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id
  WHERE pm.meta_key = '_elementor_data'
    AND p.post_status = 'publish'
    AND p.post_type IN ('page','post','elementor_library')
  ORDER BY p.ID
", ARRAY_A);

$forms = [];
foreach ($rows as $row) {
  $data = json_decode($row['elementor_data'], true);
  if (!$data) continue;

  // Recursive search for form widgets
  $stack = $data;
  while (!empty($stack)) {
    $el = array_shift($stack);
    if (!isset($el['elType'])) continue;

    if ($el['elType'] === 'widget' && isset($el['widgetType']) && $el['widgetType'] === 'form') {
      $settings = $el['settings'] ?? [];
      $form_name = $settings['form_name'] ?? '(unnamed)';
      $form_id = $el['id'] ?? '';

      // Get actions
      $submit_actions = $settings['submit_actions'] ?? [];

      // Check if scalla action exists
      $has_scalla = false;
      $has_scalla_action = in_array('scalla', $submit_actions) || in_array('ScallaAction', $submit_actions);

      // Also check custom_actions
      $custom_actions = $settings['custom_actions'] ?? [];

      // Fields
      $fields = [];
      foreach (($settings['form_fields'] ?? []) as $f) {
        $fields[] = ($f['field_label'] ?? '') . ':' . ($f['field_type'] ?? '');
      }

      $forms[] = [
        'page_id' => (int)$row['ID'],
        'page_title' => $row['post_title'],
        'form_name' => $form_name,
        'form_id' => $form_id,
        'submit_actions' => $submit_actions,
        'has_scalla_action' => $has_scalla_action,
        'fields' => $fields,
      ];
    }

    // Push children onto stack
    if (!empty($el['elements'])) {
      foreach ($el['elements'] as $child) {
        $stack[] = $child;
      }
    }
  }
}

return json_encode($forms);
`;

  const r1 = await runSnippet(snippet1);
  if (!r1.ok) {
    console.error('Failed to fetch forms:', r1.status, r1.data);
    process.exit(1);
  }

  let forms = [];
  try {
    const raw = typeof r1.data === 'string' ? r1.data : JSON.stringify(r1.data);
    const parsed = JSON.parse(typeof r1.data === 'object' && r1.data.result ? r1.data.result : raw);
    forms = Array.isArray(parsed) ? parsed : (r1.data.result ? JSON.parse(r1.data.result) : []);
  } catch (e) {
    // Try extracting result field
    if (r1.data && r1.data.result) {
      try { forms = JSON.parse(r1.data.result); } catch {}
    }
  }

  console.log(`Found ${forms.length} Elementor forms across all pages`);
  results.forms = forms;

  // 2. Get recent submissions per form (last 30 days)
  const snippet2 = `
global $wpdb;

// Check if e_submissions table exists
$table = $wpdb->prefix . 'e_submissions';
$exists = $wpdb->get_var("SHOW TABLES LIKE '{$table}'");
if (!$exists) return json_encode(['error' => 'table not found']);

// Get submissions from last 60 days grouped by form
$cutoff = date('Y-m-d', strtotime('-60 days'));
$rows = $wpdb->get_results("
  SELECT
    s.id,
    s.element_id as form_id,
    s.post_id as page_id,
    s.created_at,
    GROUP_CONCAT(sv.key, '=', IFNULL(sv.value,'') ORDER BY sv.key SEPARATOR '|||') as fields
  FROM {$table} s
  LEFT JOIN {$wpdb->prefix}e_submissions_values sv ON s.id = sv.submission_id
  WHERE s.created_at >= '{$cutoff}'
  GROUP BY s.id
  ORDER BY s.created_at DESC
", ARRAY_A);

// Group by form_id and check for scalla fields
$by_form = [];
foreach ($rows as $row) {
  $fid = $row['form_id'];
  if (!isset($by_form[$fid])) {
    $by_form[$fid] = ['page_id' => $row['page_id'], 'count' => 0, 'has_scalla_data' => false, 'sample_fields' => []];
  }
  $by_form[$fid]['count']++;

  // Check if any field key looks like a scalla campaign field
  $fields_str = $row['fields'] ?? '';
  if (stripos($fields_str, 'scalla') !== false || stripos($fields_str, 'campid') !== false || stripos($fields_str, 'campaign') !== false) {
    $by_form[$fid]['has_scalla_data'] = true;
  }

  // Store sample field keys from first submission
  if (empty($by_form[$fid]['sample_fields'])) {
    foreach (explode('|||', $fields_str) as $pair) {
      $parts = explode('=', $pair, 2);
      if (!empty($parts[0])) $by_form[$fid]['sample_fields'][] = $parts[0];
    }
  }
}

return json_encode($by_form);
`;

  const r2 = await runSnippet(snippet2);
  let submissionsByForm = {};
  if (r2.ok && r2.data && r2.data.result) {
    try { submissionsByForm = JSON.parse(r2.data.result); } catch {}
  }

  console.log(`\nSubmission data by form (last 60 days):`);
  for (const [fid, info] of Object.entries(submissionsByForm)) {
    console.log(`  Form ${fid}: ${info.count} submissions, has_scalla_data=${info.has_scalla_data}`);
  }

  // 3. Check Scalla plugin settings to see which form IDs / camp IDs are configured
  const snippet3 = `
global $wpdb;
$options = $wpdb->get_results("
  SELECT option_name, option_value
  FROM {$wpdb->options}
  WHERE option_name LIKE 'scalla%' OR option_name LIKE '%scalla%'
  ORDER BY option_name
", ARRAY_A);

$result = [];
foreach ($options as $row) {
  $result[$row['option_name']] = $row['option_value'];
}

// Also get the scalla plugin's form mappings if stored differently
$scalla_forms = get_option('scalla_forms', []);
$scalla_settings = get_option('scalla_settings', []);

return json_encode([
  'wp_options' => $result,
  'scalla_forms' => $scalla_forms,
  'scalla_settings' => $scalla_settings,
]);
`;

  const r3 = await runSnippet(snippet3);
  let scallaConfig = {};
  if (r3.ok && r3.data && r3.data.result) {
    try { scallaConfig = JSON.parse(r3.data.result); } catch {}
  }

  // 4. Analyze: which forms have NO recent submissions sending to Scalla?
  console.log('\n=== FORM ANALYSIS ===\n');

  for (const form of forms) {
    const subData = submissionsByForm[form.form_id] || null;
    const recentCount = subData ? subData.count : 0;
    const hasScallaData = subData ? subData.has_scalla_data : false;
    const hasScallaAction = form.has_scalla_action;

    const status = {
      ...form,
      recent_submissions: recentCount,
      scalla_in_submissions: hasScallaData,
      scalla_action_configured: hasScallaAction,
      status: hasScallaAction ? 'configured' : (recentCount > 0 ? 'missing_scalla_action' : 'no_recent_submissions'),
    };

    console.log(`Page: "${form.page_title}" (ID: ${form.page_id})`);
    console.log(`  Form: "${form.form_name}" (element_id: ${form.form_id})`);
    console.log(`  Actions: ${JSON.stringify(form.submit_actions)}`);
    console.log(`  Has Scalla action: ${hasScallaAction}`);
    console.log(`  Recent submissions (60d): ${recentCount}`);
    console.log(`  Scalla data in submissions: ${hasScallaData}`);
    console.log(`  Status: ${status.status}`);
    console.log('');

    if (status.status === 'missing_scalla_action' || status.status === 'no_recent_submissions') {
      results.broken.push(status);
    } else {
      results.working.push(status);
    }
  }

  results.scalla_config = scallaConfig;
  results.submissions_by_form = submissionsByForm;

  // Write results
  const fs = await import('fs');
  const path = await import('path');
  const dir = 'diagnostics';
  if (!fs.default.existsSync(dir)) fs.default.mkdirSync(dir, { recursive: true });

  fs.default.writeFileSync(path.default.join(dir, 'broken-forms-raw.json'), JSON.stringify(results, null, 2));

  // Write readable summary
  let md = `# Broken Forms Diagnostic\n\n**Run:** ${results.timestamp}\n\n`;
  md += `## Summary\n\n`;
  md += `- Total Elementor forms found: ${forms.length}\n`;
  md += `- Forms with Scalla action: ${results.working.length}\n`;
  md += `- Forms potentially broken: ${results.broken.length}\n\n`;

  if (results.broken.length > 0) {
    md += `## Broken / Missing Scalla Action\n\n`;
    for (const f of results.broken) {
      md += `### "${f.form_name}" on "${f.page_title}" (page ID: ${f.page_id})\n`;
      md += `- Element ID: \`${f.form_id}\`\n`;
      md += `- Current actions: \`${JSON.stringify(f.submit_actions)}\`\n`;
      md += `- Recent submissions (60d): ${f.recent_submissions}\n`;
      md += `- Status: **${f.status}**\n\n`;
    }
  }

  if (results.working.length > 0) {
    md += `## Working Forms (Scalla action configured)\n\n`;
    for (const f of results.working) {
      md += `- "${f.form_name}" on "${f.page_title}" (page ID: ${f.page_id}) — ${f.recent_submissions} recent submissions\n`;
    }
    md += '\n';
  }

  md += `## Scalla WP Options\n\n\`\`\`json\n${JSON.stringify(scallaConfig.wp_options || {}, null, 2)}\n\`\`\`\n`;

  fs.default.writeFileSync(path.default.join(dir, 'broken-forms.md'), md);
  console.log('\nResults written to diagnostics/broken-forms.md');
}

main().catch(e => { console.error(e); process.exit(1); });
