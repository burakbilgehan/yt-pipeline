import React, { useMemo } from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";
import type {
  HorseRaceChartProps,
  HorseRaceAnnotation,
  HorseRaceSeries,
  SceneYearRange,
  ShrinkflationMarker,
} from "../../types";
import {
  TEXT,
  GRID,
  TRACK,
  CARD_BG,
  ACCENT_PINK,
  ACCENT_BLUE,
  SURFACE_BORDER_STRONG,
  TEXT_SECONDARY,
  NEGATIVE,
} from "../../palette";

// ─── Constants ────────────────────────────────────────────────

const CHART_PADDING = { top: 60, right: 240, bottom: 70, left: 90 };
const LABEL_FONT_SIZE = 20;
const LABEL_VALUE_FONT_SIZE = 20;
const LABEL_LINE_HEIGHT = 44; // spacing between stacked labels
const LABEL_MAX_WIDTH = 220; // max label text width before truncation
const WINDOW_YEARS = 18; // how many years visible in the sliding window

// ─── Rewind animation ────────────────────────────────────────
// When a scene jumps backward in time (e.g. 2015→2011), we "steal"
// the first REWIND_DURATION_SEC seconds of the new range to animate
// the year counter smoothly backward (VHS-style rewind).
const REWIND_DURATION_SEC = 3.0;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Extra years to look ahead beyond the visible window for stable Y-range
const Y_RANGE_LOOKAHEAD_TOTAL = 3;
// Padding factor added to Y-range to reduce frequency of range changes
const Y_RANGE_PADDING = 0.05;

// ─── Notification Stack Constants ─────────────────────────────
const TAG_MAX_VISIBLE = 5;
const TAG_GAP = 14;
const TAG_ESTIMATED_HEIGHT = 65; // estimated height of one tag (padding + text)
const TAG_STACK_TOP = 60;
const TAG_PUSH_ANIM_YEARS = 0.15; // years over which push-down animates
const TAG_VISIBLE_SEC = 4.0; // seconds an annotation stays fully visible
const TAG_FADE_OUT_SEC = 0.5; // seconds for the fade-out animation
const TAG_WIDTH = 480; // fixed width for the notification stack

// ─── Annotation style → text color mapping ───────────────────

function getAnnotationTextColor(
  style: HorseRaceAnnotation["style"]
): string {
  switch (style) {
    case "event-flash":
    case "crisis-flash":
      return ACCENT_BLUE;
    case "major-crisis-flash":
      return NEGATIVE;
    case "milestone-flash":
      return TEXT;
    // shrinkflation-callout, leader-callout, policy-banner, crossing-alert
    default:
      return ACCENT_PINK;
  }
}

// ─── Theme-aware color helper ─────────────────────────────────

function isDarkBackground(color: string): boolean {
  if (color === "transparent" || color === "") return false;
  // Parse hex and check relative luminance
  if (color.startsWith("#") && color.length >= 7) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    // Perceived brightness (0-255)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
  }
  if (color.startsWith("#0") || color.startsWith("#1") || color.startsWith("#2") || color.startsWith("#3")) return true;
  return false;
}

// ─── Date / year utilities ───────────────────────────────────

function dateToYear(dateStr: string): number {
  const parts = dateStr.split("-");
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2] || "1", 10);
  return y + (m * 30 + d) / 365;
}

/**
 * Pre-computed series data point with numeric year for O(1) access.
 * Avoids repeated string→number parsing every frame.
 */
interface PrecomputedDataPoint {
  year: number;
  ratio: number;
}

/**
 * Pre-compute year values for a data array (called once via useMemo).
 */
function precomputeYears(data: { date: string; ratio: number }[]): PrecomputedDataPoint[] {
  return data.map((dp) => ({ year: dateToYear(dp.date), ratio: dp.ratio }));
}

/**
 * Binary search + interpolation on pre-computed data (no string parsing).
 */
function getValueAtYear(
  precomputed: PrecomputedDataPoint[],
  year: number
): number | null {
  if (precomputed.length === 0) return null;

  if (year < precomputed[0].year) return null;
  if (year >= precomputed[precomputed.length - 1].year) return precomputed[precomputed.length - 1].ratio;

  // Binary search
  let lo = 0;
  let hi = precomputed.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1; // faster than Math.floor
    if (precomputed[mid].year < year) lo = mid + 1;
    else hi = mid;
  }

  if (lo > 0) {
    const prev = precomputed[lo - 1];
    const next = precomputed[lo];
    const t = (year - prev.year) / (next.year - prev.year || 1);
    return prev.ratio + (next.ratio - prev.ratio) * t;
  }
  return precomputed[0].ratio;
}

// Legacy wrapper for non-precomputed usage
function getSeriesValueAtYear(
  series: HorseRaceSeries,
  year: number
): number | null {
  const data = series.data;
  if (data.length === 0) return null;

  const firstYear = dateToYear(data[0].date);
  if (year < firstYear) return null;

  const lastYear = dateToYear(data[data.length - 1].date);
  if (year >= lastYear) return data[data.length - 1].ratio;

  // Binary search for closest point
  let lo = 0;
  let hi = data.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (dateToYear(data[mid].date) < year) lo = mid + 1;
    else hi = mid;
  }

  // Interpolate between lo-1 and lo for smooth values
  if (lo > 0) {
    const prevYear = dateToYear(data[lo - 1].date);
    const nextYear = dateToYear(data[lo].date);
    const t = (year - prevYear) / (nextYear - prevYear || 1);
    return data[lo - 1].ratio + (data[lo].ratio - data[lo - 1].ratio) * t;
  }
  return data[0].ratio;
}

// ─── Subsample data for performance ──────────────────────────

function subsampleData(
  data: { date: string; ratio: number }[],
  maxPoints: number
): { date: string; ratio: number }[] {
  if (data.length <= maxPoints) return data;
  const step = data.length / maxPoints;
  const result: { date: string; ratio: number }[] = [];
  for (let i = 0; i < maxPoints; i++) {
    result.push(data[Math.floor(i * step)]);
  }
  if (result[result.length - 1] !== data[data.length - 1]) {
    result.push(data[data.length - 1]);
  }
  return result;
}

// ─── Y-Axis tick generation (log-aware) ──────────────────────

function generateYTicks(
  minVal: number,
  maxVal: number,
  isLog: boolean
): number[] {
  if (isLog && minVal > 0 && maxVal > 0) {
    const logMin = Math.floor(Math.log10(minVal));
    const logMax = Math.ceil(Math.log10(maxVal));
    const ticks: number[] = [];
    for (let p = logMin; p <= logMax; p++) {
      const v = Math.pow(10, p);
      if (v >= minVal * 0.5 && v <= maxVal * 2) {
        ticks.push(v);
      }
    }
    return ticks.length > 0 ? ticks : [minVal, maxVal];
  }

  const range = maxVal - minVal;
  if (range <= 0) return [0];
  const rawStep = range / 6;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;
  let niceStep: number;
  if (normalized <= 1) niceStep = magnitude;
  else if (normalized <= 2) niceStep = 2 * magnitude;
  else if (normalized <= 5) niceStep = 5 * magnitude;
  else niceStep = 10 * magnitude;

  const ticks: number[] = [];
  const start = Math.floor(minVal / niceStep) * niceStep;
  for (let v = start; v <= maxVal + niceStep * 0.5; v += niceStep) {
    if (v >= minVal - niceStep * 0.5) ticks.push(v);
  }
  return ticks;
}

// ─── Catmull-Rom spline for smooth lines ─────────────────────

function catmullRomPath(
  points: { x: number; y: number }[],
  tension: number = 0.5
): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)} L ${points[1].x.toFixed(2)} ${points[1].y.toFixed(2)}`;
  }

  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + ((p2.x - p0.x) * tension) / 3;
    const cp1y = p1.y + ((p2.y - p0.y) * tension) / 3;
    const cp2x = p2.x - ((p3.x - p1.x) * tension) / 3;
    const cp2y = p2.y - ((p3.y - p1.y) * tension) / 3;

    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }

  return d;
}

// ─── Label anti-collision (vertical push) ────────────────────

interface LabelEntry {
  id: string;
  label: string;
  color: string;
  value: number;
  idealY: number;
  finalY: number;
}

function resolveLabels(
  entries: LabelEntry[],
  minY: number,
  maxY: number,
  lineHeight: number
): LabelEntry[] {
  if (entries.length === 0) return [];

  const sorted = [...entries].sort((a, b) => a.idealY - b.idealY);
  const count = sorted.length;
  const totalNeeded = count * lineHeight;
  const availableSpace = maxY - minY;

  // If labels need more space than available, shrink spacing
  const effectiveHeight =
    totalNeeded > availableSpace ? availableSpace / count : lineHeight;

  // Pass 1: Push down from top — keep labels from overlapping
  for (let i = 1; i < count; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (curr.finalY - prev.finalY < effectiveHeight) {
      curr.finalY = prev.finalY + effectiveHeight;
    }
  }

  // Pass 2: If overflow bottom, shift all up
  const lastLabel = sorted[count - 1];
  if (lastLabel.finalY > maxY) {
    const overflow = lastLabel.finalY - maxY;
    for (const l of sorted) {
      l.finalY -= overflow;
    }
  }

  // Pass 3: Clamp top and re-push
  for (let i = 0; i < count; i++) {
    if (sorted[i].finalY < minY) {
      sorted[i].finalY = minY + i * effectiveHeight;
    }
    if (i > 0 && sorted[i].finalY - sorted[i - 1].finalY < effectiveHeight) {
      sorted[i].finalY = sorted[i - 1].finalY + effectiveHeight;
    }
  }

  // Pass 4: Center-pull — nudge block toward centroid of ideal positions
  const centroidY = sorted.reduce((sum, l) => sum + l.idealY, 0) / count;
  const currentCentroid =
    sorted.reduce((sum, l) => sum + l.finalY, 0) / count;
  const drift = centroidY - currentCentroid;
  const firstAfterDrift = sorted[0].finalY + drift;
  const lastAfterDrift = sorted[count - 1].finalY + drift;
  if (firstAfterDrift >= minY && lastAfterDrift <= maxY) {
    for (const l of sorted) {
      l.finalY += drift;
    }
  } else {
    const maxUp = sorted[0].finalY - minY;
    const maxDown = maxY - sorted[count - 1].finalY;
    const clampedDrift =
      drift > 0 ? Math.min(drift, maxDown) : Math.max(drift, -maxUp);
    for (const l of sorted) {
      l.finalY += clampedDrift;
    }
  }

  return sorted;
}

// ─── Format ratio value ─────────────────────────────────────

function formatRatio(v: number): string {
  if (v < 0.01) return v.toFixed(4);
  if (v < 1) return v.toFixed(3);
  if (v < 100) return v.toFixed(2);
  return v.toFixed(2);
}

function formatTickLabel(tick: number): string {
  if (tick < 0.01) return tick.toFixed(3);
  if (tick < 1) return tick.toFixed(2);
  if (tick < 10) return tick.toFixed(2);
  return Math.round(tick).toLocaleString();
}

// ─── Scene-based year mapping (voiceover sync) ──────────────

function getYearFromFrame(
  frame: number,
  fps: number,
  sceneYearRanges: SceneYearRange[],
  _chartStartSec: number, // kept for API compat, not used
  fallbackTimeRange: { start: number; end: number },
  totalFrames: number
): number {
  // frame is relative to the chart Sequence start (frame 0 = chart Sequence begins).
  // sceneYearRanges use sceneStartSec/sceneEndSec also relative to chart Sequence start.
  const currentSec = frame / fps;

  // Pre-scan: detect which ranges have a backward jump from the previous range.
  // For each such range, the first REWIND_DURATION_SEC seconds are the rewind zone.
  for (let i = 0; i < sceneYearRanges.length; i++) {
    const range = sceneYearRanges[i];

    // Check if this range has a backward jump from the previous range
    const prevRange = i > 0 ? sceneYearRanges[i - 1] : null;
    const isRewind =
      prevRange !== null && range.yearStart < prevRange.yearEnd;

    if (isRewind && prevRange !== null) {
      // Steal the first REWIND_DURATION_SEC of this range for the rewind animation.
      // Clamp rewind duration to at most the full range duration so short ranges work.
      const rangeDuration = range.sceneEndSec - range.sceneStartSec;
      const rewindDur = Math.min(REWIND_DURATION_SEC, rangeDuration * 0.5);
      const rewindEndSec = range.sceneStartSec + rewindDur;

      if (currentSec >= range.sceneStartSec && currentSec < rewindEndSec) {
        // ── REWIND ZONE: animate from prevRange.yearEnd → range.yearStart ──
        const rewindProgress =
          (currentSec - range.sceneStartSec) / (rewindDur || 0.001);
        const easedProgress = easeInOutCubic(
          Math.min(1, Math.max(0, rewindProgress))
        );
        // Interpolate backward: prevRange.yearEnd → range.yearStart
        return (
          prevRange.yearEnd +
          easedProgress * (range.yearStart - prevRange.yearEnd)
        );
      }

      if (currentSec >= rewindEndSec && currentSec <= range.sceneEndSec) {
        // ── POST-REWIND: normal forward interpolation over remaining time ──
        const remainingDuration = range.sceneEndSec - rewindEndSec;
        const t =
          (currentSec - rewindEndSec) / (remainingDuration || 1);
        return range.yearStart + t * (range.yearEnd - range.yearStart);
      }
    } else {
      // No rewind — standard forward interpolation
      if (currentSec >= range.sceneStartSec && currentSec <= range.sceneEndSec) {
        const t =
          (currentSec - range.sceneStartSec) /
          (range.sceneEndSec - range.sceneStartSec || 1);
        return range.yearStart + t * (range.yearEnd - range.yearStart);
      }
    }
  }

  // If past all scenes (e.g., chart hold), return last year
  if (sceneYearRanges.length > 0) {
    const lastRange = sceneYearRanges[sceneYearRanges.length - 1];
    if (currentSec > lastRange.sceneEndSec) return lastRange.yearEnd;
    if (currentSec < sceneYearRanges[0].sceneStartSec)
      return sceneYearRanges[0].yearStart;
  }

  // Fallback: linear mapping
  const totalYears = fallbackTimeRange.end - fallbackTimeRange.start;
  return fallbackTimeRange.start + (frame / totalFrames) * totalYears;
}

/**
 * Inverse of getYearFromFrame: given a target year, return the frame at which
 * that year is first reached. Uses binary search over the frame range for accuracy.
 * Ignores rewind zones (returns the first forward-pass frame that reaches the year).
 */
function getFrameFromYear(
  targetYear: number,
  fps: number,
  sceneYearRanges: SceneYearRange[] | undefined,
  chartStartSec: number,
  fallbackTimeRange: { start: number; end: number },
  totalFrames: number
): number {
  if (sceneYearRanges && sceneYearRanges.length > 0) {
    // Find the scene range where targetYear falls (forward direction)
    for (const range of sceneYearRanges) {
      if (range.yearEnd < range.yearStart) continue; // skip rewind ranges
      if (targetYear >= range.yearStart && targetYear <= range.yearEnd) {
        const yearSpan = range.yearEnd - range.yearStart;
        const t = yearSpan > 0 ? (targetYear - range.yearStart) / yearSpan : 0;
        const sec = range.sceneStartSec + t * (range.sceneEndSec - range.sceneStartSec);
        return Math.round(sec * fps);
      }
    }
    // If year is before all ranges, return first frame
    if (targetYear <= sceneYearRanges[0].yearStart) return 0;
    // If year is after all ranges, return last frame
    const last = sceneYearRanges[sceneYearRanges.length - 1];
    return Math.round(last.sceneEndSec * fps);
  }

  // Fallback: linear mapping (inverse of getYearFromFrame fallback)
  const totalYears = fallbackTimeRange.end - fallbackTimeRange.start;
  if (totalYears <= 0) return 0;
  const t = (targetYear - fallbackTimeRange.start) / totalYears;
  return Math.round(t * totalFrames);
}

// ─── Main Component ──────────────────────────────────────────

export const HorseRaceChart: React.FC<HorseRaceChartProps> = ({
  series,
  cameraKeyframes: _cameraKeyframes, // no longer used for zoom/3D
  annotations,
  timeRange,
  sceneYearRanges,
  shrinkflationMarkers,
  backgroundColor,
  brandColor: _brandColor,
  fontFamily,
  logScale: logScaleProp,
  yAxisLabel,
  deflatorLabel,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  const useLogScale = logScaleProp !== false;

  // ── Theme colors — dark-cozy ──
  const gridColor = GRID;
  const tickLabelColor = TEXT;
  const yearBgColor = TRACK;
  const nowLineColor = "rgba(240,237,232,0.35)"; // derived from TEXT
  const yAxisLabelColor = TEXT;
  const yearDisplayColor = TEXT;
  const labelBgColor = "rgba(0,0,0,0.6)";

  // ── Process series data — pre-compute year values once ──
  const processedSeries = useMemo(() => {
    return series.map((s) => {
      const sampled = subsampleData(s.data, 2000);
      return {
        ...s,
        data: sampled,
        // Pre-compute numeric years to avoid string parsing every frame
        precomputed: precomputeYears(sampled),
      };
    });
  }, [series]);

  // ── Determine the chart start second (first scene start) ──
  const chartStartSec = useMemo(() => {
    if (sceneYearRanges && sceneYearRanges.length > 0) {
      return sceneYearRanges[0].sceneStartSec;
    }
    return 0;
  }, [sceneYearRanges]);

  // ── Current year — scene-based linear interpolation ──
  const currentYear = useMemo(() => {
    if (sceneYearRanges && sceneYearRanges.length > 0) {
      return getYearFromFrame(
        frame,
        fps,
        sceneYearRanges,
        chartStartSec,
        timeRange,
        durationInFrames
      );
    }
    // Legacy: linear progression
    const totalYears = timeRange.end - timeRange.start;
    return timeRange.start + (frame / durationInFrames) * totalYears;
  }, [frame, fps, sceneYearRanges, chartStartSec, timeRange, durationInFrames]);

  // ── Sliding window X-axis (fixed width, slides right) ──
  const xWindowEnd = currentYear;
  const xWindowStart = Math.max(timeRange.start, currentYear - WINDOW_YEARS);
  const xRange = xWindowEnd - xWindowStart || 1;

  // ── Chart dimensions ──
  const plotWidth = width - CHART_PADDING.left - CHART_PADDING.right;
  const plotHeight = height - CHART_PADDING.top - CHART_PADDING.bottom;

  // ── Current values for all series (uses pre-computed years) ──
  const currentValues = useMemo(() => {
    return processedSeries.map((s) => ({
      id: s.id,
      label: s.label,
      color: s.color,
      value: getValueAtYear(s.precomputed, currentYear),
    }));
  }, [processedSeries, currentYear]);

  // ── Determine Y range (frame-deterministic: wide look-ahead window) ──
  //
  // Strategy (renderMedia-safe — no useRef):
  //   1. Scan visible window + generous look-ahead to find min/max values.
  //   2. Apply padding so minor data changes don't trigger range shifts.
  //   3. Purely functional: same frame → same output, regardless of render order.
  //
  const LOOK_AHEAD_YEARS = 5;
  const LOOK_BACK_EXTRA = 3;

  const yRange = useMemo(() => {
    let minV = Infinity;
    let maxV = -Infinity;
    const lookBackStart = xWindowStart - LOOK_BACK_EXTRA;
    // Look ahead further than the visible window for early awareness of upcoming data
    const lookAheadEnd = currentYear + LOOK_AHEAD_YEARS + Y_RANGE_LOOKAHEAD_TOTAL;
    let hasValues = false;

    for (const s of processedSeries) {
      const pc = s.precomputed;
      // Binary search to find first point in window
      let lo = 0;
      let hi = pc.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (pc[mid].year < lookBackStart) lo = mid + 1;
        else hi = mid;
      }
      for (let i = lo; i < pc.length; i++) {
        if (pc[i].year > lookAheadEnd) break;
        const ratio = pc[i].ratio;
        if (ratio < minV) minV = ratio;
        if (ratio > maxV) maxV = ratio;
        hasValues = true;
      }
    }

    if (!hasValues) return { min: 0.01, max: 10 };

    if (useLogScale) {
      minV = Math.max(0.005, minV);
      maxV = Math.max(minV * 2, maxV);
      const logMin = Math.log10(minV);
      const logMax = Math.log10(maxV);
      const logRange = logMax - logMin || 1;
      // 20% base padding + extra stability padding
      const totalPad = 0.20 + Y_RANGE_PADDING;
      minV = Math.pow(10, logMin - logRange * totalPad);
      maxV = Math.pow(10, logMax + logRange * totalPad);
    } else {
      const range = maxV - minV || 1;
      // 15%/20% base padding + extra stability padding
      minV = Math.max(0, minV - range * (0.15 + Y_RANGE_PADDING));
      maxV = maxV + range * (0.20 + Y_RANGE_PADDING);
    }

    return { min: minV, max: maxV };
  }, [processedSeries, currentYear, xWindowStart, useLogScale]);

  // ── Coordinate mapping ──
  const valueToY = (v: number): number => {
    if (useLogScale && v > 0 && yRange.min > 0) {
      const logMin = Math.log10(yRange.min);
      const logMax = Math.log10(yRange.max);
      const logV = Math.log10(Math.max(v, 0.0001));
      return (
        CHART_PADDING.top +
        plotHeight -
        ((logV - logMin) / (logMax - logMin)) * plotHeight
      );
    }
    return (
      CHART_PADDING.top +
      plotHeight -
      ((v - yRange.min) / (yRange.max - yRange.min)) * plotHeight
    );
  };

  const yearToX = (year: number): number => {
    return CHART_PADDING.left + ((year - xWindowStart) / xRange) * plotWidth;
  };

  // ── Y-axis ticks ──
  const yTicks = useMemo(
    () => generateYTicks(yRange.min, yRange.max, useLogScale),
    [yRange, useLogScale]
  );

  // ── X-axis labels ──
  const xYearLabels = useMemo(() => {
    const labels: number[] = [];
    const spanYears = xWindowEnd - xWindowStart;
    let step = 10;
    if (spanYears < 10) step = 2;
    else if (spanYears < 25) step = 5;
    else if (spanYears > 60) step = 10;

    const startYear = Math.ceil(xWindowStart / step) * step;
    for (let y = startYear; y <= xWindowEnd; y += step) {
      labels.push(y);
    }
    return labels;
  }, [xWindowStart, xWindowEnd]);

  // ── Build smooth SVG paths (uses pre-computed years — no string parsing per frame) ──
  const seriesPaths = useMemo(() => {
    return processedSeries.map((s) => {
      const pc = s.precomputed;
      const points: { x: number; y: number }[] = [];
      let addedTip = false;

      for (let i = 0; i < pc.length; i++) {
        const dpYear = pc[i].year;

        // If this data point is beyond currentYear, add interpolated tip and stop
        if (dpYear > currentYear) {
          if (!addedTip && i > 0) {
            const tipValue = getValueAtYear(pc, currentYear);
            if (tipValue !== null) {
              const tipX = yearToX(currentYear);
              const tipY = valueToY(tipValue);
              points.push({ x: tipX, y: tipY });
              addedTip = true;
            }
          }
          break;
        }

        // Include points slightly before visible window for smooth spline entry
        if (dpYear < xWindowStart - 2) continue;
        const x = yearToX(dpYear);
        const y = valueToY(pc[i].ratio);
        points.push({ x, y });
      }

      // If we reached the end of data without adding tip (currentYear >= last data point)
      if (!addedTip && points.length > 0) {
        const tipValue = getValueAtYear(pc, currentYear);
        if (tipValue !== null) {
          const tipX = yearToX(currentYear);
          const tipY = valueToY(tipValue);
          const lastPoint = points[points.length - 1];
          // Only add if tip differs from last point position
          if (Math.abs(tipX - lastPoint.x) > 0.5 || Math.abs(tipY - lastPoint.y) > 0.5) {
            points.push({ x: tipX, y: tipY });
          }
        }
      }

      if (points.length < 2) return { id: s.id, path: "", visible: false };

      return {
        id: s.id,
        path: catmullRomPath(points, 0.4),
        visible: true,
      };
    });
  }, [processedSeries, currentYear, xWindowStart, yRange, xRange]);

  // ── Build floating labels at the right end of each visible line ──
  const resolvedLabels = useMemo(() => {
    const entries: LabelEntry[] = [];
    for (const cv of currentValues) {
      if (cv.value === null) continue;
      const idealY = valueToY(cv.value);
      entries.push({
        id: cv.id,
        label: cv.label,
        color: cv.color,
        value: cv.value,
        idealY,
        finalY: idealY,
      });
    }
    return resolveLabels(
      entries,
      CHART_PADDING.top + 10,
      height - CHART_PADDING.bottom - 10,
      LABEL_LINE_HEIGHT
    );
  }, [currentValues, yRange, height]);

  // ── Snapshot detection — disable annotations for static/frozen scenes ──
  // A snapshot is when all sceneYearRanges have yearStart === yearEnd (no animation).
  const isSnapshot = useMemo(() => {
    if (!sceneYearRanges || sceneYearRanges.length === 0) return false;
    return sceneYearRanges.every((r) => r.yearStart === r.yearEnd);
  }, [sceneYearRanges]);

  // ── Active annotations (notification stack — newest on top, max 5) ──
  // Uses frame-based timing: visible for TAG_VISIBLE_SEC, then fade over TAG_FADE_OUT_SEC.
  // Disabled in snapshot mode (static end-state scenes like 2025 summaries).
  const activeAnnotations = useMemo(() => {
    if (isSnapshot) return [];

    const totalLifetimeFrames = (TAG_VISIBLE_SEC + TAG_FADE_OUT_SEC) * fps;

    const active = annotations
      .filter((a) => {
        if (currentYear < a.year) return false;
        // Compute the frame at which this annotation first became active
        const entryFrame = getFrameFromYear(
          a.year, fps, sceneYearRanges, chartStartSec, timeRange, durationInFrames
        );
        const ageInFrames = frame - entryFrame;
        return ageInFrames >= 0 && ageInFrames <= totalLifetimeFrames;
      })
      // Newest first (highest year = most recently entered)
      .sort((a, b) => b.year - a.year);

    // Enforce max visible
    return active.slice(0, TAG_MAX_VISIBLE);
  }, [annotations, currentYear, frame, fps, isSnapshot, sceneYearRanges, chartStartSec, timeRange, durationInFrames]);

  // ── Entrance animation ──
  const entranceOpacity = interpolate(frame, [0, fps * 0.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  const displayYear = Math.floor(currentYear);

  // ── Clip path ID ──
  const clipId = "chart-area-clip";

  // ── Dot position (current time = right edge of visible data) ──
  const dotX = yearToX(currentYear);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor,
        position: "relative",
        overflow: "hidden",
        fontFamily,
      }}
    >
      {/* Large year watermark in background */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontSize: 240,
          fontWeight: 900,
          color: yearBgColor,
          fontFamily,
          pointerEvents: "none",
          userSelect: "none",
          letterSpacing: -8,
        }}
      >
        {displayYear}
      </div>

      {/* Year counter + deflator label — top left, prominent */}
      <div
        style={{
          position: "absolute",
          top: 14,
          left: CHART_PADDING.left,
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          zIndex: 5,
        }}
      >
        <span
          style={{
            fontSize: 40,
            fontWeight: 800,
            color: yearDisplayColor,
            fontFamily,
            letterSpacing: 1,
          }}
        >
          {displayYear}
        </span>
        {deflatorLabel && (
          <span
            style={{
              fontSize: 20,
              fontWeight: 500,
              color: TEXT_SECONDARY,
              fontFamily,
              letterSpacing: 0.5,
            }}
          >
            — {deflatorLabel}
          </span>
        )}
      </div>

      {/* Y-axis label */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 8,
          transform: "rotate(-90deg) translateX(-50%)",
          transformOrigin: "0 0",
          fontSize: 20,
          color: yAxisLabelColor,
          fontFamily,
          whiteSpace: "nowrap",
          letterSpacing: 1,
          fontWeight: 500,
        }}
      >
        {yAxisLabel || "Ratio"} {useLogScale ? "(log scale)" : ""}
      </div>

      <svg width={width} height={height}>
        {/* Clip path for chart plotting area */}
        <defs>
          <clipPath id={clipId}>
            <rect
              x={CHART_PADDING.left}
              y={CHART_PADDING.top}
              width={plotWidth}
              height={plotHeight}
            />
          </clipPath>
        </defs>

        {/* Grid + axes */}
        <g opacity={entranceOpacity}>
          {/* Horizontal grid lines + Y labels */}
          {yTicks.map((tick) => {
            const y = valueToY(tick);
            if (
              y < CHART_PADDING.top - 5 ||
              y > height - CHART_PADDING.bottom + 5
            )
              return null;
            return (
              <g key={`grid-${tick}`}>
                <line
                  x1={CHART_PADDING.left}
                  y1={y}
                  x2={CHART_PADDING.left + plotWidth}
                  y2={y}
                  stroke={gridColor}
                  strokeWidth={1}
                />
                <text
                  x={CHART_PADDING.left - 14}
                  y={y + 5}
                  fill={tickLabelColor}
                  fontSize={20}
                  fontFamily={fontFamily}
                  textAnchor="end"
                  fontWeight={600}
                >
                  {formatTickLabel(tick)}
                </text>
              </g>
            );
          })}

          {/* Vertical grid lines + X year labels */}
          {xYearLabels.map((year) => {
            const x = yearToX(year);
            if (
              x < CHART_PADDING.left - 5 ||
              x > CHART_PADDING.left + plotWidth + 5
            )
              return null;
            return (
              <g key={`xlabel-${year}`}>
                <line
                  x1={x}
                  y1={CHART_PADDING.top}
                  x2={x}
                  y2={height - CHART_PADDING.bottom}
                  stroke={gridColor}
                  strokeWidth={1}
                />
                <text
                  x={x}
                  y={height - CHART_PADDING.bottom + 32}
                  fill={tickLabelColor}
                  fontSize={20}
                  fontFamily={fontFamily}
                  textAnchor="middle"
                  fontWeight={600}
                >
                  {year}
                </text>
              </g>
            );
          })}

          {/* Axes lines */}
          <line
            x1={CHART_PADDING.left}
            y1={CHART_PADDING.top}
            x2={CHART_PADDING.left}
            y2={height - CHART_PADDING.bottom}
            stroke="rgba(255,255,255,0.25)"
            strokeWidth={2}
          />
          <line
            x1={CHART_PADDING.left}
            y1={height - CHART_PADDING.bottom}
            x2={CHART_PADDING.left + plotWidth}
            y2={height - CHART_PADDING.bottom}
            stroke="rgba(255,255,255,0.25)"
            strokeWidth={2}
          />
        </g>

        {/* Series lines — clipped, smooth Catmull-Rom */}
        <g clipPath={`url(#${clipId})`} opacity={entranceOpacity}>
          {/* Shrinkflation event markers — vertical dashed lines with labels */}
          {(shrinkflationMarkers || []).map((marker, idx) => {
            if (marker.year < xWindowStart || marker.year > xWindowEnd) return null;
            if (marker.year > currentYear) return null;
            const mx = yearToX(marker.year);
            const markerColor = marker.color || "#FF9F43";
            // Fade in as the chart reaches this year
            const markerProgress = Math.min(1, (currentYear - marker.year) / 0.3);
            const markerOpacity = markerProgress < 0 ? 0 : markerProgress;
            return (
              <g key={`shrink-marker-${idx}`} opacity={markerOpacity}>
                <line
                  x1={mx}
                  y1={CHART_PADDING.top}
                  x2={mx}
                  y2={height - CHART_PADDING.bottom}
                  stroke={markerColor}
                  strokeWidth={2}
                  strokeDasharray="6,4"
                  opacity={0.7}
                />
                {/* Small triangle at top */}
                <polygon
                  points={`${mx},${CHART_PADDING.top - 2} ${mx - 6},${CHART_PADDING.top - 12} ${mx + 6},${CHART_PADDING.top - 12}`}
                  fill={markerColor}
                  opacity={0.85}
                />
                {/* Label — rotated 90° at top of the line */}
                <text
                  x={mx + 4}
                  y={CHART_PADDING.top + 18}
                  fill={markerColor}
                  fontSize={20}
                  fontFamily={fontFamily}
                  fontWeight={600}
                  transform={`rotate(90, ${mx + 4}, ${CHART_PADDING.top + 18})`}
                  opacity={0.85}
                >
                  {marker.label}
                </text>
              </g>
            );
          })}

          {seriesPaths.map((sp, i) => {
            if (!sp.visible || !sp.path) return null;
            const s = processedSeries[i];
            return (
              <path
                key={s.id}
                d={sp.path}
                fill="none"
                stroke={s.color}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.9}
              />
            );
          })}
        </g>

        {/* Current position dots at the drawing edge */}
        <g clipPath={`url(#${clipId})`} opacity={entranceOpacity}>
          {currentValues.map((cv) => {
            if (cv.value === null) return null;
            const y = valueToY(cv.value);
            return (
              <g key={`dot-${cv.id}`}>
                <circle cx={dotX} cy={y} r={5} fill={cv.color} opacity={0.9} />
                <circle
                  cx={dotX}
                  cy={y}
                  r={2.5}
                  fill="#fff"
                  opacity={0.95}
                />
              </g>
            );
          })}
        </g>

        {/* "Now" dashed vertical line */}
        <line
          x1={dotX}
          y1={CHART_PADDING.top}
          x2={dotX}
          y2={height - CHART_PADDING.bottom}
          stroke={nowLineColor}
          strokeWidth={1}
          strokeDasharray="4,4"
          opacity={entranceOpacity * 0.6}
        />
      </svg>

      {/* ═══ Floating labels — positioned at each line's Y, near the right edge ═══ */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        {resolvedLabels.map((lbl) => {
          // Position label near the right edge of the plot, floating on the line
          const labelLeft = CHART_PADDING.left + plotWidth + 8;
          
          return (
            <div
              key={`label-${lbl.id}`}
              style={{
                position: "absolute",
                left: labelLeft,
                top: lbl.finalY - LABEL_FONT_SIZE / 2 - 4,
                opacity: entranceOpacity,
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
            >
              {/* Connector line from line endpoint to label */}
              <div
                style={{
                  position: "absolute",
                  left: -8,
                  top: LABEL_FONT_SIZE / 2 + 2,
                  width: 8,
                  height: 0,
                  borderTop: `2px solid ${lbl.color}`,
                  opacity: 0.4,
                }}
              />

              {/* Asset name */}
              <div
                style={{
                  fontSize: LABEL_FONT_SIZE,
                  fontWeight: 700,
                  color: lbl.color,
                  fontFamily,
                  lineHeight: 1.1,
                  backgroundColor: labelBgColor,
                  padding: "1px 4px",
                  borderRadius: 3,
                  whiteSpace: "nowrap",
                  maxWidth: LABEL_MAX_WIDTH,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {lbl.label}
              </div>

              {/* Current ratio value */}
              <div
                style={{
                  fontSize: LABEL_VALUE_FONT_SIZE,
                  fontWeight: 500,
                  color: "rgba(240,237,232,0.65)",
                  fontFamily,
                  lineHeight: 1.1,
                  padding: "0 4px",
                }}
              >
                {formatRatio(lbl.value)}
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══ macOS-style notification stack — center-top ═══ */}
      <div
        style={{
          position: "absolute",
          top: TAG_STACK_TOP,
          left: "50%",
          transform: "translateX(-50%)",
          width: TAG_WIDTH,
          pointerEvents: "none",
          zIndex: 10,
        }}
      >
        {activeAnnotations.map((annotation, slotIndex) => {
          // ── Frame-based timing: 4s visible, 0.5s fade-out ──
          const entryFrame = getFrameFromYear(
            annotation.year, fps, sceneYearRanges, chartStartSec, timeRange, durationInFrames
          );
          const ageInSec = (frame - entryFrame) / fps;

          // Fade in over 0.3s, hold for TAG_VISIBLE_SEC, fade out over TAG_FADE_OUT_SEC
          const fadeInSec = 0.3;
          const fadeOpacity = interpolate(
            ageInSec,
            [0, fadeInSec, TAG_VISIBLE_SEC, TAG_VISIBLE_SEC + TAG_FADE_OUT_SEC],
            [0, 1, 1, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );

          // Slide down from above on entrance: -30px → 0 over 0.3s
          const slideY = interpolate(
            ageInSec,
            [0, fadeInSec],
            [-30, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.quad) }
          );

          // Smooth push-down: animate Y position when slotIndex changes
          // Each annotation knows how many newer tags are above it (slotIndex).
          // We animate from slot 0 to the target slot over TAG_PUSH_ANIM_YEARS
          // after the *newest* tag above it appeared.
          const targetY = slotIndex * (TAG_ESTIMATED_HEIGHT + TAG_GAP);

          // Find the newest annotation above this one (if any) to time the push
          const newestAbove = slotIndex > 0 ? activeAnnotations[0] : null;
          const pushStartYear = newestAbove ? newestAbove.year : annotation.year;
          const pushAge = currentYear - pushStartYear;
          const pushProgress = TAG_PUSH_ANIM_YEARS > 0
            ? Math.min(1, Math.max(0, pushAge / TAG_PUSH_ANIM_YEARS))
            : 1;
          // Ease-out for smooth deceleration
          const easedPush = 1 - Math.pow(1 - pushProgress, 3);
          // Previous slot = one slot up (or 0 for first push)
          const prevY = Math.max(0, (slotIndex - 1)) * (TAG_ESTIMATED_HEIGHT + TAG_GAP);
          const smoothY = prevY + (targetY - prevY) * easedPush;

          // Compute year as YYYY string from the annotation's year field
          const datePrefix = String(Math.floor(annotation.year));

          const textColor = getAnnotationTextColor(annotation.style);
          const isMajorCrisis = annotation.style === "major-crisis-flash";

          return (
            <div
              key={`ann-${annotation.year}-${annotation.text}`}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: TAG_WIDTH,
                transform: `translateY(${smoothY + slideY}px)`,
                opacity: fadeOpacity,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                backgroundColor: CARD_BG,
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                border: `1px solid ${isMajorCrisis ? NEGATIVE : SURFACE_BORDER_STRONG}`,
                borderRadius: 14,
                padding: "12px 24px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                boxSizing: "border-box",
              }}
            >
              {/* Icon (if present) */}
              {annotation.icon && (
                <span style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>
                  {annotation.icon === "crown"
                    ? "👑"
                    : annotation.icon === "skull"
                      ? "💀"
                      : "⚡"}
                </span>
              )}

              {/* Text block: date prefix + main text */}
              <div style={{ display: "flex", flexDirection: "column", gap: 2, overflow: "hidden", minWidth: 0 }}>
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 500,
                    color: TEXT_SECONDARY,
                    fontFamily,
                    lineHeight: 1.2,
                  }}
                >
                  {datePrefix}
                </span>
                <span
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: textColor,
                    fontFamily,
                    lineHeight: 1.3,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {annotation.text}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
