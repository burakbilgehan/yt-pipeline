import React from "react";
import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { DataChartInput } from "../../schemas";
import { TEXT } from "../../palette";

interface LineChartProps {
  chart: DataChartInput;
  brandColor: string;
  fontFamily: string;
}

/**
 * Format a numeric value for axis labels.
 * Over 1000 → "1.2K", over 1M → "1.2M", etc.
 * Prepends unit if it looks like a prefix (e.g. "$").
 */
function formatAxisValue(value: number, unit?: string): string {
  const isPrefix = unit && /^[^\w\s]/.test(unit); // "$", "€", "£" etc.
  const prefix = isPrefix ? unit : "";
  const suffix = unit && !isPrefix ? ` ${unit}` : "";

  let formatted: string;
  const abs = Math.abs(value);

  if (abs >= 1_000_000) {
    formatted = `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  } else if (abs >= 1_000) {
    formatted = `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  } else {
    formatted = Math.round(value).toLocaleString();
  }

  return `${prefix}${formatted}${suffix}`;
}

/**
 * Animated line chart — responsive, flat background, brand-colored.
 * Line draws progressively with spring physics. Points appear staggered.
 */
export const LineChart: React.FC<LineChartProps> = ({
  chart,
  brandColor,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const items = chart.items || [];
  if (items.length < 2) return null;

  const maxValue = Math.max(...items.map((item) => item.value));
  const minValue = Math.min(...items.map((item) => item.value));
  const range = maxValue - minValue || 1;

  // SVG dimensions
  const svgWidth = 1600;
  const svgHeight = 700;
  const padding = { top: 40, right: 60, bottom: 70, left: 80 };
  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  const lineColor = chart.colors?.[0] || brandColor;

  // --- Animations ---

  // Line draw progress
  const drawProgress = spring({
    fps,
    frame,
    config: { damping: 30, stiffness: 30 },
  });

  // Y-axis labels fade in
  const yLabelOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Calculate plot points
  const points = items.map((item, i) => ({
    x: padding.left + (i / (items.length - 1)) * plotWidth,
    y:
      padding.top +
      plotHeight -
      ((item.value - minValue) / range) * plotHeight,
    label: item.label,
    value: item.value,
  }));

  // Build SVG path
  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  // Calculate total path length for stroke-dasharray animation
  let totalLength = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    totalLength += Math.sqrt(dx * dx + dy * dy);
  }

  // Grid fractions: 0%, 25%, 50%, 75%, 100%
  const gridFractions = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 80,
        boxSizing: "border-box",
      }}
    >
      {chart.title && (
        <h2
          style={{
            color: TEXT,
            fontSize: 40,
            fontFamily,
            fontWeight: 600,
            marginTop: 0,
            marginBottom: 30,
            textAlign: "left",
          }}
        >
          {chart.title}
        </h2>
      )}

      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        width="100%"
        style={{ display: "block" }}
      >
        {/* Horizontal grid lines */}
        {gridFractions.map((frac) => {
          const y = padding.top + plotHeight * (1 - frac);
          const val = minValue + range * frac;
          return (
            <g key={frac}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + plotWidth}
                y2={y}
                stroke="rgba(240, 237, 232, 0.08)"
                strokeWidth={1}
              />
              <text
                x={padding.left - 14}
                y={y + 5}
                fill="rgba(240, 237, 232, 0.5)"
                fontSize={16}
                fontFamily={fontFamily}
                textAnchor="end"
                opacity={yLabelOpacity}
              >
                {formatAxisValue(val, chart.unit)}
              </text>
            </g>
          );
        })}

        {/* Area fill (very subtle) */}
        <path
          d={`${linePath} L ${points[points.length - 1].x} ${padding.top + plotHeight} L ${points[0].x} ${padding.top + plotHeight} Z`}
          fill={`${lineColor}15`}
          opacity={drawProgress}
        />

        {/* Animated line */}
        <path
          d={linePath}
          fill="none"
          stroke={lineColor}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={totalLength}
          strokeDashoffset={totalLength * (1 - drawProgress)}
        />

        {/* Data points + X-axis labels */}
        {points.map((p, i) => {
          const pointSpring = spring({
            fps,
            frame: frame - i * 4 - 15,
            config: { damping: 15, stiffness: 100 },
          });

          return (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r={6 * pointSpring}
                fill={lineColor}
                stroke={TEXT}
                strokeWidth={2}
              />
              <text
                x={p.x}
                y={padding.top + plotHeight + 30}
                fill="rgba(240, 237, 232, 0.6)"
                fontSize={16}
                fontFamily={fontFamily}
                textAnchor="middle"
                opacity={pointSpring}
              >
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
