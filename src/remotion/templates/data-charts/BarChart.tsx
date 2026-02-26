import React from "react";
import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { DataChartInput, DataChartItem } from "../../schemas";

interface BarChartProps {
  chart: DataChartInput;
  brandColor: string;
  fontFamily: string;
}

/**
 * Animated bar chart component.
 * Bars grow upward with spring physics, labels fade in.
 */
export const BarChart: React.FC<BarChartProps> = ({
  chart,
  brandColor,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const items = chart.items || [];
  if (items.length === 0) return null;

  const maxValue = Math.max(...items.map((item) => item.value));
  const defaultColors = [
    "#6C63FF", "#FF6584", "#43E97B", "#F9D423",
    "#FF9A9E", "#A18CD1", "#FBC2EB", "#84FAB0",
  ];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "60px 80px",
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        borderRadius: 20,
      }}
    >
      {/* Chart title */}
      {chart.title && (
        <h2
          style={{
            color: "#FFFFFF",
            fontSize: 36,
            fontFamily,
            fontWeight: 700,
            marginBottom: 40,
            textAlign: "center",
          }}
        >
          {chart.title}
        </h2>
      )}

      {/* Bars container */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: Math.max(20, 60 - items.length * 5),
          paddingBottom: 60,
        }}
      >
        {items.map((item, index) => {
          // Staggered spring animation
          const barSpring = spring({
            fps,
            frame: frame - index * 5,
            config: { damping: 12, stiffness: 60 },
          });

          const heightPercent = (item.value / maxValue) * 100;
          const barColor =
            item.color || chart.colors?.[index] || defaultColors[index % defaultColors.length];

          return (
            <div
              key={item.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                flex: 1,
                maxWidth: 120,
              }}
            >
              {/* Value label */}
              <div
                style={{
                  color: "#FFFFFF",
                  fontSize: 22,
                  fontFamily,
                  fontWeight: 600,
                  marginBottom: 8,
                  opacity: barSpring,
                }}
              >
                {chart.unit === "$"
                  ? `$${item.value.toLocaleString()}`
                  : `${item.value.toLocaleString()}${chart.unit ? ` ${chart.unit}` : ""}`}
              </div>

              {/* Bar */}
              <div
                style={{
                  width: "100%",
                  height: `${heightPercent * barSpring}%`,
                  minHeight: 4,
                  backgroundColor: barColor,
                  borderRadius: "8px 8px 0 0",
                  position: "relative",
                }}
              />

              {/* Label */}
              <div
                style={{
                  color: "rgba(255,255,255,0.8)",
                  fontSize: 16,
                  fontFamily,
                  marginTop: 12,
                  textAlign: "center",
                  opacity: barSpring,
                }}
              >
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
