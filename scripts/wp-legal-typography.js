#!/usr/bin/env node
// Measure typography on the 3 legal pages so we can pick canonical values

const puppeteer = require('puppeteer');
const fs = require('fs');

const PAGES = [
  { name: 'privacy', url: 'https://ishadama.co.il/privacy/' },
  { name: 'conditions', url: 'https://ishadama.co.il/conditions/' },
  { name: 'accessibility', url: 'https://ishadama.co.il/accessibility-statement/' },
];

async function measurePage(browser, p) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });
  try {
    await page.goto(p.url, { waitUntil: 'networkidle2', timeout: 60000 });
  } catch (e) {
    await page.close();
    return { name: p.name, url: p.url, error: e.message };
  }
  await new Promise(r => setTimeout(r, 1500));

  const data = await page.evaluate(() => {
    const measure = (sel, label) => {
      const el = document.querySelector(sel);
      if (!el) return { label, sel, found: false };
      const cs = window.getComputedStyle(el);
      return {
        label, sel, found: true,
        text: (el.textContent || '').trim().slice(0, 60),
        fontFamily: cs.fontFamily,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        color: cs.color,
        textAlign: cs.textAlign,
        marginTop: cs.marginTop,
        marginBottom: cs.marginBottom,
      };
    };

    const allH1 = Array.from(document.querySelectorAll('h1')).map(h => measure_inline(h, 'h1'));
    const allH2 = Array.from(document.querySelectorAll('h2')).map(h => measure_inline(h, 'h2'));
    const firstP = document.querySelector('main p, .elementor-widget-text-editor p, p');

    function measure_inline(el, label) {
      const cs = window.getComputedStyle(el);
      return {
        label,
        text: (el.textContent || '').trim().slice(0, 60),
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        color: cs.color,
        textAlign: cs.textAlign,
        fontFamily: cs.fontFamily,
      };
    }

    return {
      bodyClass: document.body.className,
      h1_count: document.querySelectorAll('h1').length,
      h2_count: document.querySelectorAll('h2').length,
      p_count: document.querySelectorAll('p').length,
      h1: allH1,
      h2: allH2.slice(0, 5),
      first_p: firstP ? measure_inline(firstP, 'p') : null,
      body_font_size: window.getComputedStyle(document.body).fontSize,
      body_font_family: window.getComputedStyle(document.body).fontFamily,
    };
  });

  await page.close();
  return { name: p.name, url: p.url, ...data };
}

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const results = [];
  for (const p of PAGES) {
    console.log(`Measuring ${p.name}...`);
    const r = await measurePage(browser, p);
    results.push(r);
  }
  await browser.close();

  let md = `# Legal Pages Typography\n\n**Run:** ${new Date().toISOString()}\n\n`;
  for (const r of results) {
    md += `## ${r.name} — ${r.url}\n\n`;
    if (r.error) { md += `ERROR: ${r.error}\n\n`; continue; }
    md += `- body class: \`${r.bodyClass?.slice(0, 200)}\`\n`;
    md += `- body font-size: **${r.body_font_size}**, family: \`${r.body_font_family}\`\n`;
    md += `- counts: h1=${r.h1_count}, h2=${r.h2_count}, p=${r.p_count}\n\n`;
    md += `### H1 elements (${r.h1?.length || 0})\n\n`;
    for (const h of (r.h1 || [])) {
      md += `- "**${h.text}**" — size: **${h.fontSize}**, weight: ${h.fontWeight}, line-height: ${h.lineHeight}, align: ${h.textAlign}\n`;
    }
    md += `\n### H2 elements (first 5)\n\n`;
    for (const h of (r.h2 || [])) {
      md += `- "${h.text}" — size: **${h.fontSize}**, weight: ${h.fontWeight}, align: ${h.textAlign}\n`;
    }
    md += `\n### First paragraph\n\n`;
    if (r.first_p) {
      md += `- size: **${r.first_p.fontSize}**, weight: ${r.first_p.fontWeight}, line-height: ${r.first_p.lineHeight}, align: ${r.first_p.textAlign}\n`;
    }
    md += `\n---\n\n`;
  }

  if (!fs.existsSync('diagnostics')) fs.mkdirSync('diagnostics', { recursive: true });
  fs.writeFileSync('diagnostics/legal-pages-typography.md', md);
  fs.writeFileSync('diagnostics/legal-pages-typography-raw.json', JSON.stringify(results, null, 2));
  console.log(md);
})();
// re-run Thu Jun  4 13:30:28 UTC 2026
