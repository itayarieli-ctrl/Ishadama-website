#!/usr/bin/env node
// Fixed: scope max-width to the page CONTENT only (not header/footer)
// Header/footer use the wp-page Elementor data type, page content uses wp-page also
// So we target by .elementor-element-* of the section the content is in, or by being
// inside [data-elementor-type="wp-page"] only

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

const NEW_CODE = `
add_action('wp_head', function() {
  if (!is_page([1508, 5096, 3140])) return;
  echo '<style id="claude-legal-typography">
  /* === Unified legal pages: privacy(1508) / conditions(5096) / accessibility(3140) === */

  /* Scope: ONLY [data-elementor-type="wp-page"] - this excludes header/footer */
  body.page-id-1508 [data-elementor-type="wp-page"] > .elementor-section .elementor-container,
  body.page-id-1508 [data-elementor-type="wp-page"] > .e-con,
  body.page-id-1508 [data-elementor-type="wp-page"] .e-con.e-parent,
  body.page-id-5096 [data-elementor-type="wp-page"] > .elementor-section .elementor-container,
  body.page-id-5096 [data-elementor-type="wp-page"] > .e-con,
  body.page-id-5096 [data-elementor-type="wp-page"] .e-con.e-parent,
  body.page-id-3140 [data-elementor-type="wp-page"] > .elementor-section .elementor-container,
  body.page-id-3140 [data-elementor-type="wp-page"] > .e-con,
  body.page-id-3140 [data-elementor-type="wp-page"] .e-con.e-parent {
    max-width: 820px !important;
    margin-inline: auto !important;
  }

  /* Headings inside page content only */
  body.page-id-1508 [data-elementor-type="wp-page"] .elementor-heading-title,
  body.page-id-1508 [data-elementor-type="wp-page"] h1,
  body.page-id-1508 [data-elementor-type="wp-page"] h2,
  body.page-id-5096 [data-elementor-type="wp-page"] .elementor-heading-title,
  body.page-id-5096 [data-elementor-type="wp-page"] h1,
  body.page-id-5096 [data-elementor-type="wp-page"] h2,
  body.page-id-3140 [data-elementor-type="wp-page"] .elementor-heading-title,
  body.page-id-3140 [data-elementor-type="wp-page"] h1,
  body.page-id-3140 [data-elementor-type="wp-page"] h2 {
    font-size: 32px !important;
    font-weight: 600 !important;
    text-align: center !important;
    line-height: 1.4 !important;
    margin-top: 32px !important;
    margin-bottom: 16px !important;
  }

  body.page-id-1508 [data-elementor-type="wp-page"] h3, body.page-id-1508 [data-elementor-type="wp-page"] h4,
  body.page-id-5096 [data-elementor-type="wp-page"] h3, body.page-id-5096 [data-elementor-type="wp-page"] h4,
  body.page-id-3140 [data-elementor-type="wp-page"] h3, body.page-id-3140 [data-elementor-type="wp-page"] h4 {
    font-size: 20px !important;
    font-weight: 600 !important;
    text-align: start !important;
    line-height: 1.4 !important;
    margin-top: 24px !important;
    margin-bottom: 12px !important;
  }

  /* Body text inside page content only */
  body.page-id-1508 [data-elementor-type="wp-page"] p,
  body.page-id-1508 [data-elementor-type="wp-page"] li,
  body.page-id-1508 [data-elementor-type="wp-page"] .elementor-widget-text-editor,
  body.page-id-5096 [data-elementor-type="wp-page"] p,
  body.page-id-5096 [data-elementor-type="wp-page"] li,
  body.page-id-5096 [data-elementor-type="wp-page"] .elementor-widget-text-editor,
  body.page-id-3140 [data-elementor-type="wp-page"] p,
  body.page-id-3140 [data-elementor-type="wp-page"] li,
  body.page-id-3140 [data-elementor-type="wp-page"] .elementor-widget-text-editor {
    font-size: 16px !important;
    line-height: 1.7 !important;
    text-align: justify !important;
  }
  </style>';
}, 100);
`;

(async () => {
  const list = await req("/wp-json/code-snippets/v1/snippets");
  if (!Array.isArray(list.json)) {
    console.error("List failed:", list.status, list.body?.slice(0, 300));
    process.exit(1);
  }
  const existing = list.json.find(s => s.name === "Claude: Legal Pages Typography");
  if (existing) {
    console.log(`Updating snippet id=${existing.id}...`);
    const upd = await req(`/wp-json/code-snippets/v1/snippets/${existing.id}`, {
      method: "POST",
      body: { code: NEW_CODE, active: true },
    });
    console.log(`Update HTTP ${upd.status}, active=${upd.json?.active}`);
  } else {
    const create = await req("/wp-json/code-snippets/v1/snippets", {
      method: "POST",
      body: {
        name: "Claude: Legal Pages Typography",
        desc: "Unifies layout/typography on privacy/conditions/accessibility pages",
        code: NEW_CODE,
        scope: "global",
        active: true,
        priority: 20,
      },
    });
    console.log(`Created id=${create.json?.id}`);
  }
  console.log("\nDone. Hard refresh required (PhastPress cache).");
})();
