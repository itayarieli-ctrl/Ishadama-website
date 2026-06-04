#!/usr/bin/env node
// Targeted diagnostic: find which element is forcing layout viewport to 1040px

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const URL = 'https://ishadama.co.il';
const VIEWPORT = { width: 393, height: 851, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true };
const UA = 'Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

async function main() {
  const outDir = 'diagnostics';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
  await page.setUserAgent(UA);

  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 4000));

  const data = await page.evaluate(() => {
    const vw = window.innerWidth;

    // 1. Viewport meta as it stands AFTER JS
    const vp = document.querySelector('meta[name=viewport]');
    const vpContent = vp ? vp.getAttribute('content') : null;

    // 2. Computed styles of html and body
    const htmlStyle = window.getComputedStyle(document.documentElement);
    const bodyStyle = window.getComputedStyle(document.body);

    const htmlInfo = {
      width: htmlStyle.width,
      maxWidth: htmlStyle.maxWidth,
      minWidth: htmlStyle.minWidth,
      overflow: htmlStyle.overflow,
      overflowX: htmlStyle.overflowX,
      position: htmlStyle.position,
      direction: htmlStyle.direction,
      offsetWidth: document.documentElement.offsetWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      rect: document.documentElement.getBoundingClientRect(),
    };

    const bodyInfo = {
      width: bodyStyle.width,
      maxWidth: bodyStyle.maxWidth,
      minWidth: bodyStyle.minWidth,
      overflow: bodyStyle.overflow,
      overflowX: bodyStyle.overflowX,
      direction: bodyStyle.direction,
      offsetWidth: document.body.offsetWidth,
      clientWidth: document.body.clientWidth,
      scrollWidth: document.body.scrollWidth,
      rect: document.body.getBoundingClientRect(),
    };

    // 3. Walk through ALL elements and find ones with positive-side overflow
    // (right edge > viewport, or rendered at x > viewport)
    const wideOnRight = [];
    const all = document.querySelectorAll('*');
    for (const el of all) {
      const r = el.getBoundingClientRect();
      // Elements that extend BEYOND the right edge (positive overflow)
      if (r.right > vw + 1 && r.width > 50) {
        const cs = window.getComputedStyle(el);
        wideOnRight.push({
          tag: el.tagName,
          id: el.id || null,
          classes: (el.className?.toString?.() || '').slice(0, 200),
          right: Math.round(r.right),
          left: Math.round(r.left),
          width: Math.round(r.width),
          cssWidth: cs.width,
          cssMaxWidth: cs.maxWidth,
          position: cs.position,
          transform: cs.transform === 'none' ? null : cs.transform,
        });
      }
    }
    // Sort by widest
    wideOnRight.sort((a, b) => b.right - a.right);

    // 4. List all elements with explicit pixel width >= 500
    const explicitWide = [];
    for (const el of all) {
      const cs = window.getComputedStyle(el);
      const w = cs.width;
      const m = w.match(/^(\d+(\.\d+)?)px$/);
      if (m && parseFloat(m[1]) >= 500) {
        explicitWide.push({
          tag: el.tagName,
          id: el.id || null,
          classes: (el.className?.toString?.() || '').slice(0, 150),
          width: w,
          position: cs.position,
        });
      }
    }

    // 5. Check if anything is the "root" container with min-width
    const rootCandidates = [];
    for (const el of document.querySelectorAll('html, body, #page, main, [data-elementor-type], .elementor-section')) {
      const cs = window.getComputedStyle(el);
      rootCandidates.push({
        tag: el.tagName,
        id: el.id || null,
        classes: (el.className?.toString?.() || '').slice(0, 100),
        width: cs.width,
        minWidth: cs.minWidth,
        maxWidth: cs.maxWidth,
        overflowX: cs.overflowX,
      });
    }

    return {
      viewport_width: vw,
      viewport_meta_after_js: vpContent,
      visual_viewport: window.visualViewport ? {
        width: window.visualViewport.width,
        height: window.visualViewport.height,
        scale: window.visualViewport.scale,
        offsetLeft: window.visualViewport.offsetLeft,
        pageLeft: window.visualViewport.pageLeft,
      } : null,
      html_info: htmlInfo,
      body_info: bodyInfo,
      wide_on_right_count: wideOnRight.length,
      wide_on_right_top20: wideOnRight.slice(0, 20),
      explicit_wide: explicitWide.slice(0, 30),
      root_candidates: rootCandidates,
    };
  });

  await browser.close();

  let md = `# Mobile Overflow — Targeted Diagnostic\n\n**Run:** ${new Date().toISOString()}\n\n`;
  md += `## Viewport\n\n- innerWidth: **${data.viewport_width}px**\n- viewport meta (after JS): \`${data.viewport_meta_after_js}\`\n- visual viewport: \`${JSON.stringify(data.visual_viewport)}\`\n\n`;
  md += `## html computed\n\n\`\`\`json\n${JSON.stringify(data.html_info, null, 2)}\n\`\`\`\n\n`;
  md += `## body computed\n\n\`\`\`json\n${JSON.stringify(data.body_info, null, 2)}\n\`\`\`\n\n`;
  md += `## Root containers\n\n\`\`\`json\n${JSON.stringify(data.root_candidates, null, 2)}\n\`\`\`\n\n`;
  md += `## Elements with positive-side overflow (extending beyond right edge)\n\n`;
  md += `Total: ${data.wide_on_right_count}. Top 20 sorted by rightmost edge:\n\n`;
  for (const o of data.wide_on_right_top20) {
    md += `- **${o.tag}**${o.id ? '#' + o.id : ''} — left:${o.left} right:${o.right} width:${o.width}\n`;
    md += `  - classes: \`${o.classes}\`\n`;
    md += `  - css width: ${o.cssWidth}, max-width: ${o.cssMaxWidth}\n`;
    md += `  - position: ${o.position}, transform: ${o.transform}\n\n`;
  }
  md += `## Elements with explicit width >= 500px\n\n`;
  for (const e of data.explicit_wide) {
    md += `- **${e.tag}**${e.id ? '#' + e.id : ''} — width: ${e.width} — classes: \`${e.classes}\`\n`;
  }

  fs.writeFileSync(path.join(outDir, 'mobile-targeted.md'), md);
  fs.writeFileSync(path.join(outDir, 'mobile-targeted-raw.json'), JSON.stringify(data, null, 2));
  console.log('Done. Wrote diagnostics/mobile-targeted.md');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
