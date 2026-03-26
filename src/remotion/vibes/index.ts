/**
 * Vibe System — Public API
 *
 * Barrel export for the vibe system. Import everything from here:
 *   import { getSceneComponent, VibeThemeProvider, useVibeTheme } from '../vibes';
 */

// ─── Types ────────────────────────────────────────────────────
export type {
  VibeId,
  SceneCategory,
  VibeMeta,
  SceneCategoryMeta,
  BaseSceneProps,
  HeroSceneProps,
  DataVizSceneProps,
  ComparisonSceneProps,
  ListSceneProps,
  NarrativeSceneProps,
  CTASceneProps,
  SceneProps,
  VibeTheme,
  VibeAnimationConfig,
  VibeLayoutConfig,
  VibeColorConfig,
  VibeTypographyConfig,
  VibeComponentMap,
  VibeSceneComponent,
} from './types';

export {
  VIBE_IDS,
  VIBE_META,
  SCENE_CATEGORIES,
  SCENE_CATEGORY_META,
} from './types';

// ─── Theme Context ────────────────────────────────────────────
export { VibeThemeProvider, useVibeTheme } from './theme-context';

// ─── Registry ─────────────────────────────────────────────────
export { getSceneComponent, getVibeComponents, vibeRegistry } from './registry';

// ─── Shared Utilities ─────────────────────────────────────────
export {
  isDarkColor,
  getAdaptiveColors,
  PALETTE_CINEMATIC,
  PALETTE_DASHBOARD,
  PALETTE_EDITORIAL,
  SPRING_PRESETS,
  formatCompactNumber,
  lerpColor,
} from './shared/utils';
