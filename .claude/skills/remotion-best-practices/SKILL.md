---
name: remotion-best-practices
description: "Best practices for Remotion video creation in React"
---
<!-- AUTO-GENERATED from .ai/ — DO NOT EDIT. Run "npm run sync-ai" to regenerate. -->


# Remotion Best Practices

Best practices for Remotion — video creation in React. Use this skill whenever you are dealing with Remotion code.

## yt-pipeline Specific Rules (CRITICAL)

These rules are specific to the yt-pipeline project and were learned through painful debugging. **Always follow them.**

### No Emoji Flags
Remotion uses Chromium which **does not render emoji flags** — they appear as black squares (☐). Always use styled **country code text badges** (e.g., `"USA"`, `"JPN"`) instead of flag emojis (🇺🇸, 🇯🇵). This applies to ALL components.

### Never Run Full Renders as Blocking
Full Remotion renders take **10+ minutes**. Never run them as blocking `npx remotion render ...`. Always:
- Background long renders (`npm run render <slug> &` on macOS/Linux, `start "" npm run render <slug>` on Windows)
- For quick checks: `npx remotion still src/remotion/index.ts MainVideo --public-dir "<path>" --frame <N> --output <path>`
- For interactive preview: `npm run studio -- --public-dir "<project-path>"` (Remotion Studio) — **preferred method**
- Preview first, render last

### Verify All Displayed Math
Any formula or calculation shown on screen must be mathematically verified before render. Compute the actual result independently.

### Progressive Enhancement Pattern
Complex data-chart components should support progressive feature addition:
- Base rendering (dots, axes, labels) always works
- Advanced features (connectors, spotlights, overlays, camera zoom, dimming) are optional config fields
- Missing config = feature disabled, NOT a crash
- Each feature has its own config interface and is independently toggleable

### Storyboard Bridge
The bridge (`src/utils/storyboard-bridge.ts`) transforms storyboard JSON → Remotion props. Key behaviors:
- `bridgeSceneVisual(visual)` transforms a single scene; `bridgeAllScenes(scenes)` does all + propagates fallbacks
- Country dot data comes from `cfg.allDots` (storyboard config), NOT hardcoded
- Normalizes `label` → `labels[]`, `connectorLine` → `connectorLines`, `cameraZoom.scale` → `endScale`
- Auto-assigns `labelDir` based on position (left/right half × top/bottom half)
- Never crashes on missing optional fields

### Audio is WAV, Not MP3
The TTS pipeline produces LINEAR16/WAV files (sample rate from channel config, commonly 24kHz or 44.1kHz). Audio file references in manifests use `.wav` extension. The `audio-probe.ts` utility supports both WAV and MP3 header parsing.

## Captions

When dealing with captions or subtitles, load the [./rules/subtitles.md](./rules/subtitles.md) file for more information.

## Using FFmpeg

For some video operations, such as trimming videos or detecting silence, FFmpeg should be used. Load the [./rules/ffmpeg.md](./rules/ffmpeg.md) file for more information.

## Audio visualization

When needing to visualize audio (spectrum bars, waveforms, bass-reactive effects), load the [./rules/audio-visualization.md](./rules/audio-visualization.md) file for more information.

## Sound effects

When needing to use sound effects, load the [./rules/sfx.md](./rules/sfx.md) file for more information.

## How to use

Read individual rule files for detailed explanations and code examples:

- [rules/3d.md](rules/3d.md) - 3D content in Remotion using Three.js and React Three Fiber
- [rules/animations.md](rules/animations.md) - Fundamental animation skills for Remotion
- [rules/assets.md](rules/assets.md) - Importing images, videos, audio, and fonts into Remotion
- [rules/audio.md](rules/audio.md) - Using audio and sound in Remotion - importing, trimming, volume, speed, pitch
- [rules/calculate-metadata.md](rules/calculate-metadata.md) - Dynamically set composition duration, dimensions, and props
- [rules/can-decode.md](rules/can-decode.md) - Check if a video can be decoded by the browser using Mediabunny
- [rules/charts.md](rules/charts.md) - Chart and data visualization patterns for Remotion (bar, pie, line, stock charts)
- [rules/compositions.md](rules/compositions.md) - Defining compositions, stills, folders, default props and dynamic metadata
- [rules/extract-frames.md](rules/extract-frames.md) - Extract frames from videos at specific timestamps using Mediabunny
- [rules/fonts.md](rules/fonts.md) - Loading Google Fonts and local fonts in Remotion
- [rules/get-audio-duration.md](rules/get-audio-duration.md) - Getting the duration of an audio file in seconds with Mediabunny
- [rules/get-video-dimensions.md](rules/get-video-dimensions.md) - Getting the width and height of a video file with Mediabunny
- [rules/get-video-duration.md](rules/get-video-duration.md) - Getting the duration of a video file in seconds with Mediabunny
- [rules/gifs.md](rules/gifs.md) - Displaying GIFs synchronized with Remotion's timeline
- [rules/images.md](rules/images.md) - Embedding images in Remotion using the Img component
- [rules/light-leaks.md](rules/light-leaks.md) - Light leak overlay effects using @remotion/light-leaks
- [rules/lottie.md](rules/lottie.md) - Embedding Lottie animations in Remotion
- [rules/measuring-dom-nodes.md](rules/measuring-dom-nodes.md) - Measuring DOM element dimensions in Remotion
- [rules/measuring-text.md](rules/measuring-text.md) - Measuring text dimensions, fitting text to containers, and checking overflow
- [rules/sequencing.md](rules/sequencing.md) - Sequencing patterns for Remotion - delay, trim, limit duration of items
- [rules/tailwind.md](rules/tailwind.md) - Using TailwindCSS in Remotion
- [rules/text-animations.md](rules/text-animations.md) - Typography and text animation patterns for Remotion
- [rules/timing.md](rules/timing.md) - Interpolation curves in Remotion - linear, easing, spring animations
- [rules/transitions.md](rules/transitions.md) - Scene transition patterns for Remotion
- [rules/transparent-videos.md](rules/transparent-videos.md) - Rendering out a video with transparency
- [rules/trimming.md](rules/trimming.md) - Trimming patterns for Remotion - cut the beginning or end of animations
- [rules/videos.md](rules/videos.md) - Embedding videos in Remotion - trimming, volume, speed, looping, pitch
- [rules/parameters.md](rules/parameters.md) - Make a video parametrizable by adding a Zod schema
- [rules/maps.md](rules/maps.md) - Add a map using Mapbox and animate it
- [rules/voiceover.md](rules/voiceover.md) - Adding AI-generated voiceover to Remotion compositions using Google Cloud TTS
- [rules/display-captions.md](rules/display-captions.md) - Displaying captions/subtitles on screen
- [rules/import-srt-captions.md](rules/import-srt-captions.md) - Importing SRT caption files
- [rules/transcribe-captions.md](rules/transcribe-captions.md) - Transcribing audio to captions
