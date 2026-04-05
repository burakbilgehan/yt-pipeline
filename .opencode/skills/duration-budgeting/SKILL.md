---
name: duration-budgeting
description: "Calculate and verify script/scene duration against target video length"
---
<!-- AUTO-GENERATED from .ai/ — DO NOT EDIT. Run "npm run sync-ai" to regenerate. -->


# Duration Budgeting

Calculate and verify script/scene duration against target length.

## Formula

```
duration_seconds = word_count ÷ WPM × 60
```

## WPM Source (priority order)

1. `channels/<channel>/channel-config.json → tts.calibration.measuredWPM` (measured from actual TTS output — most accurate)
2. `channels/<channel>/channel-config.json → tts.defaultWPM`
3. `templates/pipeline-defaults.json → tts.defaultWPM` (last resort fallback — check file for current value)

## For Script Writers

1. Read `channels/<channel>/videos/<slug>/config.json → metadata.targetLength` (seconds)
2. Calculate max words: `target × WPM ÷ 60`
3. Budget tool: `npx tsx src/scripts/text-utils.ts budget <target-seconds>`
4. After writing: `npx tsx src/scripts/text-utils.ts estimate <script-file>`
5. Tolerance: **±10%** of target (shorter videos may tolerate more). Over → cut. Under → expand.

## Format Constraints

Read format constraints from `templates/pipeline-defaults.json → formats` and `channels/<channel>/channel-config.json`. Do not hardcode format-specific duration or word count limits here.
