---
name: design-system
description: "5-layer Design System architecture, component constraints, and implementation workflow for Remotion visuals"
---

# Design System Skill

Load this skill when working with visual components, storyboards, or Remotion production.

## Quick Reference

Read `src/remotion/design-system/DESIGN-SYSTEM.md` for the full reference. That file is the single source of truth for:

- 5-layer architecture (L1 Tokens → L2 Atmospheres → L3 Motion → L4 Surfaces → L5 Scene Templates)
- Hard constraints (Remotion-native only, no framer-motion, no Tailwind, inline styles only)
- How to add new components (decompose → implement → register → showcase → verify)
- Registry system (`registerMotion`, `registerAtmosphere`, `registerSurface`)
- File map and naming conventions
- Current inventory of implemented components

## Agent-Specific Rules

### Storyboard Agent
- Only reference motion/surface/atmosphere IDs that exist in the DS registry
- If a scene needs a visual behavior not in the registry, flag it — don't invent ad-hoc animations
- Check `DESIGN-SYSTEM.md` → "Current Inventory" for available components

### Video Production Agent
- Import DS components from `src/remotion/design-system/` barrel exports
- Use `getMotion(id)`, `getAtmosphere(id)`, `getSurface(id)` for dynamic lookup
- Follow the component hierarchy: primitives → blocks → scene templates
- All new Remotion components must follow DS constraints (no framer-motion, inline styles, spring physics)

### Critic Agent
- Verify scenes use registered DS components (not ad-hoc inline animations)
- Check font sizes meet mobile-first minimums (body 32px+, heading 48px+, hero 120px+)
- Flag any framer-motion, Tailwind, or external CSS usage as automatic FAIL

### Director Agent
- When user shares a reference link: decompose into L1-L5, delegate implementation to appropriate agent
- New components need: implementation → registry entry → showcase composition → TypeScript compile check → user visual approval
- Never skip the showcase step — every new primitive must be visually verified before production use
