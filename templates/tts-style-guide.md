# TTS Delivery Style Guide

> **This is a human-readable reference only.** Agents should use the `ssml-writing` skill for authoritative rules. Config values come from `channel-config.json → tts` and `pipeline-defaults.json → tts`.

## Pacing & Pauses — Three Layers

### 1. Punctuation (always works, natural feel)
- Ellipsis `...` → longer, deliberate pause (trailing thought, dramatic beat)
- Em-dash `—` → abrupt pause (sudden break in thought)
- Period `.` → full stop, standard pause
- Comma `,` → short breath pause

### 2. Markup tags (`[MARKUP]` wrapper)

Pause durations are defined in `templates/pipeline-defaults.json → tts.pauseDurations`. Current values:
- `[pause short]` — brief pause
- `[pause]` — medium pause
- `[pause long]` — dramatic pause

Pauses can be any length via SSML `<break>` tags — there is no upper limit.

### 3. SSML tags (finest control)
- `<break time="Xms"/>` — exact pause in ms
- `<prosody rate="slow">` — rate adjustment
  - Rate: `x-slow`, `slow`, `medium`, `fast`, `x-fast`
- `<p>`, `<s>` — paragraph/sentence boundaries
- `<say-as interpret-as="date">` — number/date pronunciation
- `<phoneme alphabet="ipa" ph="...">` — custom pronunciation
- `<sub alias="...">` — pronunciation alias

**NEVER use `<prosody pitch="...">`** — produces robotic-sounding output regardless of context. This is a technical limitation of current TTS engines. Rate changes via `<prosody rate="...">` are fine.

## When to Use Which

| Situation | Tool | Example |
|-----------|------|---------|
| Natural conversational pause | Punctuation | `It seemed fine... until it wasn't.` |
| Dramatic beat after a stat | `[pause long]` | `That's 4.7 trillion dollars. [pause long] Gone.` |
| Slow down for gravitas | `<prosody>` | `<prosody rate="slow">We built our economy around this.</prosody>` |
| Precise 1.5s silence | `<break>` | `<break time="1500ms"/>` |
| Topic transition | `<break>` + `<p>` | Close `</p>`, add `<break time="1200ms"/>`, open new `<p>` |

## Emphasis

ALL CAPS for emphasis in voiceover text: `That's a TRILLION dollars.`

## Delivery Style

Read delivery style from `channels/<channel>/channel-config.json → tts.stylePrompt` and `channels/<channel>/channel-assets/brand-guide.md`. Different channels need different pacing — there is no universal formula.

## Number & Symbol Normalization

Write numbers in spoken form in `[VOICEOVER]` blocks:

| Raw | Written |
|-----|---------|
| `$1,400,000` | `one point four million dollars` |
| `3.7%` | `three point seven percent` |
| `2024-01-15` | `January fifteenth, twenty twenty-four` |
| `GDP` | spell out on first use: `Gross Domestic Product, or GDP` |
