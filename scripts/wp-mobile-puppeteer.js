#!/usr/bin/env node
// Renders ishadama.co.il in a real Chromium mobile viewport,
// screenshots it, and measures element bounding boxes to identify the
// element causing horizontal overflow.

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const URL = 'https://ishadama.co.il';
const VIEWPORT = { width: 393, height: 851, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true };
const UA = 'Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

async function main() {
  const outDir = 'diagnostics';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log('Launching Chromium...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=he-IL'],
  });

  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
  await page.setUserAgent(UA);
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'he-IL,he;q=0.9' });

  console.log('Loading homepage...');
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });

  // Wait for any async layout
  await new Promise(r => setTimeout(r, 3000));

  // Screenshot full page
  console.log('Taking screenshots...');
  await page.screenshot({ path: path.join(outDir, 'mobile-screenshot-fold.png'), fullPage: false });
  await page.screenshot({ path: path.join(outDir, 'mobile-screenshot-full.png'), fullPage: true });

  // Measure viewport, html, body and find the widest descendants
  console.log('Measuring elements...');
  const measurements = await page.evaluate(() => {
    const vw = window.innerWidth;
    const dw = document.documentElement.scrollWidth;
    const bw = document.body.scrollWidth;

    // Walk the DOM and find elements wider than viewport
    const offenders = [];
    const all = document.querySelectorAll('*');
    for (const el of all) {
      const rect = el.getBoundingClientRect();
      const cs = window.getComputedStyle(el);
      // An element is an "offender" if it extends beyond viewport
      if (rect.right > vw + 1 || rect.left < -1 || rect.width > vw + 1) {
        offenders.push({
          tag: el.tagName,
          id: el.id || null,
          classes: el.className?.toString?.().slice(0, 200) || null,
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          position: cs.position,
          transform: cs.transform === 'none' ? null : cs.transform,
          overflow: cs.overflow,
          overflowX: cs.overflowX,
          marginLeft: cs.marginLeft,
          marginRight: cs.marginRight,
          inline_style: el.getAttribute('style')?.slice(0, 200) || null,
        });
      }
    }

    // Also measure key containers
    function measure(sel) {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) };
    }

    return {
      viewport_width: vw,
      document_scroll_width: dw,
      body_scroll_width: bw,
      html_dir: document.documentElement.dir,
      html_classes: document.documentElement.className,
      body_classes: document.body.className,
      key_elements: {
        html: measure('html'),
        body: measure('body'),
        header: measure('header'),
        main: measure('main'),
        site_wrapper: measure('#page'),
        elementor_header: measure('[data-elementor-type="header"]'),
        first_section: measure('main > section, main > div > section, .elementor-section:first-of-type'),
      },
      offender_count: offenders.length,
      offenders: offenders.slice(0, 50),
    };
  });

  await browser.close();

  // Write report
  let md = `# Mobile Overflow — Puppeteer Diagnostic\n\n**Run:** ${new Date().toISOString()}\n**Viewport:** ${VIEWPORT.width}x${VIEWPORT.height}\n\n`;
  md += `## Page-level measurements\n\n`;
  md += `- Viewport width: **${measurements.viewport_width}px**\n`;
  md += `- documentElement scrollWidth: **${measurements.document_scroll_width}px**\n`;
  md += `- body scrollWidth: **${measurements.body_scroll_width}px**\n`;
  md += `- html dir: \`${measurements.html_dir}\`\n`;
  md += `- html classes: \`${measurements.html_classes}\`\n\n`;

  md += `## Key element widths\n\n\`\`\`json\n${JSON.stringify(measurements.key_elements, null, 2)}\n\`\`\`\n\n`;

  md += `## Overflow offenders (${measurements.offender_count} total, showing 50)\n\n`;
  md += `Elements extending beyond viewport bounds (vw=${measurements.viewport_width}):\n\n`;
  for (const o of measurements.offenders) {
    md += `### ${o.tag}${o.id ? '#' + o.id : ''} — left:${o.left} right:${o.right} width:${o.width}\n`;
    md += `- classes: \`${o.classes || '(none)'}\`\n`;
    md += `- position: ${o.position}, transform: ${o.transform}, overflow-x: ${o.overflowX}\n`;
    md += `- margin: L=${o.marginLeft} R=${o.marginRight}\n`;
    if (o.inline_style) md += `- inline: \`${o.inline_style}\`\n`;
    md += `\n`;
  }

  fs.writeFileSync(path.join(outDir, 'mobile-puppeteer.md'), md);
  fs.writeFileSync(path.join(outDir, 'mobile-puppeteer-raw.json'), JSON.stringify(measurements, null, 2));

  console.log(`\nDone. ${measurements.offender_count} overflow offenders found.`);
  console.log(`Viewport: ${measurements.viewport_width}, body scroll width: ${measurements.body_scroll_width}, html scroll width: ${measurements.document_scroll_width}`);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
