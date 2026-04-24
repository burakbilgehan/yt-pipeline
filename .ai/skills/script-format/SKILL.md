---
name: script-format
description: "Standard format and template for video scripts"
---

# Script Format

Standard format for video scripts in this pipeline.

## File Location

`channels/<channel>/videos/<slug>/content/script-v<N>.md`

## Template

```markdown
# Script: <Title>
> version: <N>
> based_on: research-v<X>
> changes_from_prev: <what changed, omit for v1>
> date: <ISO date>

## Metadata
- **Word count:** X words (~X min at Y WPM)
- **Tone:** ...
- **Target audience:** ...

## Hook (0:00–0:XX)
[VOICEOVER] ...
[VISUAL NOTE] ...

## Section: <Title> (X:XX–X:XX)
[VOICEOVER] ...
[VISUAL NOTE] ...

## CTA (X:XX–end)
[VOICEOVER] ...
```

## Long vs Short Format

Read format constraints from `templates/pipeline-defaults.json → formats` and `channels/<channel>/channel-config.json`. These define resolution, scene limits, word counts, and transitions per format. Do not hardcode format-specific rules here.

## Section Naming Rules

- Descriptive, slugifiable: `## Section: Global Trade (0:15-0:55)`
- No special characters
- 2–5 words
- Consistent across revisions — renaming breaks audio manifest mapping

## Word Count Discipline

After every edit:
1. Count words in ALL `[VOICEOVER]` blocks (exclude visual notes, headers, metadata)
2. Update the `Word count` line in the script's `## Metadata` section (this is the script-internal metadata header, not config.json — config.json only tracks pipeline state/version)
3. If change >15% from previous version → flag to Director

## Batch Edits (3+ changes)

Write change manifest: `channels/<channel>/videos/<slug>/content/changes-v<N>.md` — checklist of all changes, check each off as applied.

## Progressive Writing Protocol

**Never write the full script at once.** Follow this order strictly:

1. Create the file immediately with just the header block + empty section placeholders (Hook, Section names, CTA) — write to disk
2. Write `## Hook` content — write to disk
3. Write each `## Section` one at a time — write to disk after each
4. Write `## CTA` — write to disk
5. Apply delivery markup (SSML) pass — write to disk
6. Verify word count, update the `Word count` metadata line — write to disk

At every step the file on disk must be a parseable, coherent script. A timeout after step 3 means all completed sections are recoverable without redoing.

## Rules

- Write for spoken delivery — conversational, clear
- Every section needs a `[VISUAL NOTE]` for storyboard authoring
- Present draft, wait for user approval before finalizing
