---
name: youtube-metadata
description: "Rules for crafting YouTube titles, descriptions, and tags"
---

# YouTube Metadata

Rules for crafting titles, descriptions, and tags for YouTube.

## Tag Rules

Read `templates/pipeline-defaults.json → youtube` for limits (max total chars, target chars, max single tag, forbidden chars). Always validate total char count before writing metadata.

**Character counting**: YouTube counts the total as `sum of all tag characters + (number of tags - 1)` for comma separators. Multi-word tags do NOT get extra quote overhead. To verify locally: join all tags with commas (NO spaces after commas), count the resulting string length. That number matches YouTube Studio's counter. **Target `pipeline-defaults.json → youtube.targetTagChars`** (currently 490) to leave margin under the 500 hard limit.

**Copy-paste output rule (CRITICAL)**: In addition to the JSON `metadata-v<N>.json`, always generate a **`tags.txt`** file alongside it containing tags as a plain comma-separated string with NO quotation marks. Example: `polyester, cotton, merino wool, BPA`. Also generate a **`description.txt`** with the description as plain text (real newlines, not `\n` literals). These `.txt` files are what the user copies into YouTube Studio — JSON `\n` escapes and `"` quotes break when pasted directly.

**No apostrophes in tags.** Apostrophes (`'`) count as extra characters in YouTube and cause inconsistent behavior. Rephrase instead: `what is safe` not `what's safe`.

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
