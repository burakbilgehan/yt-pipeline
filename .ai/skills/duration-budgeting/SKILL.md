# Duration Budgeting

Calculate and verify script/scene duration against target length.

## Formula

```
duration_seconds = word_count ÷ WPM × 60
```

## WPM Source (priority order)

1. `channels/<channel>/channel-config.json → tts.calibration.measuredWPM`
2. `templates/pipeline-defaults.json → tts.defaultWPM` (fallback)

## For Script Writers

1. Read `channels/<channel>/videos/<slug>/config.json → metadata.targetLength` (seconds)
2. Calculate max words: `target × WPM ÷ 60`
3. Budget tool: `npx tsx src/scripts/text-utils.ts budget <target-seconds>`
4. After writing: `npx tsx src/scripts/text-utils.ts estimate <script-file>`
5. Tolerance: **±10%** of target. Over → cut. Under → expand.

## For Storyboard Authors

1. Per scene: `words ÷ WPM × 60 = scene_seconds`
2. Add pause durations from markup:
   - `[pause short]` → +0.3s
   - `[pause]` → +0.5s
   - `[pause long]` → +1.0s
3. Add transition buffer: read `templates/pipeline-defaults.json → rendering.transitionBufferSeconds`
4. `endTime = startTime + voiceover_duration + transition_buffer`
5. Total of all scenes must be ≤ `channels/<channel>/videos/<slug>/config.json → metadata.targetLength`

## Format Constraints

- **long**: 2–8 min typical (120–480s)
- **short**: 15–60s, max 150 words (read `templates/pipeline-defaults.json → formats.short`)
