---
name: ssml-writing
description: "Write voiceover scripts with proper TTS delivery markup (SSML)"
---

# SSML Writing

How to write voiceover scripts with proper TTS delivery markup.

Full reference: `templates/tts-style-guide.md` (reference only — actual config values come from channel-config → pipeline-defaults chain).

## Three Layers of Pacing Control

### 1. Punctuation (always works, TTS-engine agnostic)
- `...` → trailing thought, deliberate pause
- `—` → abrupt break
- `.` → full stop
- `,` → short breath

### 2. Markup Tags

Pause durations are defined in `templates/pipeline-defaults.json → tts.pauseDurations` (single source of truth). Current values are calibrated for Google Cloud TTS. If the TTS provider changes, update the JSON — not this skill file.

- `[pause short]` — short pause
- `[pause]` — medium pause
- `[pause long]` — long pause

**Note:** The `scene-timing` skill reads the same `pipeline-defaults.json` values for duration calculation. Both skills reference the same source — no manual sync needed.

### 3. SSML (finest control, Google Cloud TTS specific)
- `<break time="Xms"/>` — exact pause
- `<prosody rate="slow">` — rate adjustment (OK to use)
- `<say-as interpret-as="date">` — pronunciation
- `<sub alias="...">` — pronunciation alias

**NEVER use `<prosody pitch="...">`** — produces robotic-sounding output regardless of context. This is a technical limitation of current TTS engines, not a creative preference. Rate changes via `<prosody rate="...">` are fine.

## Anti-Monotony Pattern

Read delivery style preferences from `channels/<channel>/channel-config.json → tts.stylePrompt` and `channels/<channel>/channel-assets/brand-guide.md`. Different channels need different pacing patterns — there is no universal formula.

## Number Normalization

Write numbers in spoken form in `[VOICEOVER]` blocks:
- `$1,400,000` → `one point four million dollars`
- `3.7%` → `three point seven percent`
- `GDP` → spell out first use: `Gross Domestic Product, or GDP`
- **Approximate for natural flow**: `89,589` → `almost ninety thousand` (don't read every digit — think how a person would naturally say it)

## Emphasis

ALL CAPS for emphasis in voiceover text: `That's a TRILLION dollars.` Use judiciously — read channel voice guidelines from channel-config.
