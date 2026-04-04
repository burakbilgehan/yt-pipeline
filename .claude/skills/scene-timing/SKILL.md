---
name: scene-timing
description: "Calculate scene start/end times from voiceover word counts and markup"
---
<!-- AUTO-GENERATED from .ai/ — DO NOT EDIT. Run "npm run sync-ai" to regenerate. -->


# Scene Timing

Calculate scene start/end times from voiceover word counts and markup.

**Scope:** These calculations are calibrated for Google Cloud TTS (Chirp 3: HD). If the TTS engine changes, pause durations and WPM calibration must be re-measured.

## Calculation Steps

1. Count words in scene voiceover
2. `base_duration = words ÷ WPM × 60`
3. Add pause durations from markup:
   - `[pause short]` → +0.3s
   - `[pause]` → +0.5s
   - `[pause long]` → +1.0s
   - `<break time="Xms"/>` → +X/1000 s
4. Add transition buffer (read from config chain, default 0.5s)
5. `endTime = startTime + base_duration + pauses + transition_buffer`

**Note:** Pause durations above must match the values in `ssml-writing` skill. These are empirical estimates calibrated against Google TTS output — not exact measurements. They're accurate enough for budgeting but actual TTS output may vary slightly.

## WPM Source (config chain)

1. `channels/<channel>/channel-config.json → tts.calibration.measuredWPM` (measured from actual TTS output — most accurate)
2. `channels/<channel>/channel-config.json → tts.defaultWPM`
3. `templates/pipeline-defaults.json → tts.defaultWPM` (last resort fallback, currently 150)

## Constraints

- Total of all scenes ≤ `channels/<channel>/videos/<slug>/config.json → metadata.targetLength`
- Shorts: each scene 3–8s, total 15–60s
- If total exceeds target, flag to Director — script may need cutting

## Common Mistakes

- Forgetting to count pauses → scenes end too early
- Not adding transition buffer → visual cuts happen during speech
- Using hardcoded WPM instead of reading config
