#!/usr/bin/env node
// Replace the legal typography snippet with stronger rules:
// - Paragraphs: target all p/li inside the content area (not just main)
// - Layout: max-width 800px centered, justified text
// - Match the privacy page layout style

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

  /* Center the main content container with a readable max-width */
  body.page-id-1508 .elementor-section .elementor-container,
  body.page-id-5096 .elementor-section .elementor-container,
  body.page-id-3140 .elementor-section .elementor-container,
  body.page-id-1508 .e-con,
  body.page-id-5096 .e-con,
  body.page-id-3140 .e-con {
    max-width: 820px !important;
    margin-inline: auto !important;
  }

  /* Headings: 32px, weight 600, centered, consistent spacing */
  body.page-id-1508 .elementor-heading-title,
  body.page-id-5096 .elementor-heading-title,
  body.page-id-3140 .elementor-heading-title,
  body.page-id-1508 h1, body.page-id-1508 h2,
  body.page-id-5096 h1, body.page-id-5096 h2,
  body.page-id-3140 h1, body.page-id-3140 h2 {
    font-size: 32px !important;
    font-weight: 600 !important;
    text-align: center !important;
    line-height: 1.4 !important;
    margin-top: 32px !important;
    margin-bottom: 16px !important;
  }

  /* Sub-headings */
  body.page-id-1508 h3, body.page-id-1508 h4,
  body.page-id-5096 h3, body.page-id-5096 h4,
  body.page-id-3140 h3, body.page-id-3140 h4 {
    font-size: 20px !important;
    font-weight: 600 !important;
    text-align: start !important;
    line-height: 1.4 !important;
    margin-top: 24px !important;
    margin-bottom: 12px !important;
  }

  /* Body text — readable size, justified, comfortable line-height */
  body.page-id-1508 .elementor-widget-text-editor,
  body.page-id-5096 .elementor-widget-text-editor,
  body.page-id-3140 .elementor-widget-text-editor,
  body.page-id-1508 .elementor-widget-text-editor *,
  body.page-id-5096 .elementor-widget-text-editor *,
  body.page-id-3140 .elementor-widget-text-editor *,
  body.page-id-1508 p, body.page-id-1508 li, body.page-id-1508 span,
  body.page-id-5096 p, body.page-id-5096 li, body.page-id-5096 span,
  body.page-id-3140 p, body.page-id-3140 li, body.page-id-3140 span {
    font-size: 16px !important;
    line-height: 1.7 !important;
    text-align: justify !important;
  }

  /* Make sure vplugin (accessibility widget) is unaffected */
  body.page-id-1508 #vplugin *, body.page-id-5096 #vplugin *, body.page-id-3140 #vplugin * {
    font-size: revert !important;
    text-align: revert !important;
    line-height: revert !important;
    max-width: none !important;
  }
  body.page-id-1508 #vplugin h2, body.page-id-5096 #vplugin h2, body.page-id-3140 #vplugin h2 {
    font-size: 21px !important;
    text-align: center !important;
  }

  /* Restore default for header/footer area */
  body.page-id-3140 header *, body.page-id-3140 footer *,
  body.page-id-3140 [data-elementor-type="header"] *,
  body.page-id-3140 [data-elementor-type="footer"] * {
    font-size: revert !important;
    text-align: revert !important;
    line-height: revert !important;
    max-width: none !important;
  }
  </style>';
}, 100);
`;

(async () => {
  // 1. Find existing snippet
  const list = await req("/wp-json/code-snippets/v1/snippets");
  if (!Array.isArray(list.json)) {
    console.error("Failed to list snippets:", list.status, list.body?.slice(0, 300));
    process.exit(1);
  }
  const existing = list.json.find(s => s.name === "Claude: Legal Pages Typography");
  if (!existing) {
    console.error("Existing snippet not found - will create new");
  } else {
    console.log(`Found existing snippet id=${existing.id}, updating...`);
    const upd = await req(`/wp-json/code-snippets/v1/snippets/${existing.id}`, {
      method: "POST",
      body: { code: NEW_CODE, active: true },
    });
    console.log(`Update HTTP ${upd.status}, active=${upd.json?.active}`);
    if (upd.json?.code === 'rest_invalid_param' || upd.status >= 400) {
      console.error("Update error:", upd.body?.slice(0, 500));
    }
  }

  if (!existing) {
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

  console.log("\nDone. Note: PhastPress may cache the page - try a hard refresh (Ctrl+Shift+R).");
})();
