---
name: critique-methodology
description: "Quality gate evaluation methodology for pipeline deliverables"
---
<!-- AUTO-GENERATED from .ai/ — DO NOT EDIT. Run "npm run sync-ai" to regenerate. -->


# Critique Methodology

How to evaluate pipeline deliverables as a quality gate.

## Grading Scale

| Grade | Meaning | Verdict |
|-------|---------|---------|
| A | Exceptional, notable strength | PASS |
| B | Shippable, minor suggestions | PASS |
| C | Needs work, specific issues | FAIL |
| D | Significant problems | FAIL |
| F | Start over | FAIL |

## Per-Stage Checklist

| Stage | Key Questions |
|-------|--------------|
| Research | Sources credible? Claims sourced? Gaps a knowledgeable viewer would notice? |
| Script | Hook strong? Pacing tight? Every number traceable to research? Natural for TTS? No weasel words? |
| Storyboard | Visuals match narration? Timing feasible? Visual variety? Format is JSON (not Markdown)? |
| Production | Audio clear? Music balanced? Charts readable? Sync correct? All displayed math verified? |
| Publishing | Title compelling? Tags relevant? Would you click this thumbnail? |

## Output Format

```
VERDICT: PASS | FAIL
GRADE: A | B | C | D | F

STRENGTHS:
1. ...

ISSUES:
1. [🔴 Critical] [Category]
   Description: ...
   Location: ...
   Fix: ...

2. [🟡 Minor] [Category]
   Description: ...
   Fix: ...
```

## Rules

- Every criticism needs a concrete fix with file path
- Benchmark against top-tier content in the channel's genre — read `channels/<channel>/channel-config.json → channel.niche` to understand the content type and find appropriate quality benchmarks
- Math displayed to viewers = always verify (see `math-verification` skill)
- Wrong math = automatic D grade minimum
