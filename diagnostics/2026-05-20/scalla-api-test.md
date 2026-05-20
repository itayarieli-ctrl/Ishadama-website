# Scalla API Test — 2026-05-20

## Test from GitHub Actions (external)

| URL | Status | Response |
|---|---|---|
| api.scallacrm.co.il | 200 | `{"success":false,"message":"Webforms limit reached"}` |
| app.scallacrm.co.il | 200 | `{"success":false,"message":"Webforms limit reached"}` |

## Test from WordPress hosting (outbound)

| URL | Status | Response |
|---|---|---|
| api.scallacrm.co.il | 403 | `<!DOCTYPE html><html lang="en-US"><head><title>Just a moment...</title><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><meta http-equiv="X-UA-Compatible" content="IE=Edge"><meta nam` |
| app.scallacrm.co.il | 403 | `<!DOCTYPE html><html lang="en-US"><head><title>Just a moment...</title><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><meta http-equiv="X-UA-Compatible" content="IE=Edge"><meta nam` |

## What this means

- If GitHub Actions got 200 but WordPress got WP_Error/timeout → hosting is blocking outbound connections to Scalla
- If both got non-200 → the webform_id is expired or wrong endpoint
- If one subdomain (api vs app) works and the other doesn't → need to update the URL in the plugin
- If both return 200 → API is reachable; the issue is in how fields are being sent
