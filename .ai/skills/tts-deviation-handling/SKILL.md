---
name: tts-deviation-handling
description: "Handle TTS audio duration mismatches against target timing"
---

# TTS Deviation Handling

What to do when TTS audio duration doesn't match the target.

## Deviation Thresholds

Read thresholds from config chain: `channels/<channel>/channel-config.json → tts.deviationThresholds` first, then fall back to `templates/pipeline-defaults.json → tts.deviationThresholds`.

Default thresholds (from `pipeline-defaults.json → tts.deviationThresholds`, overridable per channel):

| Deviation | Action |
|-----------|--------|
| ≤ok% | No action needed |
| ok–postProcess% | Accept, or post-process with `ffmpeg atempo` filter |
| postProcess–regenBlock% | Re-generate specific blocks: `npm run tts <slug> -- --block <id> --speed <X>` |
| >regenBlock% | STOP — script needs adjustment. Route back to content-writer. |

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
3. Keep within safe range (read `pipeline-defaults.json → tts.safeSpeedRange`) — if outside, script edit is needed
4. Re-gen: `npm run tts <slug> -- --block <scene-id> --speed <calculated>`
5. Verify manifest updated correctly after re-gen
