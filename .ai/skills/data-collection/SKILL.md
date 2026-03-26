# Data Collection

How to fetch, organize, and save text/data content from the internet.

## What You Collect

| Type | Examples | Destination |
|------|----------|-------------|
| Articles/web pages | News articles, reports, blog posts | `channels/<channel>/videos/<slug>/research/sources/` |
| Raw data | CSVs, JSON datasets, statistics tables | `channels/<channel>/videos/<slug>/research/data/` |
| Statistics | Individual data points, figures, quotes | Inline in research document |

## Commands

```bash
# Fetch web content
npm run collect <slug> data "<url>"

# Search and save
npm run collect <slug> search "<query>"
```

## File Naming

Descriptive, source-tied names:
- `world-bank-gdp-2024.csv` — NOT `data1.csv`
- `reuters-trade-war-article.md` — NOT `source1.md`
- `imf-inflation-forecast.json` — NOT `raw.json`

## Workflow

1. Receive instructions from calling agent (researcher, content-writer) with: what to fetch, search terms, destination path
2. Fetch content using WebFetch or WebSearch tools
3. Save to specified location with descriptive file name
4. For web articles: save as markdown with source URL and fetch date in header
5. For data files: preserve original format, add metadata header if possible
6. Report back: file path, size, brief content summary

## Saved File Header

Every saved source file should include:
```markdown
> source: <URL>
> fetched: <ISO date>
> query: <search terms used, if applicable>
```

## Rules

- Save immediately — never hold in memory
- One file per source (don't merge multiple articles)
- Preserve original data integrity — don't clean/transform unless explicitly asked
- Flag quality issues: paywalled content, empty results, suspicious data
