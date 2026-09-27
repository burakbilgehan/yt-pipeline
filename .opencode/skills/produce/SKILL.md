---
name: produce
description: "Production stage of a layout-2 video: audio, timeline and the final render command. User-invoked."
disable-model-invocation: true
argument-hint: "<slug>"
---
<!-- AUTO-GENERATED from .ai/. DO NOT EDIT. Run "npm run sync-ai" to regenerate. -->


# Production stage

1. `npm run tts -- <slug>`: synthesizes only blocks whose text or voice settings changed. On failure, stop and report the failing blocks.
2. `npm run assemble -- <slug>`: builds the timeline and render input.
3. Spot-check with `npm run preview-scene -- <slug> <block-id>` for scenes the user wants to see.
4. Review in Remotion Studio (see AGENTS.md > Renders). Render with `npm run render -- <slug>` when the video file is needed.
5. `preview-scene` and `render` exit 1 when the output breaks the watch rules; handle it as step 5 of the `fix` skill says.
