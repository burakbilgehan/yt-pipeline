---
name: alignment-check
description: "Evaluate whether a video topic/script fits the channel brand and strategy"
---
<!-- AUTO-GENERATED from .ai/ — DO NOT EDIT. Run "npm run sync-ai" to regenerate. -->


# Alignment Check

Evaluate whether a video topic/script fits the channel's brand and strategy.

## When to Run

- Project start (topic proposal)
- Script finalization (before storyboard)
- Director triggers automatically at these points

## Inputs

Read `channels/<channel>/channel-config.json` for: niche, audience, tone, avoidTopics, maturity.

## Output Format

```
ALIGNMENT CHECK: <title>
SCORE: X/5  (1=off-brand, 3=acceptable, 5=perfect fit)

CHANNEL FIT: [why this does/doesn't match]
CONCERNS: [if score < 4]
SUGGESTIONS: [improvements to align better]
STRATEGIC CONTEXT: [how this fits the bigger picture — recent uploads, calendar, audience trends]
```

## Score Guide

| Score | Meaning | Action |
|-------|---------|--------|
| 5 | Perfect fit | Proceed |
| 4 | Good fit | Proceed, minor tweaks optional |
| 3 | Acceptable | Get Director's suggestions before proceeding |
| 1-2 | Off-brand | Reconsider topic or angle |
