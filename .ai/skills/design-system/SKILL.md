---
name: design-system
description: "5-layer Design System architecture, component constraints, and implementation workflow for Remotion visuals"
---

# Design System Skill

Load this skill when working with visual components, storyboards, or Remotion production.

## Quick Reference

Read `src/remotion/design-system/DESIGN-SYSTEM.md` for the full reference. That file is the single source of truth for:

- 5-layer architecture (L1 Tokens → L2 Atmospheres → L3 Motion → L4 Surfaces → L5 Scene Templates)
- Hard constraints (Remotion-native animation, Tailwind CSS for styling, no framer-motion/GSAP)
- How to add new components (decompose → implement → register → showcase → verify)
- Registry system (`registerMotion`, `registerAtmosphere`, `registerSurface`)
- File map and naming conventions
- Current inventory of implemented components

## Styling Stack

- **Tailwind CSS v4** — all static styling via utility classes. Enabled via `@remotion/tailwind-v4` webpack override.
- **`cn()` helper** — `src/lib/utils.ts` — use for conditional/merged class names.
- **shadcn/ui** — pre-built components in `src/components/ui/`. Add new ones: `npx shadcn add <component>`.
- **Inline `style={{}}`** — ONLY for dynamic/animated values driven by `interpolate()` or `spring()`.
- **CSS variables** — shadcn theme vars in `src/remotion/styles.css`. Dark theme is default (video bg is dark).

### Styling Decision Tree

```
Is the value animated (changes per frame)?
  YES → inline style={{ }} with interpolate()/spring()
  NO  → Tailwind class via cn()
```

## Adding shadcn Components

```bash
npx shadcn add card badge button    # adds to src/components/ui/
```

These are stock shadcn components. For DS-specific primitives (atmospheres, surfaces, motions), follow the layer registration workflow in DESIGN-SYSTEM.md.

## Component Catalog

`src/remotion/design-system/component-catalog.json` is the machine-readable mapping from **visual needs** to **DS primitives**. Every agent that picks or uses DS components must read this file.

It contains for each component:
- `useCases` — when this component is the right choice
- `keywords` — semantic tags for matching
- `whenToUse` / `whenNotToUse` — decision guidance
- `storyboardHint` — exact fields the storyboard agent should set in scene detail JSON
- `pairs` — which surfaces/atmospheres/motions work well together
- `alternatives` — what to use instead

**Flow:**
1. Storyboard agent reads catalog → assigns `visual.motion`, `visual.surface`, `visual.atmosphere` in scene details
2. Production agent reads scene hints → resolves to actual DS components via registry
3. Critic verifies choices match the catalog's `whenToUse` / `whenNotToUse` guidance

## Agent-Specific Rules

### Storyboard Agent
- **Read `component-catalog.json` before assigning visuals.** Match scene visual needs to catalog `keywords` and `useCases`.
- Assign `visual.motion`, `visual.surface`, `visual.atmosphere` IDs in scene detail JSON (see `storyboard-authoring` skill → "Design System Hints").
- Only reference IDs that exist in the catalog. If no matching component exists, note it: `"notes": "NEEDS DS COMPONENT: <description>"`.
- Use `pairs` from catalog to pick complementary combinations.

### Video Production Agent
- **Read scene `visual.motion`, `visual.surface`, `visual.atmosphere` hints.** These are DS primitive IDs to resolve.
- Import DS components from `src/remotion/design-system/` barrel exports.
- Use `getMotion(id)`, `getAtmosphere(id)`, `getSurface(id)` for dynamic lookup.
- If a hint references a `"planned"` component, flag it and fall back gracefully (e.g., simple fade instead of missing `blur-fade-in`).
- Use Tailwind classes + `cn()` for static styling, inline `style={{}}` only for animated values.
- shadcn/ui components available from `@/components/ui/`.

### Critic Agent
- Verify scenes use registered DS components (not ad-hoc inline animations)
- Check that `visual.motion`/`visual.surface`/`visual.atmosphere` IDs match catalog entries
- Verify choices make sense per catalog `whenToUse` / `whenNotToUse`
- Check font sizes meet mobile-first minimums (body 32px+, heading 48px+, hero 120px+)
- Flag any framer-motion, GSAP, anime.js usage as automatic FAIL

### Director Agent
- When user shares a reference link: decompose into L1-L5, delegate implementation to appropriate agent
- New components need: implementation → registry entry → **catalog entry** → showcase composition → TypeScript compile check → user visual approval
- Never skip the showcase step — every new primitive must be visually verified before production use
- After adding a new component, update `component-catalog.json` with use cases, keywords, and pairing info
