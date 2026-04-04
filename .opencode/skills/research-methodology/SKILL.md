<!-- AUTO-GENERATED from .ai/ — DO NOT EDIT. Run "npm run sync-ai" to regenerate. -->

# Research Methodology

How to conduct and document research for video content.

## File Locations

| Output | Path |
|--------|------|
| Research document | `pipeline.research.activePath` (from config.json — never compute this yourself) |
| Raw data files | `channels/<channel>/videos/<slug>/research/data/` |
| Source snapshots | `channels/<channel>/videos/<slug>/research/sources/` |

## Document Format

```markdown
# Research: <Topic>
> version: <N>
> based_on: —
> date: <ISO date>

## Key Findings
- Finding [source](url)

## Data & Statistics
- Stat [source](url)

## Suggested Angles
- Angle: why it matters

## Sources
1. [Title](url) — description
```

## Progressive Writing Protocol

**Never write the full document at once.** Follow this order strictly:

1. Create the file immediately with just the header + section names as empty placeholders
2. Fill in `## Key Findings` — write to disk
3. Fill in `## Data & Statistics` — write to disk
4. Fill in `## Suggested Angles` — write to disk
5. Fill in `## Sources` — write to disk
6. Final pass: add inline source links, resolve `⚠️ UNVERIFIED` — write to disk

At every step the file on disk must be a coherent, readable document. If the task times out after step 3, steps 1–3 are recoverable without redoing.

## Rules

- **Every factual claim needs an inline source link.** No exceptions.
- Flag unverified claims with `⚠️ UNVERIFIED` — resolve before marking complete.
- Present summary, wait for user approval before marking complete.
- Cross-reference multiple sources for key statistics.

## Coordinating with Collector

Researcher is the brain, Collector is the hands for bulk fetching.

- **You decide:** what data is needed, what search terms to use, what sources to target
- **Collector fetches:** actual content (articles, CSVs, web data, statistics) based on your instructions
- Give Collector specific instructions: what to fetch, where to save (`research/data/` or `research/sources/`), any filtering criteria (recency, credibility, format)
- Review what Collector returns — verify quality and relevance before incorporating into the research document
- Don't send Collector for single lookups you can do yourself — only for bulk fetching tasks
