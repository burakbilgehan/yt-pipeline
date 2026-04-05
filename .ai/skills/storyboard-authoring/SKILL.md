---
name: storyboard-authoring
description: "Create scene-by-scene visual plans (skeleton + detail files) for Remotion production"
---

# Storyboard Authoring

How to create scene-by-scene visual plans for Remotion production.

## Architecture: Skeleton + Scene Detail Files

```
channels/<channel>/videos/<slug>/storyboard/
├── storyboard-v<N>.json          ← Skeleton → evolves into final storyboard
├── storyboard-summary-v<N>.md    ← Human-readable summary (ONLY Markdown file)
├── scenes/
│   ├── scene-001.json            ← Full visual details for scene 001
│   └── ...
└── critique-v<N>.md              ← Critic feedback
```

**Storyboards are always JSON.** The summary `.md` is human-only — never parsed by pipeline.

## Write Order: Skeleton First, One Scene at a Time

**This is the most timeout-prone stage in the pipeline. Follow this order exactly — no exceptions.**

1. **Write skeleton immediately** — before any scene detail. Just section names, rough timing, visual types. Write to `pipeline.storyboard.activePath`. The file must exist on disk before you think about individual scenes.
2. **Write each scene detail as its own file** — one at a time, immediately after completing it. `scenes/scene-001.json` → write → `scenes/scene-002.json` → write → ... Never hold more than one scene in memory before writing.
3. **Update skeleton every 5 scenes** — keep it in sync as scenes are written. Don't wait until the end.
4. **Final merge** — once all scene files are on disk, merge skeleton + scene details into the final storyboard at `pipeline.storyboard.activePath`. This is a fast assembly step because everything already exists on disk.

**If a timeout or crash occurs — how to resume:**
1. Read `pipeline.storyboard.activePath` from config.json — the skeleton is there
2. List `channels/<channel>/videos/<slug>/storyboard/scenes/` — these are the scenes already written
3. Compare scene IDs in the skeleton against existing scene files to find the first missing one
4. Resume writing from that scene — skip all scenes that already have a file on disk
5. Do not regenerate already-written scenes

**Why this order:**
- Skeleton on disk first = no lost work if the task fails at any point
- One scene per write = maximum granularity of recovery
- Final merge is trivial = just combining existing files, no new generation

## Skeleton Format

```json
{
  "title": "...", "version": 1,
  "basedOn": { "content": 2 },
  "totalDuration": 300,
  "scenes": [{
    "id": "scene-001",
    "section": "Hook",
    "startTime": 0, "endTime": 10,
    "voiceover": "After just 17 hours...",
    "visual": { "type": "stock-video", "description": "Morning commute" },
    "transition": "cut",
    "sceneFile": "scenes/scene-001.json"
  }]
}
```

**Valid transition types** (from `src/remotion/schemas.ts`): `fade`, `cut`, `slide`, `zoom`, `crossfade`, `morph`, `seamless`, `cross-dissolve`, `fade-to-black`.

## Scene Detail Format

```json
{
  "id": "scene-001",
  "visual": {
    "type": "stock-video",
    "description": "Full detailed description...",
    "searchQuery": "tired commuters morning subway",
    "textOverlay": null,
    "dataVisualization": null,
    "motion": null,
    "motionConfig": {},
    "surface": null,
    "surfaceConfig": {},
    "atmosphere": null,
    "atmosphereConfig": {}
  },
  "transition": "cut",
  "notes": "Production notes, aiImagePrompt, verify flags"
}
```

### Design System Hints (visual.motion, visual.surface, visual.atmosphere)

Every scene detail can specify DS primitives for the production agent to use. **These fields are optional** — omit them when a scene uses stock footage with no overlay animation. But when a scene involves text animation, styled containers, or custom backgrounds, these hints are how you tell the production agent WHAT to use.

**Before assigning DS primitives, read `src/remotion/design-system/component-catalog.json`.** It contains:
- Every available primitive with `useCases`, `whenToUse`, `whenNotToUse`
- `keywords` for matching visual needs to components
- `pairs` showing which components work well together
- `storyboardHint` with exact field instructions

| Field | Layer | What it controls | Example value |
|-------|-------|-----------------|---------------|
| `visual.motion` | L3 | How content animates | `"stagger-text-reveal"`, `"text-rotate"`, `"counter-up"` |
| `visual.motionConfig` | L3 | Motion parameters | `{ "splitBy": "words", "staggerFrom": "center" }` |
| `visual.surface` | L4 | Container treatment | `"glass"`, `"flat"`, `"glow"` |
| `visual.surfaceConfig` | L4 | Surface parameters | `{ "blur": 12, "opacity": 0.15 }` |
| `visual.atmosphere` | L2 | Background layer | `"dot-grid"`, `"film-grain"`, `"aurora"` |
| `visual.atmosphereConfig` | L2 | Atmosphere parameters | `{ "opacity": 0.3, "speed": 1 }` |

**Rules:**
1. Only reference IDs that exist in `component-catalog.json`. If a visual need has no matching component, add a note: `"notes": "NEEDS DS COMPONENT: animated pie chart"`.
2. Check `status` field in catalog — if `"planned"` (not yet implemented), still assign the hint but add a note that production may need to implement it or fall back.
3. Use `pairs` from the catalog to pick complementary combinations (e.g., `glass` surface + `dot-grid` atmosphere).
4. Not every scene needs all three layers. Stock footage scenes typically only need `motion` (for text overlay animation) and skip `surface`/`atmosphere`.

**Example — text cycling scene:**
```json
{
  "id": "scene-005",
  "visual": {
    "type": "text-overlay",
    "description": "Average salary cycles through decades: $52K → $65K → $78K",
    "textOverlay": "Average salary:",
    "motion": "text-rotate",
    "motionConfig": {
      "texts": ["$52,000", "$65,000", "$78,000"],
      "splitBy": "characters"
    },
    "surface": "glass",
    "atmosphere": "dot-grid"
  }
}
```

**Example — hero stat scene:**
```json
{
  "id": "scene-012",
  "visual": {
    "type": "text-overlay",
    "description": "Big reveal: $2.4 Trillion counts up with glowing card",
    "textOverlay": "$2.4 Trillion",
    "motion": "counter-up",
    "motionConfig": { "from": 0, "to": 2400000000000, "prefix": "$", "format": "compact" },
    "surface": "glow",
    "atmosphere": "aurora"
  }
}
```

**Example — stock footage with animated title:**
```json
{
  "id": "scene-002",
  "visual": {
    "type": "stock-video",
    "description": "City skyline timelapse with title overlay",
    "searchQuery": "city skyline timelapse evening",
    "textOverlay": "The Hidden Cost",
    "motion": "stagger-text-reveal",
    "motionConfig": { "splitBy": "words", "staggerFrom": "first" }
  }
}
```

## Visual Assignment (every scene should have one)

"Visual" = ANY visual output for the scene, including Remotion-rendered content. If a scene intentionally has no visual (e.g., black screen for dramatic pause), mark it explicitly: `"type": "intentional-black"`.

| Type | Field | Source |
|------|-------|--------|
| Stock media | `searchQuery` | Stock provider (read channel-config → visuals.preferredStockSource) |
| AI-generated image | `aiImagePrompt` (in notes) | Image provider (read channel-config → visuals.imageProvider) |
| Text-only | `textOverlay` | Remotion text component |
| Data visualization | `dataVisualization` | Remotion chart/data component |
| Remotion animation | `type: "remotion-component"` | Custom Remotion component |

## Scene Naming

- **IDs**: `scene-001`, `scene-002`, ... (zero-padded, sequential)
- **Sections**: exact script section title (slugified for audio files)
- **One voiceover block per section**: section may have multiple scenes (visual changes within same voiceover)

## Format Rules

- **long**: no scene count limit
- **short**: read `templates/pipeline-defaults.json → formats.short` for scene count, duration, and transition constraints
