---
name: tts-deviation-handling
description: "Handle TTS audio duration mismatches against target timing"
---

# TTS Deviation Handling

What to do when TTS audio duration doesn't match the target.

## Deviation Thresholds

Read thresholds from config chain: `channels/<channel>/channel-config.json → tts.deviationThresholds` first, then fall back to `templates/pipeline-defaults.json → tts.deviationThresholds`.

| Deviation | Action |
|-----------|--------|
| ≤3% | No action needed |
| 3–10% | Accept, or post-process with `ffmpeg atempo` filter |
| 10–20% | Re-generate specific blocks: `npm run tts <slug> -- --block <id> --speed <X>` |
| >20% | STOP — script needs adjustment. Route back to content-writer. |

## Post-Process with ffmpeg

For minor speed adjustments (3–10% deviation):
```bash
ffmpeg -i input.wav -filter:a "atempo=1.05" output.wav
```

`atempo` range: 0.5–2.0. For larger changes, chain filters: `atempo=2.0,atempo=1.1`

## Re-generation Strategy

When re-generating specific blocks:
1. Identify which blocks are off (from duration report)
2. Calculate needed speed: `target_duration / actual_duration × current_speed`
3. Keep within safe range (0.85–1.15) — if outside, script edit is needed
4. Re-gen: `npm run tts <slug> -- --block <scene-id> --speed <calculated>`
5. Verify manifest updated correctly after re-gen
