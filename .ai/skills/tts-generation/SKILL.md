---
name: tts-generation
description: "Generate voiceover audio from scripts using Google Cloud TTS"
---

# TTS Generation

Generate voiceover audio from scripts using Google Cloud TTS.

## Config Sources

- **Engine/voice/encoding**: `channels/<channel>/channel-config.json → tts` (never hardcode)
- **WPM/pauses/thresholds**: `channels/<channel>/channel-config.json → tts` first, then fall back to `templates/pipeline-defaults.json → tts`
- **Speed**: configurable per channel or per video. Read from `channels/<channel>/videos/<slug>/config.json → tts.speed` (video-level override), then `channels/<channel>/channel-config.json → tts.speed`, then `templates/pipeline-defaults.json → tts.defaultSpeed`. Different channels need different speeds (e.g., data channel = normal pace, storytelling channel = slower).
- Default engine (as of 2025): Chirp 3: HD → LINEAR16 encoding → **WAV files** (not MP3). Always defer to channel config.

## Command

```bash
npm run tts <slug>
```

Single block re-generation:
```bash
npm run tts <slug> -- --block scene-003 --speed 1.1
```

## File Naming

`{section-slug}--{scene-id}.wav`

Section slug is derived from the script section title (slugified). Must match storyboard scene IDs.

## Manifest

Output: `channels/<channel>/videos/<slug>/production/audio/audio-manifest.json`

Tracks all blocks with: duration, word count, speed, file path.

## Input Modes

| Mode | When | Format |
|------|------|--------|
| `text` | Plain script | No markup |
| `markup` | `[pause]` tags | `[pause short]`, `[pause]`, `[pause long]` |
| `ssml` | Fine control | Full SSML tags |

Preserve all SSML/markup exactly as written in the script — do not strip or modify.

## Speed

- Range: 0.25–2.0 (`speaking_rate`)
- Safe range without user approval: 0.85–1.15
- Read safe range from config chain (channel-config → pipeline-defaults)

## Pre-flight

The TTS script runs duration prediction before generating audio.
- **>15% off target**: STOP, warn user — script likely needs adjustment
- **10-15% off**: proceed with a note to user
- **<10%**: proceed normally
