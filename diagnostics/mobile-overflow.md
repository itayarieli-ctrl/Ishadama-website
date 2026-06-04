# Mobile Overflow Diagnostic

**Run:** 2026-06-04T07:43:05.045Z
**URL:** https://ishadama.co.il

## Viewport meta

```
<meta name="viewport" content="width=device-width, initial-scale=1">
```

## Builders detected

```json
{
  "elementor": true,
  "phastpress": true,
  "rank_math": true
}
```

## HTML/Body classes

- html: `null`
- body: `rtl home wp-singular page-template page-template-elementor_header_footer page page-id-53 wp-custom-logo wp-embed-responsive wp-theme-hello-elementor hello-elementor-default elementor-default elementor-template-full-width elementor-kit-5 elementor-page elementor-page-53`
- body inline style: `null`

## Style blocks

- Count: 43
- Total size: 293309 bytes

## Important selectors (html/body/header) with width/overflow rules

- `.page-header .entry-title,.site-footer .footer-inner,.site-footer:not(.dynamic-footer),.site-header ` → `margin-inline-end:auto;margin-inline-start:auto;width:100%`
- `body.rtl .e-con` → `--padding-inline-start:var(--padding-right);--padding-inline-end:var(--padding-left);--margin-inline-start:var(--margin-right);--margin-inline-end:var(--margin-left);--border-inline-start-width:var(--`
- `.elementor-section.elementor-section-boxed > .elementor-container` → `max-width:1140px;`
- `.elementor-section.elementor-section-boxed > .elementor-container` → `max-width:1024px;`
- `.elementor-section.elementor-section-boxed > .elementor-container` → `max-width:767px;`
- `body` → `overflow-x:hidden;`

## Suspicious patterns

```json
[
  {
    "pattern": "fixed_width_large",
    "count": 46,
    "samples": [
      "width:1200px",
      "width:1140px",
      "width:2400px",
      "width:1026px",
      "width:1367px"
    ]
  },
  {
    "pattern": "negative_margin_large",
    "count": 8,
    "samples": [
      "margin-top:-60px",
      "margin:-220px",
      "margin-bottom:-300px",
      "margin-bottom:-250px",
      "margin-bottom:-250px"
    ]
  },
  {
    "pattern": "transform_translate_x",
    "count": 1,
    "samples": [
      "translateX(-50%)"
    ]
  }
]
```

## Inline widths > 400px (first 20)


## Widths in first 5KB of body

```json
[]
```

## Stylesheets loaded (0)

