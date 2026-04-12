/**
 * 5-Layer Design System Types
 *
 * Architecture (bottom → top):
 *   L1: Design Tokens      — colors, typography, spacing, effects, animation
 *   L2: Atmosphere          — full-screen background layers (dot-grid, particles, aurora…)
 *   L3: Motion Primitives   — reusable animation functions (counter-up, bar-grow…)
 *   L4: Surface Treatment   — card/container styling (glass, flat, glow…)
 *   L5: Scene Defaults      — per-category default combinations of L1–L4
 *
 * These types mirror design-system.json and provide the contract for
 * the runtime registries in registry.ts.
 */

import type React from 'react';

// ─── L1: Design Tokens ───────────────────────────────────────

/** Color palette — mirrors design-system.json "colors" */
export interface ColorTokens {
  bgTop: string;
  bgBottom: string;
  accent1: string;
  accent2: string;
  text: string;
  textMuted: string;
  positive: string;
  negative: string;
  surface: string;
  border: string;
  grid: string;
}

/** Font families and weights */
export interface TypographyTokens {
  fontFamily: string;
  headingWeight: number;
  bodyWeight: number;
  monoFont: string;
  bodyFont: string;
}

/** Spatial layout tokens */
export interface SpacingTokens {
  cornerRadius: number;
  borderWidth: number;
  screenUtilization: number;
  padding: number;
}

/** Visual effect intensities */
export interface EffectTokens {
  glassOpacity: number;
  glowIntensity: number;
  shadowDepth: 'none' | 'sm' | 'md' | 'lg';
  gradientAngle: number;
  filmGrainOpacity: number;
  dotGridOpacity: number;
  dotGridSpacing: number;
}

/** Animation timing and physics */
export interface AnimationTokens {
  speed: 'slow' | 'normal' | 'fast';
  springDamping: number;
  springStiffness: number;
  stagger: number;
  easingCurve: [number, number, number, number];
}

/** Composite L1 token set */
export interface DesignTokens {
  colors: ColorTokens;
  typography: TypographyTokens;
  spacing: SpacingTokens;
  effects: EffectTokens;
  animation: AnimationTokens;
}

// ─── L2: Atmosphere Layer ─────────────────────────────────────

/** Known atmosphere IDs — extensible via `string & {}` for custom ones */
export type AtmosphereId =
  | 'dot-grid'
  | 'film-grain'
  | 'retro-grid'
  | 'shooting-stars'
  | 'blurry-blob'
  | 'particles'
  | 'aurora'
  | 'flickering-grid'
  | 'none'
  // eslint-disable-next-line @typescript-eslint/ban-types
  | (string & {});

/** Configuration for an atmosphere layer instance */
export interface AtmosphereConfig {
  id: AtmosphereId;
  opacity: number;
  speed: number;
  color?: string;
  scale?: number;
}

/** Props passed to atmosphere React components */
export interface AtmosphereComponentProps extends AtmosphereConfig {
  width: number;
  height: number;
}

/** Registry metadata for a known atmosphere */
export interface AtmosphereRegistryEntry {
  id: AtmosphereId;
  name: string;
  description: string;
  defaults: AtmosphereConfig;
}

// ─── L3: Motion Primitives ────────────────────────────────────

/** Known motion primitive IDs — extensible */
export type MotionPrimitiveId =
  | 'counter-up'
  | 'bar-grow'
  | 'stagger-text-reveal'
  | 'text-rotate'
  | 'container-text-flip'
  | 'blur-fade-in'
  | 'tilt-card'
  | 'text-shimmer'
  | 'glitch-text'
  | 'typing-text'
  | 'slide-up'
  | 'scale-in'
  | 'none'
  // eslint-disable-next-line @typescript-eslint/ban-types
  | (string & {});

/** Configuration for a motion primitive instance */
export interface MotionConfig {
  durationFrames: number;
  delayFrames: number;
  easing: 'spring' | 'ease-out' | 'linear';
  springConfig?: {
    damping: number;
    stiffness: number;
    mass?: number;
  };
}

/** Return value from a motion primitive function */
export interface MotionResult {
  style: React.CSSProperties;
  progress: number;
}

/** Registry metadata for a known motion primitive */
export interface MotionRegistryEntry {
  id: MotionPrimitiveId;
  name: string;
  description: string;
  defaults: MotionConfig;
}

// ─── L4: Surface Treatment ────────────────────────────────────

/** Known surface treatment IDs — extensible */
export type SurfaceId =
  | 'glass'
  | 'flat'
  | 'glow'
  | 'neon-gradient'
  | 'backlight'
  | 'frosted'
  | 'frosted-panel'
  | 'card'
  | 'elevated'
  | 'none'
  // eslint-disable-next-line @typescript-eslint/ban-types
  | (string & {});

/** Configuration for a surface treatment instance */
export interface SurfaceConfig {
  id: SurfaceId;
  blur: number;
  opacity: number;
  borderRadius: number;
  borderColor?: string;
  borderWidth?: number;
  glowColor?: string;
  glowIntensity?: number;
  gradient?: {
    angle: number;
    stops: string[];
  };
}

/** Props passed to surface React components */
export interface SurfaceComponentProps extends SurfaceConfig {
  children: React.ReactNode;
  className?: string;
}

/** Registry metadata for a known surface treatment */
export interface SurfaceRegistryEntry {
  id: SurfaceId;
  name: string;
  description: string;
  defaults: SurfaceConfig;
}

// ─── L5: Scene Template Defaults ──────────────────────────────

/**
 * Scene template IDs — mirrors SceneCategory from vibes/types.ts.
 * Kept as a separate type to decouple the design system from the vibe system.
 */
export type SceneTemplateId =
  | 'hero'
  | 'data-viz'
  | 'comparison'
  | 'list'
  | 'narrative'
  | 'cta';

/** Default layer selections for a scene template */
export interface SceneDefaults {
  atmosphere: AtmosphereId;
  surface: SurfaceId;
  motions: MotionPrimitiveId[];
  transitionIn?: MotionPrimitiveId;
  transitionOut?: MotionPrimitiveId;
}

// ─── Full Design System ───────────────────────────────────────

/** Complete design system definition — tokens + all layer registries + scene defaults */
export interface DesignSystem {
  version: number;
  name: string;
  tokens: DesignTokens;
  atmospheres: Record<string, AtmosphereRegistryEntry>;
  motions: Record<string, MotionRegistryEntry>;
  surfaces: Record<string, SurfaceRegistryEntry>;
  sceneDefaults: Record<SceneTemplateId, SceneDefaults>;
}
