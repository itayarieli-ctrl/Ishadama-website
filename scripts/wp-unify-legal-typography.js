#!/usr/bin/env node
// Add a Code Snippet that unifies typography across the 3 legal pages
// (privacy=1508, conditions=5096, accessibility=3140)

const https = require("https");

const SITE = "https://ishadama.co.il";
const AUTH = "Basic " + Buffer.from(`${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD.replace(/\s+/g, "")}`).toString("base64");

function req(pathname, { method = "GET", body } = {}) {
  return new Promise((resolve) => {
    const u = new URL(pathname, SITE);
    const r = https.request(u, { method, headers: { Authorization: AUTH, Accept: "application/json", ...(body ? { "Content-Type": "application/json; charset=utf-8" } : {}) } }, (res) => {
      let data = ""; res.on("data", c => data += c);
      res.on("end", () => { let j = null; try { j = JSON.parse(data); } catch {}; resolve({ status: res.statusCode, body: data, json: j }); });
    });
    r.on("error", e => resolve({ status: 0, error: e.message }));
    if (body) r.write(Buffer.from(JSON.stringify(body), "utf-8"));
    r.end();
  });
}

const SNIPPET_PHP = `
add_action('wp_head', function() {
  if (!is_page([1508, 5096, 3140])) return;
  echo '<style id="claude-legal-typography">
  /* Unified typography for legal pages: privacy (1508), conditions (5096), accessibility (3140) */
  .page-id-1508 .elementor-heading-title,
  .page-id-5096 .elementor-heading-title,
  .page-id-3140 .elementor-heading-title,
  .page-id-1508 main h1, .page-id-1508 main h2,
  .page-id-5096 main h1, .page-id-5096 main h2,
  .page-id-3140 main h1, .page-id-3140 main h2 {
    font-size: 32px !important;
    font-weight: 600 !important;
    text-align: center !important;
    line-height: 1.4 !important;
    margin-top: 32px !important;
    margin-bottom: 16px !important;
  }
  .page-id-1508 main h3, .page-id-1508 .elementor-widget-text-editor h3,
  .page-id-5096 main h3, .page-id-5096 .elementor-widget-text-editor h3,
  .page-id-3140 main h3, .page-id-3140 .elementor-widget-text-editor h3 {
    font-size: 20px !important;
    font-weight: 600 !important;
    line-height: 1.4 !important;
    margin-top: 24px !important;
    margin-bottom: 12px !important;
  }
  .page-id-1508 main p, .page-id-1508 .elementor-widget-text-editor p, .page-id-1508 .elementor-widget-text-editor li,
  .page-id-5096 main p, .page-id-5096 .elementor-widget-text-editor p, .page-id-5096 .elementor-widget-text-editor li,
  .page-id-3140 main p, .page-id-3140 .elementor-widget-text-editor p, .page-id-3140 .elementor-widget-text-editor li {
    font-size: 16px !important;
    line-height: 1.6 !important;
  }
  /* Make sure the accessibility widget popup heading (always 21px) is not affected */
  .page-id-1508 #vplugin h2, .page-id-5096 #vplugin h2, .page-id-3140 #vplugin h2 {
    font-size: 21px !important;
    text-align: center !important;
  }
  </style>';
}, 100);
`;

(async () => {
  console.log("Creating typography unification snippet...");
  const create = await req("/wp-json/code-snippets/v1/snippets", {
    method: "POST",
    body: {
      name: "Claude: Legal Pages Typography",
      desc: "Unifies font sizes and heading styles across privacy/conditions/accessibility pages. Created by Claude SEO assistant.",
      code: SNIPPET_PHP,
      scope: "global",
      active: true,
      priority: 20,
    },
  });

  if (create.status !== 200 && create.status !== 201) {
    console.error("Failed:", create.status, create.body?.slice(0, 500));
    process.exit(1);
  }
  console.log("Snippet created id=" + create.json?.id + " active=" + create.json?.active);
})();
