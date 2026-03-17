import React, { useMemo } from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";
import type {
  HorseRaceChartProps,
  HorseRaceSeries,
  SceneYearRange,
} from "../../types";

// ─── Constants ────────────────────────────────────────────────

const CHART_PADDING = { top: 60, right: 180, bottom: 70, left: 90 };
const LABEL_FONT_SIZE = 20;
const LABEL_VALUE_FONT_SIZE = 15;
const LABEL_LINE_HEIGHT = 44; // spacing between stacked labels
const WINDOW_YEARS = 18; // how many years visible in the sliding window

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
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`;
  }

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + ((p2.x - p0.x) * tension) / 3;
    const cp1y = p1.y + ((p2.y - p0.y) * tension) / 3;
    const cp2x = p2.x - ((p3.x - p1.x) * tension) / 3;
    const cp2y = p2.y - ((p3.y - p1.y) * tension) / 3;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
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
  return v.toFixed(1);
}

function formatTickLabel(tick: number): string {
  if (tick < 0.01) return tick.toFixed(3);
  if (tick < 1) return tick.toFixed(2);
  if (tick < 10) return tick.toFixed(1);
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

  for (const range of sceneYearRanges) {
    if (currentSec >= range.sceneStartSec && currentSec <= range.sceneEndSec) {
      const t =
        (currentSec - range.sceneStartSec) /
        (range.sceneEndSec - range.sceneStartSec || 1);
      return range.yearStart + t * (range.yearEnd - range.yearStart);
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

// ─── Main Component ──────────────────────────────────────────

export const HorseRaceChart: React.FC<HorseRaceChartProps> = ({
  series,
  cameraKeyframes: _cameraKeyframes, // no longer used for zoom/3D
  annotations,
  timeRange,
  sceneYearRanges,
  backgroundColor,
  brandColor: _brandColor,
  fontFamily,
  logScale: logScaleProp,
  yAxisLabel,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  const useLogScale = logScaleProp !== false;

  // ── Theme colors — dark-cozy hardcoded ──
  const gridColor = "rgba(232,224,212,0.15)";
  const tickLabelColor = "#E8E0D4";
  const yearBgColor = "rgba(232,224,212,0.06)";
  const nowLineColor = "rgba(232,224,212,0.35)";
  const yAxisLabelColor = "#E8E0D4";
  const yearDisplayColor = "#E8E0D4";
  const labelBgColor = "rgba(0,0,0,0.6)";

  // ── Process series data ──
  const processedSeries = useMemo(() => {
    return series.map((s) => ({
      ...s,
      data: subsampleData(s.data, 3000),
    }));
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

  // ── Current values for all series ──
  const currentValues = useMemo(() => {
    return processedSeries.map((s) => ({
      id: s.id,
      label: s.label,
      color: s.color,
      value: getSeriesValueAtYear(s, currentYear),
    }));
  }, [processedSeries, currentYear]);

  // ── Determine Y range (auto-fit with look-ahead for smooth transitions) ──
  //
  // To prevent jarring Y-axis jumps, we:
  //   1. Include data up to LOOK_AHEAD years beyond currentYear in the range calc
  //   2. Apply generous padding so incoming values don't clip
  //   3. Use a "sliding max-envelope" — the Y range only expands eagerly but
  //      contracts slowly (hysteresis via wider lookback than visible window)
  //
  const LOOK_AHEAD_YEARS = 5;
  const LOOK_BACK_EXTRA = 3; // extra years behind visible window for slower contraction

  const yRange = useMemo(() => {
    const visibleVals: number[] = [];
    const lookBackStart = xWindowStart - LOOK_BACK_EXTRA;
    const lookAheadEnd = currentYear + LOOK_AHEAD_YEARS;

    for (const s of processedSeries) {
      for (const dp of s.data) {
        const dpYear = dateToYear(dp.date);
        if (dpYear > lookAheadEnd) break;
        if (dpYear >= lookBackStart) {
          visibleVals.push(dp.ratio);
        }
      }
    }

    if (visibleVals.length === 0) return { min: 0.01, max: 10 };

    let minV = Math.min(...visibleVals);
    let maxV = Math.max(...visibleVals);

    if (useLogScale) {
      minV = Math.max(0.005, minV);
      maxV = Math.max(minV * 2, maxV);
      const logMin = Math.log10(minV);
      const logMax = Math.log10(maxV);
      const logRange = logMax - logMin || 1;
      // Generous padding: 20% each side (was 12%)
      minV = Math.pow(10, logMin - logRange * 0.20);
      maxV = Math.pow(10, logMax + logRange * 0.20);
    } else {
      const range = maxV - minV || 1;
      minV = Math.max(0, minV - range * 0.15);
      maxV = maxV + range * 0.20;
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

  // ── Build smooth SVG paths (continuous — interpolated tip for smooth drawing) ──
  const seriesPaths = useMemo(() => {
    return processedSeries.map((s) => {
      const points: { x: number; y: number }[] = [];
      let addedTip = false;

      for (let i = 0; i < s.data.length; i++) {
        const dp = s.data[i];
        const dpYear = dateToYear(dp.date);

        // If this data point is beyond currentYear, add interpolated tip and stop
        if (dpYear > currentYear) {
          if (!addedTip && i > 0) {
            const tipValue = getSeriesValueAtYear(s, currentYear);
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
        const y = valueToY(dp.ratio);
        points.push({ x, y });
      }

      // If we reached the end of data without adding tip (currentYear >= last data point)
      if (!addedTip && points.length > 0) {
        const tipValue = getSeriesValueAtYear(s, currentYear);
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

  // ── Active annotations ──
  const activeAnnotations = useMemo(() => {
    return annotations.filter((a) => {
      const duration = a.duration ?? 1.5;
      return currentYear >= a.year && currentYear <= a.year + duration;
    });
  }, [annotations, currentYear]);

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
          left: "40%",
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

      {/* Year counter — top left, prominent */}
      <div
        style={{
          position: "absolute",
          top: 14,
          left: CHART_PADDING.left,
          fontSize: 40,
          fontWeight: 800,
          color: yearDisplayColor,
          fontFamily,
          letterSpacing: 1,
          zIndex: 5,
        }}
      >
        {displayYear}
      </div>

      {/* Y-axis label */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 8,
          transform: "rotate(-90deg) translateX(-50%)",
          transformOrigin: "0 0",
          fontSize: 16,
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
                }}
              >
                {lbl.label}
              </div>

              {/* Current ratio value */}
              <div
                style={{
                  fontSize: LABEL_VALUE_FONT_SIZE,
                  fontWeight: 500,
                  color: "rgba(232,224,212,0.65)",
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

      {/* ═══ Event annotations overlay ═══ */}
      {activeAnnotations.map((annotation, idx) => {
        const duration = annotation.duration ?? 1.5;
        const progress = (currentYear - annotation.year) / duration;
        const opacity = Math.min(
          progress < 0.15
            ? progress / 0.15
            : progress > 0.8
              ? (1 - progress) / 0.2
              : 1,
          1
        );

        const isMajor =
          annotation.style === "major-crisis-flash" ||
          annotation.style === "milestone-flash";

        const bannerBg = isMajor
          ? "rgba(255, 50, 50, 0.9)"
          : annotation.style === "policy-banner"
            ? "rgba(70, 70, 220, 0.85)"
            : "rgba(0, 0, 0, 0.85)";

        return (
          <div
            key={`ann-${idx}`}
            style={{
              position: "absolute",
              top: isMajor ? "28%" : "18%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              opacity,
              pointerEvents: "none",
              textAlign: "center",
              zIndex: 10,
            }}
          >
            {annotation.icon && (
              <div style={{ fontSize: isMajor ? 44 : 30, marginBottom: 6 }}>
                {annotation.icon === "crown"
                  ? "👑"
                  : annotation.icon === "skull"
                    ? "💀"
                    : "⚡"}
              </div>
            )}
            <div
              style={{
                backgroundColor: bannerBg,
                color: "#FFFFFF",
                fontSize: isMajor ? 30 : 22,
                fontWeight: 800,
                fontFamily,
                padding: isMajor ? "14px 32px" : "10px 22px",
                borderRadius: 10,
                border: isMajor
                  ? "2px solid rgba(255,255,255,0.5)"
                  : "1px solid rgba(255,255,255,0.25)",
                whiteSpace: "nowrap",
                textTransform: "uppercase",
                letterSpacing: isMajor ? 4 : 1.5,
              }}
            >
              {annotation.text}
            </div>
          </div>
        );
      })}
    </div>
  );
};
