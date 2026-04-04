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

Pause durations are approximate and depend on the TTS engine. These values are calibrated for Google Cloud TTS (Chirp 3: HD). If the TTS provider changes, these values must be re-calibrated.

- `[pause short]` — ~300ms
- `[pause]` — ~500ms
- `[pause long]` — ~1000ms

**Note:** The `scene-timing` skill uses these same values for duration calculation. Both skills must stay in sync — if you change pause durations here, update scene-timing too.

### 3. SSML (finest control, Google Cloud TTS specific)
- `<break time="Xms"/>` — exact pause
- `<prosody rate="slow">` — rate adjustment (OK to use)
- `<say-as interpret-as="date">` — pronunciation
- `<sub alias="...">` — pronunciation alias

**NEVER use `<prosody pitch="...">`** — sounds robotic. Rate changes are fine, pitch alteration is banned.

## Anti-Monotony Pattern

Vary delivery across the script:
- **Hook**: Punchy, short sentences. `[pause long]` after hook stat.
- **Build-up**: Slightly faster, flowing, minimal breaks.
- **Key reveals**: `[pause long]` before reveal, then slow measured delivery.
- **Transitions**: `<break time="1200ms"/>` between topics.
- **CTA**: Measured pace, deliberate pauses.

## Number Normalization

Write numbers in spoken form in `[VOICEOVER]` blocks:
- `$1,400,000` → `one point four million dollars`
- `3.7%` → `three point seven percent`
- `GDP` → spell out first use: `Gross Domestic Product, or GDP`
- **Approximate for natural flow**: `89,589` → `almost ninety thousand` (don't read every digit — think how a person would naturally say it)

## Emphasis

ALL CAPS sparingly — 1-2 words max: `That's a TRILLION dollars.`
