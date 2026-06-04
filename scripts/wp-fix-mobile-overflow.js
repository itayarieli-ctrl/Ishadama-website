#!/usr/bin/env node
// Adds CSS to fix mobile horizontal overflow caused by swiper carousels
// missing overflow:hidden on their containers.
// Creates a Code Snippet that injects the CSS into wp_head.

const https = require("https");

const SITE = "https://ishadama.co.il";
const USER = process.env.WP_USERNAME;
const PASS = process.env.WP_APP_PASSWORD;
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
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
    };
    const r = https.request(url, opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        let json = null;
        try { json = JSON.parse(data); } catch {}
        resolve({ status: res.statusCode, body: data, json });
      });
    });
    r.on("error", (e) => resolve({ status: 0, error: e.message }));
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

const SNIPPET_PHP = `
add_action('wp_head', function() {
  echo '<style id="claude-mobile-overflow-fix">
  /* Fix horizontal overflow on mobile: ensure swiper carousels clip their wide inner wrapper */
  .swiper,
  .elementor-widget-loop-grid .swiper,
  .elementor-widget-loop-carousel .swiper,
  [data-widget_type*="loop-grid"] .swiper,
  [data-widget_type*="loop-carousel"] .swiper,
  .elementor-main-swiper,
  .elementor-swiper { overflow: hidden !important; }
  /* Safety net: prevent any direct child of body from extending the page wider than viewport */
  html, body { max-width: 100vw; overflow-x: hidden; }
  </style>';
}, 99);
`;

(async () => {
  console.log("Creating Code Snippet to fix mobile overflow...");
  const create = await req("/wp-json/code-snippets/v1/snippets", {
    method: "POST",
    body: {
      name: "Claude: Mobile Overflow Fix",
      desc: "Adds overflow:hidden to swiper containers to fix mobile horizontal scroll. Created by Claude SEO diagnostic.",
      code: SNIPPET_PHP,
      scope: "global",
      active: true,
      priority: 10,
    },
  });

  if (create.status !== 200 && create.status !== 201) {
    console.error("Failed to create snippet:", create.status, create.body?.slice(0, 500));
    process.exit(1);
  }
  console.log("Snippet created, id=" + create.json?.id);
  console.log("Status:", create.json?.active ? "ACTIVE" : "INACTIVE");

  // Verify it's active by listing snippets
  const list = await req("/wp-json/code-snippets/v1/snippets");
  if (list.json) {
    const ours = list.json.find(s => s.name?.includes("Claude: Mobile Overflow Fix"));
    if (ours) {
      console.log(`Confirmed: snippet id=${ours.id}, active=${ours.active}, scope=${ours.scope}`);
    }
  }
})();
