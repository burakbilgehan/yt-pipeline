---
name: youtube-metadata
description: "Rules for crafting YouTube titles, descriptions, and tags"
---

# YouTube Metadata

How to write `publishing/metadata.json` of a layout-2 video. Schema and checks: `src/pipeline/publish.ts`; `npm run metadata -- <slug>` validates it and generates the copy-paste files.

## File

```json
{
  "title": "The Strait That Moves a Fifth of the World's Oil",
  "description": "Hook line.\n\n{{chapters}}\n\nTwo or three sentences with keywords.\n\nSources:\n...\n\n#hashtag1 #hashtag2",
  "tags": ["strait of hormuz", "oil prices"],
  "category": "Education",
  "visibility": "private",
  "scheduledAt": "2026-10-03T16:00:00+03:00"
}
```

- `{{chapters}}` on its own line: the script fills it with one timestamp per section of `script/order.json`, from the real timeline. Never type timestamps. YouTube needs at least 3 chapters of 10 seconds or more; if the sections do not allow that, the fix is in `order.json` (a user decision), not in the description.
- Shorts have no `{{chapters}}` line.
- `scheduledAt` requires `visibility: "private"`.
- Tag limits and counting (API rule: commas count, a tag with a space counts 2 more) are enforced by the script against `templates/pipeline-defaults.json` `youtube`. No apostrophes in tags; rephrase (`what is safe`, not `what's safe`).

## Tag Strategy

Mix of:
- **Broad** (high volume): `economics`, `data visualization`
- **Specific** (medium): `country comparison GDP`
- **Long-tail** (low competition): `how much does X cost in Y`

## Title Rules

- 3 to 5 options ranked by expected CTR; the user picks
- Lead with curiosity or surprise
- Include primary keyword naturally
- Every number in the title or description is a claim in `research/claims.json`
- **Shorts**: keep under 60 chars (read `templates/pipeline-defaults.json → formats.short.maxTitleChars`)

## Description Structure (long format)

```
[Hook line - 1-2 sentences]

{{chapters}}

[2-3 sentences expanding on video content with keywords]

[CTA: subscribe, comment prompt]

[Sources: publisher and title of each source behind an on-screen number]

#hashtag1 #hashtag2 #hashtag3
```

## Format Differences

| | Long | Short |
|--|------|-------|
| Chapters | Yes (`{{chapters}}`) | No |
| End screens | Yes | No |
| Description | Full with chapters | Brief, 2-3 sentences |
| Tags | Full set | `#Shorts` required, hashtags over tags |
| Title length | Flexible | ≤maxTitleChars (config) |
