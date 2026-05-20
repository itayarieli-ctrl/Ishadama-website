#!/usr/bin/env node
// Diagnoses the WPForms → Scalla CRM lead pipeline on ishadama.co.il.
// Runs against the live site via WordPress REST API (using Application Password auth).
// Writes findings to diagnostics/<date>/wp-diagnostic.md.

const fs = require("fs");
const path = require("path");
const https = require("https");

const SITE = "https://ishadama.co.il";
const USER = process.env.WP_USERNAME;
const PASS = process.env.WP_APP_PASSWORD;

if (!USER || !PASS) {
  console.error("Missing WP_USERNAME or WP_APP_PASSWORD env vars");
  process.exit(1);
}

const AUTH = "Basic " + Buffer.from(`${USER}:${PASS.replace(/\s+/g, "")}`).toString("base64");

function req(pathname, { method = "GET", body } = {}) {
  return new Promise((resolve) => {
    const url = new URL(pathname, SITE);
    const opts = {
      method,
      headers: {
        Authorization: AUTH,
        "User-Agent": "ishadama-seo-diagnostic/1.0",
        Accept: "application/json",
      },
    };
    if (body) {
      opts.headers["Content-Type"] = "application/json";
    }
    const r = https.request(url, opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {}
        resolve({ status: res.statusCode, headers: res.headers, body: data, json });
      });
    });
    r.on("error", (e) => resolve({ status: 0, error: e.message }));
    if (body) r.write(typeof body === "string" ? body : JSON.stringify(body));
    r.end();
  });
}

function section(title, content) {
  return `\n## ${title}\n\n${content}\n`;
}

(async () => {
  const findings = [];
  let report = `# WordPress Diagnostic — ${new Date().toISOString().slice(0, 10)}\n\nSite: ${SITE}\n`;

  // 1. Auth check
  console.log("→ Testing auth...");
  const me = await req("/wp-json/wp/v2/users/me?context=edit");
  if (me.status === 200) {
    report += section(
      "Auth",
      `✅ Authenticated as **${me.json.name}** (id ${me.json.id})\nRoles: ${(me.json.roles || []).join(", ") || "n/a"}\nCapabilities: ${Object.keys(me.json.capabilities || {}).length} caps`,
    );
  } else {
    report += section("Auth", `❌ Auth failed — HTTP ${me.status}\n\`\`\`\n${me.body?.slice(0, 500)}\n\`\`\``);
    findings.push("FATAL: cannot authenticate to WordPress REST API");
  }

  // 2. WordPress core info
  console.log("→ Site info...");
  const root = await req("/wp-json/");
  if (root.json) {
    report += section(
      "Site info",
      `- Name: ${root.json.name}\n- Description: ${root.json.description}\n- WP namespaces present: ${(root.json.namespaces || []).join(", ")}`,
    );
  }

  // 3. Plugins
  console.log("→ Plugins...");
  const plugins = await req("/wp-json/wp/v2/plugins");
  if (plugins.status === 200 && Array.isArray(plugins.json)) {
    const active = plugins.json.filter((p) => p.status === "active");
    const inactive = plugins.json.filter((p) => p.status !== "active");
    const wpformsRelated = plugins.json.filter((p) =>
      /wpform|scalla|webhook|zapier|crm/i.test(p.name + " " + p.plugin),
    );
    report += section(
      "Plugins (active)",
      active.map((p) => `- **${p.name}** (${p.plugin}) v${p.version}`).join("\n") || "_none_",
    );
    report += section(
      "Plugins (inactive)",
      inactive.map((p) => `- ${p.name} (${p.plugin})`).join("\n") || "_none_",
    );
    report += section(
      "Lead-funnel-related plugins (filtered)",
      wpformsRelated.map((p) => `- **${p.name}** (${p.plugin}) — status: **${p.status}**`).join("\n") ||
        "⚠️ No WPForms / Scalla / webhook / CRM plugin found by name match",
    );
    if (!wpformsRelated.length) findings.push("No WPForms or Scalla-named plugin detected");
  } else {
    report += section("Plugins", `❌ Could not list plugins — HTTP ${plugins.status}\n\`\`\`\n${plugins.body?.slice(0, 300)}\n\`\`\``);
    findings.push("Cannot read plugin list (may be a permissions issue)");
  }

  // 4. WPForms REST endpoints discovery
  console.log("→ WPForms endpoints...");
  const wpformsRoots = ["/wp-json/wpforms/v1", "/wp-json/wpforms/v1/forms"];
  let wpformsFound = "";
  for (const p of wpformsRoots) {
    const r = await req(p);
    wpformsFound += `\n**${p}** → HTTP ${r.status}\n`;
    if (r.status === 200 && r.json) {
      wpformsFound += "```json\n" + JSON.stringify(r.json, null, 2).slice(0, 2000) + "\n```\n";
    } else if (r.body) {
      wpformsFound += "```\n" + r.body.slice(0, 300) + "\n```\n";
    }
  }
  report += section("WPForms REST endpoints", wpformsFound);

  // 5. Look for Scalla settings via options-like endpoints
  console.log("→ Scalla endpoints...");
  const scallaPaths = [
    "/wp-json/scalla/v1",
    "/wp-json/scalla/v1/settings",
    "/wp-json/scalla-crm/v1",
  ];
  let scallaFound = "";
  for (const p of scallaPaths) {
    const r = await req(p);
    scallaFound += `**${p}** → HTTP ${r.status}\n`;
  }
  report += section("Scalla REST endpoints (probing)", scallaFound);

  // 6. Forms posts: WPForms stores forms as custom post type 'wpforms'
  console.log("→ Form posts...");
  const formsCpt = await req("/wp-json/wp/v2/wpforms?per_page=20&status=any");
  if (formsCpt.status === 200 && Array.isArray(formsCpt.json)) {
    report += section(
      "Forms (custom post type wpforms)",
      formsCpt.json.map((f) => `- **${f.title?.rendered}** (id ${f.id}, status ${f.status})`).join("\n") ||
        "_no form posts visible_",
    );
  } else {
    report += section("Forms (custom post type wpforms)", `HTTP ${formsCpt.status}`);
  }

  // 7. Pages with forms — sample a few published pages, look for form shortcodes/widgets
  console.log("→ Sampling pages for form references...");
  const pages = await req("/wp-json/wp/v2/pages?per_page=20&status=publish");
  if (pages.json && Array.isArray(pages.json)) {
    const withForms = pages.json
      .filter((p) =>
        /wpforms|elementor-form|scalla|webhook/i.test(JSON.stringify(p.content?.rendered || "")),
      )
      .map((p) => `- ${p.title?.rendered} → ${p.link}`);
    report += section(
      "Pages referencing forms (heuristic)",
      withForms.join("\n") || "_no obvious form references in first 20 pages_",
    );
  }

  // 8. Summary
  report += section(
    "Findings summary",
    findings.length ? findings.map((f) => `- ⚠️ ${f}`).join("\n") : "✅ No fatal issues detected at REST layer",
  );

  const date = new Date().toISOString().slice(0, 10);
  const dir = path.join("diagnostics", date);
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, "wp-diagnostic.md");
  fs.writeFileSync(out, report);
  console.log("Wrote " + out);
})();
