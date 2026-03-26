---
description: Collect assets (media, data, or information) for a project
agent: collector
---

Collect assets: $ARGUMENTS

Usage examples:
- `/collect my-project image "expensive perfume bottle"` — search Pexels for images
- `/collect my-project video "golden liquid pouring"` — search Pexels for video
- `/collect my-project ai "cinematic golden liquid in glass"` — generate with AI (Gemini default, or `--provider dalle`)
- `/collect my-project data "world bank gdp statistics"` — gather data/text from the web
- `/collect my-project info "what to find"` — gather information from the web

Visual assets go to `channels/<channel>/videos/<slug>/production/visuals/`. Data/sources go to `channels/<channel>/videos/<slug>/research/data/` or `research/sources/`. All downloads logged in `channels/<channel>/videos/<slug>/production/asset-log.md`.
