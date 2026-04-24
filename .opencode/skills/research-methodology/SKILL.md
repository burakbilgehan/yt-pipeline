---
name: research-methodology
description: "NotebookLM-first research workflow — orchestrate research, format output into versioned documents"
---
<!-- AUTO-GENERATED from .ai/ — DO NOT EDIT. Run "npm run sync-ai" to regenerate. -->


# Research Methodology

How to conduct and document research for video content. **NotebookLM does the research; Director orchestrates and formats.**

## Mental Model

You are NOT the researcher — NotebookLM is. Your job:
1. Prepare the right source list and query sequence for the user
2. Process NotebookLM outputs into structured research doc
3. Flag gaps and prepare follow-up queries
4. Format everything into versioned research document

**Human-in-the-loop**: You prepare prompts → user executes in NotebookLM web UI → user pastes outputs back → you process. See `notebooklm` skill for prompt templates and workflow details.

## File Locations

| Output | Path |
|--------|------|
| Research document | `pipeline.research.activePath` (from config.json — never compute this yourself) |
| Raw data files | `channels/<channel>/videos/<slug>/research/data/` |
| Source snapshots | `channels/<channel>/videos/<slug>/research/sources/` |

## Workflow

### Phase 1: Setup (prepare for user)

1. Load `notebooklm` skill for prompt templates
2. Identify high-quality sources for the topic (URLs, papers, existing research)
3. Prepare query sequence: broad → specific → cross-cutting → gap-finding
4. Present everything to user in a single copy-pasteable block

### Phase 2: Extract (process user's outputs)

When user pastes NotebookLM responses:

1. **Parse** each response — extract facts, data points, quotes with source attribution
2. **Cross-reference** across responses — find patterns, contradictions, complementary info
3. **Assess coverage** — map findings against what the video needs
4. **Identify gaps** — what's missing? Prepare follow-up queries if needed

### Phase 3: Write (format into research doc)

Take processed outputs and write the versioned research document. Write progressively — section by section to disk.

## Document Format

```markdown
# Research: <Topic>
> version: <N>
> based_on: —
> date: <ISO date>
> notebook: <NotebookLM notebook name or "direct research">

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
2. Fill in `## Key Findings` from processed outputs — write to disk
3. Fill in `## Data & Statistics` — write to disk
4. Fill in `## Suggested Angles` — write to disk
5. Fill in `## Open Questions` — write to disk
6. Fill in `## Sources` — write to disk

At every step the file on disk must be a coherent, readable document. If the task times out after step 3, steps 1–3 are recoverable without redoing.

## Rules

- **NotebookLM is the primary research tool.** Prepare prompts for user to execute there first. This keeps token usage low and leverages its deep research capabilities.
- If NotebookLM's sources are insufficient for a specific question, flag the gap and prepare targeted follow-up queries or additional sources.
- Flag unverified claims with `⚠️ UNVERIFIED` — resolve by asking user to query NotebookLM further.
- Include notebook name in the document header so anyone can revisit later.
- Present summary, wait for user approval before marking complete.

## When NotebookLM Is Insufficient

If outputs don't cover a specific data point after follow-up queries:
1. Report the gap to user
2. User decides: add more sources to NotebookLM, or you do targeted web research for that specific gap
3. If web research used, note in the document: `> supplemental source: direct web research (NotebookLM gap: <description>)`
4. Do NOT run general web research instead of NotebookLM — NotebookLM first, web fallback only for specific gaps

## When NotebookLM Is Unavailable

If user reports NotebookLM is down or inaccessible:
1. Note it and offer direct web research as fallback
2. If user approves, use WebFetch but note in document header: `> method: direct (NotebookLM unavailable)`
