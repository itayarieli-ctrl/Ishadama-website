#!/usr/bin/env node
// Tests the Scalla CRM API connection by:
// 1. Firing a test HTTP POST directly from GitHub Actions (to check API reachability)
// 2. Creating a PHP snippet that fires the same call from within WordPress (to check hosting outbound)
// 3. Comparing responses to identify where the break is.

const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");

const SITE = "https://ishadama.co.il";
const USER = process.env.WP_USERNAME;
const PASS = process.env.WP_APP_PASSWORD;
const AUTH = "Basic " + Buffer.from(`${USER}:${PASS.replace(/\s+/g, "")}`).toString("base64");

const SCALLA_API_URL  = "https://api.scallacrm.co.il/modules/Webforms/capture.php?webform_id=00917cf48fd3e13e47d550e0f34a551b";
const SCALLA_APP_URL  = "https://app.scallacrm.co.il/modules/Webforms/capture.php?webform_id=00917cf48fd3e13e47d550e0f34a551b";

const TEST_FIELDS = {
  firstname: "בדיקה",
  lastname:  "אוטומטית",
  mobile:    "0500000000",
  email:     "test-claude@ishadama.co.il",
  cf_2459:   "בוקר",
};

function postForm(url, fields) {
  return new Promise((resolve) => {
    const body = Object.entries(fields)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");
    const parsed = new URL(url);
    const opts = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(body),
        "User-Agent": "ishadama-seo-test/1.0",
      },
    };
    const mod = parsed.protocol === "https:" ? https : http;
    const r = mod.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    r.on("error", (e) => resolve({ status: 0, error: e.message }));
    r.write(body);
    r.end();
  });
}

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

// PHP snippet that fires the same call from within WordPress hosting
const SNIPPET_PHP = `
$fields = array(
  'firstname' => 'בדיקה',
  'lastname'  => 'אוטומטית',
  'mobile'    => '0500000000',
  'email'     => 'test-claude@ishadama.co.il',
  'cf_2459'   => 'בוקר',
);

$api_response = wp_remote_post(
  'https://api.scallacrm.co.il/modules/Webforms/capture.php?webform_id=00917cf48fd3e13e47d550e0f34a551b',
  array(
    'method'  => 'POST',
    'timeout' => 15,
    'body'    => $fields,
  )
);

$app_response = wp_remote_post(
  'https://app.scallacrm.co.il/modules/Webforms/capture.php?webform_id=00917cf48fd3e13e47d550e0f34a551b',
  array(
    'method'  => 'POST',
    'timeout' => 15,
    'body'    => $fields,
  )
);

$out = array(
  'api_status'  => is_wp_error($api_response) ? 'WP_Error: ' . $api_response->get_error_message() : wp_remote_retrieve_response_code($api_response),
  'api_body'    => is_wp_error($api_response) ? '' : wp_remote_retrieve_body($api_response),
  'app_status'  => is_wp_error($app_response) ? 'WP_Error: ' . $app_response->get_error_message() : wp_remote_retrieve_response_code($app_response),
  'app_body'    => is_wp_error($app_response) ? '' : wp_remote_retrieve_body($app_response),
);

update_option('_claude_scalla_test', json_encode($out), false);
`;

(async () => {
  const date = new Date().toISOString().slice(0, 10);
  const dir  = path.join("diagnostics", date);
  fs.mkdirSync(dir, { recursive: true });

  let md = `# Scalla API Test — ${date}\n\n`;

  // 1. Test from GitHub Actions runner
  console.log("→ Testing Scalla API from GitHub Actions runner...");
  const [apiRes, appRes] = await Promise.all([
    postForm(SCALLA_API_URL, TEST_FIELDS),
    postForm(SCALLA_APP_URL, TEST_FIELDS),
  ]);
  md += `## Test from GitHub Actions (external)\n\n`;
  md += `| URL | Status | Response |\n|---|---|---|\n`;
  md += `| api.scallacrm.co.il | ${apiRes.status || apiRes.error} | \`${(apiRes.body || "").slice(0, 200)}\` |\n`;
  md += `| app.scallacrm.co.il | ${appRes.status || appRes.error} | \`${(appRes.body || "").slice(0, 200)}\` |\n\n`;

  // 2. Test from within WordPress (hosting outbound)
  console.log("→ Testing from within WordPress hosting...");
  const create = await req("/wp-json/code-snippets/v1/snippets", {
    method: "POST",
    body: { name: "_claude_scalla_test_" + Date.now(), code: SNIPPET_PHP, scope: "php-functions", active: false, priority: 1 },
  });
  const snippetId = create.json?.id;
  await req(`/wp-json/code-snippets/v1/snippets/${snippetId}`, { method: "POST", body: { active: true } });
  await req("/");
  await new Promise((r) => setTimeout(r, 5000));

  const expose = await req("/wp-json/code-snippets/v1/snippets", {
    method: "POST",
    body: {
      name: "_claude_expose3_" + Date.now(),
      code: `register_setting('general', '_claude_scalla_test', ['show_in_rest' => true, 'type' => 'string', 'default' => '']);`,
      scope: "php-functions", active: false, priority: 1,
    },
  });
  const exposeId = expose.json?.id;
  await req(`/wp-json/code-snippets/v1/snippets/${exposeId}`, { method: "POST", body: { active: true } });
  await req("/");
  await new Promise((r) => setTimeout(r, 2000));

  const settings = await req("/wp-json/wp/v2/settings");
  const raw = settings.json?._claude_scalla_test;

  // Cleanup
  for (const id of [snippetId, exposeId].filter(Boolean)) {
    await req(`/wp-json/code-snippets/v1/snippets/${id}`, { method: "DELETE" });
  }
  const cleanup = await req("/wp-json/code-snippets/v1/snippets", {
    method: "POST",
    body: { name: "_cleanup_" + Date.now(), code: `delete_option('_claude_scalla_test');`, scope: "php-functions", active: true, priority: 1 },
  });
  const cleanId = cleanup.json?.id;
  await req("/");
  await new Promise((r) => setTimeout(r, 1000));
  if (cleanId) await req(`/wp-json/code-snippets/v1/snippets/${cleanId}`, { method: "DELETE" });

  md += `## Test from WordPress hosting (outbound)\n\n`;
  if (raw) {
    let parsed = {};
    try { parsed = JSON.parse(raw); } catch {}
    md += `| URL | Status | Response |\n|---|---|---|\n`;
    md += `| api.scallacrm.co.il | ${parsed.api_status} | \`${(parsed.api_body || "").slice(0, 200)}\` |\n`;
    md += `| app.scallacrm.co.il | ${parsed.app_status} | \`${(parsed.app_body || "").slice(0, 200)}\` |\n\n`;
  } else {
    md += `_Could not retrieve WordPress-side test result._\n\n`;
  }

  md += `## What this means\n\n`;
  md += `- If GitHub Actions got 200 but WordPress got WP_Error/timeout → hosting is blocking outbound connections to Scalla\n`;
  md += `- If both got non-200 → the webform_id is expired or wrong endpoint\n`;
  md += `- If one subdomain (api vs app) works and the other doesn't → need to update the URL in the plugin\n`;
  md += `- If both return 200 → API is reachable; the issue is in how fields are being sent\n`;

  fs.writeFileSync(path.join(dir, "scalla-api-test.md"), md);
  console.log("Wrote " + path.join(dir, "scalla-api-test.md"));
})();
