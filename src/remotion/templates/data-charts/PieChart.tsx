import React from "react";
import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { DataChartInput } from "../../schemas";

interface PieChartProps {
  chart: DataChartInput;
  brandColor: string;
  fontFamily: string;
}

/**
 * Animated pie/donut chart.
 * Segments sweep in clockwise with staggered spring animation.
 */
export const PieChart: React.FC<PieChartProps> = ({
  chart,
  brandColor,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const items = chart.items || [];
  if (items.length === 0) return null;

  const total = items.reduce((sum, item) => sum + item.value, 0);
  const defaultColors = [
    "#6C63FF", "#FF6584", "#43E97B", "#F9D423",
    "#FF9A9E", "#A18CD1", "#FBC2EB", "#84FAB0",
  ];

  // Overall animation progress
  const sweepProgress = spring({
    fps,
    frame,
    config: { damping: 25, stiffness: 40 },
  });

  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const outerRadius = size / 2 - 10;
  const innerRadius = outerRadius * 0.55; // donut hole

  let cumulativeAngle = -90; // start from top

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 60,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRadius: 20,
        border: "1px solid rgba(255,255,255,0.08)",
        padding: 60,
      }}
    >
      {/* Pie chart SVG */}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {items.map((item, index) => {
          const sliceAngle = (item.value / total) * 360 * sweepProgress;
          const startAngle = cumulativeAngle;
          cumulativeAngle += sliceAngle;
          const endAngle = cumulativeAngle;

          const color = item.color || chart.colors?.[index] || defaultColors[index % defaultColors.length];

          return (
            <ArcSlice
              key={item.label}
              cx={cx}
              cy={cy}
              outerRadius={outerRadius}
              innerRadius={innerRadius}
              startAngle={startAngle}
              endAngle={endAngle}
              color={color}
            />
          );
        })}
      </svg>

      {/* Legend */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {chart.title && (
          <h2
            style={{
              color: "#FFFFFF",
              fontSize: 32,
              fontFamily,
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            {chart.title}
          </h2>
        )}
        {items.map((item, index) => {
          const color = item.color || chart.colors?.[index] || defaultColors[index % defaultColors.length];
          const legendSpring = spring({
            fps,
            frame: frame - index * 6,
            config: { damping: 18, stiffness: 80 },
          });
          const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0";

          return (
            <div
              key={item.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                opacity: legendSpring,
                transform: `translateX(${interpolate(legendSpring, [0, 1], [20, 0])}px)`,
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  backgroundColor: color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  color: "#FFFFFF",
                  fontSize: 20,
                  fontFamily,
                  fontWeight: 500,
                }}
              >
                {item.label}
              </span>
              <span
                style={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 18,
                  fontFamily,
                }}
              >
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// SVG arc slice helper
function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
}

interface ArcSliceProps {
  cx: number;
  cy: number;
  outerRadius: number;
  innerRadius: number;
  startAngle: number;
  endAngle: number;
  color: string;
}

const ArcSlice: React.FC<ArcSliceProps> = ({
  cx, cy, outerRadius, innerRadius, startAngle, endAngle, color,
}) => {
  if (endAngle - startAngle < 0.1) return null;

  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  const outerStart = polarToCartesian(cx, cy, outerRadius, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerRadius, endAngle);
  const innerStart = polarToCartesian(cx, cy, innerRadius, endAngle);
  const innerEnd = polarToCartesian(cx, cy, innerRadius, startAngle);

  const d = [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerEnd.x} ${innerEnd.y}`,
    "Z",
  ].join(" ");

  return <path d={d} fill={color} />;
};
