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
  ]),
  description: z.string(),
  searchQuery: z.string().optional(),
  textOverlay: z.string().optional(),
  dataChart: z.any().optional(),
  assetPath: z.string().optional(),
});

export const sceneInputSchema = z.object({
  id: z.string(),
  section: z.string(),
  startTime: z.number(),
  endTime: z.number(),
  voiceover: z.string(),
  visual: sceneVisualInputSchema,
  transition: z.enum(["fade", "cut", "slide", "zoom"]),
  notes: z.string().optional(),
});

// ─── Audio segment schema ────────────────────────────────────

export const audioSegmentSchema = z.object({
  /** Path to the audio file (relative to publicDir) */
  src: z.string(),
  /** Start time in seconds (when this audio should begin playing) */
  startTime: z.number(),
});

// ─── Main video composition schema ───────────────────────────

export const videoCompositionSchema = z.object({
  title: z.string(),
  scenes: z.array(sceneInputSchema),
  audioFiles: z.array(z.string()),
  /** Audio segments with precise timing (preferred over audioFiles) */
  audioSegments: z.array(audioSegmentSchema).optional(),
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
});

export const dataChartInputSchema = z.object({
  type: z.enum(["bar-chart", "line-chart", "pie-chart", "counter", "comparison", "timeline", "progress", "scale-comparison"]),
  title: z.string().optional(),
  items: z.array(dataChartItemSchema).optional(),
  counterValue: z.number().optional(),
  counterPrefix: z.string().optional(),
  counterSuffix: z.string().optional(),
  unit: z.string().optional(),
  colors: z.array(z.string()).optional(),
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
