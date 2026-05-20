# SEO Upgrade Roadmap — ishadama.co.il

Revised after 4-cycle self-audit. Strategy-first, not tooling-first.

## Success criteria (to be confirmed)

- [ ] Define with user: leads/month target, keyword ranking goals, traffic target
- [ ] Set a 90-day milestone and a 6-month milestone

## Baseline (2026-05-20)

| | Mobile | Desktop |
|---|---|---|
| Performance | 50 | 63 |
| SEO (technical only) | 100 | 100 |
| Accessibility | 82 | 82 |
| Best Practices | 96 | 96 |

Mobile LCP **5.2s**. Note: Lighthouse SEO 100 means *technical plumbing is clean* — says nothing about rankings or keyword targeting.

See `audits/2026-05-20/report.md` for detail.

---

## Phase 0 — Baseline ✅ Done 2026-05-20

- Locked in PageSpeed scores (single-run; need 3–5 runs averaged to be rigorous)
- Repo structure in place

---

## Phase 1 — Strategy & Discovery 🔜 Next

**Goal:** understand the business and market before touching anything.

No edits happen until this phase is complete.

### 1a — Business discovery

- [ ] What is the primary conversion goal? (leads, WhatsApp, phone calls?)
- [ ] How many leads does the site generate now per month?
- [ ] Is the site the primary sales funnel, or mostly branding/credibility?
- [ ] Any tool budget? ($100/mo Ahrefs/Semrush would change the approach)
- [ ] Any Google Analytics / Search Console connected?

### 1b — Keyword research

- [ ] Find the 10–20 keywords customers actually search in Hebrew
- [ ] Score each by: search volume / intent (buy vs. learn) / competition
- [ ] Map keywords to existing pages; identify gaps
- [ ] Tool: Google Keyword Planner (free) + autocomplete + Trends
  → upgrade to Ahrefs/Semrush if budget available

### 1c — Competitor analysis

- [ ] Identify 5 firms ranking for target keywords
- [ ] For each: page structure, content depth, trust signals, schema, backlinks
- [ ] Find the gaps — what they do that the site doesn't

### 1d — Full on-page audit (all pages, not just homepage)

- [ ] Audit each indexed page: title, H1, content, images, CTA, trust signals
- [ ] Verify Hadera duplicate-page issue (cannibalisation or legitimate differentiation?)
- [ ] Map current pages against keyword research above

### 1e — Change protocol setup

Every change from Phase 2 onward follows this pattern regardless of who executes:

1. Pre-snapshot (HTML + PSI score committed to repo)
2. Change spec (what + why + expected impact)
3. Execution
4. Post-snapshot + diff committed
5. Re-audit 7 days later

---

## Phase 2 — Conversion & Trust (highest ROI)

Touches that move leads, not just rankings.

- [ ] WhatsApp CTA prominent on every page (not buried in footer)
- [ ] Testimonials / case studies — specific numbers, named clients if possible
- [ ] Trust signals: company number, regulatory disclosures, years in business
- [ ] LocalBusiness + RealEstateAgent schema (JSON-LD)
- [ ] FAQ schema on relevant pages
- [ ] Google Business Profile — set up / optimize

---

## Phase 3 — Technical performance (speed + Core Web Vitals)

Affects conversion rate and Google Ads cost more than organic rankings.

- [ ] Diagnose LCP root cause (hero image? render-blocking JS? server TTFB?)
- [ ] Image compression + next-gen formats (WebP/AVIF)
- [ ] Reduce unused JS (likely WordPress/Elementor plugins)
- [ ] Minify CSS + JS
- [ ] Browser cache headers
- [ ] Re-audit to confirm improvement (3-run average)

---

## Phase 4 — On-page SEO

- [ ] Revise page titles: one clear promise per page, not pipe-separated keyword lists
- [ ] Meta descriptions: specific, with a call to action
- [ ] H1 → one per page, matches primary keyword
- [ ] Fix heading order issues (found in baseline audit)
- [ ] Fix accessibility issues (color contrast, link labels, tabindex)
- [ ] Rank Math: configure per-page SEO settings
- [ ] Resolve Hadera duplicate pages (merge or differentiate)

---

## Phase 5 — Content production

Only starts after Phases 1–4 are validated.

- [ ] Identify 3–5 content gaps from keyword research
- [ ] Produce one article per gap (Hebrew, 600–1000 words, genuine expertise)
- [ ] Internal linking between new and existing content

---

## Phase 6 — Off-page & local SEO

- [ ] Google Business Profile reviews strategy
- [ ] Israeli real-estate directories / listings
- [ ] Link outreach (local news, investment forums)

---

## Phase 7 — Ongoing measurement

- [ ] Monthly audit (scripts/audit.js on a schedule)
- [ ] Monthly competitor benchmark
- [ ] Quarterly roadmap review against success criteria

---

## Access & tooling decisions (deferred to Phase 1 completion)

The question of *how* changes are executed (direct REST API, Claude in Chrome, manual) is deferred until after Phase 1. Editing priority and method depend on what the discovery phase reveals.

What is decided:
- Every change produces a pre/post audit trail committed to this repo
- Elementor body content edits = Elementor editor (risk of JSON breakage too high for API edits)
- Meta, schema, Rank Math settings, redirects = REST API (safe, no layout risk)
