// Design System Tool — Core Types

export interface ColorPalette {
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
}

export interface TypographySettings {
  fontFamily: string;
  headingWeight: number;
  bodyWeight: number;
  monoFont: string;
}

export interface GeometrySettings {
  cornerRadius: number; // 0 = sharp, 4 = subtle, 8 = rounded, 16 = pill
  borderWidth: number;
  screenUtilization: number; // 0.6 = spacious, 0.8 = balanced, 0.95 = compact
  asymmetry: number; // 0 = centered/symmetric, 1 = full asymmetric
  alignment: 'center' | 'left' | 'right';
}

export interface EffectsSettings {
  glassOpacity: number; // 0 = opaque, 1 = full glass
  glowIntensity: number; // 0 = flat, 1 = strong glow
  shadowDepth: 'none' | 'whisper' | 'soft' | 'floating';
  gradientAngle: number; // degrees for background gradient
}

export interface AnimationSettings {
  speed: 'slow' | 'normal' | 'fast';
  springDamping: number;
  springStiffness: number;
  stagger: number; // ms between staggered elements
}

export interface DesignSystem {
  name: string;
  version: number;
  colors: ColorPalette;
  typography: TypographySettings;
  geometry: GeometrySettings;
  effects: EffectsSettings;
  animation: AnimationSettings;
  promptInput?: string; // freeform style description
}

// What gets exported to channels/<channel>/design-system.json
export interface DesignSystemExport extends DesignSystem {
  exportedAt: string;
  exportedFrom: 'design-system-tool';
  channelSlug?: string;
}

// ─── Two-layer preset system ────────────────────────────────────────────────

/** Color-only preset — just the palette */
export interface ColorPreset {
  id: string;
  name: string;
  description: string;
  /** Light or dark palette? Helps with vibe matching. */
  mode: 'dark' | 'light';
  colors: ColorPalette;
}

/** Vibe preset — typography + geometry + effects + animation (no colors) */
export interface VibePreset {
  id: string;
  name: string;
  description: string;
  typography: TypographySettings;
  geometry: GeometrySettings;
  effects: EffectsSettings;
  animation: AnimationSettings;
}

// Legacy combo preset (kept for backward compat with exports)
export interface DesignPreset {
  id: string;
  name: string;
  description: string;
  system: DesignSystem;
}
