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
  | "comparison"
  | "timeline"
  | "progress"
  | "scale-comparison"
  | "quadrant-scatter"
  | "deflator-summary-grid"
  | "horse-race";

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

/** Audio segment with precise timing */
export interface AudioSegment {
  /** Path to the audio file (relative to publicDir) */
  src: string;
  /** Start time in seconds (when this audio should begin playing) */
  startTime: number;
}

/** Props for a standalone data chart composition (for previewing) */
export interface DataChartCompositionProps {
  chart: DataChartInput;
  /** Duration in frames */
  durationInFrames: number;
  brandColor: string;
  fontFamily: string;
}

// ─── Horse Race Chart Types ───────────────────────────────────

/** A single data point in the horse race chart (one row of CSV) */
export interface HorseRaceDataPoint {
  date: string; // YYYY-MM-DD
  ratio: number;
}

/** One asset series in the horse race chart */
export interface HorseRaceSeries {
  id: string;
  label: string;
  color: string;
  data: HorseRaceDataPoint[];
}

/** Camera keyframe — controls zoom/speed at a given year */
export interface HorseRaceCameraKeyframe {
  /** Year (can be fractional, e.g. 1989.5) */
  year: number;
  /** Zoom level (1.0 = normal, <1 = zoom out, >1 = zoom in) */
  zoom?: number;
  /** Speed multiplier (1.0 = normal, <1 = slow, >1 = fast) */
  speed?: number;
  /** Which assets to focus on (affects Y-axis framing) */
  focusAssets?: string[];
}

/** Event annotation to flash on the chart */
export interface HorseRaceAnnotation {
  /** Year to display (can be fractional) */
  year: number;
  /** Text to display */
  text: string;
  /** Visual style */
  style: "crisis-flash" | "major-crisis-flash" | "policy-banner" | "milestone-flash" | "leader-callout" | "crossing-alert" | "shrinkflation-callout" | "event-flash";
  /** Optional: which asset this annotation belongs to */
  asset?: string;
  /** Duration in seconds to show */
  duration?: number;
  /** Show an icon (crown, skull, etc.) */
  icon?: string;
}

/** Scene-level year range for voiceover sync */
export interface SceneYearRange {
  /** Scene start time in seconds (within chart sequence) */
  sceneStartSec: number;
  /** Scene end time in seconds (within chart sequence) */
  sceneEndSec: number;
  /** Year the chart should be at when this scene starts */
  yearStart: number;
  /** Year the chart should reach when this scene ends */
  yearEnd: number;
}

/** Shrinkflation event marker — vertical line on horse-race chart */
export interface ShrinkflationMarker {
  /** Year the event occurred */
  year: number;
  /** Short label, e.g. "Skippy 18oz→16.3oz" */
  label: string;
  /** Optional color (defaults to a warning/orange color) */
  color?: string;
}

/** Full props for the HorseRaceChart composition */
export interface HorseRaceChartProps {
  /** All asset series */
  series: HorseRaceSeries[];
  /** Camera keyframes (zoom, speed, focus) — LEGACY, ignored if sceneYearRanges provided */
  cameraKeyframes: HorseRaceCameraKeyframe[];
  /** Event annotations */
  annotations: HorseRaceAnnotation[];
  /** Time range for this scene */
  timeRange: { start: number; end: number };
  /** Scene-to-year mapping for voiceover sync (takes priority over cameraKeyframes speed) */
  sceneYearRanges?: SceneYearRange[];
  /** Shrinkflation event markers — vertical lines on the chart */
  shrinkflationMarkers?: ShrinkflationMarker[];
  /** Background color */
  backgroundColor: string;
  /** Brand color for accents */
  brandColor: string;
  /** Font family */
  fontFamily: string;
  /** Whether to use log scale for Y-axis */
  logScale?: boolean;
  /** Y-axis label (e.g. "Asset / Gold Ratio") */
  yAxisLabel?: string;
  /** Deflator label displayed next to the year counter (e.g. "RUPI (Wage-Deflated)") */
  deflatorLabel?: string;
}

/** Props for the shorts video composition (9:16) */
export interface ShortsCompositionProps {
  /** Video title */
  title: string;
  /** All scenes in order */
  scenes: SceneInput[];
  /** Audio file paths (ordered voiceover segments) */
  audioFiles: string[];
  /** Audio segments with precise timing */
  audioSegments?: AudioSegment[];
  /** Whether to show subtitles (always true for shorts, bigger font) */
  showSubtitles: boolean;
  /** Brand color for UI elements */
  brandColor: string;
  /** Font family for text */
  fontFamily: string;
}
