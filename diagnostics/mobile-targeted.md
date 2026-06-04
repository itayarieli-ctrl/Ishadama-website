# Mobile Overflow — Targeted Diagnostic

**Run:** 2026-06-04T08:09:37.565Z

## Viewport

- innerWidth: **1040px**
- viewport meta (after JS): `width=device-width, initial-scale=1`
- visual viewport: `{"width":393,"height":851,"scale":1,"offsetLeft":0,"pageLeft":-646}`

## html computed

```json
{
  "width": "393px",
  "maxWidth": "none",
  "minWidth": "0px",
  "overflow": "visible",
  "overflowX": "visible",
  "position": "static",
  "direction": "rtl",
  "offsetWidth": 393,
  "clientWidth": 393,
  "scrollWidth": 1040,
  "rect": {}
}
```

## body computed

```json
{
  "width": "393px",
  "maxWidth": "none",
  "minWidth": "0px",
  "overflow": "hidden auto",
  "overflowX": "hidden",
  "direction": "rtl",
  "offsetWidth": 393,
  "clientWidth": 393,
  "scrollWidth": 1040,
  "rect": {}
}
```

## Root containers

```json
[
  {
    "tag": "HTML",
    "id": null,
    "classes": "",
    "width": "393px",
    "minWidth": "0px",
    "maxWidth": "none",
    "overflowX": "visible"
  },
  {
    "tag": "BODY",
    "id": null,
    "classes": "rtl home wp-singular page-template page-template-elementor_header_footer page page-id-53 wp-custom-l",
    "width": "393px",
    "minWidth": "0px",
    "maxWidth": "none",
    "overflowX": "hidden"
  },
  {
    "tag": "HEADER",
    "id": null,
    "classes": "elementor elementor-2512 elementor-location-header",
    "width": "393px",
    "minWidth": "0px",
    "maxWidth": "none",
    "overflowX": "visible"
  },
  {
    "tag": "DIV",
    "id": null,
    "classes": "elementor elementor-53",
    "width": "393px",
    "minWidth": "0px",
    "maxWidth": "none",
    "overflowX": "visible"
  },
  {
    "tag": "DIV",
    "id": null,
    "classes": "elementor elementor-3463 swiper-slide e-loop-item e-loop-item-3567 post-3567 post type-post status-p",
    "width": "293px",
    "minWidth": "auto",
    "maxWidth": "none",
    "overflowX": "visible"
  },
  {
    "tag": "DIV",
    "id": null,
    "classes": "elementor elementor-3463 swiper-slide e-loop-item e-loop-item-4818 post-4818 post type-post status-p",
    "width": "293px",
    "minWidth": "auto",
    "maxWidth": "none",
    "overflowX": "visible"
  },
  {
    "tag": "DIV",
    "id": null,
    "classes": "elementor elementor-3463 swiper-slide e-loop-item e-loop-item-3607 post-3607 post type-post status-p",
    "width": "293px",
    "minWidth": "auto",
    "maxWidth": "none",
    "overflowX": "visible"
  },
  {
    "tag": "DIV",
    "id": null,
    "classes": "elementor elementor-3463 swiper-slide e-loop-item e-loop-item-3587 post-3587 post type-post status-p",
    "width": "293px",
    "minWidth": "auto",
    "maxWidth": "none",
    "overflowX": "visible"
  },
  {
    "tag": "DIV",
    "id": null,
    "classes": "elementor elementor-3463 swiper-slide e-loop-item e-loop-item-3567 post-3567 post type-post status-p",
    "width": "293px",
    "minWidth": "auto",
    "maxWidth": "none",
    "overflowX": "visible"
  },
  {
    "tag": "DIV",
    "id": null,
    "classes": "elementor elementor-3463 swiper-slide e-loop-item e-loop-item-4818 post-4818 post type-post status-p",
    "width": "293px",
    "minWidth": "auto",
    "maxWidth": "none",
    "overflowX": "visible"
  },
  {
    "tag": "FOOTER",
    "id": null,
    "classes": "elementor elementor-2624 elementor-location-footer",
    "width": "393px",
    "minWidth": "0px",
    "maxWidth": "none",
    "overflowX": "visible"
  }
]
```

## Elements with positive-side overflow (extending beyond right edge)

Total: 19. Top 20 sorted by rightmost edge:

- **DIV**#swiper-wrapper-e26fff0057df2784 — left:-526 right:1292 width:1818
  - classes: `swiper-wrapper`
  - css width: 1818px, max-width: none
  - position: relative, transform: matrix(1, 0, 0, 1, 303, 0)

- **DIV** — left:999 right:1292 width:293
  - classes: `elementor elementor-3463 swiper-slide e-loop-item e-loop-item-3567 post-3567 post type-post status-publish format-standard has-post-thumbnail hentry category-blog swiper-slide-duplicate swiper-slide-p`
  - css width: 293px, max-width: none
  - position: relative, transform: matrix(1, 0, 0, 1, 0, 0)

- **A** — left:999 right:1292 width:293
  - classes: `elementor-element elementor-element-1c0f33a0 e-con-full e-flex e-con e-parent`
  - css width: 293px, max-width: 100%
  - position: relative, transform: null

- **DIV** — left:1019 right:1272 width:253
  - classes: `elementor-element elementor-element-37be3d86 elementor-widget__width-initial elementor-widget-mobile__width-inherit elementor-widget elementor-widget-theme-post-featured-image elementor-widget-image`
  - css width: 253px, max-width: 100%
  - position: relative, transform: null

- **DIV** — left:1019 right:1272 width:253
  - classes: `elementor-widget-container`
  - css width: 253px, max-width: none
  - position: static, transform: null

- **IMG** — left:1019 right:1272 width:253
  - classes: `attachment-full size-full wp-image-3626`
  - css width: 253px, max-width: 100%
  - position: static, transform: null

- **DIV** — left:1019 right:1272 width:253
  - classes: `elementor-element elementor-element-d78d85b e-con-full e-flex e-con e-child`
  - css width: 253px, max-width: none
  - position: relative, transform: null

- **DIV** — left:1019 right:1272 width:253
  - classes: `elementor-element elementor-element-2ba6fdee elementor-widget-mobile__width-inherit elementor-widget elementor-widget-heading`
  - css width: 253px, max-width: 100%
  - position: relative, transform: null

- **DIV** — left:1019 right:1272 width:253
  - classes: `elementor-widget-container`
  - css width: 253px, max-width: none
  - position: static, transform: null

- **P** — left:1019 right:1272 width:253
  - classes: `elementor-heading-title elementor-size-default`
  - css width: 253px, max-width: none
  - position: static, transform: null

- **DIV** — left:1019 right:1272 width:253
  - classes: `elementor-element elementor-element-7177b46b elementor-widget-mobile__width-inherit elementor-widget elementor-widget-theme-post-title elementor-page-title elementor-widget-heading`
  - css width: 253px, max-width: 100%
  - position: relative, transform: null

- **DIV** — left:1019 right:1272 width:253
  - classes: `elementor-widget-container`
  - css width: 253px, max-width: none
  - position: static, transform: null

- **H4** — left:1019 right:1272 width:253
  - classes: `elementor-heading-title elementor-size-default`
  - css width: 253px, max-width: none
  - position: static, transform: null

- **DIV** — left:1019 right:1272 width:253
  - classes: `elementor-element elementor-element-64855827 animated-slow elementor-widget-divider--view-line elementor-invisible elementor-widget elementor-widget-divider`
  - css width: 253px, max-width: 100%
  - position: relative, transform: null

- **DIV** — left:1019 right:1272 width:253
  - classes: `elementor-widget-container`
  - css width: 253px, max-width: none
  - position: static, transform: null

- **DIV** — left:1019 right:1272 width:253
  - classes: `elementor-divider`
  - css width: 253px, max-width: none
  - position: static, transform: null

- **SPAN** — left:1019 right:1272 width:253
  - classes: `elementor-divider-separator`
  - css width: 253px, max-width: none
  - position: static, transform: null

- **DIV** — left:1019 right:1272 width:253
  - classes: `elementor-element elementor-element-bcd635d elementor-widget-mobile__width-inherit elementor-widget elementor-widget-theme-post-excerpt`
  - css width: 253px, max-width: 100%
  - position: relative, transform: null

- **DIV** — left:1019 right:1272 width:253
  - classes: `elementor-widget-container`
  - css width: 253px, max-width: none
  - position: static, transform: null

## Elements with explicit width >= 500px

- **DIV** — width: 1040px — classes: `cmplz-cookiebanner banner-1 banner-a optin cmplz-bottom-right cmplz-categories-type-view-preferences cmplz-show`
- **DIV** — width: 1000px — classes: `cmplz-header`
- **DIV** — width: 1040px — classes: `cmplz-divider cmplz-divider-header`
- **DIV** — width: 1000px — classes: `cmplz-body`
- **DIV**#cmplz-message-1-optin — width: 995px — classes: `cmplz-message`
- **P** — width: 995px — classes: ``
- **DIV** — width: 1040px — classes: `cmplz-divider cmplz-footer`
- **DIV** — width: 1000px — classes: `cmplz-buttons`
- **BUTTON** — width: 1000px — classes: `cmplz-btn cmplz-accept`
- **BUTTON** — width: 1000px — classes: `cmplz-btn cmplz-deny`
- **BUTTON** — width: 1000px — classes: `cmplz-btn cmplz-view-preferences`
- **DIV** — width: 1000px — classes: `cmplz-documents cmplz-links`
- **DIV** — width: 1024px — classes: `elementor-icon`
- **svg**#Layer_1 — width: 1024px — classes: `[object SVGAnimatedString]`
- **DIV**#swiper-wrapper-e26fff0057df2784 — width: 1818px — classes: `swiper-wrapper`
