#!/usr/bin/env node
// Load the site, scroll to footer, screenshot it, extract all visible links

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const URL = 'https://ishadama.co.il';

(async () => {
  const outDir = 'diagnostics';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 2000));

  // Scroll to absolute bottom to trigger lazy-loaded footer
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await new Promise(r => setTimeout(r, 3000));

  // Get all links on page with their text and URL
  const allLinks = await page.evaluate(() => {
    const links = [];
    for (const a of document.querySelectorAll('a[href]')) {
      const rect = a.getBoundingClientRect();
      const absTop = rect.top + window.scrollY;
      links.push({
        text: (a.textContent || '').trim().slice(0, 100),
        href: a.getAttribute('href'),
        abs_top: Math.round(absTop),
        in_footer_zone: absTop > (document.documentElement.scrollHeight - 1500),
      });
    }
    return {
      doc_height: document.documentElement.scrollHeight,
      links,
    };
  });

  // Filter for footer-zone links and links containing relevant terms
  const footerLinks = allLinks.links.filter(l => l.in_footer_zone);
  const termsLinks = allLinks.links.filter(l =>
    /תנאי|תקנון|תנאים|terms|תנאי השימוש|מדיניות|פרטיות|privacy/iu.test(l.text)
  );

  // Screenshot the footer area
  const footerEl = await page.$('footer, [data-elementor-type="footer"], .site-footer');
  if (footerEl) {
    try { await footerEl.screenshot({ path: path.join(outDir, 'footer-screenshot.png') }); } catch {}
  } else {
    // Just screenshot the bottom of the page
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight - 800));
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(outDir, 'footer-screenshot.png'), fullPage: false });
  }

  await browser.close();

  let md = `# Footer & Terms Links\n\n**Run:** ${new Date().toISOString()}\n**Document height:** ${allLinks.doc_height}px\n\n`;
  md += `## Links matching terms/privacy/תקנון/תנאי (anywhere on page) — ${termsLinks.length}\n\n`;
  for (const l of termsLinks) {
    md += `- text="**${l.text}**" → \`${l.href}\` (top=${l.abs_top}px, footer_zone=${l.in_footer_zone})\n`;
  }
  md += `\n## All links in footer zone (bottom 1500px) — ${footerLinks.length}\n\n`;
  for (const l of footerLinks) {
    md += `- text="${l.text}" → \`${l.href}\`\n`;
  }

  fs.writeFileSync(path.join(outDir, 'footer-links.md'), md);
  console.log(md);
})();
