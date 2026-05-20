# Ishadama SEO Project

Working repository for the SEO upgrade of **ishadama.co.il** (איש אדמה — boutique agricultural-land investment firm).

This repo is **not the website itself**. The website is a WordPress site. This repo is where we plan, audit, and track progress.

## Workflow

- **Claude Code (cloud sessions):** runs audits, plans changes, writes instructions.
- **Claude in Chrome (browser extension):** executes WordPress edits following the instructions in `plans/`.
- **You:** review, approve, watch the numbers improve.

## Folders

- `audits/` — periodic snapshots of the site's health (PageSpeed scores, SEO findings). One folder per date.
- `plans/` — change requests, prioritized fixes, content briefs.
- `scripts/` — automation (e.g., the periodic audit runner).

## Running an audit

Requires a Google PageSpeed Insights API key in the env var `PSI_API_KEY`.

```bash
PSI_API_KEY=your_key_here node scripts/audit.js
```

This writes JSON results and a Markdown report into `audits/YYYY-MM-DD/`.

## Status

See `plans/roadmap.md` for current phase and next actions.
