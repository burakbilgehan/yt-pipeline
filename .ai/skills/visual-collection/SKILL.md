# Visual Collection

How to fetch and organize visual assets for video production.

## Commands

```bash
# Stock images/video from Pexels
npm run collect <slug> <image|video> "<query>"

# AI images (Gemini — primary)
npm run generate-image <slug> "<prompt>"

# AI images (DALL-E — alternate)
npm run generate-image <slug> "<prompt>" --provider dalle

# Shorts format (9:16)
npm run collect <slug> image "<query>" --format short
npm run generate-image <slug> "<prompt>" --format short
```

## Where Assets Go

| Type | Path |
|------|------|
| Visuals (images/video) | `channels/<channel>/videos/<slug>/production/visuals/` |
| Research data | `channels/<channel>/videos/<slug>/research/data/` |
| Source snapshots | `channels/<channel>/videos/<slug>/research/sources/` |
| Asset log | `channels/<channel>/videos/<slug>/production/asset-log.md` |

## File Naming

Descriptive, scene-tied names: `scene-003-city-skyline.jpg`, NOT `img1.jpg`.

## Quality Requirements

Read `templates/pipeline-defaults.json → stockMedia`:
- Min resolution: 1920×1080
- Max clip duration: 15s

## Rules

- Save everything to disk immediately — never hold in memory
- Update `channels/<channel>/videos/<slug>/production/asset-log.md` after every download
- Use only free/open-license media
- **Read `channels/<channel>/channel-assets/brand-guide.md` before generating AI images** — follow visual bible exactly
