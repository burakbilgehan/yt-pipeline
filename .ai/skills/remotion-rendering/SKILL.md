---
name: remotion-rendering
description: "Rules and workflows for rendering video with Remotion"
---

# Remotion Rendering

Rules and workflows for rendering video with Remotion.

## Commands

```bash
# Full render (NEVER block — always background on Windows)
start "" npm run render <slug>

# Single frame preview
npx remotion still <composition-id> --frame <N> --output channels/<channel>/videos/<slug>/production/test-renders/preview.png

# Interactive preview
npm run studio -- --public-dir <project-public-dir>
```

## Critical Rules

### Never Block with Full Renders
Full renders take 10+ minutes. Always launch in background on Windows using `start ""` (NOT `start /B`). For quick checks, use `remotion still` or the studio.

### Concurrency
Add `--concurrency=16` to render commands for optimal performance on the current machine.

### Use `<OffthreadVideo>` for Stock Footage
Never use `<Video>` component — causes stuttering with external media. Always `<OffthreadVideo>`.

### Match Stock FPS to Composition
Stock footage may have different FPS than the composition (default 30fps). Convert before rendering:
```bash
ffmpeg -i input.mp4 -r 30 -c:v libx264 output.mp4
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

- Gemini is primary provider, Pexels for generic backgrounds
- Shorts: `--format short` for 9:16 vertical images
- **Always read `channels/<channel>/channel-assets/brand-guide.md`** before generating — follow visual bible exactly
