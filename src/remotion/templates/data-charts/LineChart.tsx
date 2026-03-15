import React from "react";
import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { DataChartInput } from "../../schemas";

interface LineChartProps {
  chart: DataChartInput;
  brandColor: string;
  fontFamily: string;
}

/**
 * Animated line chart.
 * Line draws progressively from left to right with spring physics.
 * Points appear with staggered animation.
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

  // Line drawing progress
  const drawProgress = spring({
    fps,
    frame,
    config: { damping: 30, stiffness: 30 },
  });

  const chartWidth = 700;
  const chartHeight = 350;
  const padding = { top: 30, right: 40, bottom: 50, left: 60 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  // Calculate points
  const points = items.map((item, i) => ({
    x: padding.left + (i / (items.length - 1)) * plotWidth,
    y: padding.top + plotHeight - ((item.value - minValue) / range) * plotHeight,
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

  const lineColor = chart.colors?.[0] || brandColor;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRadius: 20,
        border: "1px solid rgba(255,255,255,0.08)",
        padding: 40,
      }}
    >
      {chart.title && (
        <h2
          style={{
            color: "#FFFFFF",
            fontSize: 32,
            fontFamily,
            fontWeight: 700,
            marginBottom: 20,
          }}
        >
          {chart.title}
        </h2>
      )}

      <svg width={chartWidth} height={chartHeight}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = padding.top + plotHeight * (1 - frac);
          const val = minValue + range * frac;
          return (
            <g key={frac}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + plotWidth}
                y2={y}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth={1}
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                fill="rgba(255,255,255,0.5)"
                fontSize={14}
                fontFamily={fontFamily}
                textAnchor="end"
              >
                {Math.round(val).toLocaleString()}
              </text>
            </g>
          );
        })}

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

        {/* Area fill (subtle gradient) */}
        <path
          d={`${linePath} L ${points[points.length - 1].x} ${padding.top + plotHeight} L ${points[0].x} ${padding.top + plotHeight} Z`}
          fill={`${lineColor}15`}
          opacity={drawProgress}
        />

        {/* Data points */}
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
                stroke="#FFFFFF"
                strokeWidth={2}
              />
              {/* Label below x-axis */}
              <text
                x={p.x}
                y={padding.top + plotHeight + 25}
                fill="rgba(255,255,255,0.7)"
                fontSize={13}
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
