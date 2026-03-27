/**
 * Shared utilities for vibe components.
 * Extracted from duplicated logic across 5+ components.
 *
 * Color values are imported from the central palette (../palette.ts).
 */

import {
  TEXT, TEXT_MUTED, TEXT_SECONDARY, SURFACE, SURFACE_BORDER,
  SURFACE_HOVER, SURFACE_BORDER_STRONG, DATA_PALETTE,
} from '../../palette';

/**
 * Detect if a hex color is dark (luminance < 128).
 * Used to determine text color, surface style, etc.
 */
export function isDarkColor(hex: string): boolean {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  // YIQ formula (same as used in existing components)
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

/** Light-theme text color */
const TEXT_LIGHT = '#1a1a1a';

/**
 * Derive adaptive text colors from a background color.
 */
export function getAdaptiveColors(backgroundColor: string) {
  const dark = isDarkColor(backgroundColor);
  return {
    isDark: dark,
    textPrimary: dark ? TEXT : TEXT_LIGHT,
    textMuted: dark ? TEXT_MUTED : 'rgba(26,26,26,0.55)',
    textSecondary: dark ? TEXT_SECONDARY : 'rgba(26,26,26,0.7)',
    surface: dark ? SURFACE : 'rgba(0,0,0,0.04)',
    surfaceBorder: dark ? SURFACE_BORDER : 'rgba(0,0,0,0.1)',
    cardBg: dark ? SURFACE_HOVER : 'rgba(0,0,0,0.06)',
    cardBorder: dark ? SURFACE_BORDER_STRONG : 'rgba(0,0,0,0.12)',
  };
}

// ─── Default Data Palettes ────────────────────────────────────

/** Warm palette — used by cinematic vibe (data charts). Derived from central palette. */
export const PALETTE_CINEMATIC = [...DATA_PALETTE];

/** Vivid palette — used by dashboard vibe */
export const PALETTE_DASHBOARD = [
  '#00D4FF', '#FF6B6B', '#4ECDC4', '#FFE66D', '#A78BFA',
  '#F472B6', '#34D399', '#FB923C',
];

/** Muted palette — used by editorial vibe */
export const PALETTE_EDITORIAL = [
  '#6C63FF', '#FF6584', '#43E97B', '#F9D423', '#FF9A9E',
  '#A18CD1', '#FBC2EB', '#84FAB0',
];

// ─── Animation Presets ────────────────────────────────────────

export const SPRING_PRESETS = {
  /** Cinematic: slow, dramatic, slight overshoot */
  cinematic: { damping: 14, stiffness: 60 },
  /** Dashboard: snappy, minimal overshoot */
  dashboard: { damping: 22, stiffness: 180 },
  /** Editorial: smooth, natural, balanced */
  editorial: { damping: 18, stiffness: 100 },
} as const;

// ─── Formatting Helpers ───────────────────────────────────────

/**
 * Format large numbers with K/M/B suffixes.
 */
export function formatCompactNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + 'B';
  if (Math.abs(value) >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(value) >= 1_000) return (value / 1_000).toFixed(1) + 'K';
  return value.toFixed(0);
}

/**
 * Interpolate between two hex colors. t=0 → colorA, t=1 → colorB.
 */
export function lerpColor(colorA: string, colorB: string, t: number): string {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`;
}

function hexToRgb(hex: string) {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}
