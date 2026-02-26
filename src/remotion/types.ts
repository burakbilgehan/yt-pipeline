/**
 * Remotion video composition input types.
 *
 * These types define the data that flows from storyboard JSON
 * into Remotion compositions for rendering.
 */

// ─── Scene Visual Types ───────────────────────────────────────

export type VisualType =
  | "stock-video"
  | "stock-image"
  | "ai-image"
  | "text-overlay"
  | "data-chart"
  | "map"
  | "composite";

export type TransitionType = "fade" | "cut" | "slide" | "zoom";

export type ChartType =
  | "bar-chart"
  | "line-chart"
  | "pie-chart"
  | "counter"
  | "comparison";

// ─── Scene Input ──────────────────────────────────────────────

export interface SceneInput {
  id: string;
  /** Section title shown briefly at scene start */
  section: string;
  /** Start time in seconds */
  startTime: number;
  /** End time in seconds */
  endTime: number;
  /** Voiceover text (for subtitle display) */
  voiceover: string;
  /** Visual specification */
  visual: SceneVisualInput;
  /** Transition to next scene */
  transition: TransitionType;
  /** Optional notes (not rendered, for reference) */
  notes?: string;
}

export interface SceneVisualInput {
  type: VisualType;
  /** Description of what should be shown */
  description: string;
  /** Search query used for stock media */
  searchQuery?: string;
  /** Text to overlay on screen */
  textOverlay?: string;
  /** Data visualization config */
  dataChart?: DataChartInput;
  /** Resolved asset path (filled by collector/production agent) */
  assetPath?: string;
}

// ─── Data Chart Types ─────────────────────────────────────────

export interface DataChartInput {
  type: ChartType;
  title?: string;
  /** Items for bar/comparison charts */
  items?: DataChartItem[];
  /** Target value for counter animation */
  counterValue?: number;
  /** Counter prefix (e.g. "$") */
  counterPrefix?: string;
  /** Counter suffix (e.g. "/gallon") */
  counterSuffix?: string;
  /** Unit label for axes */
  unit?: string;
  /** Color theme override */
  colors?: string[];
}

export interface DataChartItem {
  label: string;
  value: number;
  /** Optional color override */
  color?: string;
  /** Optional icon/image path */
  icon?: string;
}

// ─── Composition Input Props ──────────────────────────────────

/** Props for the main video composition */
export interface VideoCompositionProps {
  /** Video title */
  title: string;
  /** All scenes in order */
  scenes: SceneInput[];
  /** Audio file paths (ordered voiceover segments) */
  audioFiles: string[];
  /** Whether to show subtitles */
  showSubtitles: boolean;
  /** Whether to show progress bar */
  showProgressBar: boolean;
  /** Brand color for UI elements */
  brandColor: string;
  /** Font family for text */
  fontFamily: string;
}

/** Props for a standalone data chart composition (for previewing) */
export interface DataChartCompositionProps {
  chart: DataChartInput;
  /** Duration in frames */
  durationInFrames: number;
  brandColor: string;
  fontFamily: string;
}
