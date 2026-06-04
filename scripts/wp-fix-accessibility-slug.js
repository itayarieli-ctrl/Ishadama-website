#!/usr/bin/env node
// Fix slug of page #3140 ("הצהרת נגישות") from קרקע-להשקעה-2 to accessibility-statement.
// WordPress automatically creates a 301 redirect from the old slug (built-in wp_old_slug_redirect).

const https = require("https");

const SITE = "https://ishadama.co.il";
const AUTH = "Basic " + Buffer.from(`${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD.replace(/\s+/g, "")}`).toString("base64");

function req(pathname, { method = "GET", body, followRedirect = false } = {}) {
  return new Promise((resolve) => {
    const u = new URL(pathname, SITE);
    const r = https.request(u, {
      method,
      headers: { Authorization: AUTH, Accept: "application/json", ...(body ? { "Content-Type": "application/json; charset=utf-8" } : {}) },
    }, (res) => {
      let data = ""; res.on("data", c => data += c);
      res.on("end", () => {
        let j = null; try { j = JSON.parse(data); } catch {}
        resolve({ status: res.statusCode, headers: res.headers, body: data, json: j });
      });
    });
    r.on("error", e => resolve({ status: 0, error: e.message }));
    if (body) r.write(Buffer.from(JSON.stringify(body), "utf-8"));
    r.end();
  });
}

const PAGE_ID = 3140;
const NEW_SLUG = "accessibility-statement";
const OLD_SLUG_ENCODED = "%d7%a7%d7%a8%d7%a7%d7%a2-%d7%9c%d7%94%d7%a9%d7%a7%d7%a2%d7%94-2";

(async () => {
  // 1. Before state
  console.log("=== BEFORE ===");
  const before = await req(`/wp-json/wp/v2/pages/${PAGE_ID}?context=edit`);
  console.log(`  status=${before.json?.status} slug="${before.json?.slug}" link=${before.json?.link}`);
  console.log(`  title="${before.json?.title?.rendered}"`);

  // 2. Safety check: ensure no other page uses the new slug
  const check = await req(`/wp-json/wp/v2/pages?slug=${NEW_SLUG}&_fields=id,title,slug`);
  if (Array.isArray(check.json) && check.json.length > 0) {
    console.error(`SAFETY ABORT: slug "${NEW_SLUG}" already used by:`, check.json);
    process.exit(1);
  }
  console.log(`  Safety check passed: slug "${NEW_SLUG}" is available`);

  // 3. Update slug
  console.log(`\n=== Updating slug to "${NEW_SLUG}" ===`);
  const update = await req(`/wp-json/wp/v2/pages/${PAGE_ID}`, {
    method: "POST",
    body: { slug: NEW_SLUG },
  });
  console.log(`  HTTP ${update.status}`);
  if (update.json?.code) {
    console.error(`  ERROR: ${update.json.code} - ${update.json.message}`);
    process.exit(1);
  }

  // 4. After state
  console.log("\n=== AFTER ===");
  const after = await req(`/wp-json/wp/v2/pages/${PAGE_ID}?context=edit`);
  console.log(`  status=${after.json?.status} slug="${after.json?.slug}" link=${after.json?.link}`);

  // 5. Verify new URL is reachable
  console.log("\n=== Verifying new URL ===");
  const newPub = await req(`/${NEW_SLUG}/`);
  console.log(`  GET /${NEW_SLUG}/ -> HTTP ${newPub.status}`);
  console.log(`  Contains "הצהרת נגישות": ${newPub.body.includes('הצהרת נגישות')}`);

  // 6. Verify old URL 301 redirects
  console.log("\n=== Verifying old URL redirect ===");
  const oldPub = await req(`/${OLD_SLUG_ENCODED}/`);
  console.log(`  GET /${OLD_SLUG_ENCODED}/ -> HTTP ${oldPub.status}`);
  if (oldPub.status === 301 || oldPub.status === 302) {
    console.log(`  Redirects to: ${oldPub.headers.location}`);
  } else if (oldPub.status === 200) {
    console.log(`  WARNING: old URL still returns 200 (no redirect). Body contains "הצהרת נגישות": ${oldPub.body.includes('הצהרת נגישות')}`);
  }
})();
