---
name: research-methodology
description: "NotebookLM-first research workflow — orchestrate research, format output into versioned documents"
---
<!-- AUTO-GENERATED from .ai/ — DO NOT EDIT. Run "npm run sync-ai" to regenerate. -->


# Research Methodology

How to conduct and document research for video content. **NotebookLM does the research; you orchestrate and format.**

## Mental Model

You are NOT the researcher — NotebookLM is. Your job:
1. Feed it the right sources and queries
2. Ask it the right questions
3. Format its output into the research document
4. Flag gaps and ask follow-up questions

**Do NOT fetch URLs, read articles, or gather data yourself.** Every fact, statistic, and source comes from NotebookLM queries. This keeps our token usage near zero.

## File Locations

| Output | Path |
|--------|------|
| Research document | `pipeline.research.activePath` (from config.json — never compute this yourself) |
| Raw data files | `channels/<channel>/videos/<slug>/research/data/` |
| Source snapshots | `channels/<channel>/videos/<slug>/research/sources/` |

## Workflow

### Phase 1: Setup (notebook + sources)
1. `notebooklm create "<slug>: <topic>"`
2. Add known high-quality sources: `notebooklm source add "<url>"`
3. Launch deep research: `notebooklm source add-research "<topic>" --mode deep --no-wait`
4. Wait for completion: `notebooklm research wait --import-all --timeout 600`

### Phase 2: Extract (query the notebook)
Ask structured questions — each `notebooklm ask` call extracts one section:

1. **Key findings:** `notebooklm ask "What are the most important findings about <topic>? List with sources."`
2. **Data & statistics:** `notebooklm ask "What are the key statistics and data points? Include numbers, dates, and source references."`
3. **Angles:** `notebooklm ask "What are the most interesting or surprising angles for a YouTube video on this topic?"`
4. **Gaps:** `notebooklm ask "What aspects of this topic lack strong evidence in the sources?"`

If a gap is identified, add more sources or run another research query — don't WebFetch.

### Phase 3: Write (format into research doc)
Take NotebookLM's answers and format into the document structure below. Write progressively — section by section to disk.

## Document Format

```markdown
# Research: <Topic>
> version: <N>
> based_on: —
> date: <ISO date>
> notebook_id: <NotebookLM notebook UUID>

## Key Findings
- Finding [source](url)

## Data & Statistics
- Stat [source](url)

## Suggested Angles
- Angle: why it matters

## Open Questions
- What we couldn't confirm or find strong sources for

## Sources
1. [Title](url) — description
```

## Progressive Writing Protocol

**Never write the full document at once.** Follow this order strictly:

1. Create the file immediately with header + empty section placeholders
2. Fill in `## Key Findings` from NotebookLM response — write to disk
3. Fill in `## Data & Statistics` — write to disk
4. Fill in `## Suggested Angles` — write to disk
5. Fill in `## Open Questions` — write to disk
6. Fill in `## Sources` — write to disk

At every step the file on disk must be a coherent, readable document. If the task times out after step 3, steps 1–3 are recoverable without redoing.

## Rules

- **Every fact comes from NotebookLM.** If it's not in the notebook, it's not in the document.
- Flag unverified claims with `⚠️ UNVERIFIED` — resolve by querying NotebookLM further, not by WebFetch.
- Include `notebook_id` in the document header so anyone can revisit the notebook later.
- Present summary, wait for user approval before marking complete.

## When NotebookLM Is Unavailable

Only if `notebooklm status` fails (auth issue, service down):
1. Stop and report to Director
2. Director decides: wait for fix, or approve fallback to WebSearch/WebFetch
3. If fallback approved, use direct web research but note in the document header: `> method: direct (NotebookLM unavailable)`
