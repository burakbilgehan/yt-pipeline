/**
 * Zod schemas for Remotion composition props.
 * Used by Root.tsx for Composition registration and by components for type inference.
 */
import { z } from "zod";

// ─── Scene schemas ────────────────────────────────────────────

export const sceneVisualInputSchema = z.object({
  type: z.enum([
    "stock-video", "stock-image", "ai-image",
    "text-overlay", "data-chart", "map", "composite",
    "data-visualization", "remotion-component", "intentional-black",
  ]),
  description: z.string(),
  searchQuery: z.string().optional(),
  textOverlay: z.any().optional(),
  dataChart: z.any().optional(),
  assetPath: z.string().optional(),
  // ── Design System layers (L2–L4) ──
  atmosphere: z.string().optional(),
  atmosphereConfig: z.object({
    opacity: z.number().optional(),
    speed: z.number().optional(),
    color: z.string().optional(),
    scale: z.number().optional(),
  }).optional(),
  surface: z.string().optional(),
  surfaceConfig: z.object({
    blur: z.number().optional(),
    opacity: z.number().optional(),
    borderRadius: z.number().optional(),
    borderColor: z.string().optional(),
    borderWidth: z.number().optional(),
    glowColor: z.string().optional(),
    glowIntensity: z.number().optional(),
  }).optional(),
  motion: z.string().optional(),
  motionConfig: z.object({
    durationFrames: z.number().optional(),
    delayFrames: z.number().optional(),
  }).optional(),
});

export const sceneInputSchema = z.object({
  id: z.string(),
  section: z.string(),
  startTime: z.number(),
  endTime: z.number(),
  voiceover: z.string(),
  visual: sceneVisualInputSchema,
  transition: z.enum(["fade", "cut", "slide", "zoom", "crossfade", "morph", "seamless", "cross-dissolve", "fade-to-black"]),
  notes: z.string().optional(),
});

// ─── Audio segment schema ────────────────────────────────────

export const audioSegmentSchema = z.object({
  /** Path to the audio file (relative to publicDir) */
  src: z.string(),
  /** Start time in seconds (when this audio should begin playing) */
  startTime: z.number(),
});

// ─── Background music schema ─────────────────────────────────

export const backgroundMusicTrackSchema = z.object({
  /** Path to audio file (relative to publicDir) */
  src: z.string(),
  /** Duration of the track in seconds */
  durationSec: z.number(),
});

export const backgroundMusicSchema = z.object({
  /** Ordered list of tracks to play sequentially */
  tracks: z.array(backgroundMusicTrackSchema),
  /** Base volume 0-1 (recommended: 0.04-0.08) */
  volume: z.number(),
  /** Crossfade duration between tracks in seconds */
  crossfadeSec: z.number().optional(),
  /** Fade-in at video start in seconds */
  fadeInSec: z.number().optional(),
  /** Fade-out at video end in seconds */
  fadeOutSec: z.number().optional(),
});

// ─── Main video composition schema ───────────────────────────

export const videoCompositionSchema = z.object({
  title: z.string(),
  scenes: z.array(sceneInputSchema),
  audioFiles: z.array(z.string()),
  /** Audio segments with precise timing (preferred over audioFiles) */
  audioSegments: z.array(audioSegmentSchema).optional(),
  /** Background music tracks — sequential playback with crossfade */
  backgroundMusic: backgroundMusicSchema.optional(),
  showSubtitles: z.boolean(),
  showProgressBar: z.boolean(),
  brandColor: z.string(),
  fontFamily: z.string(),
});

export type VideoCompositionProps = z.infer<typeof videoCompositionSchema>;

// ─── Data chart schemas ──────────────────────────────────────

export const dataChartItemSchema = z.object({
  label: z.string(),
  value: z.number(),
  color: z.string().optional(),
  icon: z.string().optional(),
  displayValue: z.string().optional(),
});

export const dataChartInputSchema = z.object({
  type: z.enum(["bar-chart", "line-chart", "pie-chart", "counter", "comparison", "timeline", "scale-comparison", "horse-race", "progress", "quadrant-scatter", "salary-shuffle", "ranking-resort", "calendar-grid", "division-comparison", "end-card", "hook-scene", "horizontal-bar-chart", "split-comparison", "title-card", "composite-phases", "closing-scene", "deflator-summary-grid", "metric-scene", "shrinkflation-hook", "hook-punchline", "lens-switch-pivot", "closing-sequence", "shrinkflation-cards", "skimpflation-card", "baseline-reference", "bls-shrink-explainer", "vertical-tabs", "world-map-scene", "hook-reveal", "location-map", "scoreboard", "closing-cta"]),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  items: z.array(dataChartItemSchema).optional(),
  counterValue: z.number().optional(),
  counterPrefix: z.string().optional(),
  counterSuffix: z.string().optional(),
  unit: z.string().optional(),
  colors: z.array(z.string()).optional(),
  orientation: z.enum(["horizontal", "vertical"]).optional(),
  duel: z.object({
    left: z.union([z.string(), z.object({ label: z.string(), subtitle: z.string().optional() })]),
    right: z.union([z.string(), z.object({ label: z.string(), subtitle: z.string().optional() })]),
  }).optional(),
  annotation: z.string().optional(),
  /** Sub-heading for the primary bar group when a secondaryChart is present */
  groupTitle: z.string().optional(),
});

export const dataChartCompositionSchema = z.object({
  chart: dataChartInputSchema,
  durationInFrames: z.number(),
  brandColor: z.string(),
  fontFamily: z.string(),
});

export type DataChartCompositionProps = z.infer<typeof dataChartCompositionSchema>;
export type DataChartInput = z.infer<typeof dataChartInputSchema>;
export type DataChartItem = z.infer<typeof dataChartItemSchema>;
export type SceneInput = z.infer<typeof sceneInputSchema>;
export type SceneVisualInput = z.infer<typeof sceneVisualInputSchema>;

// ─── Shorts composition schema ──────────────────────────────

export const shortsCompositionSchema = z.object({
  title: z.string(),
  scenes: z.array(sceneInputSchema),
  audioFiles: z.array(z.string()),
  audioSegments: z.array(audioSegmentSchema).optional(),
  showSubtitles: z.boolean(),
  brandColor: z.string(),
  fontFamily: z.string(),
});

export type ShortsCompositionProps = z.infer<typeof shortsCompositionSchema>;

// ─── Horse Race chart composition schema ─────────────────────

export const horseRaceDataPointSchema = z.object({
  date: z.string(),
  ratio: z.number(),
});

export const horseRaceSeriesSchema = z.object({
  id: z.string(),
  label: z.string(),
  color: z.string(),
  data: z.array(horseRaceDataPointSchema),
});

export const horseRaceCameraKeyframeSchema = z.object({
  year: z.number(),
  zoom: z.number().optional(),
  speed: z.number().optional(),
  focusAssets: z.array(z.string()).optional(),
});

export const horseRaceAnnotationSchema = z.object({
  year: z.number(),
  text: z.string(),
  style: z.enum([
    "crisis-flash",
    "major-crisis-flash",
    "policy-banner",
    "milestone-flash",
    "leader-callout",
    "crossing-alert",
    "shrinkflation-callout",
    "event-flash",
  ]),
  asset: z.string().optional(),
  duration: z.number().optional(),
  icon: z.string().optional(),
});

export const horseRaceCompositionSchema = z.object({
  series: z.array(horseRaceSeriesSchema),
  cameraKeyframes: z.array(horseRaceCameraKeyframeSchema),
  annotations: z.array(horseRaceAnnotationSchema),
  timeRange: z.object({ start: z.number(), end: z.number() }),
  backgroundColor: z.string(),
  brandColor: z.string(),
  fontFamily: z.string(),
  logScale: z.boolean().optional(),
  yAxisLabel: z.string().optional(),
});

export type HorseRaceCompositionProps = z.infer<typeof horseRaceCompositionSchema>;

// ─── Thumbnail composition schema ────────────────────────────

export const thumbnailCompositionSchema = z.object({
  variant: z.enum(["A", "B", "C"]),
  beforeNumber: z.string(),
  afterNumber: z.string(),
  topLabel: z.string().optional(),
  bottomLabel: z.string().optional(),
  cornerLabel: z.string().optional(),
  cornerPosition: z.enum(["bottom-left", "bottom-right"]).optional(),
  bgTop: z.string().optional(),
  bgBottom: z.string().optional(),
  beforeColor: z.string().optional(),
  strikethroughColor: z.string().optional(),
  afterColor: z.string().optional(),
  glowColor: z.string().optional(),
  cornerLabelColor: z.string().optional(),
  fontFamily: z.string().optional(),
  showDivider: z.boolean().optional(),
  dividerColor: z.string().optional(),
  connectorText: z.string().optional(),
  connectorColor: z.string().optional(),
});

export type ThumbnailCompositionProps = z.infer<typeof thumbnailCompositionSchema>;

// ─── Thumbnail overlay composition schema ────────────────────

export const thumbnailOverlayCompositionSchema = z.object({
  baseImage: z.string(),
  logoImage: z.string(),
  logoSize: z.number().optional(),
  logoPadding: z.number().optional(),
  logoPosition: z.enum(["bottom-right", "bottom-left", "top-right", "top-left"]).optional(),
});

export type ThumbnailOverlayCompositionProps = z.infer<typeof thumbnailOverlayCompositionSchema>;
