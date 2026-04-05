# Design System Reference

> Source of truth for the 5-layer DS architecture. Read this file at the start of any session that touches visual components, storyboards, or Remotion production.

## Architecture Overview

Five layers, bottom-up. Higher layers compose lower ones.

```
L5: SCENE TEMPLATES     "What are we showing"     hero, ranking, data-viz, comparison, narrative, cta
L4: SURFACE TREATMENT   "How does the container"  glass, flat, glow, frosted, elevated
L3: MOTION PRIMITIVES   "How does it move"        stagger-text-reveal, text-rotate, counter-up, bar-grow
L2: ATMOSPHERE          "What's the mood"          dot-grid, film-grain, particles, aurora, flickering-grid
L1: DESIGN TOKENS       "Numeric values"           colors, typography, spacing, borders, shadows, opacity
```

**Types**: `src/remotion/design-system/types.ts` defines all interfaces.
**Runtime registry**: `src/remotion/design-system/registry.ts` provides `register*()` / `get*()` for L2-L4.
**JSON config**: `channels/<channel>/channel-assets/design-system.json` stores per-channel token values and layer selections.

## Constraints

These are non-negotiable. Every component in this system must follow them.

1. **Remotion-native only.** Use `useCurrentFrame()`, `spring()`, `interpolate()`, `AbsoluteFill`, `Sequence`. No framer-motion, no GSAP, no anime.js.
2. **No Tailwind, no `cn()` utility.** All styling via inline `style={{}}` objects. Remotion renders in a headless browser — CSS utility classes add complexity for zero benefit.
3. **No external CSS files.** Everything self-contained in the component.
4. **Pure functions where possible.** Motion primitives that don't need React state should be plain `(frame, config) => MotionResult` functions registered in the motion registry.
5. **React components for visual layers.** Atmospheres (L2) and Surfaces (L4) are React components because they render DOM. Motion primitives (L3) can be either functions or components depending on complexity.
6. **Spring physics over easing curves.** Prefer `spring()` for organic movement. Use `interpolate()` with easing only when spring is inappropriate (linear progress bars, etc.).
7. **Mobile-first font sizes.** Minimum body text: 32px. Minimum heading: 48px. Hero numbers: 120px+. Viewers watch on phones.

## Layer Details

### L1: Design Tokens

Defined in `types.ts` → `DesignTokens`. Stored per-channel in `design-system.json`.

| Token Group | Key Fields | Example |
|-------------|-----------|---------|
| `colors` | bgTop, bgBottom, accent1, accent2, text, textMuted, positive, negative, surface, border, grid | `"accent1": "#ff5941"` |
| `typography` | fontFamily, headingWeight, bodyWeight, monoFont, bodyFont | `"fontFamily": "Montserrat"` |
| `spacing` | cornerRadius, borderWidth, screenUtilization, padding | `"cornerRadius": 16` |
| `effects` | glassOpacity, glowIntensity, shadowDepth, gradientAngle, filmGrainOpacity, dotGridOpacity | `"glassOpacity": 0.15` |
| `animation` | speed, springDamping, springStiffness, stagger, easingCurve | `"springDamping": 15` |

Tokens are consumed by all higher layers. Components should read from theme context or props — never hardcode color/size values.

### L2: Atmospheres

Full-screen background layers rendered behind all content. Registered via `registerAtmosphere()`.

- **Directory**: `src/remotion/design-system/atmospheres/`
- **Type**: `React.FC<AtmosphereComponentProps>` — receives `width`, `height`, `opacity`, `speed`, `color`, `scale`
- **Registry ID type**: `AtmosphereId` (e.g., `'dot-grid'`, `'particles'`, `'aurora'`)
- **Usage**: Rendered as a full-bleed `<AbsoluteFill>` layer beneath scene content

Known IDs (from types.ts): `dot-grid`, `film-grain`, `particles`, `aurora`, `flickering-grid`, `none`.

**Status**: Registry wired, no implementations yet.

### L3: Motion Primitives

Reusable animation behaviors. Can be **functions** (registered in motion registry) or **React components** (exported from `motion/`).

- **Directory**: `src/remotion/design-system/motion/`
- **Function type**: `(frame: number, config: MotionConfig) => MotionResult` — returns `{ style, progress }`
- **Component type**: Standard `React.FC<*Props>` using `useCurrentFrame()` + `spring()` internally
- **Registry**: Functions registered via `registerMotion(id, fn)` in `motion/index.ts`

**Implemented**:
| ID | Type | File | Description |
|----|------|------|-------------|
| `stagger-text-reveal` | Function + Component | `StaggerTextReveal.tsx` | Per-character/word spring reveal with configurable `staggerFrom` (first/last/center) |
| `text-rotate` | Function + Component | `TextRotate.tsx` | 3-phase text cycling: exit → resize → enter. Inspired by 21st.dev TextRotate |

**Key props pattern** (shared across text motion components):
- `staggerFrames` — delay between each unit's animation start
- `staggerFrom` — `'first'` / `'last'` / `'center'` — which end starts first
- `splitBy` — `'characters'` / `'words'`
- `springConfig` — `{ damping, stiffness, mass }` for physics tuning

### L4: Surface Treatments

Card/container styling components that wrap content. Registered via `registerSurface()`.

- **Directory**: `src/remotion/design-system/surfaces/`
- **Type**: `React.FC<SurfaceComponentProps>` — receives `children`, `blur`, `opacity`, `borderRadius`, `borderColor`, `glowColor`, `gradient`
- **Registry ID type**: `SurfaceId` (e.g., `'glass'`, `'flat'`, `'glow'`, `'frosted'`, `'elevated'`)

Known IDs (from types.ts): `glass`, `flat`, `glow`, `frosted`, `elevated`, `none`.

**Status**: Registry wired, no implementations yet.

### L5: Scene Templates

Default L1-L4 combinations per scene category. Defined in `types.ts` → `SceneDefaults`.

Categories: `hero`, `data-viz`, `comparison`, `list`, `narrative`, `cta`.

Each template specifies:
- Default `atmosphere` (L2 ID)
- Default `surface` (L4 ID)
- Default `motions[]` (L3 IDs for content animation)
- Optional `transitionIn` / `transitionOut` (L3 IDs)

**Status**: Type defined, no defaults populated yet. These will be populated as L2-L4 components are implemented.

## Component Hierarchy

Three levels of composition:

| Level | Name | What it is | Example |
|-------|------|-----------|---------|
| **Primitive** (atom) | Single animation, surface, or atmosphere | `StaggerTextReveal`, `GlassSurface`, `DotGridAtmosphere` |
| **Block** (molecule) | Composed primitives | Glassmorphic card with counter-up number + stagger subtitle |
| **Scene Template** (organism) | Full scene from blocks | Hero scene: aurora atmosphere + glass card + text-rotate headline + counter stat |

Blocks live in `src/remotion/design-system/blocks/` (not yet created).
Scene templates will bridge into the existing vibe system or replace it.

## Adding a New Component

When the user shares a reference link (CodePen, 21st.dev, Dribbble, etc.):

### Step 1: Decompose

Analyze the reference and identify which layers it touches:
- Is it a **motion** (how something moves)? → L3
- Is it a **surface** (how a container looks)? → L4
- Is it an **atmosphere** (full-screen background)? → L2
- Does it combine multiple? → Implement each layer separately, then compose as a block

### Step 2: Implement

1. Create the component file in the correct layer directory:
   - L2: `atmospheres/<Name>.tsx`
   - L3: `motion/<Name>.tsx`
   - L4: `surfaces/<Name>.tsx`
2. Follow constraints (Remotion-native, inline styles, spring physics)
3. Export a typed `Props` interface
4. Export the component as a named export

### Step 3: Register

1. Import in the layer's `index.ts`
2. For L3 functions: `registerMotion('kebab-id', fn)` in `motion/index.ts`
3. For L2 components: `registerAtmosphere('kebab-id', Component)` in `atmospheres/index.ts`
4. For L4 components: `registerSurface('kebab-id', Component)` in `surfaces/index.ts`
5. Add the ID to the corresponding type union in `types.ts` if it's a new canonical ID

### Step 4: Showcase

1. Create or update a showcase composition in `showcase/`
2. Register the composition in `src/remotion/Root.tsx` with prefix `DS-` (e.g., `DS-TextMotion`, `DS-Surfaces`)
3. Verify in Remotion Studio: `npm run studio`

### Step 5: Verify

1. `npx tsc --noEmit` — must compile clean (ignore `src/tools/` errors, they're a separate project)
2. Visual check in Remotion Studio
3. User approval before using in production

## Registry System

Runtime registries in `registry.ts` map string IDs to implementations.

| Registry | Register | Lookup | Value type |
|----------|----------|--------|-----------|
| Atmosphere (L2) | `registerAtmosphere(id, component)` | `getAtmosphere(id)` | `React.FC<AtmosphereComponentProps>` |
| Motion (L3) | `registerMotion(id, fn)` | `getMotion(id)` | `(frame, config) => MotionResult` |
| Surface (L4) | `registerSurface(id, component)` | `getSurface(id)` | `React.FC<SurfaceComponentProps>` |

**Registration happens at import time** — each layer's `index.ts` calls `register*()` as a side effect. Import `design-system/motion` and all motion primitives are registered.

**Storyboard constraint**: The storyboard agent should only reference IDs that exist in the registry. If a scene needs a visual behavior not in the registry, flag it as needing a new DS component — don't invent ad-hoc animations inline.

## Showcase Pattern

Every new primitive gets a visual demo in Remotion Studio.

- **Directory**: `src/remotion/design-system/showcase/`
- **Naming**: `<Category>Showcase.tsx` (e.g., `TextMotionShowcase.tsx`, `SurfaceShowcase.tsx`)
- **Composition ID**: `DS-<Category>` prefix in `Root.tsx` (e.g., `DS-TextMotion`)
- **Duration**: 300 frames (10s) at 30fps, 1920x1080
- **Background**: Dark neutral (`#2A2A32` or similar) to let components stand out
- **Purpose**: Quick visual verification before using in production. Not shipped in final videos.

Existing showcases:
- `TextMotionShowcase.tsx` → `DS-TextMotion` — demonstrates `StaggerTextReveal` + `TextRotate`

## File Map

```
src/remotion/design-system/
├── DESIGN-SYSTEM.md          ← This file (reference doc)
├── types.ts                  ← L1-L5 TypeScript interfaces
├── registry.ts               ← Runtime registries (register*/get*)
├── index.ts                  ← Barrel exports
├── atmospheres/
│   └── index.ts              ← L2 exports + registrations
├── motion/
│   ├── index.ts              ← L3 exports + registrations
│   ├── StaggerTextReveal.tsx ← Per-char/word spring reveal
│   └── TextRotate.tsx        ← 3-phase text cycling
├── surfaces/
│   └── index.ts              ← L4 exports + registrations
└── showcase/
    └── TextMotionShowcase.tsx ← DS-TextMotion demo composition
```

Future directories (create when needed):
- `blocks/` — composed primitives (molecule level)
- `templates/` — scene-level defaults (organism level)

## Current Inventory

### Implemented
| Layer | ID | Component/File | Status |
|-------|----|---------------|--------|
| L3 Motion | `stagger-text-reveal` | `StaggerTextReveal.tsx` | Done, showcased |
| L3 Motion | `text-rotate` | `TextRotate.tsx` | Done, showcased |

### Planned (not yet implemented)
| Layer | ID | Notes |
|-------|----|-------|
| L2 Atmosphere | `dot-grid` | Common in data/explainer videos |
| L2 Atmosphere | `film-grain` | Cinematic texture |
| L2 Atmosphere | `particles` | Floating ambient particles |
| L4 Surface | `glass` | Glassmorphism card (blur + transparency) |
| L4 Surface | `flat` | Clean flat card with subtle border |
| L4 Surface | `glow` | Card with animated glow border |
| L3 Motion | `counter-up` | Animated number counting |
| L3 Motion | `bar-grow` | Horizontal/vertical bar animation |
| L3 Motion | `blur-fade-in` | Blur → sharp reveal |
