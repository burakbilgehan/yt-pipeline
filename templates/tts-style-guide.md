# TTS Delivery Style Guide

Reference for content-writers and storyboard agents. Controls pacing, emphasis, and naturalness in voiceover scripts.

Read `channel-config.json → tts` for engine, voice, and speed settings.  
Read `pipeline-defaults.json → tts` for WPM, pause durations, and thresholds.

## Pacing & Pauses — Three Layers

### 1. Punctuation (always works, natural feel)
- Ellipsis `...` → longer, deliberate pause (trailing thought, dramatic beat)
- Em-dash `—` → abrupt pause (sudden break in thought)
- Period `.` → full stop, standard pause
- Comma `,` → short breath pause

### 2. Markup tags (`[MARKUP]` wrapper)
- `[pause short]` — brief (~300ms)
- `[pause]` — medium (~500ms)
- `[pause long]` — dramatic (~1s)

### 3. SSML tags (finest control)
- `<break time="Xms"/>` — exact pause in ms
- `<prosody rate="slow" pitch="-1st">` — rate + pitch
  - Rate: `x-slow`, `slow`, `medium`, `fast`, `x-fast`
  - Pitch: `-3st` to `+3st` (semitones)
- `<p>`, `<s>` — paragraph/sentence boundaries
- `<say-as interpret-as="date">` — number/date pronunciation
- `<phoneme alphabet="ipa" ph="...">` — custom pronunciation
- `<sub alias="...">` — pronunciation alias

**AVOID `<prosody pitch="...">` alone** — sounds robotic. Use sparingly with rate.

## When to Use Which

| Situation | Tool | Example |
|-----------|------|---------|
| Natural conversational pause | Punctuation | `It seemed fine... until it wasn't.` |
| Dramatic beat after a stat | `[pause long]` | `That's 4.7 trillion dollars. [pause long] Gone.` |
| Slow down for gravitas | `<prosody>` | `<prosody rate="slow">We built our economy around this.</prosody>` |
| Precise 1.5s silence | `<break>` | `<break time="1500ms"/>` |
| Topic transition | `<break>` + `<p>` | Close `</p>`, add `<break time="1200ms"/>`, open new `<p>` |

## Emphasis

ALL CAPS sparingly (1–2 words max): `That's a TRILLION dollars.`

## Anti-Monotony

Vary delivery across the script:
- **Hook:** Punchy short sentences, `[pause long]` after hook stat
- **Build-up:** Slightly faster, flowing, minimal breaks
- **Key reveals:** `<prosody rate="slow">`, `<break time="800ms"/>` before reveal
- **Transitions:** `<break time="1200ms"/>` between topics
- **Closing/CTA:** Measured pace, deliberate pauses

## Number & Symbol Normalization

Write numbers in spoken form in `[VOICEOVER]` blocks:

| Raw | Written |
|-----|---------|
| `$1,400,000` | `one point four million dollars` |
| `3.7%` | `three point seven percent` |
| `2024-01-15` | `January fifteenth, twenty twenty-four` |
| `GDP` | spell out on first use: `Gross Domestic Product, or GDP` |
