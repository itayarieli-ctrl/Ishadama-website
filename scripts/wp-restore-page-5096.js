#!/usr/bin/env node
// Restore page 5096 ("תנאי שימוש באתר") from trash to publish

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

(async () => {
  console.log("Before:");
  const before = await req("/wp-json/wp/v2/pages/5096?context=edit");
  console.log(`  status=${before.json?.status} slug=${before.json?.slug} link=${before.json?.link}`);

  console.log("\nRestoring page 5096 (status -> publish, slug -> תנאי-שימוש)...");
  const update = await req("/wp-json/wp/v2/pages/5096", {
    method: "POST",
    body: { status: "publish", slug: "terms-of-use" },
  });
  console.log(`  HTTP ${update.status}`);
  if (update.json?.code) console.log(`  ERROR: ${update.json.code} - ${update.json.message}`);

  console.log("\nAfter:");
  const after = await req("/wp-json/wp/v2/pages/5096?context=edit");
  console.log(`  status=${after.json?.status} slug=${after.json?.slug} link=${after.json?.link}`);

  // Verify the page is now reachable publicly
  const pub = await req("/?page_id=5096");
  console.log(`\nPublic fetch /?page_id=5096 -> HTTP ${pub.status}`);
  console.log(`  Contains "תנאי שימוש": ${pub.body.includes('תנאי שימוש')}`);
})();
