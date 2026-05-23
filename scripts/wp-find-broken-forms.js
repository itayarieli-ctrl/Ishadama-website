#!/usr/bin/env node
// Finds Elementor forms not sending leads to Scalla CRM
// Uses only standard WP REST API (no Code Snippets needed)

const WP_BASE = 'https://ishadama.co.il/wp-json';
const AUTH = Buffer.from(`${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD}`).toString('base64');

async function wpFetch(path) {
  const res = await fetch(`${WP_BASE}${path}`, {
    headers: { Authorization: `Basic ${AUTH}` },
  });
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, data: JSON.parse(text) }; }
  catch { return { ok: res.ok, status: res.status, data: text }; }
}

async function getAllPages() {
  const pages = [];
  for (let p = 1; p <= 20; p++) {
    const r = await wpFetch(`/wp/v2/pages?per_page=100&page=${p}&status=publish&_fields=id,title,meta`);
    if (!r.ok || !Array.isArray(r.data) || r.data.length === 0) break;
    pages.push(...r.data);
    if (r.data.length < 100) break;
  }
  // Also get posts and elementor_library
  for (const type of ['posts', 'elementor_library']) {
    for (let p = 1; p <= 5; p++) {
      const r = await wpFetch(`/wp/v2/${type}?per_page=100&page=${p}&status=publish&_fields=id,title,meta`);
      if (!r.ok || !Array.isArray(r.data) || r.data.length === 0) break;
      pages.push(...r.data);
      if (r.data.length < 100) break;
    }
  }
  return pages;
}

function findFormsInData(elementorData, pageId, pageTitle) {
  const forms = [];
  try {
    const elements = typeof elementorData === 'string' ? JSON.parse(elementorData) : elementorData;
    if (!Array.isArray(elements)) return forms;
    const stack = [...elements];
    while (stack.length) {
      const el = stack.shift();
      if (!el || typeof el !== 'object') continue;
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
      if (Array.isArray(el.elements)) stack.push(...el.elements);
    }
  } catch {}
  return forms;
}

async function main() {
  const fs = (await import('fs')).default;
  const results = { timestamp: new Date().toISOString(), forms: [], broken: [], working: [], errors: [] };

  // 1. Get all published pages with elementor meta
  console.log('Fetching pages...');
  const pages = await getAllPages();
  console.log(`Got ${pages.length} pages/posts total`);

  // 2. For each page, fetch elementor data via meta
  const forms = [];
  for (const page of pages) {
    const pageId = page.id;
    const pageTitle = page.title?.rendered || page.title?.raw || String(pageId);

    // Try to get elementor data from meta
    let elementorData = page.meta?._elementor_data || null;

    // If not in meta, fetch the full post with meta
    if (!elementorData) {
      const type = page._links?.['wp:post_type']?.[0]?.href?.includes('elementor') ? 'elementor_library' : 'pages';
      const r = await wpFetch(`/wp/v2/pages/${pageId}?context=edit&_fields=id,title,meta`);
      if (r.ok && r.data?.meta?._elementor_data) {
        elementorData = r.data.meta._elementor_data;
      }
    }

    if (!elementorData) continue;

    const pageForms = findFormsInData(elementorData, pageId, pageTitle);
    if (pageForms.length > 0) {
      console.log(`  Page "${pageTitle}" (${pageId}): ${pageForms.length} form(s)`);
      forms.push(...pageForms);
    }
  }

  // Also check all pages by fetching each individually if we found 0 forms
  if (forms.length === 0) {
    console.log('No forms found via meta, trying per-page fetch...');
    for (const page of pages.slice(0, 50)) {
      const r = await wpFetch(`/wp/v2/pages/${page.id}?context=edit`);
      if (!r.ok) continue;
      const ed = r.data?.meta?._elementor_data || r.data?.content?.raw || '';
      const pageForms = findFormsInData(ed, page.id, page.title?.rendered || String(page.id));
      forms.push(...pageForms);
    }
  }

  console.log(`\nTotal Elementor forms found: ${forms.length}`);
  results.forms = forms;

  // 3. Analyze Scalla action
  for (const f of forms) {
    const hasScalla = (f.submit_actions || []).some(a =>
      String(a).toLowerCase().includes('scalla')
    );
    f.has_scalla_action = hasScalla;
    if (hasScalla) results.working.push(f);
    else results.broken.push(f);
  }

  // 4. Write report
  let md = `# Broken Forms Diagnostic\n\n**Run:** ${results.timestamp}\n\n`;
  md += `## Summary\n\n`;
  md += `- Pages scanned: ${pages.length}\n`;
  md += `- Elementor forms found: ${forms.length}\n`;
  md += `- Forms WITH Scalla action: ${results.working.length}\n`;
  md += `- Forms MISSING Scalla action: ${results.broken.length}\n\n`;

  if (results.broken.length > 0) {
    md += `## ⚠️ Forms Missing Scalla Action\n\n`;
    for (const f of results.broken) {
      md += `### "${f.form_name}" — Page: "${f.page_title}" (ID: ${f.page_id})\n`;
      md += `- Element ID: \`${f.form_id}\`\n`;
      md += `- Current actions: \`${JSON.stringify(f.submit_actions)}\`\n`;
      md += `- Fields: ${f.fields.join(', ')}\n\n`;
    }
  } else if (forms.length > 0) {
    md += `## ✅ All forms have Scalla action configured\n\n`;
  } else {
    md += `## ⚠️ No Elementor forms found — check if _elementor_data meta is accessible\n\n`;
  }

  if (results.working.length > 0) {
    md += `## Working Forms (have Scalla action)\n\n`;
    for (const f of results.working) {
      md += `- **"${f.form_name}"** — "${f.page_title}" (page ${f.page_id})\n`;
      md += `  Actions: ${JSON.stringify(f.submit_actions)}\n`;
    }
    md += '\n';
  }

  if (!fs.existsSync('diagnostics')) fs.mkdirSync('diagnostics', { recursive: true });
  fs.writeFileSync('diagnostics/broken-forms.md', md);
  fs.writeFileSync('diagnostics/broken-forms-raw.json', JSON.stringify(results, null, 2));

  console.log('\n' + md);
}

main().catch(e => { console.error(e); process.exit(1); });
