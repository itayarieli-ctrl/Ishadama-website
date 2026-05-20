# WP Deep Diagnostic — 2026-05-20

Site: https://ishadama.co.il

## Scalla plugin options

- **scalla_debug_last**: `a:5:{s:6:"fields";a:8:{s:9:"firstname";s:8:"דבאג";s:8:"lastname";s:6:"דוג";s:13:"field_9c64e60";s:6:"דוג";s:6:"mobile";s:10:"0506660777";s:7:"cf_2459";s:8:"בוקר";s:5:"email";s:21:"debug_test@test.co.i`
- **scallacampid1**: `קמפיין טאבולה סוף עמוד`
- **scallacampid10**: ``
- **scallacampid2**: `טופס אתר וורדפרס`
- **scallacampid3**: `דה מרקר אמצע עמוד`
- **scallacampid4**: `דה מרקר סוף עמוד`
- **scallacampid5**: `טאבולה אמצע עמוד`
- **scallacampid6**: ``
- **scallacampid7**: ``
- **scallacampid8**: ``
- **scallacampid9**: ``
- **scallacamppass10**: ``
- **scallacamppass2**: ``
- **scallacamppass3**: ``
- **scallacamppass4**: ``
- **scallacamppass5**: ``
- **scallacamppass6**: ``
- **scallacamppass7**: ``
- **scallacamppass8**: ``
- **scallacamppass9**: ``

## WPForms forms

_No WPForms forms found in DB._

## WPForms global settings

```json
{
  "modern-markup": "1",
  "modern-markup-is-set": true,
  "modern-markup-hide-setting": true
}
```

## WP Mail SMTP (sanitised)

```json
{
  "mail": {
    "from_email": "admin@ishadama.co.il",
    "from_name": "ishadama.co.il",
    "mailer": "gmail",
    "return_path": false,
    "from_email_force": false,
    "from_name_force": false
  },
  "smtp": {
    "autotls": "yes",
    "auth": "yes",
    "host": "",
    "port": "587",
    "encryption": "tls",
    "user": "",
    "pass": ""
  },
  "general": {
    "summary_report_email_disabled": true
  },
  "gmail": {
    "client_id": "***REDACTED***",
    ***REDACTED***,
    "one_click_setup_enabled": false,
    "one_click_setup_credentials": {
      "key": "",
      "token": ""
    },
    "one_click_setup_user_details": {
      "email": ""
    },
    "is_setup_wizard_auth": false,
    "auth_code": "4/0AeoWuM_cfgzic9Bu-Bt_7gLlcl-ZjZ8mP9_EYurEJvtej1uYe7bC6AxNgqNo0CDa3FzpLg",
    "access_token": {
      ***REDACTED***דף נחיתה חדש לקמפיין" (id 4120)

- Widget type: **form**
  - Form name: קמפיין נחיתה קטן
  - Fields:
    - recaptcha_v3 (type: recaptcha_v3, id: b4037f9)
    - שם (type: undefined, id: 90f6b7e)
    - טלפון (type: tel, id: 9df5f70)
    - מתי נוח (type: select, id: 40b1faf)
    - honeypot (type: honeypot, id: 9321423)
    - acceptance (type: acceptance, id: 4b40491)
    - html (type: html, id: 0dad83c)

<details><summary>Full widget settings</summary>

```json
{
  "form_name": "קמפיין נחיתה קטן",
  "form_fields": [
    {
      "_id": "b4037f9",
      "field_type": "recaptcha_v3",
      "recaptcha_badge": "bottomleft",
      "custom_id": "field_b4037f9"
    },
    {
      "custom_id": "firstname",
      "field_label": "שם",
      "placeholder": "שם",
      "width": "33",
      "dynamic": {
        "active": true
      },
      "_id": "90f6b7e"
    },
    {
      "custom_id": "mobile",
      "field_type": "tel",
      "required": "true",
      "field_label": "טלפון",
      "placeholder": "טלפון",
      "width": "33",
      "_id": "9df5f70"
    },
    {
      "_id": "40b1faf",
      "field_type": "select",
      "field_options": "מתי נוח לי?\nבוקר\nצהריים \nאחרהצ\n",
      "width": "33",
      "custom_id": "cf_2459",
      "field_label": "מתי נוח"
    },
    {
      "_id": "9321423",
      "field_type": "honeypot",
      "custom_id": "field_9321423"
    },
    {
      "_id": "4b40491",
      "field_type": "acceptance",
      "required": "true",
      "custom_id": "field_4b40491",
      "acceptance_text": "אני מאשר/ת קבלת דוא\"ל מאיש אדמה"
    },
    {
      "_id": "0dad83c",
      "field_type": "html",
      "field_html": "[scallacf7 scallacampid=\"דה מרקר אמצע עמוד\"]",
      "custom_id": "field_0dad83c",
      "__dynamic__": {
        "field_label": "[elementor-tag id=\"8f6923b\" name=\"shortcode\" settings=\"%7B%22shortcode%22%3A%22%5Bscallacf7%20scallacampid%3D%5C%22%D7%93%D7%94%20%D7%9E%D7%A8%D7%A7%D7%A8%20%D7%90%D7%9E%D7%A6%D7%A2%20%D7%A2%D7%9E%D7%95%D7%93%5C%22%5D%22%7D\"]"
      }
    }
  ],
  "show_labels": "",
  "button_size": "md",
  "step_next_label": "הבא",
  "step_previous_label": "הקודם",
  "button_text": "שליחה",
  "email_to": "admin@ishadama.co.il",
  "email_subject": "ליד חדש דה מרקר אמצע עמוד",
  "email_content": "[all-fields]",
  "email_from": "info@ishadama.co.il",
  "email_from_name": "איש אדמה",
  "email_to_2": "admin@ishadama.co.il",
  "email_subject_2": "הודעה חדשה מאת &quot;איש אדמה&quot;",
  "email_content_2": "[all-fields]",
  "email_from_2": "email@ishadama.co.il",
  "email_from_name_2": "איש אדמה",
  "email_reply_to_2": "admin@ishadama.co.il",
  "activecampaign_fields_map": [],
  "convertkit_fields_map": [],
  "drip_fields_map": [],
  "getresponse_fields_map": [],
  "mailchimp_fields_map": [],
  "mailerlite_fields_map": [],
  "custom_messages": "yes",
  "success_message": "נשלח בהצלחה",
  "error_message": "אירעה שגיאה",
  "server_message": "קיימת תקלה בשרת",
  "invalid_message": "שגיאה במילוי הטופס",
  "required_field_message": "שדה זה הוא שדה חובה.",
  "field_border_width": {
    "unit": "px",
    "top": "1",
    "right": "1",
    "bottom": "1",
    "left": "1",
    "isLinked": true
  },
  "field_border_radius": {
    "unit": "px",
    "top": "8",
    "right": "8",
    "bottom": "8",
    "left": "8",
    "isLinked": true
  },
  "button_border_border": "solid",
  "button_border_width": {
    "unit": "px",
    "top": "2",
    "right": "2",
    "bottom": "2",
    "left": "2",
 
```
</details>

- Widget type: **form**
  - Form name: קמפיין נחיתה
  - Fields:
    - recaptcha_v3 (type: recaptcha_v3, id: 2d55c53)
    - שם פרטי (type: undefined, id: f48ece7)
    - שם משפחה (type: undefined, id: b953709)
    - טלפון (type: tel, id: e33e4be)
    - שעות נוחות לשיחה (type: select, id: 8c9e190)
    - אימייל (type: email, id: 357e3e6)
    - acceptance (type: acceptance, id: 70cae7e)
    - honeypot (type: honeypot, id: ea6c8a4)
    - html (type: html, id: ec11413)

<details><summary>Full widget settings</summary>

```json
{
  "form_name": "קמפיין נחיתה",
  "form_fields": [
    {
      "_id": "2d55c53",
      "field_type": "recaptcha_v3",
      "recaptcha_badge": "bottomleft",
      "custom_id": "field_2d55c53"
    },
    {
      "custom_id": "firstname",
      "field_label": "שם פרטי",
      "width": "50",
      "dynamic": {
        "active": true
      },
      "_id": "f48ece7",
      "required": "true"
    },
    {
      "_id": "b953709",
      "field_label": "שם משפחה",
      "required": "true",
      "width": "50",
      "custom_id": "lastname"
    },
    {
      "_id": "e33e4be",
      "field_type": "tel",
      "field_label": "טלפון",
      "required": "true",
      "width": "50",
      "custom_id": "mobile"
    },
    {
      "_id": "8c9e190",
      "field_type": "select",
      "field_label": "שעות נוחות לשיחה",
      "required": "true",
      "field_options": "בוקר\nצהריים \nערב",
      "width": "50",
      "custom_id": "cf_2459"
    },
    {
      "custom_id": "email",
      "field_type": "email",
      "field_label": "אימייל",
      "_id": "357e3e6",
      "required": "true"
    },
    {
      "_id": "70cae7e",
      "field_type": "acceptance",
      "required": "true",
      "custom_id": "field_70cae7e",
      "acceptance_text": "אני מאשר/ת קבלת דוא\"ל מאיש אדמה"
    },
    {
      "_id": "ea6c8a4",
      "field_type": "honeypot",
      "custom_id": "field_ea6c8a4"
    },
    {
      "_id": "ec11413",
      "field_type": "html",
      "field_html": "[scallacf7 scallacampid=\"דה מרקר סוף עמוד\"]",
      "custom_id": "field_ec11413",
      "__dynamic__": {
        "field_label": "[elementor-tag id=\"a3e4bfc\" name=\"shortcode\" settings=\"%7B%22shortcode%22%3A%22%5Bscallacf7%20scallacampid%3D%5C%22%D7%93%D7%94%20%D7%9E%D7%A8%D7%A7%D7%A8%20%D7%A1%D7%95%D7%A3%20%D7%A2%D7%9E%D7%95%D7%93%5C%22%5D%22%7D\"]"
      }
    }
  ],
  "mark_required": "yes",
  "step_next_label": "הבא",
  "step_previous_label": "הקודם",
  "button_text": "שלח",
  "email_to": "admin@ishadama.co.il",
  "email_subject": "ליד חדש דה מרקר סוף עמוד",
  "email_content": "[all-fields]",
  "email_from": "info@ishadama.co.il",
  "email_from_name": "איש אדמה",
  "email_to_2": "admin@ishadama.co.il",
  "email_subject_2": "New message from &quot;איש אדמה&quot;",
  "email_content_2": "[all-fields]",
  "email_from_2": "email@ishadama.co.il",
  "email_from_name_2": "איש אדמה",
  "email_reply_to_2": "admin@ishadama.co.il",
  "activecampaign_fields_map": [],
  "convertkit_fields_map": [],
  "drip_fields_map": [],
  "getresponse_fields_map": [],
  "mailchimp_fields_map": [],
  "mailerlite_fields_map": [],
  "step_icon_shape": "rounded",
  "custom_messages": "yes",
  "success_message": "הטופס נשלח",
  "error_message": "שגיאה בשליחת הטופס",
  "server_message": "קיימת תקלה בשרת",
  "invalid_message": "שגיאה במילוי הטופס",
  "required_field_message": "This field is required.",
  "field_border_width": {
    "unit": "px",
    "top": "2",
    "right": "2",
    "bottom": "2",
    "left": "2",
    "isLinked": tr
```
</details>


## Pages with WPForms shortcodes

_None._

## Debug log (Scalla/WPForms mentions)

```
debug.log not found at /home/u310848492/domains/ishadama.co.il/public_html/wp-content/debug.log
```
