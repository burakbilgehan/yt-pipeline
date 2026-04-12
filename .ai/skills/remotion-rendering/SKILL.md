---
name: remotion-rendering
description: "Rules and workflows for rendering video with Remotion"
---

# Remotion Rendering

Rules and workflows for rendering video with Remotion.

## Commands

```bash
# Full render (NEVER block — always background)
# macOS/Linux:
npm run render <slug> &
# Windows:
# start "" npm run render <slug>

# Single frame preview
npx remotion still <composition-id> --frame <N> --output channels/<channel>/videos/<slug>/production/test-renders/preview.png

# Interactive preview
npm run studio -- --public-dir <project-public-dir>
```

## Critical Rules

### Never Run Full Renders — User Only
Full video renders (`npm run render`, `npx remotion render` for the entire composition) are **exclusively triggered by the user**. They take 10+ minutes and are expensive. When all fixes/changes are complete, **provide the exact render command** to the user and let them run it. Never run a full render yourself, even in background.

For quick visual checks, use `remotion still` (single frame) or the studio — these are fine to run freely.

### Concurrency
Add `--concurrency=<N>` to render commands based on your machine's CPU cores (e.g., `--concurrency=$(sysctl -n hw.ncpu)` on macOS).

### Use `<OffthreadVideo>` for Stock Footage
Never use `<Video>` component — causes stuttering with external media. Always `<OffthreadVideo>`.

### Match Stock FPS to Composition
Stock footage may have different FPS than the composition. Read FPS from `channels/<channel>/channel-config.json → visuals.fps`. Convert before rendering:
```bash
ffmpeg -i input.mp4 -r <target-fps> -c:v libx264 output.mp4
```

### No Emoji Flags
Chromium (Remotion's renderer) cannot render emoji flags. Use text country code badges instead (e.g., "US", "JP", "DE").

### Bridge Must Be Defensive
The storyboard bridge (`src/utils/storyboard-bridge.ts`) must:
- Normalize all data formats
- Auto-assign sensible defaults for missing fields
- Never crash on missing/malformed storyboard data

### Progressive Enhancement
Missing config values = feature disabled, not a crash. Every optional field must have a fallback.

## Asset Pipeline

1. All visuals must be in `channels/<channel>/videos/<slug>/production/visuals/` before render
2. Copy needed assets to `public/<slug>/` for Remotion access
3. Verify every non-text scene has an asset — no black frames

## Render Outputs

- Intermediate renders: keep significant milestones, delete the rest
- Only `channels/<channel>/videos/<slug>/production/output/final.mp4` is permanent
- Test renders go in `channels/<channel>/videos/<slug>/production/test-renders/`, never repo root

## Image Generation

- Read image provider and style from `channels/<channel>/channel-config.json → visuals.imageProvider` and `visuals.aiImageStyle`
- **Always read `channels/<channel>/channel-assets/brand-guide.md`** before generating — follow visual bible exactly
