# WordPress Diagnostic — 2026-05-23

Site: https://ishadama.co.il

## Auth

✅ Authenticated as **איש אדמה** (id 1)
Roles: administrator
Capabilities: 88 caps

## Site info

- Name: איש אדמה
- Description: קרקעות בהשקעה בטוחה
- WP namespaces present: oembed/1.0, code-snippets/v1, rankmath/v1, rankmath/v1/setupWizard, elementor-one/v1, complianz/v1, complianz_tc/v1, elementor/v1, elementor-pro/v1, elementor-hello-elementor/v1, rankmath/v1/ca, rankmath/v1/an, rankmath/v1/in, rankmath/v1/status, google-site-kit/v1, elementor/v1/documents, elementor-ai/v1, elementor/v1/feedback, wp/v2, wp-site-health/v1, wp-block-editor/v1, wp-abilities/v1

## Plugins (active)

- **Admin and Site Enhancements (ASE)** (admin-site-enhancements/admin-site-enhancements) v8.8.0
- **Code Snippets** (code-snippets/code-snippets) v3.9.6
- **Complianz - Terms and Conditions** (complianz-terms-conditions/complianz-terms-conditions) v1.3.0
- **Complianz | GDPR/CCPA Cookie Consent** (complianz-gdpr/complianz-gpdr) v7.4.6
- **אלמנטור** (elementor/elementor) v4.0.9
- **אלמנטור פרו** (elementor-pro/elementor-pro) v4.0.4
- **HandL UTM Grabber** (handl-utm-grabber/handl-utm-grabber) v2.9.0
- **Header Footer Code Manager** (header-footer-code-manager/99robots-header-footer-code-manager) v1.1.44
- **Meta pixel for WordPress** (official-facebook-pixel/facebook-for-wordpress) v5.1.0
- **PhastPress** (phastpress/phastpress) v3.9
- **Rank Math SEO** (seo-by-rank-math/rank-math) v1.0.270
- **scallacrm** (wp-scalla/scalla) v0.1.0
- **Site Kit by Google** (google-site-kit/google-site-kit) v1.179.0
- **Unlist Posts &amp; Pages** (unlist-posts/unlist-posts) v1.2.1
- **UpdraftPlus - Backup/Restore** (updraftplus/updraftplus) v1.26.4
- **WP Consent API** (wp-consent-api/wp-consent-api) v2.0.1
- **WPForms Lite** (wpforms-lite/wpforms) v1.10.0.5
- **WP Mail SMTP** (wp-mail-smtp/wp_mail_smtp) v4.8.0

## Plugins (inactive)

- Compliance by Hu-manity.co (cookie-notice/cookie-notice)
- CookieYes | GDPR Cookie Consent (cookie-law-info/cookie-law-info)
- שליחת אימייל - תחליף ל SMTP, שליחה באמצעות API, ויומן אימיילים. (site-mailer/site-mailer)
- Taboola (taboola/taboola_widget)
- WP Fastest Cache (wp-fastest-cache/wpFastestCache)
- WP Meteor (wp-meteor/wp-meteor)
- Yoast SEO (wordpress-seo/wp-seo)
- Zapier for WordPress (zapier/zapier)

## Lead-funnel-related plugins (filtered)

- **scallacrm** (wp-scalla/scalla) — status: **active**
- **WPForms Lite** (wpforms-lite/wpforms) — status: **active**
- **Zapier for WordPress** (zapier/zapier) — status: **inactive**

## WPForms REST endpoints


**/wp-json/wpforms/v1** → HTTP 200
```json
{
  "namespace": "wpforms/v1",
  "routes": {
    "/wpforms/v1": {
      "namespace": "wpforms/v1",
      "methods": [
        "GET"
      ],
      "endpoints": [
        {
          "methods": [
            "GET"
          ],
          "args": {
            "namespace": {
              "default": "wpforms/v1",
              "required": false
            },
            "context": {
              "default": "view",
              "required": false
            }
          }
        }
      ],
      "_links": {
        "self": [
          {
            "href": "https://ishadama.co.il/wp-json/wpforms/v1"
          }
        ]
      }
    },
    "/wpforms/v1/elementor/themes": {
      "namespace": "wpforms/v1",
      "methods": [
        "GET"
      ],
      "endpoints": [
        {
          "methods": [
            "GET"
          ],
          "args": []
        }
      ],
      "_links": {
        "self": [
          {
            "href": "https://ishadama.co.il/wp-json/wpforms/v1/elementor/themes"
          }
        ]
      }
    },
    "/wpforms/v1/elementor/themes/custom": {
      "namespace": "wpforms/v1",
      "methods": [
        "POST"
      ],
      "endpoints": [
        {
          "methods": [
            "POST"
          ],
          "args": []
        }
      ],
      "_links": {
        "self": [
          {
            "href": "https://ishadama.co.il/wp-json/wpforms/v1/elementor/themes/custom"
          }
        ]
      }
    },
    "/wpforms/v1/forms": {
      "namespace": "wpforms/v1",
      "methods": [
        "GET"
      ],
      "endpoints": [
        {
          "methods": [
            "GET"
          ],
          "args": []
        }
      ],
      "_links": {
        "self": [
          {
            "href": "https://ishadama.co.il/wp-json/wpforms/v1/forms"
          }
        ]
      }
    },
    "/wpforms/v1/themes": {
      "namespace": "wpforms/v1",
      "methods": [
        "GET"
      ],
      "endpoints": [
        {
          "method
```

**/wp-json/wpforms/v1/forms** → HTTP 401
```
{"code":"rest_forbidden","message":"This route is private.","data":{"status":401}}
```


## Scalla REST endpoints (probing)

**/wp-json/scalla/v1** → HTTP 404
**/wp-json/scalla/v1/settings** → HTTP 404
**/wp-json/scalla-crm/v1** → HTTP 404


## Forms (custom post type wpforms)

HTTP 404

## Pages referencing forms (heuristic)

- דף נחיתה חדש לקמפיין → https://ishadama.co.il/%d7%93%d7%a3-%d7%a0%d7%97%d7%99%d7%aa%d7%94-%d7%97%d7%93%d7%a9-%d7%9c%d7%a7%d7%9e%d7%a4%d7%99%d7%99%d7%9f/

## Findings summary

✅ No fatal issues detected at REST layer
