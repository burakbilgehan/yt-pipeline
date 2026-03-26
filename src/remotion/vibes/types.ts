/**
 * Vibe System Types
 *
 * A "vibe" determines the visual identity of a channel — which components
 * are used, how layouts are structured, what the overall tone feels like.
 *
 * Architecture:
 *   VibeId × SceneCategory → React Component
 *   Each vibe provides a component for each scene category.
 */

import type React from 'react';

// ─── Vibe IDs ─────────────────────────────────────────────────

export type VibeId = 'cinematic' | 'dashboard' | 'editorial';

export const VIBE_IDS: VibeId[] = ['cinematic', 'dashboard', 'editorial'];

export interface VibeMeta {
  id: VibeId;
  name: string;
  description: string;
  reference: string; // reference channels/styles
  tone: string;
}

export const VIBE_META: Record<VibeId, VibeMeta> = {
  cinematic: {
    id: 'cinematic',
    name: 'Cinematic',
    description: 'Documentary-style with letterbox framing, Ken Burns motion, fade transitions, and dramatic reveals',
    reference: 'Kurzgesagt, ColdFusion, Real Engineering',
    tone: 'Serious, authoritative, slow-burn storytelling',
  },
  dashboard: {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Grid layouts, snap transitions, data panels, terminal aesthetic, information-dense',
    reference: 'Fireship, Bloomberg, The Plain Bagel',
    tone: 'Fast, technical, data-forward, energetic',
  },
  editorial: {
    id: 'editorial',
    name: 'Editorial',
    description: 'Infographic storytelling, clean whitespace, data-art, smooth scroll-like flow',
    reference: 'Vox, Visual Capitalist, Polymatter',
    tone: 'Explanatory, clean, story-driven, accessible',
  },
};

// ─── Scene Categories ─────────────────────────────────────────

export type SceneCategory =
  | 'hero'        // Big number/statement reveal, attention-grabbing opener
  | 'data-viz'    // Chart, graph, data animation
  | 'comparison'  // A vs B, formula, side-by-side
  | 'list'        // Sequential item reveal, parade, scoreboard
  | 'narrative'   // Voiceover + visual, explanation scene
  | 'cta';        // Closing, subscribe, end screen

export const SCENE_CATEGORIES: SceneCategory[] = [
  'hero', 'data-viz', 'comparison', 'list', 'narrative', 'cta',
];

export interface SceneCategoryMeta {
  id: SceneCategory;
  name: string;
  description: string;
}

export const SCENE_CATEGORY_META: Record<SceneCategory, SceneCategoryMeta> = {
  hero: {
    id: 'hero',
    name: 'Hero',
    description: 'Big number or statement reveal — the hook that grabs attention',
  },
  'data-viz': {
    id: 'data-viz',
    name: 'Data Visualization',
    description: 'Charts, graphs, animated data — the core of a data channel',
  },
  comparison: {
    id: 'comparison',
    name: 'Comparison',
    description: 'A vs B, formula breakdown, side-by-side analysis',
  },
  list: {
    id: 'list',
    name: 'List / Parade',
    description: 'Sequential items, rankings, scored lists revealed one by one',
  },
  narrative: {
    id: 'narrative',
    name: 'Narrative',
    description: 'Voiceover-driven scene with supporting visuals — the storytelling glue',
  },
  cta: {
    id: 'cta',
    name: 'Call to Action',
    description: 'Closing card, subscribe prompt, end screen',
  },
};

// ─── Scene Props (generic, shared across all vibes) ───────────

/**
 * Base props that EVERY scene component receives, regardless of vibe.
 * The vibe theme context provides additional styling information.
 */
export interface BaseSceneProps {
  /** Scene duration in frames */
  durationInFrames: number;
  /** Voiceover text for subtitle sync (optional, handled by SubtitleOverlay) */
  voiceover?: string;
}

/**
 * Hero scene props — big number/statement reveal
 */
export interface HeroSceneProps extends BaseSceneProps {
  /** Primary big number or statement (e.g. "26,000%") */
  primaryValue: string;
  /** Secondary/comparison value (e.g. "132%") */
  secondaryValue?: string;
  /** Subtitle text below the number */
  subtitle?: string;
  /** Sub-label (e.g. "in gold terms") */
  subLabel?: string;
  /** Context line (e.g. "The Dow Jones · Since 1925") */
  contextLine?: string;
  /** Color for primary value */
  primaryColor?: string;
  /** Color for secondary value */
  secondaryColor?: string;
  /** Variant hint — vibe can interpret or ignore */
  variant?: string;
}

/**
 * Data visualization scene props
 * Reuses existing DataChartInput for flexibility.
 */
export interface DataVizSceneProps extends BaseSceneProps {
  /** Chart type identifier */
  chartType: string;
  /** Chart title */
  title?: string;
  /** Chart subtitle */
  subtitle?: string;
  /** Data items */
  items?: Array<{ label: string; value: number; color?: string; icon?: string }>;
  /** For counter-type visualizations */
  counterValue?: number;
  counterPrefix?: string;
  counterSuffix?: string;
  /** Unit label */
  unit?: string;
  /** Color overrides */
  colors?: string[];
  /** Chart orientation */
  orientation?: 'horizontal' | 'vertical';
  /** For comparison/duel charts */
  duel?: { left: string; right: string };
  /** Background image path (for overlay charts on visuals) */
  backgroundAsset?: string;
}

/**
 * Comparison scene props — formula, A vs B
 */
export interface ComparisonSceneProps extends BaseSceneProps {
  /** Formula parts to display sequentially (e.g. ["Asset Price", "÷", "Gold Price", "=", "Ratio"]) */
  formulaParts?: string[];
  /** Worked example text */
  example?: string;
  /** Data source badge text */
  dataBadge?: string;
  /** Accent color for highlights */
  accentColor?: string;
}

/**
 * List / Sequential Reveal scene props
 */
export interface ListSceneProps extends BaseSceneProps {
  /** Section title */
  title?: string;
  /** Items to reveal one by one */
  items: Array<{
    name: string;
    /** Primary display value (e.g. price, score) */
    value: string;
    /** Secondary computed value (e.g. ratio, percentage) */
    computedValue?: string;
    /** Item color */
    color: string;
    /** Optional suffix (e.g. "%", "oz") */
    suffix?: string;
    /** Optional period/label (e.g. "2020-2025") */
    period?: string;
  }>;
  /** Reference value label (e.g. "Gold $2,990") — shown in computation */
  referenceLabel?: string;
  /** Footer text */
  footerText?: string;
  /** Data source badge */
  dataBadge?: string;
  /** Accent color */
  accentColor?: string;
  /** Seconds to show formula phase (if any) */
  formulaDuration?: number;
  /** Seconds per item reveal */
  itemDuration?: number;
}

/**
 * Narrative scene props — voiceover with supporting visuals
 */
export interface NarrativeSceneProps extends BaseSceneProps {
  /** Visual type (stock image, video, text overlay, etc.) */
  visualType: 'stock-image' | 'stock-video' | 'ai-image' | 'text-overlay' | 'composite';
  /** Text to show on screen (if text-overlay or as overlay on media) */
  textOverlay?: string;
  /** Path to media asset */
  assetPath?: string;
  /** Fallback asset from previous scene */
  fallbackAsset?: string;
  /** Description for context */
  description?: string;
}

/**
 * CTA / Closing scene props
 */
export interface CTASceneProps extends BaseSceneProps {
  /** Closing message */
  message?: string;
  /** Channel name */
  channelName?: string;
  /** CTA button text */
  ctaText?: string;
  /** Accent color */
  accentColor?: string;
  /** Show YouTube end screen boxes */
  showEndScreen?: boolean;
}

// ─── Scene Props Union ────────────────────────────────────────

export type SceneProps =
  | ({ category: 'hero' } & HeroSceneProps)
  | ({ category: 'data-viz' } & DataVizSceneProps)
  | ({ category: 'comparison' } & ComparisonSceneProps)
  | ({ category: 'list' } & ListSceneProps)
  | ({ category: 'narrative' } & NarrativeSceneProps)
  | ({ category: 'cta' } & CTASceneProps);

// ─── Vibe Theme (provided via React Context) ──────────────────

export interface VibeAnimationConfig {
  /** Default spring damping */
  springDamping: number;
  /** Default spring stiffness */
  springStiffness: number;
  /** Stagger delay between sequential elements (ms converted to frames at usage) */
  staggerDelayFrames: number;
  /** Transition type preference */
  preferredTransition: 'fade' | 'cut' | 'slide' | 'zoom';
  /** Default transition duration in frames */
  transitionDurationFrames: number;
}

export interface VibeLayoutConfig {
  /** Screen utilization (0.0-1.0) */
  screenUtilization: number;
  /** Default padding in pixels */
  padding: number;
  /** Corner radius for cards/containers */
  cornerRadius: number;
  /** Border width for containers */
  borderWidth: number;
  /** Whether to use letterbox (cinematic bars) */
  letterbox: boolean;
  /** Content alignment preference */
  alignment: 'center' | 'left' | 'right';
}

export interface VibeColorConfig {
  /** Whether the vibe is dark-theme by default */
  isDark: boolean;
  /** Text primary color */
  textPrimary: string;
  /** Text secondary/muted color */
  textMuted: string;
  /** Surface/card background */
  surface: string;
  /** Surface border */
  surfaceBorder: string;
  /** Positive indicator (growth, success) */
  positive: string;
  /** Negative indicator (decline, warning) */
  negative: string;
  /** Default data palette (for charts without explicit colors) */
  dataPalette: string[];
}

export interface VibeTypographyConfig {
  /** Heading font size (hero numbers, titles) */
  heroSize: number;
  /** Title font size */
  titleSize: number;
  /** Body font size */
  bodySize: number;
  /** Label/caption font size */
  labelSize: number;
  /** Heading font weight */
  headingWeight: number;
  /** Body font weight */
  bodyWeight: number;
}

/**
 * Full vibe theme — everything a component needs to render in-vibe.
 * Provided via React context so components don't need prop drilling.
 */
export interface VibeTheme {
  /** Which vibe is active */
  vibeId: VibeId;
  /** Brand color (from channel config) */
  brandColor: string;
  /** Background color */
  backgroundColor: string;
  /** Primary font family (CSS string) */
  fontFamily: string;
  /** Mono font family (CSS string) */
  monoFont: string;
  /** Animation config */
  animation: VibeAnimationConfig;
  /** Layout config */
  layout: VibeLayoutConfig;
  /** Color config (derived from vibe + backgroundColor) */
  colors: VibeColorConfig;
  /** Typography config */
  typography: VibeTypographyConfig;
}

// ─── Vibe Scene Component Type ────────────────────────────────

/**
 * A vibe scene component is a React FC that receives:
 * 1. Category-specific props (data)
 * 2. VibeTheme via React context (styling)
 *
 * The component mapping in the registry uses the generic SceneProps union,
 * but each component internally narrows to its specific category props.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type VibeSceneComponent = React.FC<any>;

/**
 * A vibe registration — maps each scene category to a component.
 */
export type VibeComponentMap = Record<SceneCategory, VibeSceneComponent>;
