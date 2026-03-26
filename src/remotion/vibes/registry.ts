/**
 * Vibe Registry — Maps (VibeId, SceneCategory) → React Component
 *
 * This is the core dispatch table. When rendering a scene, the composition
 * looks up the correct component for the current vibe + scene category.
 */

import type { VibeId, SceneCategory, VibeComponentMap, VibeSceneComponent } from './types';

// ─── Component Imports (lazy to avoid circular deps) ──────────

// Cinematic vibe (wraps existing components)
import { CinematicHero } from './cinematic/CinematicHero';
import { CinematicDataViz } from './cinematic/CinematicDataViz';
import { CinematicComparison } from './cinematic/CinematicComparison';
import { CinematicList } from './cinematic/CinematicList';
import { CinematicNarrative } from './cinematic/CinematicNarrative';
import { CinematicCTA } from './cinematic/CinematicCTA';

// Dashboard vibe
import { DashboardHero } from './dashboard/DashboardHero';
import { DashboardDataViz } from './dashboard/DashboardDataViz';
import { DashboardComparison } from './dashboard/DashboardComparison';
import { DashboardList } from './dashboard/DashboardList';
import { DashboardNarrative } from './dashboard/DashboardNarrative';
import { DashboardCTA } from './dashboard/DashboardCTA';

// Editorial vibe
import { EditorialHero } from './editorial/EditorialHero';
import { EditorialDataViz } from './editorial/EditorialDataViz';
import { EditorialComparison } from './editorial/EditorialComparison';
import { EditorialList } from './editorial/EditorialList';
import { EditorialNarrative } from './editorial/EditorialNarrative';
import { EditorialCTA } from './editorial/EditorialCTA';

// ─── Registry ─────────────────────────────────────────────────

const vibeRegistry: Record<VibeId, VibeComponentMap> = {
  cinematic: {
    hero: CinematicHero,
    'data-viz': CinematicDataViz,
    comparison: CinematicComparison,
    list: CinematicList,
    narrative: CinematicNarrative,
    cta: CinematicCTA,
  },
  dashboard: {
    hero: DashboardHero,
    'data-viz': DashboardDataViz,
    comparison: DashboardComparison,
    list: DashboardList,
    narrative: DashboardNarrative,
    cta: DashboardCTA,
  },
  editorial: {
    hero: EditorialHero,
    'data-viz': EditorialDataViz,
    comparison: EditorialComparison,
    list: EditorialList,
    narrative: EditorialNarrative,
    cta: EditorialCTA,
  },
};

/**
 * Get the scene component for a given vibe + category.
 * Falls back to cinematic if vibe/category not found.
 */
export function getSceneComponent(
  vibeId: VibeId,
  category: SceneCategory,
): VibeSceneComponent {
  const vibeMap = vibeRegistry[vibeId] ?? vibeRegistry.cinematic;
  return vibeMap[category] ?? vibeRegistry.cinematic[category];
}

/**
 * Get the entire component map for a vibe.
 */
export function getVibeComponents(vibeId: VibeId): VibeComponentMap {
  return vibeRegistry[vibeId] ?? vibeRegistry.cinematic;
}

export { vibeRegistry };
