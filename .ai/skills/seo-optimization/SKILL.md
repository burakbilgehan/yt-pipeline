---
name: seo-optimization
description: "YouTube SEO best practices for optimizing video discoverability"
---

# SEO Optimization

YouTube SEO best practices for optimizing discoverability.

## Output Format

```markdown
# SEO Notes: <Title>

## Title Options
1. [Best] ... — reasoning
2. [Good] ... — reasoning
3-5 options total

## Description
[Optimized description with chapters, keywords, hashtags, CTA]

## Tags
broad-tag, specific-tag, long-tail-tag...
Total: XXX/500 chars
```

## File Location

`channels/<channel>/videos/<slug>/publishing/seo-notes-v<N>.md`

## Principles

- Base advice on **current** best practices, not outdated SEO dogma
- **Read `channels/<channel>/channel-config.json`** for channel tone, style, and audience before making recommendations. SEO strategy varies wildly by channel type.
- Titles: style depends on channel identity (curiosity-driven, authoritative, playful, etc.) — read channel config, don't assume one style fits all
- Descriptions: front-load important keywords in first 2 lines (shown in search)
- Tags: focus on a targeted set of well-chosen tags rather than filling to the limit. **No apostrophes** — rephrase instead. Target 480–490 chars (YouTube counts multi-word tags with +2 for auto-quotes).
- Thumbnails: style is channel-specific (data channels = minimal/graphic, vlogs = human faces, etc.). Read `channels/<channel>/channel-assets/brand-guide.md` for visual direction.

## Copy-Paste Output Rule

Always generate **`tags.txt`** and **`description.txt`** alongside `metadata-v<N>.json`. These are plain-text, copy-paste ready files — no JSON escapes, no quotation marks around tags. The user pastes from these files into YouTube Studio, not from the JSON.

## Format-Specific

- **Long**: chapters/timestamps in description, end screen CTA
- **Short**: `#Shorts` tag mandatory, hashtags > tags, ultra-short title
