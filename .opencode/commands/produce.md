---
description: Produce a video from storyboard (TTS, visuals, render)
agent: video-production
---
<!-- AUTO-GENERATED from .ai/ — DO NOT EDIT. Run "npm run sync-ai" to regenerate. -->

Produce the video for project: $ARGUMENTS

Read the latest storyboard from `channels/<channel>/videos/<slug>/storyboard/storyboard-v<N>.json` (use the highest version number) and:
1. Generate TTS audio via `npm run tts <slug>`
2. Collect/generate visuals (stock + AI images)
3. Build Remotion composition
4. Present preview for review before final render
