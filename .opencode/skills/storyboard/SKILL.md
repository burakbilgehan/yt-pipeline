---
name: storyboard
description: "Storyboard stage of a layout-2 video: one storyboard/<block-id>.json per script block, each picking a scene type from the catalog and filling its data. User-invoked; ends with user approval."
disable-model-invocation: true
argument-hint: "<slug>"
---
<!-- AUTO-GENERATED from .ai/. DO NOT EDIT. Run "npm run sync-ai" to regenerate. -->


# Storyboard stage

Applies to videos with `"renderer": "catalog"` in `config.json` (every new video). Each block in `script/order.json` gets `storyboard/<block-id>.json`. You pick a scene type and fill its data; you never design, never write components, never set colors, sizes or timing. The contract is `src/remotion/catalog/schema.ts`; `npm run assemble` rejects anything outside it with file, field and reason.

## File format

```json
{
  "type": "ranked-bars",
  "title": "Hormuz is second by volume",
  "kicker": "Oil flow, million barrels/day",
  "source": "EIA via research notes",
  "holdSec": 0.4,
  "props": { "decimals": 1, "items": [{ "label": "Malacca", "value": 23.2 }, { "label": "Hormuz", "value": 20.9, "highlight": true }] },
  "cues": {}
}
```

- The header caption at top left reads `kicker · title`: `kicker` (max 40, default the section title) is the scope, `title` (max 60) the measure and unit ("Strait of Hormuz" · "Crude oil flow, million barrels a day"). Consecutive scenes with the same header keep it still.
- `status` {text (28), tone pink|blue|gray}: optional chip at top right, a state rather than a figure ("Blockade since Mar 2"). Its text must be sourced like any number.
- `source` is required on every data type. Name the real source.
- `holdSec`: seconds the scene stays after its narration (default 0.4). Raise it only when the visual needs time to land.
- `cues`: named moments inside the scene, each a phrase copied from the block's narration. The phrase must appear verbatim (case-insensitive) or assemble fails. Every type also takes `kick`: one short punch of the frame on the scene's key reveal (put it on the same phrase as that reveal). Use it for a few moments per video, never on every scene.
- Transitions are not chosen per scene: inside a section scenes push, and the stage turns at every section boundary of `order.json`.

## Choosing a type

| Beat | Type | Props (limits) | Cues |
|---|---|---|---|
| A claim, quote, question | `statement` | `text` (120), `emphasis` substring, `attribution`, `fraction` {n, d 2..10} when the sentence states one ("a fifth" = 1 of 5) | `emphasis` |
| One figure to stop on | `big-number` | `value`, `decimals`, `prefix`, `unit`, `context` (70), `label` (30, names the main row of a benchmark), `reference` {label, value, kind, remainderLabel}. kind `part`: the reference is a share of the value (bypass capacity of a flow); drawn as one stacked bar and the headline turns to the remainder, named by `remainderLabel` (required). kind `benchmark`: an independent figure, two bars on one scale | `reference`, `remainder` |
| 2 to 4 values by size | `compare-values` | `items` 2..4 {label (24), value, highlight, contrast}, `unit`, `prefix`, `decimals`, `showDelta`, `reference` {label, value}, `annotation` {text (40), item}. Two items with `showDelta` on (default) are a before/after duel: the first value on a digit board, the second rising on a zero-based measure and landing on cue `second` (the phrase that names it), then the percent change | `second`, `annotation` |
| A ranking of 5 to 12 | `ranked-bars` | `items` 5..12, same item fields, `reference`, `annotation` | `annotation` |
| Where something is | `map-focus` | `focus` ISO numeric ids 1..6, `contrast` (3), `route` [lon, lat] 2..6, `routeLabel` (30, "schematic" unless the route is traced from sourced coordinates), `marker` {lon, lat, label} (the point of interest), `frame` ("marker" zooms to the marker and route instead of the whole countries), `labels` {lon, lat, text, anchor} (6). Focus and contrast countries are named automatically | `zoom` |

Not implemented yet (assemble rejects them): `chapter-card`, `time-series`, `timeline`, `breakdown`, `matrix`.

Rules: on-screen quotes and apostrophes are typeset automatically; write plain ASCII. At most one `highlight` item (the one the narration names) and one `contrast` item per scene. Values are the real numbers from `research/`, never rounded to look better; bars are drawn to scale from zero, so a tiny value next to a huge one is correct. If a beat fits no type, tell the user instead of forcing one; a new type is added only in a design-system session.

## Steps

1. `npm run status -- <slug>`; the script must exist.
2. Write the block files in order.
3. `npm run tts -- <slug>` if audio is missing, then `npm run assemble -- <slug>`; fix every reported problem.
4. Show the user one line per block (id, type, title), then stop.

Videos with `"renderer": "legacy"` are migrated copies of old videos; their visual files keep the old format and are not extended.
