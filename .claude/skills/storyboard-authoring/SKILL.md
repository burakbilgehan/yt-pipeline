<!-- AUTO-GENERATED from .ai/ — DO NOT EDIT. Run "npm run sync-ai" to regenerate. -->

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

## Write Order: Skeleton First

**Critical workflow — follow this order exactly:**

1. **Write skeleton first** — lightweight, minimal. Just section names, rough timing, visual types. No scene detail files yet. Write to `channels/<channel>/videos/<slug>/storyboard/storyboard-v<N>.json`. This is your overview / roadmap.
2. **Write scene details** — one file at a time (`channels/<channel>/videos/<slug>/storyboard/scenes/scene-NNN.json`). Between scenes, you can glance at the skeleton to maintain coherence.
3. **Update skeleton periodically** — if scenes diverge from the initial outline, update the skeleton to stay in sync. The skeleton is a living document until finalization.
4. **Final merge** — once all scenes are complete, merge skeleton + scene details into the final `storyboard-v<N>.json`. This is a straightforward assembly step because all content already exists on disk.

**Why this order:**
- Starting from the skeleton prevents losing the big picture when diving into scene details
- Writing to disk at every step means agent crashes/context overflow don't lose work
- The final merge is easy because it's just combining existing files, not generating new content
- Subagents can work on isolated scenes without needing the full context

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

## Scene Detail Format

```json
{
  "id": "scene-001",
  "visual": {
    "type": "stock-video",
    "description": "Full detailed description...",
    "searchQuery": "tired commuters morning subway",
    "textOverlay": null,
    "dataVisualization": null
  },
  "transition": "cut",
  "notes": "Production notes, aiImagePrompt, verify flags"
}
```

## Visual Assignment (every scene must have one)

"Visual" = ANY visual output for the scene, including Remotion-rendered content:

| Type | Field | Source |
|------|-------|--------|
| Stock media | `searchQuery` | Pexels stock |
| AI-generated image | `aiImagePrompt` (in notes) | Gemini image generation |
| Text-only | `textOverlay` | Remotion text component |
| Data visualization | `dataVisualization` | Remotion chart/data component |
| Remotion animation | `type: "remotion-component"` | Custom Remotion component |

## Scene Naming

- **IDs**: `scene-001`, `scene-002`, ... (zero-padded, sequential)
- **Sections**: exact script section title (slugified for audio files)
- **One voiceover block per section**: section may have multiple scenes (visual changes within same voiceover)

## Format Rules

- **long**: no scene count limit
- **short**: 3–5 scenes, 3–8s each, `"cut"` transitions only (read `templates/pipeline-defaults.json → formats.short`)
