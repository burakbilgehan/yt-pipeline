---
name: scene-timing
description: "Calculate scene start/end times from voiceover word counts and markup"
---
<!-- AUTO-GENERATED from .ai/ — DO NOT EDIT. Run "npm run sync-ai" to regenerate. -->


# Scene Timing

Calculate scene start/end times from voiceover word counts and markup.

**Scope:** These calculations are calibrated for Google Cloud TTS. If the TTS engine changes, pause durations and WPM calibration must be re-measured.

## Calculation Steps

1. Count words in scene voiceover
2. `base_duration = words ÷ WPM × 60`
3. Add pause durations from markup (values from `templates/pipeline-defaults.json → tts.pauseDurations`):
   - `[pause short]` → +short ms
   - `[pause]` → +medium ms
   - `[pause long]` → +long ms
   - `<break time="Xms"/>` → +X/1000 s
4. Add transition buffer (read from config chain, default 0.5s)
5. `endTime = startTime + base_duration + pauses + transition_buffer`

**Note:** Pause durations are defined in `templates/pipeline-defaults.json → tts.pauseDurations` (the single source of truth). These are empirical estimates calibrated against Google TTS output — not exact measurements. They're accurate enough for budgeting but actual TTS output may vary slightly.

## WPM Source (config chain)

See `duration-budgeting` skill for the canonical 3-step WPM fallback chain. Both skills use the same chain.

## Constraints

- Total of all scenes ≤ `channels/<channel>/videos/<slug>/config.json → metadata.targetLength`
- Read format-specific constraints from `templates/pipeline-defaults.json → formats`
- If total exceeds target, flag to Director — script may need cutting

## Common Mistakes

- Forgetting to count pauses → scenes end too early
- Not adding transition buffer → visual cuts happen during speech
- Using hardcoded WPM instead of reading config
