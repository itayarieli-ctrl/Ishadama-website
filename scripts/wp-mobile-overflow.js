#!/usr/bin/env node
// Diagnoses mobile horizontal overflow on ishadama.co.il
// Fetches HTML, finds elements with potential overflow issues, checks CSS

const https = require("https");
const fs = require("fs");
const path = require("path");

const SITE = "https://ishadama.co.il";

function fetchUrl(url, mobile = true) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const opts = {
      method: "GET",
      headers: {
        "User-Agent": mobile
          ? "Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
          : "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "he-IL,he;q=0.9",
      },
    };
    const r = https.request(u, opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    });
    r.on("error", (e) => resolve({ status: 0, error: e.message }));
    r.end();
  });
}

async function main() {
  const outDir = "diagnostics";
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log("Fetching homepage as mobile...");
  const home = await fetchUrl(SITE, true);
  console.log(`Status: ${home.status}, size: ${home.body.length}`);

  if (!home.body) {
    console.error("No HTML received");
    process.exit(1);
  }

  fs.writeFileSync(path.join(outDir, "homepage-mobile.html"), home.body);

  // Find inline styles with fixed widths
  const findings = {
    viewport_meta: [],
    inline_widths: [],
    suspicious_styles: [],
    stylesheets: [],
    scripts_loaded: [],
    classes_with_width: [],
  };

  // 1. Viewport meta tag
  const viewportMatch = home.body.match(/<meta[^>]*name=["']viewport["'][^>]*>/gi) || [];
  findings.viewport_meta = viewportMatch;

  // 2. Inline styles with hardcoded widths > 400px
  const inlineStyleRegex = /style=["']([^"']+)["']/gi;
  let m;
  while ((m = inlineStyleRegex.exec(home.body)) !== null) {
    const style = m[1];
    if (/width\s*:\s*(\d{4,}|[5-9]\d{2})px/i.test(style) ||
        /min-width\s*:\s*(\d{4,}|[5-9]\d{2})px/i.test(style)) {
      findings.inline_widths.push(style.slice(0, 200));
    }
  }

  // 3. Stylesheets
  const cssLinks = home.body.match(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi) || [];
  for (const link of cssLinks) {
    const href = (link.match(/href=["']([^"']+)["']/) || [])[1];
    if (href) findings.stylesheets.push(href);
  }

  // 4. Look for problematic patterns
  const patterns = [
    { name: "fixed_width_large", regex: /width\s*:\s*(1[0-9]{3,}|[2-9][0-9]{3})px/gi },
    { name: "negative_margin_large", regex: /margin[^:]*:\s*-\d{2,}px/gi },
    { name: "transform_translate_x", regex: /translateX?\(\s*-?\d+(px|%)\s*\)/gi },
    { name: "html_overflow_x", regex: /html\s*\{[^}]*overflow-x[^}]*\}/gi },
  ];
  for (const p of patterns) {
    const matches = home.body.match(p.regex) || [];
    if (matches.length) findings.suspicious_styles.push({ pattern: p.name, count: matches.length, samples: matches.slice(0, 5) });
  }

  // 5. Body/html classes
  const bodyClassMatch = home.body.match(/<body[^>]*class=["']([^"']+)["']/i);
  findings.body_classes = bodyClassMatch ? bodyClassMatch[1] : null;

  const htmlClassMatch = home.body.match(/<html[^>]*class=["']([^"']+)["']/i);
  findings.html_classes = htmlClassMatch ? htmlClassMatch[1] : null;

  // 6. Detect plugins/builders in use
  const builders = {
    elementor: /elementor/i.test(home.body),
    phastpress: /phastpress/i.test(home.body),
    rank_math: /rank.?math/i.test(home.body),
  };
  findings.builders = builders;

  // 6b. Find selectors using translateX(-50%) or 100vw - these are the prime suspects
  const culprits = [];
  for (const block of styleBlocks) {
    const rules = block.matchAll(/([^{}]+)\{([^}]+)\}/g);
    for (const r of rules) {
      const selector = r[1].trim();
      const decl = r[2].trim();
      if (/translateX\(-?50%\)|100vw|left\s*:\s*50%|right\s*:\s*50%/i.test(decl)) {
        culprits.push({ selector: selector.slice(0, 150), decl: decl.slice(0, 300) });
      }
    }
  }
  findings.translate_culprits = culprits.slice(0, 40);

  // 6c. Look at html element
  const htmlTagMatch = home.body.match(/<html[^>]*>/i);
  findings.html_tag = htmlTagMatch ? htmlTagMatch[0] : null;

  // 7. Find direct CSS rules with viewport-larger widths inline in <style>
  const styleBlocks = home.body.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
  findings.style_block_count = styleBlocks.length;
  findings.style_block_size_total = styleBlocks.reduce((a, b) => a + b.length, 0);

  // Extract rules touching html, body, .page, .site-header
  const importantSelectors = [];
  for (const block of styleBlocks) {
    const rules = block.matchAll(/([^{}]+)\{([^}]+)\}/g);
    for (const r of rules) {
      const selector = r[1].trim();
      const decl = r[2].trim();
      if (/^(html|body|\.site|\.page|header|\.header|#header|\.main-header|\.elementor-section)/i.test(selector)) {
        if (/width|overflow|min-width|max-width/i.test(decl)) {
          importantSelectors.push({ selector: selector.slice(0, 100), decl: decl.slice(0, 200) });
        }
      }
    }
  }
  findings.important_selectors = importantSelectors.slice(0, 30);

  // 8. Inline style on body/html
  const bodyStyleMatch = home.body.match(/<body[^>]*style=["']([^"']+)["']/i);
  findings.body_inline_style = bodyStyleMatch ? bodyStyleMatch[1] : null;

  // 9. Check the first ~3KB after <body> for direct children with widths
  const bodyOpen = home.body.search(/<body[^>]*>/i);
  if (bodyOpen >= 0) {
    const bodyStart = home.body.slice(bodyOpen, bodyOpen + 5000);
    const wideAttr = bodyStart.match(/style=["'][^"']*width\s*:\s*[^"']+["']/gi) || [];
    findings.body_start_widths = wideAttr.slice(0, 10);
  }

  // Write report
  let md = `# Mobile Overflow Diagnostic\n\n**Run:** ${new Date().toISOString()}\n**URL:** ${SITE}\n\n`;
  md += `## Viewport meta\n\n\`\`\`\n${findings.viewport_meta.join("\n") || "(NONE FOUND — likely the problem!)"}\n\`\`\`\n\n`;
  md += `## Builders detected\n\n\`\`\`json\n${JSON.stringify(findings.builders, null, 2)}\n\`\`\`\n\n`;
  md += `## HTML/Body classes\n\n- html: \`${findings.html_classes}\`\n- body: \`${findings.body_classes}\`\n- body inline style: \`${findings.body_inline_style}\`\n\n`;
  md += `## Style blocks\n\n- Count: ${findings.style_block_count}\n- Total size: ${findings.style_block_size_total} bytes\n\n`;
  md += `## Important selectors (html/body/header) with width/overflow rules\n\n`;
  for (const s of findings.important_selectors) {
    md += `- \`${s.selector}\` → \`${s.decl}\`\n`;
  }
  md += `\n## Suspicious patterns\n\n\`\`\`json\n${JSON.stringify(findings.suspicious_styles, null, 2)}\n\`\`\`\n\n`;
  md += `## Inline widths > 400px (first 20)\n\n`;
  for (const s of findings.inline_widths.slice(0, 20)) {
    md += `- \`${s}\`\n`;
  }
  md += `\n## Widths in first 5KB of body\n\n\`\`\`json\n${JSON.stringify(findings.body_start_widths, null, 2)}\n\`\`\`\n\n`;
  md += `## HTML tag\n\n\`\`\`\n${findings.html_tag}\n\`\`\`\n\n`;
  md += `## Selectors using translateX(-50%) / 100vw / left:50%\n\n`;
  for (const c of findings.translate_culprits) {
    md += `- \`${c.selector}\`\n  → \`${c.decl}\`\n\n`;
  }
  md += `## Stylesheets loaded (${findings.stylesheets.length})\n\n`;
  for (const s of findings.stylesheets) md += `- ${s}\n`;

  fs.writeFileSync(path.join(outDir, "mobile-overflow.md"), md);
  fs.writeFileSync(path.join(outDir, "mobile-overflow-raw.json"), JSON.stringify(findings, null, 2));

  console.log("\n=== RESULT ===");
  console.log(md);
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });
