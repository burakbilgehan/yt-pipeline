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

1. **Remotion-native animation.** Use `useCurrentFrame()`, `spring()`, `interpolate()`, `AbsoluteFill`, `Sequence` for animation. No framer-motion, no GSAP, no anime.js.
2. **Tailwind CSS v4 + `cn()` for styling.** Use Tailwind utility classes and the `cn()` helper from `@/lib/utils` for all styling. Inline `style={{}}` is allowed only for dynamic/animated values (e.g., `transform`, `opacity` driven by `interpolate()`). Static layout, colors, spacing, typography → always Tailwind classes.
3. **shadcn/ui components available.** Use shadcn/ui primitives (Card, Badge, Button, etc.) where appropriate. Add new ones via `npx shadcn add <component>`. Components live in `src/components/ui/`.
4. **No external animation libraries.** No framer-motion, GSAP, anime.js, react-spring. Remotion's `spring()` + `interpolate()` are the only animation primitives.
5. **Pure functions where possible.** Motion primitives that don't need React state should be plain `(frame, config) => MotionResult` functions registered in the motion registry.
6. **React components for visual layers.** Atmospheres (L2) and Surfaces (L4) are React components because they render DOM. Motion primitives (L3) can be either functions or components depending on complexity.
7. **Spring physics over easing curves.** Prefer `spring()` for organic movement. Use `interpolate()` with easing only when spring is inappropriate (linear progress bars, etc.).
8. **Mobile-first font sizes.** Minimum body text: 32px. Minimum heading: 48px. Hero numbers: 120px+. Viewers watch on phones.

### Styling Decision Tree

```
Is the value animated (changes per frame)?
  YES → inline style={{ }} with interpolate()/spring()
  NO  → Is it a standard layout/color/spacing/typography property?
          YES → Tailwind class via cn()
          NO  → inline style={{ }} (e.g., exotic CSS properties)
```

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
src/
├── remotion/
│   ├── styles.css                ← Tailwind v4 + shadcn theme variables
│   ├── webpack-override.ts       ← Shared webpack override (enables Tailwind)
│   └── design-system/
│       ├── DESIGN-SYSTEM.md      ← This file (reference doc)
│       ├── types.ts              ← L1-L5 TypeScript interfaces
│       ├── registry.ts           ← Runtime registries (register*/get*)
│       ├── index.ts              ← Barrel exports
│       ├── atmospheres/
│       │   └── index.ts          ← L2 exports + registrations
│       ├── motion/
│       │   ├── index.ts          ← L3 exports + registrations
│       │   ├── StaggerTextReveal.tsx
│       │   └── TextRotate.tsx
│       ├── surfaces/
│       │   └── index.ts          ← L4 exports + registrations
│       └── showcase/
│           └── TextMotionShowcase.tsx
├── components/
│   └── ui/                       ← shadcn/ui components (added via `npx shadcn add`)
├── lib/
│   └── utils.ts                  ← cn() helper (clsx + tailwind-merge)
```

### Infrastructure Files (outside design-system)

| File | Purpose |
|------|---------|
| `remotion.config.ts` | CLI webpack override for Tailwind v4 |
| `components.json` | shadcn CLI configuration |
| `src/remotion/webpack-override.ts` | Shared `enableTailwind()` for CLI + Node.js API |
| `src/remotion/styles.css` | Tailwind import + shadcn CSS variables (dark theme default) |
| `src/lib/utils.ts` | `cn()` utility — `twMerge(clsx(...))` |

Future directories (create when needed):
- `blocks/` — composed primitives (molecule level)
- `templates/` — scene-level defaults (organism level)

## Component Catalog

The machine-readable catalog is at `component-catalog.json` (same directory). It maps every DS primitive to:

- **useCases** — when this component is the right choice
- **keywords** — semantic tags for matching visual needs to components
- **whenToUse / whenNotToUse** — decision guidance
- **storyboardHint** — exact fields the storyboard agent should set
- **pairs** — which surfaces/atmospheres/motions work well together
- **alternatives** — what to use instead if this doesn't fit

**Agents must read `component-catalog.json` when:**
- Storyboard agent is assigning visuals to scenes
- Production agent is resolving storyboard hints to actual implementations
- Critic is verifying component choices make sense for the scene context

## Quick Decision Guide

### "I need text to appear" → Which motion?

| Situation | Use | Not |
|-----------|-----|-----|
| Title/heading enters dramatically | `stagger-text-reveal` | |
| Text cycles through multiple values | `text-rotate` | `stagger-text-reveal` |
| Number counts up smoothly | `counter-up` | `text-rotate` |
| Subtle label or caption fades in | `blur-fade-in` | `stagger-text-reveal` |

### "I need a container" → Which surface?

| Situation | Use | Not |
|-----------|-----|-----|
| Card floating over atmospheric bg | `glass` | `flat` |
| Clean data table, max readability | `flat` | `glass` |
| Hero stat demanding attention | `glow` | `flat` |
| Soft transparent card, vintage feel | `frosted` | `glow` |

### "I need a background" → Which atmosphere?

| Situation | Use | Not |
|-----------|-----|-----|
| Data/analytical scene | `dot-grid` | `aurora` |
| Cinematic/emotional scene | `film-grain` | `dot-grid` |
| Futuristic/techy scene | `particles` | `film-grain` |
| Dramatic hero moment | `aurora` | `dot-grid` |
| Stock footage background | `none` | anything (it competes) |

## Current Inventory

### Implemented
| Layer | ID | File | Use When |
|-------|----|------|----------|
| L3 Motion | `stagger-text-reveal` | `StaggerTextReveal.tsx` | Text appearing for the first time — character/word entrance |
| L3 Motion | `text-rotate` | `TextRotate.tsx` | Multiple values cycling in same position — before/after, progression |

### Planned (not yet implemented)
| Layer | ID | Use When |
|-------|----|----------|
| L2 Atmosphere | `dot-grid` | Data/analytical scene backgrounds |
| L2 Atmosphere | `film-grain` | Cinematic/documentary texture |
| L2 Atmosphere | `particles` | Futuristic/ambient floating particles |
| L4 Surface | `glass` | Semi-transparent cards over atmospheric backgrounds |
| L4 Surface | `flat` | Clean opaque cards for maximum readability |
| L4 Surface | `glow` | Hero stats or CTAs that need maximum emphasis |
| L3 Motion | `counter-up` | Numeric values animating from 0 to target |
| L3 Motion | `bar-grow` | Bar charts / progress bars filling up |
| L3 Motion | `blur-fade-in` | Subtle content entrance — blur to sharp |
