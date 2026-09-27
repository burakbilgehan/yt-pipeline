---
name: design-system
description: "How the scene catalog and its tokens are built and changed: tokens.ts as the single source of visual values, the stage, scene components, and the procedure for adding or changing a scene type in a dedicated design-system session."
---
<!-- AUTO-GENERATED from .ai/. DO NOT EDIT. Run "npm run sync-ai" to regenerate. -->


# Design system

## Where things live

- `src/remotion/catalog/tokens.ts`: every color, type role and size, layout position, easing curve, duration, motion and shape value. The only place such values exist; components import them and never hard-code a value. The visual language is style frame E (`src/remotion/styleframes/e/`, the approved reference; do not edit it).
- `src/remotion/catalog/schema.ts`: the scene contract (types, props, limits, cues, which types are implemented).
- `src/remotion/catalog/motion.ts` and `ui.tsx`: the motion vocabulary (ramp, overshoot, punch, drift, blur) and the primitives every scene builds on (Layer, Snap, Panel, Chip, Card).
- `src/remotion/catalog/Stage.tsx`, `Atmosphere.tsx`, `CatalogVideo.tsx`: the header, chip and source line, the grain, and the renderer with its transitions (push inside a section, stage turn at a section boundary) and kicks.
- `src/remotion/catalog/scenes/`: one component per scene type.
- `src/remotion/catalog/showcase-data.ts`: the review reel (`npm run showcase`).
- `channels/<channel>/channel-assets/brand-guide.md`: the rules in words; it names tokens and never repeats values.

Code under `src/remotion/templates/`, `src/remotion/design-system/` and `src/remotion/compositions/MainComposition.tsx` serves legacy projects only. Do not extend it.

## Changing a token

1. Change the value in `tokens.ts` only. If the user changed it in the Claude Design system, download its `project/tokens.json` and run `npm run design-tokens -- --diff <file>` to list what to apply.
2. `npm run showcase` and look at the reel. Then `npm run design-tokens -- --out <file>` and publish that file to the Claude Design system so both sides match.

## Choosing a look (before any system work)

A new visual direction, or a scene type whose look is not already approved, starts with style frames: at least three clearly different directions for the same real beats, rendered in Remotion as stills and short clips, shown to the user in Studio. The user picks or mixes; only then are tokens and scene types built from the chosen frames. Research documents inform the directions but never define a look on their own. (user, 26.09.2026)

Before anything visual is shown to the user (style frames included), review it at full resolution frame by frame: alignment of every label to its mark and to the grid, one consistent type system, icon quality, and every number, route and shape traced to a source. Anything invented is fixed or named to the user as invented; never shown silently. A contact sheet is not a review. (user, 26.09.2026) Every render is analyzed automatically: `npm run render` and `npm run preview-scene` run the watch gate themselves (`src/pipeline/watch.ts`: cuts, motion, holds, periodic pulses, blank frames, full-resolution frames at those moments) and exit 1 on a rule violation; for showcase and direct Remotion renders `.ai/hooks/auto-watch.mjs` does the same. Read the report and those frames before showing the clip. `.ai/hooks/clean-watch.mjs` deletes analysis folders after an hour.

## Adding or changing a scene type (a new type: design-system session only, with the user; a flagged detail of an existing type: fixed during the video, see AGENTS.md)

1. Contract first: add or change the props schema, limits and cue names in `schema.ts`.
2. Component in `scenes/`: fills the content area, reads only tokens and the primitives in `ui.tsx`, has visible content within `MOTION.sceneEnterDelay` frames of its start, draws data to scale from zero. Layers carrying data marks are `flat` and sit on the grid; only figures and panels drift.
3. Wire it in `CatalogVideo.tsx`, add a showcase entry with real data, add the type to `IMPLEMENTED_TYPES`.
4. Update the type table in the `storyboard` skill.
5. `npx tsc --noEmit`, `npm run showcase`, user approval.

Never port an external animation runtime (framer-motion, gsap, anime.js, react-spring); motion is a pure function of the frame, read with `useFrame` from `catalog/motion.ts` (design frames, so the output fps never changes the speed), never `useCurrentFrame`.
