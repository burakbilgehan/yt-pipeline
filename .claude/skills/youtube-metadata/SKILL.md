---
name: youtube-metadata
description: "Rules for crafting YouTube titles, descriptions, and tags"
---
<!-- AUTO-GENERATED from .ai/ — DO NOT EDIT. Run "npm run sync-ai" to regenerate. -->


# YouTube Metadata

Rules for crafting titles, descriptions, and tags for YouTube.

## Tag Rules

Read `templates/pipeline-defaults.json → youtube` for limits (max total chars, max single tag, multi-word overhead, forbidden chars). Always validate total char count before writing metadata.

## Tag Strategy

Mix of:
- **Broad** (high volume): `economics`, `data visualization`
- **Specific** (medium): `country comparison GDP`
- **Long-tail** (low competition): `how much does X cost in Y`

## Title Rules

- 3–5 options ranked by expected CTR
- Lead with curiosity or surprise
- Include primary keyword naturally
- **Shorts**: keep under 60 chars (read `templates/pipeline-defaults.json → formats.short.maxTitleChars`)

## Description Structure (long format)

```
[Hook line — 1-2 sentences]

[Chapter timestamps]
0:00 — Intro
0:15 — Section title
...

[2-3 sentences expanding on video content with keywords]

[CTA: subscribe, comment prompt]

[Credits / sources / links]

#hashtag1 #hashtag2 #hashtag3
```

## Format Differences

| | Long | Short |
|--|------|-------|
| Chapters | Yes (timestamps) | No |
| End screens | Yes | No |
| Description | Full with chapters | Brief, 2-3 sentences |
| Tags | Full set | `#Shorts` required, hashtags over tags |
| Title length | Flexible | ≤maxTitleChars (config) |
