/**
 * Design System — barrel exports
 *
 * Re-exports all types and registry functions so consumers can import
 * from '@/remotion/design-system' directly.
 */

// ─── Types (L1–L5) ───────────────────────────────────────────

export type {
  // L1: Design Tokens
  ColorTokens,
  TypographyTokens,
  SpacingTokens,
  EffectTokens,
  AnimationTokens,
  DesignTokens,
  // L2: Atmosphere
  AtmosphereId,
  AtmosphereConfig,
  AtmosphereComponentProps,
  AtmosphereRegistryEntry,
  // L3: Motion
  MotionPrimitiveId,
  MotionConfig,
  MotionResult,
  MotionRegistryEntry,
  // L4: Surface
  SurfaceId,
  SurfaceConfig,
  SurfaceComponentProps,
  SurfaceRegistryEntry,
  // L5: Scene Defaults
  SceneTemplateId,
  SceneDefaults,
  // Full system
  DesignSystem,
} from './types';

// ─── Registry functions ───────────────────────────────────────

export {
  registerAtmosphere,
  getAtmosphere,
  registerMotion,
  getMotion,
  registerSurface,
  getSurface,
} from './registry';
