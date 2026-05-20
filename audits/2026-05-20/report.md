# Audit — 2026-05-20 (baseline)

Site: https://ishadama.co.il
Source: Google PageSpeed Insights v5

## Mobile

| Metric | Value |
|---|---|
| Performance | **50** |
| SEO | **100** |
| Accessibility | **82** |
| Best Practices | **96** |
| LCP | 5.2 s |
| CLS | 0 |
| TBT | 950 ms |
| FCP | 1.6 s |
| Speed Index | 8.5 s |

### Top opportunities
  - **Reduce unused JavaScript** _(save ~300ms)_
  - **Minify CSS**
  - **Minify JavaScript**

### Failing audits (SEO + Accessibility)
  - **Elements with an ARIA `[role]` that require children to contain a specific `[role]` are missing some or all of those required children.** — Some ARIA parent roles must contain specific child roles to perform their intended accessibility functions.
  - **Background and foreground colors do not have a sufficient contrast ratio.** — Low-contrast text is difficult or impossible for many users to read.
  - **Heading elements are not in a sequentially-descending order** — Properly ordered headings that do not skip levels convey the semantic structure of the page, making it easier to navigate and understand when using assistive technologies.
  - **Links do not have a discernible name** — Link text (and alternate text for images, when used as links) that is discernible, unique, and focusable improves the navigation experience for screen reader users.
  - **Skip links are not focusable.** — Including a skip link can help users skip to the main content to save time.
  - **Some elements have a `[tabindex]` value greater than 0** — A value greater than 0 implies an explicit navigation ordering.

## Desktop

| Metric | Value |
|---|---|
| Performance | **63** |
| SEO | **100** |
| Accessibility | **82** |
| Best Practices | **96** |
| LCP | 0.9 s |
| CLS | 0.068 |
| TBT | 1,170 ms |
| FCP | 0.7 s |
| Speed Index | 2.7 s |

### Top opportunities
  - **Reduce unused JavaScript**
  - **Minify JavaScript**
  - **Minify CSS**

### Failing audits (SEO + Accessibility)
  - **Elements with an ARIA `[role]` that require children to contain a specific `[role]` are missing some or all of those required children.** — Some ARIA parent roles must contain specific child roles to perform their intended accessibility functions.
  - **Background and foreground colors do not have a sufficient contrast ratio.** — Low-contrast text is difficult or impossible for many users to read.
  - **Heading elements are not in a sequentially-descending order** — Properly ordered headings that do not skip levels convey the semantic structure of the page, making it easier to navigate and understand when using assistive technologies.
  - **Links do not have a discernible name** — Link text (and alternate text for images, when used as links) that is discernible, unique, and focusable improves the navigation experience for screen reader users.
  - **Skip links are not focusable.** — Including a skip link can help users skip to the main content to save time.
  - **Some elements have a `[tabindex]` value greater than 0** — A value greater than 0 implies an explicit navigation ordering.

