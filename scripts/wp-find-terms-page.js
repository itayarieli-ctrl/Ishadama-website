#!/usr/bin/env node
// Find the actual Terms of Use page in WordPress
// Lists all pages and looks for ones matching terms-of-use patterns

const https = require("https");
const fs = require("fs");

const SITE = "https://ishadama.co.il";
const AUTH = "Basic " + Buffer.from(`${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD.replace(/\s+/g, "")}`).toString("base64");

function req(pathname) {
  return new Promise((resolve) => {
    const u = new URL(pathname, SITE);
    const r = https.request(u, { method: "GET", headers: { Authorization: AUTH, Accept: "application/json" } }, (res) => {
      let data = ""; res.on("data", c => data += c);
      res.on("end", () => { let j = null; try { j = JSON.parse(data); } catch {}; resolve({ status: res.statusCode, body: data, json: j }); });
    });
    r.on("error", e => resolve({ status: 0, error: e.message }));
    r.end();
  });
}

(async () => {
  // 1. Try to fetch page 5096 specifically with all statuses
  console.log("=== Direct lookup of page 5096 ===");
  const direct5096 = await req("/wp-json/wp/v2/pages/5096?status=any&context=edit");
  console.log("Status:", direct5096.status);
  console.log("Body:", direct5096.body.slice(0, 500));

  // 2. List ALL pages including drafts, private, trash
  console.log("\n=== Listing all pages (all statuses) ===");
  const allPages = [];
  for (const status of ['publish', 'draft', 'private', 'pending', 'trash']) {
    for (let p = 1; p <= 5; p++) {
      const r = await req(`/wp-json/wp/v2/pages?status=${status}&per_page=100&page=${p}&_fields=id,title,slug,status,link,date_gmt`);
      if (!Array.isArray(r.json) || r.json.length === 0) break;
      for (const pg of r.json) allPages.push({ ...pg, _queried_status: status });
      if (r.json.length < 100) break;
    }
  }
  console.log(`Total pages found: ${allPages.length}`);

  // Look for terms-related pages
  const termsPatterns = /(תנאי|תקנון|תנאים|terms|takanon|tnaim|usage|use)/i;
  const candidates = allPages.filter(p =>
    termsPatterns.test(p.title?.rendered || '') ||
    termsPatterns.test(p.slug || '') ||
    p.id === 5096
  );

  console.log(`\n=== Candidate terms-of-use pages (${candidates.length}) ===`);
  for (const c of candidates) {
    console.log(`  #${c.id} [${c.status}] slug="${c.slug}" title="${c.title?.rendered}" link=${c.link}`);
  }

  // Also list ALL pages by ID for context
  console.log(`\n=== All pages (ID, status, title) ===`);
  const sorted = [...allPages].sort((a, b) => a.id - b.id);
  for (const p of sorted) {
    console.log(`  #${p.id} [${p.status}] "${p.title?.rendered?.slice(0, 50)}" /${p.slug}/`);
  }

  if (!fs.existsSync("diagnostics")) fs.mkdirSync("diagnostics", { recursive: true });
  let md = `# Find Terms of Use Page\n\n**Run:** ${new Date().toISOString()}\n\n`;
  md += `## Page 5096 direct lookup\n\nStatus: ${direct5096.status}\n\`\`\`\n${direct5096.body.slice(0, 800)}\n\`\`\`\n\n`;
  md += `## Terms-of-use candidates (${candidates.length})\n\n`;
  for (const c of candidates) {
    md += `- **#${c.id}** [${c.status}] slug=\`${c.slug}\` title="**${c.title?.rendered}**" link=\`${c.link}\`\n`;
  }
  md += `\n## All pages (${sorted.length})\n\n`;
  for (const p of sorted) {
    md += `- #${p.id} [${p.status}] "${p.title?.rendered}" /${p.slug}/\n`;
  }
  fs.writeFileSync("diagnostics/terms-page-search.md", md);
})();
