import React from "react";
import { spring, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import type { DataChartInput } from "../../schemas";

// ─── Types ────────────────────────────────────────────────────

export interface QuadrantScatterPoint {
  label: string;
  x: number;
  y: number;
  quadrant: "dream" | "grind" | "chill" | "trap";
  /** Highlight this point (larger, glowing, always labeled) */
  highlight?: boolean;
  /** Label placement hint to avoid collisions */
  labelDir?: "top" | "bottom" | "left" | "right" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

/** Camera zoom target — either a quadrant name or explicit data coordinates */
type ZoomTarget =
  | "topLeft" | "topRight" | "bottomLeft" | "bottomRight"
  | "center" | "fullExtended"
  | { x: number; y: number };

export interface CameraZoomConfig {
  /** Where to zoom into — quadrant name or {x, y} in data space */
  target: ZoomTarget;
  /** Starting scale (default 1.0) */
  startScale?: number;
  /** Ending scale (default 1.5) */
  endScale?: number;
  /** Delay before zoom starts, in seconds (default 0) */
  startAt?: number | string;
  /** Zoom duration in seconds (default: scene duration) */
  duration?: number | string;
  /** Previous scene's camera position — enables smooth transition from old position */
  startFrom?: { target: ZoomTarget; scale: number };
  /** Duration of the entry transition from startFrom in seconds (default 1.5) */
  transitionDuration?: number | string;
}

/** Connector line between two countries */
export interface ConnectorLineConfig {
  from: string;       // country code
  to: string;         // country code
  style?: "solid" | "dashed" | "dotted";
  color?: string;
  labels?: string[];
  /** When to show the connector (in seconds or "Xs" format) */
  showAt?: string | number;
  /** How long to show (in seconds or "Xs" format) */
  duration?: string | number;
}

/** Spotlight card (detailed callout for a single country) */
export interface SpotlightCardConfig {
  flag: string;
  label: string;
  stats: Array<{ key: string; value: string }>;
  rankBadge?: string;
}

/** Division comparison overlay (Portugal vs Hungary etc.) */
export interface DivisionOverlayConfig {
  left: { flag: string; label: string; code?: string; wage: number; hours?: number; result: number; resultColor: string };
  right: { flag: string; label: string; code?: string; wage: number; hours?: number; result: number; resultColor: string };
  operator: string;
  conclusion: string;
}

/** Tooltip attached to a dot */
export interface TooltipConfig {
  code: string;
  /** Position hint — "auto" picks best side based on dot screen position & occlusion */
  position: "topLeft" | "topRight" | "bottomLeft" | "bottomRight" | "left" | "right" | "top" | "bottom" | "auto";
  showAt?: string | number;
  data: Record<string, string>;
  /** Extra pixel offset applied AFTER position calculation — use to spread tooltips manually */
  pixelOffset?: { x: number; y: number };
}

/** Annotation badge attached to a dot */
export interface AnnotationConfig {
  type: "text-badge" | "icon-badge" | "text-overlay";
  attachTo: string;
  text?: string;
  icon?: string;
  position?: string;
  showAt?: string | number;
  duration?: string | number;
  style?: Record<string, any>;
}

/** Ugly truth dot (non-OECD, square shape) */
export interface UglyTruthDot {
  code: string;
  x: number;
  y: number;
  shape?: "square" | "circle";
  color?: string;
}

/** Closing sequence phases */
export interface ClosingSequenceConfig {
  phase1_allVisible?: { duration: string; allDotsOpacity: number; showAllLabels: boolean };
  phase2_fadeToSpotlight?: { duration: string; fadeAllExcept: string[]; fadeTo: number };
  phase3_spotlightPulse?: { duration: string; spotlightDots: Array<{ code: string; showLabel: boolean; pulse: boolean; glowColor: string; tooltip?: Record<string, string> }> };
  phase4_dotsFade?: { duration: string; fadeAllDots: boolean; keepAxes: boolean; keepGrid: boolean };
  phase5_closingText?: { duration: string; text: string; fadeIn: string; hold: string; fadeOut: string };
  phase6_fadeToBlack?: { duration: string; fadeAxes: boolean; fadeGrid: boolean; backgroundColor: string };
}

export interface QuadrantScatterConfig {
  type: "quadrant-scatter";
  title?: string;
  subtitle?: string;
  /** Data points */
  points: QuadrantScatterPoint[];
  /** X-axis config */
  xAxis: { label: string; min: number; max: number; origin: number };
  /** Y-axis config */
  yAxis: { label: string; min: number; max: number; origin: number };
  /** Quadrant labels (clockwise from top-left) */
  quadrantLabels?: {
    topLeft: string;
    topRight: string;
    bottomLeft: string;
    bottomRight: string;
  };
  /** Which points to spotlight (by label) — always show label */
  spotlights?: string[];
  /** Camera zoom — smooth animated zoom into a quadrant or data point */
  cameraZoom?: CameraZoomConfig;
  /**
   * Progressive reveal: dots appear first (no labels), then labels fade in
   * after labelRevealDelay seconds. Defaults to true when spotlights exist.
   */
  progressiveReveal?: boolean;
  /** Delay before labels appear in seconds (default 2) */
  labelRevealDelay?: number;
  /** Division comparison overlay — floats over the scatter chart */
  divisionOverlay?: DivisionOverlayConfig;
  /** Dashed connector lines between countries across quadrants */
  connectorLines?: ConnectorLineConfig[];
  /** Spotlight card — detailed callout for a single country (e.g. Japan) */
  spotlightCard?: SpotlightCardConfig;
  /** Counter label e.g. "16 of 33 countries" */
  counterLabel?: string;
  /** Which quadrant is active — dims other quadrants when set */
  activeQuadrant?: "topLeft" | "topRight" | "bottomLeft" | "bottomRight";
  // ─── New v5 fields ───
  /** Selective label reveal — only show labels for these codes */
  showLabelsFor?: string[];
  /** Which dots belong to the active quadrant (color them differently) */
  activeQuadrantDots?: string[];
  /** Tooltips — info boxes near dots with salary/hours/hourlyRate */
  tooltips?: TooltipConfig[];
  /** Annotations — text badges, icon badges, text overlays attached to dots */
  annotations?: AnnotationConfig[];
  /** Non-OECD ugly truth dots (square shape, deep TRAP) */
  uglyTruthDots?: UglyTruthDot[];
  /** Closing sequence — 6-phase animation for scene-010 */
  closingSequence?: ClosingSequenceConfig;
  /** Quadrant glow effect */
  quadrantGlow?: { quadrant: string; color: string; animateIn: string | number } | null;
  /** Active dot color override */
  dotColorActive?: string;
  /** Inactive dot color override */
  dotColorInactive?: string;
  /** Show quadrant fills */
  showQuadrantFills?: boolean;
  /** Show quadrant labels */
  showQuadrantLabels?: boolean;
  /** Skip entrance animations — chart appears instantly (for seamless scene transitions) */
  skipEntrance?: boolean;
}

interface QuadrantScatterProps {
  chart: DataChartInput;
  brandColor: string;
  fontFamily: string;
}

// ─── Default Theme Colors ─────────────────────────────────────

const BG = "#1A1B22";
const TEXT = "#EAE0D5";
const MUTED = "rgba(234, 224, 213, 0.4)";
const GRID = "rgba(163, 177, 138, 0.12)";
const ORIGIN_LINE = "rgba(163, 177, 138, 0.4)";

const QUADRANT_COLORS = {
  dream: { bg: "rgba(91, 191, 140, 0.06)", dot: "#5BBF8C", label: "rgba(91, 191, 140, 0.35)" },
  grind: { bg: "rgba(216, 167, 177, 0.06)", dot: "#D8A7B1", label: "rgba(216, 167, 177, 0.35)" },
  chill: { bg: "rgba(144, 175, 197, 0.06)", dot: "#90AFC5", label: "rgba(144, 175, 197, 0.35)" },
  trap:  { bg: "rgba(224, 96, 112, 0.06)",  dot: "#E06070", label: "rgba(224, 96, 112, 0.35)" },
};

// ─── Chart Dimensions ─────────────────────────────────────────

const CANVAS_W = 1920;
const CANVAS_H = 1080;
const CHART_LEFT = 160;
const CHART_TOP = 70;
const CHART_RIGHT = 1820;
const CHART_BOTTOM = 940;
const CHART_W = CHART_RIGHT - CHART_LEFT;
const CHART_H = CHART_BOTTOM - CHART_TOP;

// ─── Helpers ──────────────────────────────────────────────────

/** Clamp spring values to snap to 0 or 1 when within threshold, eliminating micro-oscillation jitter */
const clampSpring = (val: number): number =>
  val >= 0.998 ? 1 : val <= 0.002 ? 0 : val;

const mapX = (val: number, min: number, max: number) =>
  Math.round(CHART_LEFT + ((val - min) / (max - min)) * CHART_W);

const mapY = (val: number, min: number, max: number) =>
  Math.round(CHART_BOTTOM - ((val - min) / (max - min)) * CHART_H);

/** Parse a time string like "3s" to seconds number, or pass through if already number */
const parseSeconds = (val: number | string | undefined, fallback: number): number => {
  if (val === undefined) return fallback;
  if (typeof val === "number") return val;
  const match = val.match(/^([\d.]+)s?$/);
  return match ? parseFloat(match[1]) : fallback;
};

/** Get label offset based on direction hint */
const getLabelOffset = (dir: string, radius: number): { dx: number; dy: number; anchor: string } => {
  switch (dir) {
    case "top":          return { dx: 0,              dy: -(radius + 16), anchor: "center" };
    case "bottom":       return { dx: 0,              dy: radius + 6,     anchor: "center" };
    case "left":         return { dx: -(radius + 6),  dy: -4,             anchor: "right" };
    case "top-left":     return { dx: -(radius + 6),  dy: -(radius + 8),  anchor: "right" };
    case "top-right":    return { dx: radius + 6,     dy: -(radius + 8),  anchor: "left" };
    case "bottom-left":  return { dx: -(radius + 6),  dy: radius + 4,     anchor: "right" };
    case "bottom-right": return { dx: radius + 6,     dy: radius + 4,     anchor: "left" };
    case "right":
    default:             return { dx: radius + 6,     dy: -4,             anchor: "left" };
  }
};

// ─── Camera Zoom Logic ────────────────────────────────────────

/**
 * Resolve zoom target to pixel coordinates.
 * Quadrant names map to the center of that quadrant area.
 * Explicit {x, y} values are in data space and get mapped to pixels.
 */
function resolveZoomTarget(
  target: ZoomTarget,
  xAxis: { min: number; max: number; origin: number },
  yAxis: { min: number; max: number; origin: number },
): { px: number; py: number } {
  if (typeof target === "object" && "x" in target) {
    return {
      px: mapX(target.x, xAxis.min, xAxis.max),
      py: mapY(target.y, yAxis.min, yAxis.max),
    };
  }

  const originPx = mapX(xAxis.origin, xAxis.min, xAxis.max);
  const originPy = mapY(yAxis.origin, yAxis.min, yAxis.max);

  switch (target) {
    case "topLeft":
      return { px: (CHART_LEFT + originPx) / 2, py: (CHART_TOP + originPy) / 2 };
    case "topRight":
      return { px: (originPx + CHART_RIGHT) / 2, py: (CHART_TOP + originPy) / 2 };
    case "bottomLeft":
      return { px: (CHART_LEFT + originPx) / 2, py: (originPy + CHART_BOTTOM) / 2 };
    case "bottomRight":
      return { px: (originPx + CHART_RIGHT) / 2, py: (originPy + CHART_BOTTOM) / 2 };
    default:
      return { px: CANVAS_W / 2, py: CANVAS_H / 2 };
  }
}

/**
 * Compute the CSS transform for camera zoom at the current frame.
 * Uses cubic bezier easing for cinematic feel.
 */
interface CameraState {
  transform: string;
  transformOrigin: string;
  /** Current zoom scale (1 = no zoom) */
  scale: number;
  /** Translation in px (after scale) */
  tx: number;
  ty: number;
}

function useCameraZoom(
  config: CameraZoomConfig | undefined,
  xAxis: { min: number; max: number; origin: number },
  yAxis: { min: number; max: number; origin: number },
  frame: number,
  fps: number,
): CameraState {
  const identity: CameraState = { transform: "scale(1) translate(0px, 0px)", transformOrigin: "center center", scale: 1, tx: 0, ty: 0 };
  if (!config) return identity;

  const startScale = config.startScale ?? 1.0;
  const endScale = config.endScale ?? 1.5;
  const startAtSec = parseSeconds(config.startAt, 0);
  const durationSec = parseSeconds(config.duration, 4);

  const startFrame = Math.round(startAtSec * fps);
  const durationFrames = Math.round(durationSec * fps);

  if (durationFrames <= 0) return identity;

  // ── Entry transition from previous scene's camera position ──
  const transitionDurSec = parseSeconds(config.transitionDuration, 1.5);
  const transitionFrames = Math.round(transitionDurSec * fps);
  const hasTransition = !!config.startFrom && transitionFrames > 0;

  let transitionProgress = 1; // 1 = fully at new position
  if (hasTransition) {
    transitionProgress = interpolate(
      frame,
      [0, transitionFrames],
      [0, 1],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
      },
    );
  }

  // Smooth ease-in-out progress for main zoom (cubic bezier)
  const progress = interpolate(
    frame,
    [startFrame, startFrame + durationFrames],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
    },
  );

  // Current scene's camera state
  const newScale = startScale + (endScale - startScale) * progress;
  const { px: newPx, py: newPy } = resolveZoomTarget(config.target, xAxis, yAxis);

  // Compute transform for current scene position
  const centerX = CANVAS_W / 2;
  const centerY = CANVAS_H / 2;

  if (hasTransition && transitionProgress < 1) {
    // Interpolate between old camera and new camera
    const oldTarget = config.startFrom!.target;
    const oldScale = config.startFrom!.scale;
    const { px: oldPx, py: oldPy } = resolveZoomTarget(oldTarget, xAxis, yAxis);

    // Old camera transform
    const oldTx = (centerX - oldPx) * (oldScale - 1);
    const oldTy = (centerY - oldPy) * (oldScale - 1);

    // New camera transform
    const newTx = (centerX - newPx) * (newScale - 1);
    const newTy = (centerY - newPy) * (newScale - 1);

    // Lerp between old and new
    const scale = oldScale + (newScale - oldScale) * transitionProgress;
    const tx = oldTx + (newTx - oldTx) * transitionProgress;
    const ty = oldTy + (newTy - oldTy) * transitionProgress;

    return {
      transform: `scale(${scale.toFixed(4)}) translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px)`,
      transformOrigin: "center center",
      scale, tx, ty,
    };
  }

  // Normal zoom (no entry transition or transition complete)
  const tx = (centerX - newPx) * (newScale - 1);
  const ty = (centerY - newPy) * (newScale - 1);

  return {
    transform: `scale(${newScale.toFixed(4)}) translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px)`,
    transformOrigin: "center center",
    scale: newScale, tx, ty,
  };
}

// ─── Component ────────────────────────────────────────────────

export const QuadrantScatter: React.FC<QuadrantScatterProps> = ({
  chart,
  brandColor,
  fontFamily,
}) => {
  const accent = brandColor || "#D8A7B1";
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Parse config from chart
  const config = chart as unknown as QuadrantScatterConfig;
  const points = config.points || [];
  const xAxisRaw = config.xAxis || { label: "X", min: 0, max: 100, origin: 50 };
  const yAxisRaw = config.yAxis || { label: "Y", min: 0, max: 100, origin: 50 };

  // ─── Animated axis range expansion (ugly truth zoom-out) ───
  const xExtend = (xAxisRaw as any).extendAnimation;
  const yExtend = (yAxisRaw as any).extendAnimation;
  const extendDelaySec = parseSeconds((xExtend || yExtend)?.delay, 2);
  const extendDurSec = parseSeconds((xExtend || yExtend)?.duration, 3);
  const extendStartFrame = Math.round(extendDelaySec * fps);
  const extendEndFrame = extendStartFrame + Math.round(extendDurSec * fps);
  const extendProgress = interpolate(
    frame,
    [extendStartFrame, extendEndFrame],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.25, 0.1, 0.25, 1.0) },
  );

  const xAxis = {
    ...xAxisRaw,
    max: xExtend ? xExtend.from + (xExtend.to - xExtend.from) * extendProgress : xAxisRaw.max,
    min: (xAxisRaw as any).extendAnimation?.fromMin != null
      ? (xAxisRaw as any).extendAnimation.fromMin + (xAxisRaw.min - (xAxisRaw as any).extendAnimation.fromMin) * (1 - extendProgress)
      : xAxisRaw.min,
  };
  const yAxis = {
    ...yAxisRaw,
    min: yExtend ? yExtend.from + (yExtend.to - yExtend.from) * extendProgress : yAxisRaw.min,
  };
  const quadrantLabels = config.quadrantLabels || {
    topLeft: "DREAM",
    topRight: "GRIND",
    bottomLeft: "CHILL",
    bottomRight: "TRAP",
  };
  const spotlightSet = new Set(config.spotlights || []);

  // v5: Selective label reveal — show labels only for these country codes
  const showLabelsForSet = new Set(config.showLabelsFor || []);
  // v5: Active quadrant dots — these get special coloring
  const activeQuadrantDotsSet = new Set(config.activeQuadrantDots || []);
  // v5: Custom dot colors
  const dotColorActive = config.dotColorActive;
  const dotColorInactive = config.dotColorInactive;
  // v5: Toggle quadrant fills and labels
  const showQuadrantFills = config.showQuadrantFills ?? true;
  const showQuadrantLabels = config.showQuadrantLabels ?? true;
  // v5: Quadrant glow
  const quadrantGlow = config.quadrantGlow;
  // v5: Tooltips and annotations
  const tooltips = config.tooltips || [];
  const annotations = config.annotations || [];
  // v5: Ugly truth dots
  const uglyTruthDots = config.uglyTruthDots || [];
  // v5: Closing sequence
  const closingSequence = config.closingSequence;

  // Progressive reveal: dots appear first, labels later
  const progressiveReveal = config.progressiveReveal ?? (spotlightSet.size > 0 || showLabelsForSet.size > 0);
  const labelRevealDelaySec = config.labelRevealDelay ?? 2;
  const labelRevealDelayFrames = Math.round(labelRevealDelaySec * fps);

  // Division overlay
  const divisionOverlay = config.divisionOverlay;

  // Connector lines, spotlight card, counter
  const connectorLines = config.connectorLines || [];
  const spotlightCard = config.spotlightCard;
  const counterLabel = config.counterLabel;
  const activeQuadrant = config.activeQuadrant;

  // Map activeQuadrant to quadrant key for dimming
  const activeQ = activeQuadrant
    ? ({ topLeft: "dream", topRight: "grind", bottomLeft: "chill", bottomRight: "trap" } as const)[activeQuadrant]
    : undefined;

  // Origin in pixel space
  const originPx = mapX(xAxis.origin, xAxis.min, xAxis.max);
  const originPy = mapY(yAxis.origin, yAxis.min, yAxis.max);

  // Camera zoom
  const cameraZoom = config.cameraZoom;
  const { transform: cameraTransform, transformOrigin, scale: camScale, tx: camTx, ty: camTy } = useCameraZoom(
    cameraZoom, xAxis, yAxis, frame, fps,
  );

  // ─── Animation phases ───────────────────────────────────────
  const skipEntrance = config.skipEntrance ?? false;
  const gridIn = skipEntrance ? 1 : clampSpring(spring({ fps, frame, config: { damping: 30, stiffness: 120 } }));
  const axisIn = skipEntrance ? 1 : clampSpring(spring({ fps, frame: Math.max(0, frame - 5), config: { damping: 25, stiffness: 100 } }));
  const quadIn = skipEntrance ? 1 : clampSpring(spring({ fps, frame: Math.max(0, frame - 12), config: { damping: 20, stiffness: 80 } }));
  const titleIn = skipEntrance ? 1 : clampSpring(spring({ fps, frame, config: { damping: 200 } }));

  // ─── Tooltip Smart Positioning & Collision Detection ─────────
  // Build "obstacle" rects: all dots, dot labels, connector line labels
  // Auto-scale tooltips based on zoom level and crowdedness
  const visibleTooltipCount = tooltips.length;
  const autoTooltipScale = (() => {
    // Base: 1.0 for 1-2 tooltips, shrink for more
    const crowdFactor = visibleTooltipCount <= 2 ? 1.0
      : visibleTooltipCount <= 4 ? 0.85
      : visibleTooltipCount <= 6 ? 0.7
      : 0.6;
    // Zoom: shrink proportionally when zoomed in (less visible area)
    const zoomFactor = camScale > 1 ? 1 / Math.sqrt(camScale) : 1;
    return crowdFactor * zoomFactor;
  })();
  const tooltipScale = (config as any).tooltipScale ?? autoTooltipScale;
  const tooltipPositions = React.useMemo(() => {
    const TT_W = Math.round(420 * tooltipScale);
    const TT_MARGIN = 28;       // gap between dot and tooltip edge
    const TT_POINTER_H = 14;    // height of the speech-bubble pointer
    const TT_PADDING_V = Math.round(36 * tooltipScale);
    const TT_HEADER_H = Math.round(42 * tooltipScale);
    const TT_ROW_H = Math.round(38 * tooltipScale);
    const TT_SOURCE_H = Math.round(28 * tooltipScale);

    const estimateHeight = (tt: TooltipConfig) => {
      const entries = Object.entries(tt.data).filter(([k]) => k !== "source" && k !== "note");
      const hasSource = !!(tt.data.source || tt.data.note);
      return TT_PADDING_V + TT_HEADER_H + entries.length * TT_ROW_H + (hasSource ? TT_SOURCE_H : 0);
    };

    // ── Collect obstacle rects (things tooltip should NOT cover) ──
    const obstacles: Array<{ left: number; top: number; width: number; height: number; type: string; owner?: string }> = [];

    // 1. All visible dots (OECD)
    for (const p of points) {
      const dpx = mapX(p.x, xAxis.min, xAxis.max);
      const dpy = mapY(p.y, yAxis.min, yAxis.max);
      const r = 10; // max dot radius
      obstacles.push({ left: dpx - r, top: dpy - r, width: r * 2, height: r * 2, type: "dot", owner: p.label });
    }

    // 2. Ugly truth dots
    for (const ut of uglyTruthDots) {
      const utx = mapX(ut.x, xAxis.min, xAxis.max);
      const uty = mapY(ut.y, yAxis.min, yAxis.max);
      obstacles.push({ left: utx - 10, top: uty - 10, width: 20, height: 20, type: "dot", owner: ut.code });
    }

    // 3. Dot labels (for showLabelsFor dots)
    const showLabelsForSet2 = new Set(config.showLabelsFor || []);
    const spotlightSet2 = new Set(config.spotlights || []);
    for (const p of points) {
      const shouldShow = showLabelsForSet2.has(p.label) || spotlightSet2.has(p.label) || p.highlight;
      if (!shouldShow) continue;
      const dpx = mapX(p.x, xAxis.min, xAxis.max);
      const dpy = mapY(p.y, yAxis.min, yAxis.max);
      const dir = p.labelDir || "right";
      const radius = p.highlight ? 10 : 8;
      const off = getLabelOffset(dir, radius);
      // Label bounding box (approximate: 60x18 for typical 3-letter code)
      const lblW = 60;
      const lblH = 18;
      let lblLeft = dpx + off.dx;
      if (off.anchor === "right") lblLeft -= lblW;
      else if (off.anchor === "center") lblLeft -= lblW / 2;
      obstacles.push({ left: lblLeft, top: dpy + off.dy - 4, width: lblW, height: lblH, type: "label", owner: p.label });
    }

    // 4. Connector line midpoint labels
    for (const cl of connectorLines) {
      const fromPt = points.find(p => p.label === cl.from) || uglyTruthDots.find(d => d.code === cl.from);
      const toPt = points.find(p => p.label === cl.to) || uglyTruthDots.find(d => d.code === cl.to);
      if (!fromPt || !toPt) continue;
      const x1 = mapX(fromPt.x, xAxis.min, xAxis.max);
      const y1 = mapY(fromPt.y, yAxis.min, yAxis.max);
      const x2 = mapX(toPt.x, xAxis.min, xAxis.max);
      const y2 = mapY(toPt.y, yAxis.min, yAxis.max);
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const lblCount = cl.labels?.length || 0;
      // Each label is ~180x28, stacked vertically with 30px spacing
      const clH = lblCount * 30 + 10;
      obstacles.push({ left: mx - 100, top: my - clH / 2, width: 200, height: clH, type: "connectorLabel" });
    }

    // 5. Annotation badges (text-badge, icon-badge, text-overlay)
    // Use inflated bounding boxes to account for camera zoom effects
    const zoomInflate = cameraZoom ? (typeof cameraZoom.endScale === "number" ? cameraZoom.endScale : 1.3) : 1;
    for (const ann of annotations) {
      const annPt = points.find(p => p.label === ann.attachTo);
      if (!annPt) continue;
      const apx = mapX(annPt.x, xAxis.min, xAxis.max);
      const apy = mapY(annPt.y, yAxis.min, yAxis.max);
      if (ann.type === "text-badge") {
        const badgePos = ann.position || "right";
        const bLeft = badgePos.includes("left") ? apx - 220 : apx + 10;
        const bTop = badgePos.includes("top") ? apy - 40 : apy - 6;
        obstacles.push({ left: bLeft, top: bTop, width: 230, height: 44, type: "annotation" });
      } else if (ann.type === "icon-badge") {
        obstacles.push({ left: apx + 6, top: apy - 30, width: 38, height: 38, type: "annotation" });
      } else if (ann.type === "text-overlay") {
        const oLeft = (ann.position || "").includes("left") ? apx - 240 : apx + 10;
        const oTop = (ann.position || "").includes("top") ? apy - 46 : apy + 10;
        obstacles.push({ left: oLeft, top: oTop, width: 270, height: 44, type: "annotation" });
      }
    }

    // ── Compute tooltip pixel anchors and resolve auto-position ──
    type ResolvedTT = { left: number; top: number; width: number; height: number; idx: number; px: number; py: number; resolvedPos: string };
    const rects: ResolvedTT[] = [];

    // Helper: compute rect for a given position
    const computeRect = (px: number, py: number, pos: string, h: number): { left: number; top: number } => {
      // Tooltip connects to dot with a pointer — the box is offset from dot center
      if (pos === "topLeft")     return { left: px - TT_W - TT_MARGIN, top: py - h - TT_POINTER_H };
      if (pos === "topRight")    return { left: px + TT_MARGIN, top: py - h - TT_POINTER_H };
      if (pos === "bottomLeft")  return { left: px - TT_W - TT_MARGIN, top: py + TT_MARGIN + TT_POINTER_H };
      if (pos === "bottomRight") return { left: px + TT_MARGIN, top: py + TT_MARGIN + TT_POINTER_H };
      if (pos === "left")        return { left: px - TT_W - TT_MARGIN, top: py - h / 2 };
      if (pos === "right")       return { left: px + TT_MARGIN, top: py - h / 2 };
      if (pos === "top")         return { left: px - TT_W / 2, top: py - h - TT_MARGIN - TT_POINTER_H };
      if (pos === "bottom")      return { left: px - TT_W / 2, top: py + TT_MARGIN + TT_POINTER_H };
      // default topRight
      return { left: px + TT_MARGIN, top: py - h - TT_POINTER_H };
    };

    // Helper: count how many obstacles a rect overlaps (skip own dot/label)
    const countOcclusions = (rect: { left: number; top: number; width: number; height: number }, ownCode: string) => {
      let count = 0;
      const PAD = 6;
      for (const obs of obstacles) {
        // Skip the tooltip's own dot and label — it's expected to be near them
        if (obs.owner === ownCode && (obs.type === "dot" || obs.type === "label")) continue;
        if (rect.left + rect.width + PAD < obs.left) continue;
        if (obs.left + obs.width + PAD < rect.left) continue;
        if (rect.top + rect.height + PAD < obs.top) continue;
        if (obs.top + obs.height + PAD < rect.top) continue;
        // Weight: annotations are more important to avoid (they carry info)
        count += obs.type === "annotation" ? 3 : obs.type === "connectorLabel" ? 2 : 1;
      }
      return count;
    };

    // Helper: is rect within CHART AREA bounds? (camera-aware, but clamped to chart area)
    // Tooltips must stay inside the chart area to avoid covering axis labels/gutters.
    const cXB = CANVAS_W / 2;
    const cYB = CANVAS_H / 2;
    const vL = (0 - cXB * (1 - camScale)) / camScale - camTx;
    const vR = (CANVAS_W - cXB * (1 - camScale)) / camScale - camTx;
    const vT = (0 - cYB * (1 - camScale)) / camScale - camTy;
    const vB = (CANVAS_H - cYB * (1 - camScale)) / camScale - camTy;
    const bndL = Math.max(CHART_LEFT + 10, vL + 20);
    const bndR = Math.min(CHART_RIGHT - 10, vR - 20);
    const bndT = Math.max(CHART_TOP + 10, vT + 20);
    const bndB = Math.min(CHART_BOTTOM - 10, vB - 20);
    const isInBounds = (rect: { left: number; top: number; width: number; height: number }) =>
      rect.left >= bndL && rect.left + rect.width <= bndR &&
      rect.top >= bndT && rect.top + rect.height <= bndB;

    for (let ti = 0; ti < tooltips.length; ti++) {
      const tt = tooltips[ti];
      const ttPoint = points.find(p => p.label === tt.code);
      const ttUgly = !ttPoint ? uglyTruthDots.find(d => d.code === tt.code) : undefined;
      if (!ttPoint && !ttUgly) continue;

      const px = ttPoint ? mapX(ttPoint.x, xAxis.min, xAxis.max) : mapX(ttUgly!.x, xAxis.min, xAxis.max);
      const py = ttPoint ? mapY(ttPoint.y, yAxis.min, yAxis.max) : mapY(ttUgly!.y, yAxis.min, yAxis.max);
      const h = estimateHeight(tt);

      let bestPos: string;

      if (tt.position === "auto" || !tt.position) {
        // Smart auto-positioning: try all 4 positions, pick best
        // Prefer: right side if dot is on left half of chart, left side if on right half
        // Then prefer top over bottom (less likely to cover lower dots)
        const midX = (CHART_LEFT + CHART_RIGHT) / 2;
        const midY = (CHART_TOP + CHART_BOTTOM) / 2;
        const preferRight = px < midX;
        const preferTop = py > midY;

        // Order candidates by preference — include cardinal directions for more options
        const candidates: string[] = preferRight
          ? (preferTop
            ? ["topRight", "right", "bottomRight", "top", "topLeft", "bottom", "bottomLeft", "left"]
            : ["bottomRight", "right", "topRight", "bottom", "bottomLeft", "top", "topLeft", "left"])
          : (preferTop
            ? ["topLeft", "left", "bottomLeft", "top", "topRight", "bottom", "bottomRight", "right"]
            : ["bottomLeft", "left", "topLeft", "bottom", "bottomRight", "top", "topRight", "right"]);

        let bestScore = -Infinity;
        bestPos = candidates[0];

        for (const cand of candidates) {
          const { left, top } = computeRect(px, py, cand, h);
          const rect = { left, top, width: TT_W, height: h };
          const inBounds = isInBounds(rect);
          const occlusions = countOcclusions(rect, tt.code);
          // Score: in-bounds is most important, then fewest occlusions, then preference order
          const prefBonus = (candidates.length - candidates.indexOf(cand)) * 0.1;
          const score = (inBounds ? 100 : 0) - occlusions * 10 + prefBonus;
          if (score > bestScore) {
            bestScore = score;
            bestPos = cand;
          }
        }
      } else {
        bestPos = tt.position;
      }

      const { left, top } = computeRect(px, py, bestPos, h);
      // Apply pixelOffset BEFORE collision resolution so collisions see real positions
      const tt2 = tooltips[ti];
      const offX = tt2.pixelOffset ? tt2.pixelOffset.x : 0;
      const offY = tt2.pixelOffset ? tt2.pixelOffset.y : 0;
      rects.push({ left: left + offX, top: top + offY, width: TT_W, height: h, idx: ti, px, py, resolvedPos: bestPos });
    }

    // ── Resolve tooltip-vs-tooltip collisions ──
    const COLLISION_PAD = 14;
    for (let pass = 0; pass < 12; pass++) {
      let anyCollision = false;
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i];
          const b = rects[j];
          if (a.left + a.width + COLLISION_PAD < b.left || b.left + b.width + COLLISION_PAD < a.left) continue;
          if (a.top + a.height + COLLISION_PAD < b.top || b.top + b.height + COLLISION_PAD < a.top) continue;
          anyCollision = true;
          const overlapX = (Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left)) + COLLISION_PAD;
          const overlapY = (Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top)) + COLLISION_PAD;
          // Choose the axis with smaller overlap to resolve (cheaper move)
          if (overlapY <= overlapX) {
            // Push vertically
            if (a.top <= b.top) {
              b.top += overlapY / 2 + 4;
              a.top -= overlapY / 2 + 4;
            } else {
              a.top += overlapY / 2 + 4;
              b.top -= overlapY / 2 + 4;
            }
          } else {
            // Push horizontally
            if (a.left <= b.left) {
              b.left += overlapX / 2 + 4;
              a.left -= overlapX / 2 + 4;
            } else {
              a.left += overlapX / 2 + 4;
              b.left -= overlapX / 2 + 4;
            }
          }
        }
      }
      if (!anyCollision) break;
    }

    // Clamp to CHART AREA (not full viewport) — tooltips must not cover axis labels/gutters.
    // Use chart boundaries as the hard clamp, intersected with visible viewport for camera zoom.
    const cX = CANVAS_W / 2;
    const cY = CANVAS_H / 2;
    const visLeft = (0 - cX * (1 - camScale)) / camScale - camTx;
    const visRight = (CANVAS_W - cX * (1 - camScale)) / camScale - camTx;
    const visTop = (0 - cY * (1 - camScale)) / camScale - camTy;
    const visBottom = (CANVAS_H - cY * (1 - camScale)) / camScale - camTy;
    // Use the MORE restrictive of chart area vs visible viewport
    const clampLeft = Math.max(CHART_LEFT + 10, visLeft + 10);
    const clampRight = Math.min(CHART_RIGHT - 10, visRight - 10);
    const clampTop = Math.max(CHART_TOP + 10, visTop + 10);
    const clampBottom = Math.min(CHART_BOTTOM - 10, visBottom - 10);
    for (const r of rects) {
      if (r.top < clampTop) r.top = clampTop;
      if (r.top + r.height > clampBottom) r.top = clampBottom - r.height;
      if (r.left < clampLeft) r.left = clampLeft;
      if (r.left + r.width > clampRight) r.left = clampRight - r.width;
    }

    // Final safety clamp — ensure nothing goes off-screen
    for (const r of rects) {
      if (r.left < clampLeft) r.left = clampLeft;
      if (r.left + r.width > clampRight) r.left = clampRight - r.width;
      if (r.top < clampTop) r.top = clampTop;
      if (r.top + r.height > clampBottom) r.top = clampBottom - r.height;
    }

    // Build lookup with resolved position for pointer direction
    const result: Record<number, { left: number; top: number; resolvedPos: string; px: number; py: number }> = {};
    for (const r of rects) { result[r.idx] = { left: r.left, top: r.top, resolvedPos: r.resolvedPos, px: r.px, py: r.py }; }
    return result;
  }, [tooltips, points, uglyTruthDots, xAxis, yAxis, connectorLines, annotations, config.showLabelsFor, config.spotlights, camScale, camTx, camTy, tooltipScale]);

  return (
    <div
      style={{
        width: CANVAS_W,
        height: CANVAS_H,
        backgroundColor: BG,
        position: "relative",
        overflow: "hidden",
        fontFamily,
      }}
    >
      {/* ── Camera Zoom Wrapper — everything inside gets transformed ── */}
      <div
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          position: "absolute",
          top: 0,
          left: 0,
          transform: cameraTransform,
          transformOrigin,
        }}
      >
        {/* ── Title ── */}
        {config.title && (
          <div
            style={{
              position: "absolute",
              top: 20,
              left: CHART_LEFT,
              right: 100,
              opacity: titleIn,
            }}
          >
            <div style={{ color: TEXT, fontSize: 30, fontWeight: 700, lineHeight: 1.2 }}>
              {config.title}
            </div>
            {config.subtitle && (
              <div style={{ color: MUTED, fontSize: 14, fontWeight: 400, marginTop: 2 }}>
                {config.subtitle}
              </div>
            )}
          </div>
        )}

        {/* ── SVG Layer: backgrounds, grid, axes ── */}
        <svg width={CANVAS_W} height={CANVAS_H} style={{ position: "absolute", top: 0, left: 0 }}>
          {/* Quadrant background fills */}
          {showQuadrantFills && ([
            { key: "dream" as const, x: CHART_LEFT, y: CHART_TOP, w: originPx - CHART_LEFT, h: originPy - CHART_TOP },
            { key: "grind" as const, x: originPx, y: CHART_TOP, w: CHART_RIGHT - originPx, h: originPy - CHART_TOP },
            { key: "chill" as const, x: CHART_LEFT, y: originPy, w: originPx - CHART_LEFT, h: CHART_BOTTOM - originPy },
            { key: "trap" as const, x: originPx, y: originPy, w: CHART_RIGHT - originPx, h: CHART_BOTTOM - originPy },
          ]).map(({ key, x, y, w, h }) => {
            const isDimmed = activeQ && activeQ !== key;
            // Quadrant glow: if this quadrant matches the glow config, use brighter fill
            const isGlowing = quadrantGlow && quadrantGlow.quadrant === (
              key === "dream" ? "topLeft" : key === "grind" ? "topRight" : key === "chill" ? "bottomLeft" : "bottomRight"
            );
            const glowColor = isGlowing ? quadrantGlow!.color : undefined;
            const glowDelaySec = isGlowing ? parseSeconds(quadrantGlow!.animateIn, 0) : 0;
            const glowIn = isGlowing ? clampSpring(spring({
              fps,
              frame: Math.max(0, frame - Math.round(glowDelaySec * fps)),
              config: { damping: 26, stiffness: 120 },
            })) : 0;
            return (
              <React.Fragment key={key}>
                <rect x={x} y={y} width={w} height={h}
                  fill={QUADRANT_COLORS[key].bg}
                  opacity={quadIn * (isDimmed ? 0.3 : 1)} />
                {isGlowing && glowColor && (
                  <rect x={x} y={y} width={w} height={h}
                    fill={glowColor}
                    opacity={glowIn * quadIn} />
                )}
              </React.Fragment>
            );
          })}

          {/* Subtle grid lines */}
          {[0.2, 0.4, 0.6, 0.8].map((pct) => {
            const xVal = xAxis.min + pct * (xAxis.max - xAxis.min);
            const yVal = yAxis.min + pct * (yAxis.max - yAxis.min);
            return (
              <React.Fragment key={`grid-${pct}`}>
                <line x1={mapX(xVal, xAxis.min, xAxis.max)} y1={CHART_TOP}
                  x2={mapX(xVal, xAxis.min, xAxis.max)} y2={CHART_BOTTOM}
                  stroke={GRID} strokeWidth={1} opacity={gridIn * 0.6} />
                <line x1={CHART_LEFT} y1={mapY(yVal, yAxis.min, yAxis.max)}
                  x2={CHART_RIGHT} y2={mapY(yVal, yAxis.min, yAxis.max)}
                  stroke={GRID} strokeWidth={1} opacity={gridIn * 0.6} />
              </React.Fragment>
            );
          })}

          {/* Origin crosshair */}
          <line x1={originPx} y1={CHART_TOP} x2={originPx} y2={CHART_BOTTOM}
            stroke={ORIGIN_LINE} strokeWidth={2} strokeDasharray="8,6" opacity={axisIn} />
          <line x1={CHART_LEFT} y1={originPy} x2={CHART_RIGHT} y2={originPy}
            stroke={ORIGIN_LINE} strokeWidth={2} strokeDasharray="8,6" opacity={axisIn} />

          {/* Chart border */}
          <rect x={CHART_LEFT} y={CHART_TOP} width={CHART_W} height={CHART_H}
            fill="none" stroke="rgba(234, 224, 213, 0.08)" strokeWidth={1} opacity={gridIn} />

          {/* Connector lines from spotlight dots to labels */}
          {points.map((point, i) => {
            const isSpotlight = spotlightSet.has(point.label) || point.highlight;
            if (!isSpotlight) return null;

            const dotDelay = 20 + i * 1.5;
            const lineDelay = progressiveReveal
              ? dotDelay + labelRevealDelayFrames
              : dotDelay + 8;
            const lineIn = clampSpring(spring({
              fps,
              frame: Math.max(0, frame - lineDelay),
              config: { damping: 18, stiffness: 100 },
            }));

            const px = mapX(point.x, xAxis.min, xAxis.max);
            const py = mapY(point.y, yAxis.min, yAxis.max);
            const radius = 10;
            const dir = point.labelDir || "right";
            const offset = getLabelOffset(dir, radius);
            const lx = px + offset.dx;
            const ly = py + offset.dy;

            return (
              <line
                key={`line-${point.label}`}
                x1={px}
                y1={py}
                x2={px + (lx - px) * lineIn}
                y2={py + (ly - py) * lineIn}
                stroke={QUADRANT_COLORS[point.quadrant].dot}
                strokeWidth={1}
                opacity={lineIn * 0.4}
              />
            );
          })}

          {/* ── Cross-country connector lines (e.g. Greece → Germany) ── */}
          {connectorLines.map((cl, i) => {
            // Find endpoints in OECD points OR ugly truth dots
            const fromPt = points.find(p => p.label === cl.from) || uglyTruthDots.find(d => d.code === cl.from);
            const toPt = points.find(p => p.label === cl.to) || uglyTruthDots.find(d => d.code === cl.to);
            if (!fromPt || !toPt) return null;

            // Use showAt timing from config, or default stagger
            const showAtSec = parseSeconds((cl as any).showAt, 3 + i * 0.5);
            const connDelay = Math.round(showAtSec * fps);
            const connIn = clampSpring(spring({
              fps,
              frame: Math.max(0, frame - connDelay),
              config: { damping: 16, stiffness: 60 },
            }));

            // Duration-based fade out
            const connDurSec = parseSeconds((cl as any).duration, 999);
            const connEndFrame = connDelay + Math.round(connDurSec * fps);
            const connOut = frame > connEndFrame
              ? Math.max(0, 1 - (frame - connEndFrame) / (fps * 0.5))
              : 1;
            const connOpacity = connIn * connOut;

            const x1 = mapX(fromPt.x, xAxis.min, xAxis.max);
            const y1 = mapY(fromPt.y, yAxis.min, yAxis.max);
            const x2 = mapX(toPt.x, xAxis.min, xAxis.max);
            const y2 = mapY(toPt.y, yAxis.min, yAxis.max);
            const lineColor = cl.color || accent;

            // Animate line drawing from "from" to "to"
            const cx = x1 + (x2 - x1) * connIn;
            const cy = y1 + (y2 - y1) * connIn;

            // Stroke dash pattern
            const dashArray = cl.style === "dashed" ? "8,5"
              : cl.style === "dotted" ? "3,4"
              : "none";

            return (
              <React.Fragment key={`conn-${i}`}>
                <line
                  x1={x1} y1={y1}
                  x2={cx} y2={cy}
                  stroke={lineColor}
                  strokeWidth={2}
                  strokeDasharray={dashArray}
                  opacity={connOpacity * 0.7}
                />
                {/* Midpoint label(s) */}
                {connIn > 0.8 && cl.labels && cl.labels.map((lbl, li) => {
                  const mx = (x1 + x2) / 2;
                  const my = (y1 + y2) / 2 + (li - (cl.labels!.length - 1) / 2) * 30;
                  return (
                    <React.Fragment key={`cl-${i}-${li}`}>
                      {/* Background for readability */}
                      <rect
                        x={mx - 90} y={my - 14}
                        width={180} height={28}
                        rx={6} ry={6}
                        fill="rgba(26, 27, 34, 0.85)"
                        opacity={interpolate(connIn, [0.8, 1], [0, 0.9], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) * connOut}
                      />
                      <text
                        x={mx} y={my + 6}
                        textAnchor="middle"
                        fill={lineColor}
                        fontSize={22}
                        fontWeight={700}
                        fontFamily="JetBrains Mono, monospace"
                        opacity={interpolate(connIn, [0.8, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) * connOut}
                      >
                        <tspan>{lbl}</tspan>
                      </text>
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            );
          })}
        </svg>

        {/* ── Origin label (stays in camera space — moves with data) ── */}
        <div style={{
          position: "absolute", top: originPy + 4, left: originPx + 8,
          color: "rgba(163, 177, 138, 0.65)", fontSize: 14, fontWeight: 600,
          letterSpacing: 1, opacity: axisIn,
        }}>
          OECD AVG
        </div>

        {/* ── Quadrant Labels (watermark-style, centered in each quadrant) ── */}
        {showQuadrantLabels && [
          { key: "topLeft",     cx: (CHART_LEFT + originPx) / 2, cy: (CHART_TOP + originPy) / 2,     q: "dream" as const },
          { key: "topRight",    cx: (originPx + CHART_RIGHT) / 2, cy: (CHART_TOP + originPy) / 2,    q: "grind" as const },
          { key: "bottomLeft",  cx: (CHART_LEFT + originPx) / 2, cy: (originPy + CHART_BOTTOM) / 2,  q: "chill" as const },
          { key: "bottomRight", cx: (originPx + CHART_RIGHT) / 2, cy: (originPy + CHART_BOTTOM) / 2, q: "trap"  as const },
        ].map(({ key, cx, cy, q }) => {
          const isDimmed = activeQ && activeQ !== q;
          return (
          <div key={key} style={{
            position: "absolute",
            top: cy - 26,
            left: cx - 120,
            width: 240,
            textAlign: "center",
            color: QUADRANT_COLORS[q].label,
            fontSize: 44,
            fontWeight: 800,
            letterSpacing: 8,
            textTransform: "uppercase" as const,
            opacity: quadIn * (isDimmed ? 0.15 : 0.55),
            pointerEvents: "none" as const,
          }}>
            {quadrantLabels[key as keyof typeof quadrantLabels]}
          </div>
        );
        })}

        {/* ── Data Points (non-spotlight first, then spotlight on top) ── */}
        {[...points]
          .sort((a, b) => {
            const aS = spotlightSet.has(a.label) || a.highlight || showLabelsForSet.has(a.label) ? 1 : 0;
            const bS = spotlightSet.has(b.label) || b.highlight || showLabelsForSet.has(b.label) ? 1 : 0;
            return aS - bS;
          })
          .map((point, i) => {
            const isSpotlight = spotlightSet.has(point.label) || point.highlight;
            const shouldShowLabel = isSpotlight || showLabelsForSet.has(point.label);
            const isActiveDot = activeQuadrantDotsSet.has(point.label);

            const dotDelay = skipEntrance ? 0 : 20 + i * 1.5;
            const dotIn = skipEntrance ? 1 : clampSpring(spring({
              fps,
              frame: Math.max(0, frame - dotDelay),
              config: { damping: 12, stiffness: 80 },
            }));

            const labelDelay = skipEntrance ? 0 : (progressiveReveal
              ? dotDelay + labelRevealDelayFrames
              : dotDelay + 8);
            const labelIn = skipEntrance ? 1 : clampSpring(spring({
              fps,
              frame: Math.max(0, frame - labelDelay),
              config: { damping: 18, stiffness: 100 },
            }));

            const px = mapX(point.x, xAxis.min, xAxis.max);
            const py = mapY(point.y, yAxis.min, yAxis.max);

            // Determine dot color: active dots use dotColorActive, others use inactive or quadrant default
            const defaultColor = QUADRANT_COLORS[point.quadrant].dot;
            let dotColor: string;
            if (activeQuadrantDotsSet.size > 0) {
              // When activeQuadrantDots is specified, use active/inactive coloring
              dotColor = isActiveDot
                ? (dotColorActive || defaultColor)
                : (dotColorInactive || `${defaultColor}40`);
            } else {
              dotColor = isSpotlight ? defaultColor : `${defaultColor}B0`;
            }

            const radius = isSpotlight ? 10 : shouldShowLabel ? 8 : 5;

            const dir = point.labelDir || "right";
            const offset = getLabelOffset(dir, radius);
            const textAlign = offset.anchor === "right" ? "right" as const
              : offset.anchor === "center" ? "center" as const
              : "left" as const;

            return (
              <React.Fragment key={point.label}>
                {/* Dot */}
                <div style={{
                  position: "absolute",
                  left: px - radius,
                  top: py - radius,
                  width: radius * 2,
                  height: radius * 2,
                  borderRadius: "50%",
                  backgroundColor: dotColor,
                  opacity: dotIn,
                  transform: `scale(${dotIn})`,
                  boxShadow: isSpotlight
                    ? `0 0 20px ${dotColor}60, 0 0 6px ${dotColor}40`
                    : "none",
                  border: isSpotlight ? `2px solid ${dotColor}` : "none",
                  zIndex: shouldShowLabel ? 20 : 5,
                }} />

                {/* Label — show for spotlight OR showLabelsFor dots */}
                {shouldShowLabel && (
                  <div style={{
                    position: "absolute",
                    left: px + offset.dx + (textAlign === "right" ? -140 : textAlign === "center" ? -70 : 0),
                    top: py + offset.dy,
                    width: 140,
                    textAlign,
                    opacity: labelIn,
                    zIndex: 21,
                    pointerEvents: "none" as const,
                  }}>
                    <span style={{
                      color: isActiveDot ? (dotColorActive || defaultColor) : defaultColor,
                      fontSize: isSpotlight ? 15 : 13,
                      fontWeight: 700,
                      textShadow: "0 1px 6px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.6)",
                    }}>
                      {point.label}
                    </span>
                  </div>
                )}
              </React.Fragment>
            );
          })}

        {/* Counter, Tooltips, Annotations moved to Unclipped Camera Overlay below */}

        {/* ── Ugly Truth Dots (square shape, non-OECD) ── */}
        {uglyTruthDots.map((ut, ui) => {
          const utDelay = skipEntrance ? 0 : Math.round(fps * 3) + ui * Math.round(fps * 1.5);
          const utIn = skipEntrance ? 1 : clampSpring(spring({
            fps,
            frame: Math.max(0, frame - utDelay),
            config: { damping: 14, stiffness: 60 },
          }));

          const utx = mapX(ut.x, xAxis.min, xAxis.max);
          const uty = mapY(ut.y, yAxis.min, yAxis.max);
          const utColor = ut.color || "#8B2030";
          const utSize = 10;
          const shouldShowUtLabel = showLabelsForSet.has(ut.code);

          const utLabelDir = ut.x > 2300 ? "left" : "right";
          const utOffset = getLabelOffset(utLabelDir, utSize);

          return (
            <React.Fragment key={`ut-${ut.code}`}>
              {/* Square dot */}
              <div style={{
                position: "absolute",
                left: utx - utSize,
                top: uty - utSize,
                width: utSize * 2,
                height: utSize * 2,
                borderRadius: ut.shape === "square" ? 3 : "50%",
                backgroundColor: utColor,
                opacity: utIn,
                transform: `scale(${utIn})`,
                boxShadow: `0 0 16px ${utColor}50, 0 0 4px ${utColor}30`,
                border: `1.5px solid ${utColor}`,
                zIndex: 22,
              }} />
              {/* Label */}
              {shouldShowUtLabel && (
                <div style={{
                  position: "absolute",
                  left: utx + utOffset.dx + (utLabelDir === "left" ? -100 : 0),
                  top: uty + utOffset.dy,
                  width: 100,
                  textAlign: utLabelDir === "left" ? "right" as const : "left" as const,
                  opacity: utIn,
                  zIndex: 23,
                  pointerEvents: "none" as const,
                }}>
                  <span style={{
                    color: utColor,
                    fontSize: 13,
                    fontWeight: 700,
                    textShadow: "0 1px 6px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.6)",
                  }}>
                    {ut.code}
                  </span>
                </div>
              )}
            </React.Fragment>
          );
        })}

        {/* ── Spotlight Card (detailed callout e.g. Japan) ── */}
        {spotlightCard && (() => {
          const cardDelay = Math.round(fps * 3);
          const cardIn = clampSpring(spring({
            fps,
            frame: Math.max(0, frame - cardDelay),
            config: { damping: 16, stiffness: 70 },
          }));
          return (
            <div style={{
              position: "absolute",
              top: 130,
              right: 50,
              width: 280,
              opacity: cardIn,
              transform: `translateX(${interpolate(cardIn, [0, 1], [40, 0])}px)`,
              zIndex: 40,
            }}>
              <div style={{
                backgroundColor: "rgba(26, 27, 34, 0.92)",
                borderRadius: 12,
                padding: "20px 24px",
                border: "1px solid rgba(91, 191, 140, 0.25)",
                backdropFilter: "blur(12px)",
              }}>
                {/* Country header */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <span style={{
                    fontSize: 12, fontWeight: 700, color: "#1A1B22",
                    backgroundColor: "rgba(234, 224, 213, 0.85)",
                    borderRadius: 4, padding: "3px 7px", letterSpacing: 1,
                  }}>
                    {spotlightCard.label.slice(0, 3).toUpperCase()}
                  </span>
                  <span style={{ color: TEXT, fontSize: 20, fontWeight: 700 }}>
                    {spotlightCard.label}
                  </span>
                  {spotlightCard.rankBadge && (
                    <span style={{
                      color: "#5BBF8C",
                      fontSize: 16,
                      fontWeight: 800,
                      marginLeft: "auto",
                      fontFamily: "JetBrains Mono, monospace",
                    }}>
                      {spotlightCard.rankBadge}
                    </span>
                  )}
                </div>
                {/* Stats */}
                {spotlightCard.stats.map((stat, si) => (
                  <div key={si} style={{
                    display: "flex", justifyContent: "space-between",
                    padding: "6px 0",
                    borderBottom: si < spotlightCard.stats.length - 1 ? "1px solid rgba(234, 224, 213, 0.06)" : "none",
                  }}>
                    <span style={{ color: MUTED, fontSize: 12, fontWeight: 500 }}>{stat.key}</span>
                    <span style={{
                      color: TEXT, fontSize: 14, fontWeight: 700,
                      fontFamily: "JetBrains Mono, monospace",
                    }}>
                      {stat.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ── Division Comparison Overlay ── */}
        {divisionOverlay && (
          <DivisionOverlayPanel
            overlay={divisionOverlay}
            frame={frame}
            fps={fps}
            fontFamily={fontFamily}
            accent={accent}
          />
        )}

        {/* ── Data Source ── */}
        <div style={{
          position: "absolute", bottom: 12, right: 20,
          color: "rgba(234, 224, 213, 0.2)", fontSize: 10,
          fontWeight: 400, opacity: gridIn,
        }}>
          OECD Wages 2024 (PPP-adjusted) · OECD Hours 2022
        </div>

        {/* Closing sequence moved OUTSIDE camera wrapper — see after frozen axis overlay */}
      </div>
      {/* ── End Camera Zoom Wrapper (clipped) ── */}

      {/* ── Unclipped Camera Overlay — tooltips, annotations, counter, title ── */}
      {/* Same camera transform but NO clipPath so tooltips can extend into axis area */}
      <div
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          position: "absolute",
          top: 0,
          left: 0,
          transform: cameraTransform,
          transformOrigin,
          pointerEvents: "none" as const,
          zIndex: 46,
        }}
      >
        {/* ── Counter Label ("16 of 33 countries") ── */}
        {counterLabel && (
          <div style={{
            position: "absolute",
            bottom: 70,
            right: 40,
            opacity: clampSpring(spring({ fps, frame: Math.max(0, frame - Math.round(fps * 2)), config: { damping: 20, stiffness: 80 } })),
            zIndex: 30,
          }}>
            <span style={{
              color: TEXT,
              fontSize: 20,
              fontWeight: 700,
              fontFamily: "JetBrains Mono, monospace",
              letterSpacing: 1,
              padding: "8px 16px",
              backgroundColor: "rgba(26, 27, 34, 0.8)",
              borderRadius: 8,
              border: "1px solid rgba(234, 224, 213, 0.1)",
            }}>
              {counterLabel}
            </span>
          </div>
        )}

        {/* ── Tooltips — speech bubble info boxes connected to dots ── */}
        {tooltips.map((tt, ti) => {
          const ttPoint = points.find(p => p.label === tt.code);
          const ttUgly = !ttPoint ? uglyTruthDots.find(d => d.code === tt.code) : undefined;
          if (!ttPoint && !ttUgly) return null;

          const ttShowAtSec = parseSeconds(tt.showAt, 2 + ti);
          const ttDelay = Math.round(ttShowAtSec * fps);
          const ttIn = clampSpring(spring({
            fps,
            frame: Math.max(0, frame - ttDelay),
            config: { damping: 16, stiffness: 70 },
          }));
          if (ttIn < 0.01) return null;

          const resolved = tooltipPositions[ti];
          if (!resolved) return null;
          const TT_W_RENDER = Math.round(420 * tooltipScale);
          const ttLeft = resolved.left;
          const ttTop = resolved.top;
          const rPos = resolved.resolvedPos;
          const dotPx = resolved.px;
          const dotPy = resolved.py;

          const dataEntries = Object.entries(tt.data).filter(([k]) => k !== "source" && k !== "note");
          const sourceOrNote = tt.data.source || tt.data.note;

          const isLeft = rPos === "topLeft" || rPos === "bottomLeft" || rPos === "left";
          const isTop = rPos === "topLeft" || rPos === "topRight" || rPos === "top";
          const isBottom = rPos === "bottomLeft" || rPos === "bottomRight" || rPos === "bottom";

          const ttEstH = 160;
          const ttRight = ttLeft + TT_W_RENDER;
          const ttBottom2 = ttTop + ttEstH;
          const connEdgeX = Math.max(ttLeft + 10, Math.min(dotPx, ttRight - 10));
          const connEdgeY = dotPy < ttTop
            ? ttTop
            : dotPy > ttBottom2
              ? ttBottom2
              : ttTop + ttEstH / 2;

          return (
            <React.Fragment key={`tt-${ti}`}>
              <svg style={{
                position: "absolute", top: 0, left: 0,
                width: CANVAS_W, height: CANVAS_H,
                pointerEvents: "none",
                zIndex: 34,
              }}>
                <line
                  x1={dotPx} y1={dotPy}
                  x2={dotPx + (connEdgeX - dotPx) * ttIn}
                  y2={dotPy + (connEdgeY - dotPy) * ttIn}
                  stroke="rgba(234, 224, 213, 0.25)"
                  strokeWidth={1.5}
                  strokeDasharray="4,3"
                  opacity={ttIn * 0.8}
                />
                <circle
                  cx={dotPx} cy={dotPy} r={4}
                  fill="none"
                  stroke="rgba(234, 224, 213, 0.4)"
                  strokeWidth={1.5}
                  opacity={ttIn}
                />
              </svg>

              <div style={{
                position: "absolute",
                left: ttLeft,
                top: ttTop,
                width: TT_W_RENDER,
                opacity: ttIn,
                transform: `scale(${interpolate(ttIn, [0, 1], [0.92, 1])})`,
                transformOrigin: isLeft
                  ? (isTop ? "bottom right" : "top right")
                  : (isTop ? "bottom left" : "top left"),
                zIndex: 35,
                pointerEvents: "none" as const,
              }}>
                <div style={{
                  backgroundColor: "rgba(26, 27, 34, 0.94)",
                  borderRadius: Math.round(10 * tooltipScale),
                  padding: `${Math.round(16 * tooltipScale)}px ${Math.round(22 * tooltipScale)}px`,
                  border: "1px solid rgba(234, 224, 213, 0.18)",
                  backdropFilter: "blur(10px)",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.5), 0 0 1px rgba(234,224,213,0.1)",
                }}>
                  <div style={{
                    fontSize: Math.round(24 * tooltipScale), fontWeight: 700, color: "#1A1B22",
                    backgroundColor: "rgba(234, 224, 213, 0.85)",
                    borderRadius: 4, padding: `${Math.round(5 * tooltipScale)}px ${Math.round(14 * tooltipScale)}px`, letterSpacing: 1.5,
                    display: "inline-block", marginBottom: Math.round(12 * tooltipScale),
                  }}>
                    {tt.code}
                  </div>
                  {dataEntries.map(([key, val], di) => (
                    <div key={di} style={{
                      display: "flex", justifyContent: "space-between",
                      padding: `${Math.round(6 * tooltipScale)}px 0`,
                      borderBottom: di < dataEntries.length - 1 ? "1px solid rgba(234, 224, 213, 0.06)" : "none",
                    }}>
                      <span style={{ color: MUTED, fontSize: Math.round(20 * tooltipScale), fontWeight: 500 }}>{key}</span>
                      <span style={{
                        color: TEXT, fontSize: Math.round(26 * tooltipScale), fontWeight: 700,
                        fontFamily: "JetBrains Mono, monospace",
                      }}>
                        {val}
                      </span>
                    </div>
                  ))}
                  {sourceOrNote && (
                    <div style={{ color: "rgba(234, 224, 213, 0.3)", fontSize: Math.round(16 * tooltipScale), marginTop: Math.round(8 * tooltipScale), fontStyle: "italic" as const }}>
                      {sourceOrNote}
                    </div>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}

        {/* ── Annotations — text badges, icon badges, text overlays ── */}
        {annotations.map((ann, ai) => {
          const annPoint = points.find(p => p.label === ann.attachTo);
          if (!annPoint) return null;

          const annShowAtSec = parseSeconds(ann.showAt, 2 + ai);
          const annDelay = Math.round(annShowAtSec * fps);
          const annIn = clampSpring(spring({
            fps,
            frame: Math.max(0, frame - annDelay),
            config: { damping: 18, stiffness: 80 },
          }));
          if (annIn < 0.01) return null;

          const annDurSec = parseSeconds(ann.duration, 999);
          const annEndFrame = annDelay + Math.round(annDurSec * fps);
          const annOut = frame > annEndFrame
            ? Math.max(0, 1 - (frame - annEndFrame) / (fps * 0.5))
            : 1;
          const annOpacity = annIn * annOut;

          const apx = mapX(annPoint.x, xAxis.min, xAxis.max);
          const apy = mapY(annPoint.y, yAxis.min, yAxis.max);
          const annStyle = ann.style || {};

          if (ann.type === "text-badge") {
            const badgePos = ann.position || "right";
            const bLeft = badgePos.includes("left") ? apx - 200 : apx + 14;
            const bTop = badgePos.includes("top") ? apy - 34 : apy + 2;
            return (
              <div key={`ann-${ai}`} style={{
                position: "absolute", left: bLeft, top: bTop,
                opacity: annOpacity, zIndex: 30,
                pointerEvents: "none" as const,
                transform: `translateX(${interpolate(annIn, [0, 1], [10, 0])}px)`,
              }}>
                <span style={{
                  backgroundColor: annStyle.backgroundColor || "rgba(144,175,197,0.2)",
                  border: `1px solid ${annStyle.borderColor || "#90AFC5"}`,
                  color: annStyle.color || TEXT,
                  fontSize: annStyle.fontSize || 13,
                  fontWeight: 600,
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontFamily: "JetBrains Mono, monospace",
                  whiteSpace: "nowrap" as const,
                }}>
                  {ann.text}
                </span>
              </div>
            );
          }

          if (ann.type === "icon-badge") {
            const iconLeft = apx + ((ann.position || "").includes("Left") || (ann.position || "").includes("left") ? -28 : 12);
            const iconTop = apy + ((ann.position || "").includes("top") || (ann.position || "").includes("Top") ? -28 : 8);
            return (
              <div key={`ann-${ai}`} style={{
                position: "absolute", left: iconLeft, top: iconTop,
                opacity: annOpacity, zIndex: 30,
                pointerEvents: "none" as const,
                transform: `scale(${interpolate(annIn, [0, 1], [0.5, 1])})`,
              }}>
                <div style={{
                  width: 28, height: 28,
                  borderRadius: annStyle.shape === "circle" ? "50%" : 4,
                  backgroundColor: annStyle.backgroundColor || "rgba(144,175,197,0.3)",
                  border: `1px solid ${annStyle.borderColor || "#90AFC5"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: annStyle.color || TEXT,
                  fontSize: annStyle.fontSize || 16,
                  fontWeight: 700,
                }}>
                  {ann.icon}
                </div>
              </div>
            );
          }

          if (ann.type === "text-overlay") {
            const ovLeft = (ann.position || "").includes("left") || (ann.position || "").includes("Left")
              ? apx - 260 : apx + 18;
            const ovTop = (ann.position || "").includes("bottom") || (ann.position || "").includes("Bottom")
              ? apy + 18 : apy - 36;
            return (
              <div key={`ann-${ai}`} style={{
                position: "absolute", left: ovLeft, top: ovTop,
                opacity: annOpacity, zIndex: 30,
                pointerEvents: "none" as const,
                transform: `translateY(${interpolate(annIn, [0, 1], [6, 0])}px)`,
              }}>
                <span style={{
                  color: annStyle.color || "#90AFC5",
                  fontSize: annStyle.fontSize || 15,
                  fontStyle: (annStyle.fontStyle as any) || "italic",
                  fontWeight: 500,
                  backgroundColor: annStyle.backgroundColor || "rgba(26,27,34,0.85)",
                  padding: annStyle.padding || "4px 10px",
                  borderRadius: 4,
                  whiteSpace: "nowrap" as const,
                }}>
                  {ann.text}
                </span>
              </div>
            );
          }

          return null;
        })}
      </div>
      {/* ── End Unclipped Camera Overlay ── */}

      {/* ── Frozen Axis Overlay — stays fixed regardless of camera zoom ── */}
      {/* Like Excel's freeze panes: axes, ticks, and labels are always visible */}
      {/* Hidden during closing sequence to avoid covering spotlight dots in bottom area */}
      {!closingSequence && (() => {
        // Inverse-map: given a screen pixel, what data value would be there
        // Camera: scale(S) translate(Tx, Ty) with transform-origin center center
        // Forward: screenPx = (chartPx + Tx) * S + centerX * (1 - S)
        // Inverse: chartPx = (screenPx - centerX * (1 - S)) / S - Tx
        const cX = CANVAS_W / 2;
        const cY = CANVAS_H / 2;
        const invPx = (screenPx: number) => (screenPx - cX * (1 - camScale)) / camScale - camTx;
        const invPy = (screenPy: number) => (screenPy - cY * (1 - camScale)) / camScale - camTy;

        // Visible data range at current zoom
        const visLeftPx = invPx(CHART_LEFT);
        const visRightPx = invPx(CHART_RIGHT);
        const visTopPx = invPy(CHART_TOP);
        const visBotPx = invPy(CHART_BOTTOM);

        // Convert pixel to data space
        const pxToDataX = (px: number) => xAxis.min + ((px - CHART_LEFT) / CHART_W) * (xAxis.max - xAxis.min);
        const pxToDataY = (px: number) => yAxis.min + ((CHART_BOTTOM - px) / CHART_H) * (yAxis.max - yAxis.min);

        const visXMin = pxToDataX(visLeftPx);
        const visXMax = pxToDataX(visRightPx);
        const visYMin = pxToDataY(visBotPx);
        const visYMax = pxToDataY(visTopPx);
        const visXRange = visXMax - visXMin;
        const visYRange = visYMax - visYMin;

        // Compute nice tick step for given range and desired tick count
        const niceStep = (range: number, maxTicks: number) => {
          const rough = range / maxTicks;
          const mag = Math.pow(10, Math.floor(Math.log10(rough)));
          const norm = rough / mag;
          let step: number;
          if (norm <= 1.5) step = 1 * mag;
          else if (norm <= 3) step = 2 * mag;
          else if (norm <= 7) step = 5 * mag;
          else step = 10 * mag;
          return step;
        };

        const xStep = niceStep(visXRange, 6);
        const yStep = niceStep(visYRange, 6);

        // Generate tick values within visible range
        const xTicks: number[] = [];
        const xStart = Math.ceil(visXMin / xStep) * xStep;
        for (let v = xStart; v <= visXMax; v += xStep) xTicks.push(Math.round(v));

        const yTicks: number[] = [];
        const yStart = Math.ceil(visYMin / yStep) * yStep;
        for (let v = yStart; v <= visYMax; v += yStep) yTicks.push(Math.round(v));

        // Map data value to screen position (accounting for camera transform)
        // Forward: chartPx from mapX/mapY, then screenPx = (chartPx + Tx) * S + cX * (1-S)
        const dataToScreenX = (val: number) => {
          const chartPx = mapX(val, xAxis.min, xAxis.max);
          return (chartPx + camTx) * camScale + cX * (1 - camScale);
        };
        const dataToScreenY = (val: number) => {
          const chartPx = mapY(val, yAxis.min, yAxis.max);
          return (chartPx + camTy) * camScale + cY * (1 - camScale);
        };

        // Axis area dimensions — generous space for labels
        const AXIS_LEFT_W = CHART_LEFT;          // left gutter width for Y-axis labels
        const AXIS_BOTTOM_H = CANVAS_H - CHART_BOTTOM; // bottom gutter height for X-axis labels
        const Y_TITLE_W = 60;                    // strip for rotated Y-axis title
        const Y_TICK_W = AXIS_LEFT_W - Y_TITLE_W; // remaining space for tick values (100px)

        return (
          <>
            {/* ── Left gutter background (Y axis area) — masks chart content that bleeds during zoom ── */}
            <div style={{
              position: "absolute", top: 0, left: 0,
              width: AXIS_LEFT_W, height: CANVAS_H,
              background: BG,
              zIndex: 45, pointerEvents: "none" as const,
            }} />

            {/* ── Bottom gutter background (X axis area) — masks chart content that bleeds during zoom ── */}
            <div style={{
              position: "absolute", top: CHART_BOTTOM, left: 0,
              width: CANVAS_W, height: AXIS_BOTTOM_H,
              background: BG,
              zIndex: 45, pointerEvents: "none" as const,
            }} />

            {/* ── Y-axis title (vertical text, centered in Y_TITLE_W strip) ── */}
            <div style={{
              position: "absolute",
              top: CHART_TOP + CHART_H / 2,
              left: Y_TITLE_W - 5,
              zIndex: 46, pointerEvents: "none" as const,
              opacity: axisIn,
              transform: "translate(-50%, -50%) rotate(-90deg)",
              color: "rgba(234, 224, 213, 0.55)",
              fontSize: 28, fontWeight: 600, letterSpacing: 3,
              textTransform: "uppercase" as const,
              whiteSpace: "nowrap",
            }}>
              ↑ {yAxis.label}
            </div>

            {/* ── X-axis title ── */}
            <div style={{
              position: "absolute",
              top: CHART_BOTTOM + 28,
              left: CHART_LEFT,
              width: CHART_W,
              textAlign: "center",
              zIndex: 46, pointerEvents: "none" as const,
              opacity: axisIn,
              color: "rgba(234, 224, 213, 0.65)",
              fontSize: 22, fontWeight: 600, letterSpacing: 2,
              textTransform: "uppercase" as const,
            }}>
              {xAxis.label} →
            </div>

            {/* ── X-axis tick values ── */}
            {xTicks.map((val) => {
              const sx = dataToScreenX(val);
              // Only render if tick is within the chart area
              if (sx < CHART_LEFT - 10 || sx > CHART_RIGHT + 10) return null;
              return (
                <div key={`fxt-${val}`} style={{
                  position: "absolute",
                  top: CHART_BOTTOM + 8,
                  left: sx - 55,
                  width: 110,
                  textAlign: "center",
                  color: "rgba(234, 224, 213, 0.6)",
                  fontSize: 22, fontWeight: 500, opacity: gridIn,
                  zIndex: 46, pointerEvents: "none" as const,
                  fontFamily: "JetBrains Mono, monospace",
                }}>
                  {val.toLocaleString()}
                </div>
              );
            })}

            {/* ── Y-axis tick values ── */}
            {yTicks.map((val) => {
              const sy = dataToScreenY(val);
              // Only render if tick is within the chart area
              if (sy < CHART_TOP - 10 || sy > CHART_BOTTOM + 10) return null;
              return (
                <div key={`fyt-${val}`} style={{
                  position: "absolute",
                  top: sy - 13,
                  left: Y_TITLE_W,
                  width: Y_TICK_W - 6,
                  textAlign: "right",
                  color: "rgba(234, 224, 213, 0.6)",
                  fontSize: 22, fontWeight: 500, opacity: gridIn,
                  zIndex: 46, pointerEvents: "none" as const,
                  fontFamily: "JetBrains Mono, monospace",
                }}>
                  {val >= 1000 ? `$${(val / 1000).toFixed(0)}K` : val.toLocaleString()}
                </div>
              );
            })}

            {/* ── Frozen chart border lines (L-shape: left edge + bottom edge) ── */}
            <svg width={CANVAS_W} height={CANVAS_H} style={{
              position: "absolute", top: 0, left: 0,
              zIndex: 46, pointerEvents: "none" as const,
            }}>
              {/* Left border */}
              <line x1={CHART_LEFT} y1={CHART_TOP} x2={CHART_LEFT} y2={CHART_BOTTOM}
                stroke="rgba(234, 224, 213, 0.15)" strokeWidth={1.5} opacity={gridIn} />
              {/* Bottom border */}
              <line x1={CHART_LEFT} y1={CHART_BOTTOM} x2={CHART_RIGHT} y2={CHART_BOTTOM}
                stroke="rgba(234, 224, 213, 0.15)" strokeWidth={1.5} opacity={gridIn} />
              {/* Tick marks on X axis */}
              {xTicks.map((val) => {
                const sx = dataToScreenX(val);
                if (sx < CHART_LEFT - 2 || sx > CHART_RIGHT + 2) return null;
                return (
                  <line key={`fxtm-${val}`}
                    x1={sx} y1={CHART_BOTTOM}
                    x2={sx} y2={CHART_BOTTOM + 6}
                    stroke="rgba(234, 224, 213, 0.35)" strokeWidth={1} opacity={gridIn} />
                );
              })}
              {/* Tick marks on Y axis */}
              {yTicks.map((val) => {
                const sy = dataToScreenY(val);
                if (sy < CHART_TOP - 2 || sy > CHART_BOTTOM + 2) return null;
                return (
                  <line key={`fytm-${val}`}
                    x1={CHART_LEFT - 6} y1={sy}
                    x2={CHART_LEFT} y2={sy}
                    stroke="rgba(234, 224, 213, 0.35)" strokeWidth={1} opacity={gridIn} />
                );
              })}
            </svg>
          </>
        );
      })()}

      {/* ── Closing Sequence Overlay (6-phase animation for scene-010) ── */}
      {/* Rendered OUTSIDE camera wrapper so it's above frozen axis overlay (stacking context) */}
      {closingSequence && (() => {
        // Parse phase durations into frame ranges
        const p1Dur = parseSeconds(closingSequence.phase1_allVisible?.duration, 4);
        const p2Dur = parseSeconds(closingSequence.phase2_fadeToSpotlight?.duration, 3);
        const p3Dur = parseSeconds(closingSequence.phase3_spotlightPulse?.duration, 8);
        const p4Dur = parseSeconds(closingSequence.phase4_dotsFade?.duration, 2);
        const p5Dur = parseSeconds(closingSequence.phase5_closingText?.duration, 6);
        const p6Dur = parseSeconds(closingSequence.phase6_fadeToBlack?.duration, 3);

        const p1Start = 0;
        const p2Start = p1Start + p1Dur;
        const p3Start = p2Start + p2Dur;
        const p4Start = p3Start + p3Dur;
        const p5Start = p4Start + p4Dur;
        const p6Start = p5Start + p5Dur;

        const currentTimeSec = frame / fps;

        // Phase 2: Fade all dots except spotlight to near-invisible
        const p2FadeTo = closingSequence.phase2_fadeToSpotlight?.fadeTo ?? 0.08;
        const p2Progress = currentTimeSec >= p2Start
          ? Math.min(1, (currentTimeSec - p2Start) / p2Dur)
          : 0;

        // Phase 4: Fade all dots
        const p4Progress = currentTimeSec >= p4Start
          ? Math.min(1, (currentTimeSec - p4Start) / p4Dur)
          : 0;

        // Phase 5: Closing text
        const p5FadeInSec = parseSeconds(closingSequence.phase5_closingText?.fadeIn, 1.5);
        const p5HoldSec = parseSeconds(closingSequence.phase5_closingText?.hold, 3);
        const p5FadeOutSec = parseSeconds(closingSequence.phase5_closingText?.fadeOut, 1.5);
        const p5LocalTime = currentTimeSec - p5Start;
        let p5TextOpacity = 0;
        if (p5LocalTime >= 0) {
          if (p5LocalTime < p5FadeInSec) {
            p5TextOpacity = p5LocalTime / p5FadeInSec;
          } else if (p5LocalTime < p5FadeInSec + p5HoldSec) {
            p5TextOpacity = 1;
          } else if (p5LocalTime < p5FadeInSec + p5HoldSec + p5FadeOutSec) {
            p5TextOpacity = 1 - (p5LocalTime - p5FadeInSec - p5HoldSec) / p5FadeOutSec;
          }
        }

        // Phase 6: Fade to black
        const p6Progress = currentTimeSec >= p6Start
          ? Math.min(1, (currentTimeSec - p6Start) / p6Dur)
          : 0;
        const p6BgColor = closingSequence.phase6_fadeToBlack?.backgroundColor || "#000000";

        // Compute dot dim overlay opacity (phases 2+4 combined)
        const dotDimOpacity = Math.min(1,
          p2Progress * (1 - p2FadeTo) + p4Progress * p2FadeTo
        );

        return (
          <>
            {/* Phase 2+4: Dimming overlay for non-spotlight dots */}
            {p2Progress > 0 && (
              <div style={{
                position: "absolute",
                top: 0, left: 0, width: CANVAS_W, height: CANVAS_H,
                backgroundColor: BG,
                opacity: dotDimOpacity,
                zIndex: 60,
                pointerEvents: "none" as const,
              }} />
            )}

            {/* Phase 3: Spotlight dots on top of the dim */}
            {closingSequence.phase3_spotlightPulse && currentTimeSec >= p2Start && p4Progress < 1 && (
              closingSequence.phase3_spotlightPulse.spotlightDots || []).map((sd, si) => {
                // Find the dot in points or uglyTruthDots
                const sdPoint = points.find(p => p.label === sd.code);
                const sdUgly = !sdPoint ? uglyTruthDots.find(d => d.code === sd.code) : undefined;
                if (!sdPoint && !sdUgly) return null;

                // Since this is outside camera wrapper, for scene-010 camera is identity (scale=1, tx=0, ty=0)
                // Use mapX/mapY directly — coordinates are same as chart space
                const sdx = sdPoint
                  ? mapX(sdPoint.x, xAxis.min, xAxis.max)
                  : mapX(sdUgly!.x, xAxis.min, xAxis.max);
                const sdy = sdPoint
                  ? mapY(sdPoint.y, yAxis.min, yAxis.max)
                  : mapY(sdUgly!.y, yAxis.min, yAxis.max);

                const spotlightOpacity = Math.min(p2Progress * 2, 1) * (1 - p4Progress);

                // Pulse animation
                const pulsePhase = sd.pulse ? Math.sin(frame * 0.08) * 0.3 + 1 : 1;
                const sdRadius = 12;

                // Smart positioning: flip label/tooltip to avoid overflow
                const ttWidth = 340;
                const flipH = sdx + 20 + ttWidth > CANVAS_W - 20;
                const flipV = sdy > CHART_BOTTOM - 80; // flip up if dot is near/below chart bottom

                return (
                  <React.Fragment key={`cs-spot-${si}`}>
                    {/* Glow circle */}
                    <div style={{
                      position: "absolute",
                      left: sdx - sdRadius * 2,
                      top: sdy - sdRadius * 2,
                      width: sdRadius * 4,
                      height: sdRadius * 4,
                      borderRadius: sdUgly?.shape === "square" ? 6 : "50%",
                      backgroundColor: sd.glowColor || QUADRANT_COLORS.dream.dot,
                      opacity: spotlightOpacity * 0.3 * pulsePhase,
                      zIndex: 61,
                      pointerEvents: "none" as const,
                    }} />
                    {/* Dot */}
                    <div style={{
                      position: "absolute",
                      left: sdx - sdRadius,
                      top: sdy - sdRadius,
                      width: sdRadius * 2,
                      height: sdRadius * 2,
                      borderRadius: sdUgly?.shape === "square" ? 3 : "50%",
                      backgroundColor: sd.glowColor || "#fff",
                      opacity: spotlightOpacity,
                      transform: `scale(${pulsePhase})`,
                      boxShadow: `0 0 24px ${sd.glowColor || "#fff"}80`,
                      zIndex: 62,
                      pointerEvents: "none" as const,
                    }} />
                    {/* Label + Tooltip container for spotlight dots */}
                    {(sd.showLabel || sd.tooltip) && (() => {
                      // When flipped: tooltip above dot, label between tooltip and dot
                      // When normal: label next to dot, tooltip below label
                      const tooltipH = sd.tooltip ? Object.keys(sd.tooltip).length * 35 + 32 : 0; // approx height
                      const labelH = 30;
                      const gap = 6;

                      if (flipV) {
                        // Stack above dot: [tooltip] [label] [dot]
                        const stackBottom = sdy - 20; // above dot
                        const labelTop = stackBottom - labelH;
                        const tooltipTop = labelTop - gap - tooltipH;
                        const anchorLeft = flipH ? sdx - 20 - ttWidth : sdx + 20;

                        return (
                          <>
                            {sd.showLabel && (
                              <div style={{
                                position: "absolute",
                                left: flipH ? anchorLeft + ttWidth : anchorLeft,
                                top: labelTop,
                                opacity: spotlightOpacity,
                                zIndex: 63,
                                pointerEvents: "none" as const,
                                ...(flipH ? { textAlign: "right" as const } : {}),
                              }}>
                                <span style={{
                                  color: TEXT,
                                  fontSize: 22,
                                  fontWeight: 800,
                                  letterSpacing: 1,
                                  textShadow: "0 2px 12px rgba(0,0,0,0.9), 0 0 24px rgba(0,0,0,0.6)",
                                }}>
                                  {sd.code}
                                </span>
                              </div>
                            )}
                            {sd.tooltip && (
                              <div style={{
                                position: "absolute",
                                left: anchorLeft,
                                top: tooltipTop,
                                width: ttWidth,
                                opacity: spotlightOpacity,
                                zIndex: 63,
                                pointerEvents: "none" as const,
                              }}>
                                <div style={{
                                  backgroundColor: "rgba(26, 27, 34, 0.92)",
                                  borderRadius: 10,
                                  padding: "14px 20px",
                                  border: `1px solid ${sd.glowColor || "rgba(234, 224, 213, 0.15)"}`,
                                  boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 16px ${sd.glowColor || "transparent"}30`,
                                }}>
                                  {Object.entries(sd.tooltip).map(([k, v], ti) => (
                                    <div key={ti} style={{
                                      display: "flex", justifyContent: "space-between", padding: "5px 0",
                                      borderBottom: ti < Object.entries(sd.tooltip!).length - 1 ? "1px solid rgba(234,224,213,0.06)" : "none",
                                    }}>
                                      <span style={{ color: MUTED, fontSize: 15, fontWeight: 500 }}>{k}</span>
                                      <span style={{ color: TEXT, fontSize: 20, fontWeight: 700, fontFamily: "JetBrains Mono, monospace" }}>{v}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        );
                      } else {
                        // Normal: [dot] [label] [tooltip below]
                        return (
                          <>
                            {sd.showLabel && (
                              <div style={{
                                position: "absolute",
                                left: sdx + 20,
                                top: sdy - 12,
                                opacity: spotlightOpacity,
                                zIndex: 63,
                                pointerEvents: "none" as const,
                              }}>
                                <span style={{
                                  color: TEXT,
                                  fontSize: 22,
                                  fontWeight: 800,
                                  letterSpacing: 1,
                                  textShadow: "0 2px 12px rgba(0,0,0,0.9), 0 0 24px rgba(0,0,0,0.6)",
                                }}>
                                  {sd.code}
                                </span>
                              </div>
                            )}
                            {sd.tooltip && (
                              <div style={{
                                position: "absolute",
                                left: sdx + 20,
                                top: sdy + 18,
                                width: ttWidth,
                                opacity: spotlightOpacity,
                                zIndex: 63,
                                pointerEvents: "none" as const,
                              }}>
                                <div style={{
                                  backgroundColor: "rgba(26, 27, 34, 0.92)",
                                  borderRadius: 10,
                                  padding: "14px 20px",
                                  border: `1px solid ${sd.glowColor || "rgba(234, 224, 213, 0.15)"}`,
                                  boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 16px ${sd.glowColor || "transparent"}30`,
                                }}>
                                  {Object.entries(sd.tooltip).map(([k, v], ti) => (
                                    <div key={ti} style={{
                                      display: "flex", justifyContent: "space-between", padding: "5px 0",
                                      borderBottom: ti < Object.entries(sd.tooltip!).length - 1 ? "1px solid rgba(234,224,213,0.06)" : "none",
                                    }}>
                                      <span style={{ color: MUTED, fontSize: 15, fontWeight: 500 }}>{k}</span>
                                      <span style={{ color: TEXT, fontSize: 20, fontWeight: 700, fontFamily: "JetBrains Mono, monospace" }}>{v}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        );
                      }
                    })()}
                  </React.Fragment>
                );
              }
            )}

            {/* Phase 5: Closing text */}
            {p5TextOpacity > 0 && closingSequence.phase5_closingText && (
              <div style={{
                position: "absolute",
                top: 0, left: 0, width: CANVAS_W, height: CANVAS_H,
                display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: 65,
                pointerEvents: "none" as const,
              }}>
                <div style={{
                  color: TEXT,
                  fontSize: 36,
                  fontWeight: 500,
                  fontFamily,
                  letterSpacing: "0.02em",
                  opacity: p5TextOpacity,
                  textShadow: "0 2px 20px rgba(0,0,0,0.8)",
                  textAlign: "center" as const,
                  maxWidth: 800,
                  lineHeight: 1.4,
                }}>
                  {closingSequence.phase5_closingText.text}
                </div>
              </div>
            )}

            {/* Phase 6: Fade to black */}
            {p6Progress > 0 && (
              <div style={{
                position: "absolute",
                top: 0, left: 0, width: CANVAS_W, height: CANVAS_H,
                backgroundColor: p6BgColor,
                opacity: p6Progress,
                zIndex: 70,
                pointerEvents: "none" as const,
              }} />
            )}
          </>
        );
      })()}
    </div>
  );
};

// ─── Division Comparison Overlay Panel ──────────────────────────

interface DivisionOverlayPanelProps {
  overlay: DivisionOverlayConfig;
  frame: number;
  fps: number;
  fontFamily: string;
  accent: string;
}

const DivisionOverlayPanel: React.FC<DivisionOverlayPanelProps> = ({
  overlay,
  frame,
  fps,
  fontFamily,
  accent,
}) => {
  // Overlay appears after dots settle (delay ~4s into scene)
  const panelDelay = Math.round(fps * 4);
  const panelIn = clampSpring(spring({
    fps,
    frame: Math.max(0, frame - panelDelay),
    config: { damping: 18, stiffness: 70 },
  }));

  // Left side numbers
  const leftDivDelay = Math.round(fps * 5.5);
  const leftDivIn = clampSpring(spring({
    fps,
    frame: Math.max(0, frame - leftDivDelay),
    config: { damping: 14, stiffness: 50 },
  }));

  // Right side numbers
  const rightDivDelay = Math.round(fps * 7);
  const rightDivIn = clampSpring(spring({
    fps,
    frame: Math.max(0, frame - rightDivDelay),
    config: { damping: 14, stiffness: 50 },
  }));

  // Operator reveal
  const opDelay = Math.round(fps * 8.5);
  const opIn = clampSpring(spring({
    fps,
    frame: Math.max(0, frame - opDelay),
    config: { damping: 12, stiffness: 60 },
  }));

  // Conclusion text
  const conDelay = Math.round(fps * 10);
  const conIn = clampSpring(spring({
    fps,
    frame: Math.max(0, frame - conDelay),
    config: { damping: 18, stiffness: 80 },
  }));

  const PANEL_W = 640;
  const PANEL_H = 280;
  const CARD_BG = "rgba(26, 27, 34, 0.92)";

  return (
    <div
      style={{
        position: "absolute",
        bottom: 60,
        left: (CANVAS_W - PANEL_W) / 2,
        width: PANEL_W,
        opacity: panelIn,
        transform: `translateY(${interpolate(panelIn, [0, 1], [30, 0])}px)`,
        zIndex: 50,
        pointerEvents: "none" as const,
      }}
    >
      <div
        style={{
          backgroundColor: CARD_BG,
          borderRadius: 14,
          padding: "24px 32px",
          border: `1px solid rgba(234, 224, 213, 0.1)`,
          backdropFilter: "blur(12px)",
          display: "flex",
          flexDirection: "column" as const,
          alignItems: "center",
          gap: 14,
          fontFamily,
        }}
      >
        {/* Two-column comparison */}
        <div style={{ display: "flex", alignItems: "center", gap: 28, width: "100%" }}>
          {/* Left country */}
          <div style={{ flex: 1, textAlign: "center" as const }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
              <span style={{
                fontSize: 12, fontWeight: 700, color: "#1A1B22",
                backgroundColor: "rgba(234, 224, 213, 0.85)",
                borderRadius: 3, padding: "2px 6px", letterSpacing: 1,
              }}>
                {overlay.left.code || overlay.left.label?.slice(0, 3).toUpperCase()}
              </span>
              <span style={{ color: TEXT, fontSize: 16, fontWeight: 600 }}>
                {overlay.left.label}
              </span>
            </div>
            <DivisionFormula
              side={overlay.left}
              progress={leftDivIn}
            />
          </div>

          {/* Operator */}
          <div style={{
            opacity: opIn,
            transform: `scale(${interpolate(opIn, [0, 0.5, 1], [0.3, 1.2, 1])})`,
          }}>
            <span style={{ color: accent, fontSize: 36, fontWeight: 700 }}>
              {overlay.right.result > overlay.left.result ? "<" : overlay.operator}
            </span>
          </div>

          {/* Right country */}
          <div style={{ flex: 1, textAlign: "center" as const }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
              <span style={{
                fontSize: 12, fontWeight: 700, color: "#1A1B22",
                backgroundColor: "rgba(234, 224, 213, 0.85)",
                borderRadius: 3, padding: "2px 6px", letterSpacing: 1,
              }}>
                {overlay.right.code || overlay.right.label?.slice(0, 3).toUpperCase()}
              </span>
              <span style={{ color: TEXT, fontSize: 16, fontWeight: 600 }}>
                {overlay.right.label}
              </span>
            </div>
            <DivisionFormula
              side={overlay.right}
              progress={rightDivIn}
            />
          </div>
        </div>

        {/* Conclusion */}
        <div style={{
          opacity: conIn,
          transform: `translateY(${interpolate(conIn, [0, 1], [10, 0])}px)`,
          textAlign: "center" as const,
          marginTop: 4,
        }}>
          <span style={{
            color: TEXT,
            fontSize: 15,
            fontWeight: 600,
            fontStyle: "italic" as const,
          }}>
            {overlay.conclusion}
          </span>
        </div>
      </div>
    </div>
  );
};

// ─── Division Formula (shows annual salary ÷ hours = $/hr) ─────

type DivisionSide = DivisionOverlayConfig["left"];

const DivisionFormula: React.FC<{ side: DivisionSide; progress: number }> = ({ side, progress }) => {
  // Compute hourly wage: annual PPP salary / hours worked
  const hourlyWage = side.hours ? side.wage / side.hours : side.result;
  const formulaLabel = side.hours
    ? `$${side.wage.toLocaleString()} ÷ ${side.hours.toLocaleString()} hrs`
    : `$${side.wage.toLocaleString()} PPP`;

  return (
    <div style={{ opacity: progress }}>
      <div style={{
        color: MUTED, fontSize: 11, letterSpacing: 1,
        textTransform: "uppercase" as const, marginBottom: 2,
        fontFamily: "JetBrains Mono, monospace",
      }}>
        {formulaLabel}
      </div>
      <div style={{
        color: side.resultColor,
        fontSize: 36, fontWeight: 800,
        fontFamily: "JetBrains Mono, monospace",
        transform: `scale(${interpolate(progress, [0, 0.7, 1], [0.5, 1.05, 1])})`,
      }}>
        ${hourlyWage.toFixed(2)}
      </div>
      <div style={{ color: MUTED, fontSize: 10, letterSpacing: 1 }}>$/hr</div>
    </div>
  );
};
