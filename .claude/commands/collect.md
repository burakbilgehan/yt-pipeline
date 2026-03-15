---
description: Collect stock media or generate AI images for a project
---
<!-- AUTO-GENERATED from .ai/ — DO NOT EDIT. Run "npm run sync-ai" to regenerate. -->

Collect assets: $ARGUMENTS

Usage examples:
- `/collect my-project image "expensive perfume bottle"` — search Pexels for images
- `/collect my-project video "golden liquid pouring"` — search Pexels for video
- `/collect my-project ai "cinematic golden liquid in glass"` — generate with AI (Gemini default, or `--provider dalle`)
- `/collect my-project info "what to find"` — gather information from the web

All assets are saved to `projects/<slug>/production/visuals/` and logged in `asset-log.md`.
