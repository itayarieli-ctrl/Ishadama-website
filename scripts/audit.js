#!/usr/bin/env node
// Runs a PageSpeed Insights audit for ishadama.co.il (mobile + desktop)
// and writes JSON + a human-readable Markdown report into audits/YYYY-MM-DD/.

const fs = require("fs");
const path = require("path");
const https = require("https");

const KEY = process.env.PSI_API_KEY;
if (!KEY) {
  console.error("Missing PSI_API_KEY env var. See .env.example.");
  process.exit(1);
}

const SITE = process.env.AUDIT_URL || "https://ishadama.co.il";
const CATS = ["performance", "seo", "accessibility", "best-practices"];

function fetchPSI(strategy) {
  const params = new URLSearchParams({ url: SITE, strategy, key: KEY });
  CATS.forEach((c) => params.append("category", c));
  const u = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`;
  return new Promise((resolve, reject) => {
    https
      .get(u, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

function pct(s) {
  return s == null ? "—" : Math.round(s * 100);
}

function summarize(label, j) {
  const c = j.lighthouseResult.categories;
  const a = j.lighthouseResult.audits;
  const failed = c.accessibility.auditRefs
    .concat(c.seo.auditRefs)
    .map((r) => a[r.id])
    .filter((x) => x && x.score !== null && x.score < 1)
    .map((x) => `  - **${x.title}** — ${x.description.split(".")[0]}.`);
  const opportunities = Object.values(a)
    .filter(
      (x) =>
        x.score !== null &&
        x.score < 0.9 &&
        (x.details?.overallSavingsMs || x.details?.overallSavingsBytes),
    )
    .sort(
      (x, y) =>
        (y.details?.overallSavingsMs || 0) - (x.details?.overallSavingsMs || 0),
    )
    .slice(0, 8)
    .map((x) => {
      const ms = x.details?.overallSavingsMs
        ? ` _(save ~${Math.round(x.details.overallSavingsMs)}ms)_`
        : "";
      return `  - **${x.title}**${ms}`;
    });
  return `## ${label}

| Metric | Value |
|---|---|
| Performance | **${pct(c.performance.score)}** |
| SEO | **${pct(c.seo.score)}** |
| Accessibility | **${pct(c.accessibility.score)}** |
| Best Practices | **${pct(c["best-practices"].score)}** |
| LCP | ${a["largest-contentful-paint"].displayValue} |
| CLS | ${a["cumulative-layout-shift"].displayValue} |
| TBT | ${a["total-blocking-time"].displayValue} |
| FCP | ${a["first-contentful-paint"].displayValue} |
| Speed Index | ${a["speed-index"].displayValue} |

### Top opportunities
${opportunities.join("\n") || "_(none)_"}

### Failing audits (SEO + Accessibility)
${failed.join("\n") || "_(none)_"}
`;
}

(async () => {
  console.log(`Auditing ${SITE} ...`);
  const [mobile, desktop] = await Promise.all([
    fetchPSI("mobile"),
    fetchPSI("desktop"),
  ]);
  if (mobile.error || desktop.error) {
    console.error(JSON.stringify(mobile.error || desktop.error, null, 2));
    process.exit(1);
  }
  const today = new Date().toISOString().slice(0, 10);
  const dir = path.join("audits", today);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "mobile.json"), JSON.stringify(mobile));
  fs.writeFileSync(path.join(dir, "desktop.json"), JSON.stringify(desktop));
  const md = `# Audit — ${today}

Site: ${SITE}
Source: Google PageSpeed Insights v5

${summarize("Mobile", mobile)}
${summarize("Desktop", desktop)}
`;
  fs.writeFileSync(path.join(dir, "report.md"), md);
  console.log(`Wrote ${dir}/{mobile.json,desktop.json,report.md}`);
})();
