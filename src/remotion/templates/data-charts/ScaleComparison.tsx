import React from "react";
import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { DataChartInput } from "../../schemas";

interface ScaleComparisonProps {
  chart: DataChartInput;
  brandColor: string;
  fontFamily: string;
}

/**
 * Visual size/scale comparison.
 * Shows items as circles/squares with proportional sizes.
 * Great for "a drop vs a gallon" or "Earth vs Jupiter" comparisons.
 */
export const ScaleComparison: React.FC<ScaleComparisonProps> = ({
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
    "#FF9A9E", "#A18CD1",
  ];

  // Max circle diameter (in pixels)
  const maxDiameter = 240;
  const minDiameter = 24;

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
            marginBottom: 40,
            textAlign: "center",
          }}
        >
          {chart.title}
        </h2>
      )}

      {/* Scale circles */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 40,
          flex: 1,
        }}
      >
        {items.map((item, index) => {
          const itemSpring = spring({
            fps,
            frame: frame - index * 8,
            config: { damping: 12, stiffness: 50 },
          });

          // Area-proportional sizing (use sqrt for visual accuracy)
          const ratio = Math.sqrt(item.value / maxValue);
          const diameter = Math.max(ratio * maxDiameter, minDiameter);
          const color = item.color || chart.colors?.[index] || defaultColors[index % defaultColors.length];

          return (
            <div
              key={item.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
                opacity: itemSpring,
              }}
            >
              {/* Value label */}
              <div
                style={{
                  color: "#FFFFFF",
                  fontSize: 22,
                  fontFamily,
                  fontWeight: 700,
                  transform: `translateY(${interpolate(itemSpring, [0, 1], [-10, 0])}px)`,
                }}
              >
                {chart.unit === "$"
                  ? `$${item.value.toLocaleString()}`
                  : `${item.value.toLocaleString()}${chart.unit ? ` ${chart.unit}` : ""}`}
              </div>

              {/* Circle */}
              <div
                style={{
                  width: diameter * itemSpring,
                  height: diameter * itemSpring,
                  borderRadius: "50%",
                  backgroundColor: `${color}CC`,
                  border: `3px solid ${color}`,
                  boxShadow: `0 0 30px ${color}40`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              />

              {/* Label */}
              <div
                style={{
                  color: "rgba(255,255,255,0.8)",
                  fontSize: 20,
                  fontFamily,
                  fontWeight: 500,
                  textAlign: "center",
                  maxWidth: 120,
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
