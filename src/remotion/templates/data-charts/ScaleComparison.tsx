import React from "react";
import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { DataChartInput } from "../../schemas";
import { ACCENT_PINK, ACCENT_BLUE, POSITIVE, NEGATIVE, SAGE, TEXT, TEXT_MUTED, SURFACE_BORDER, DATA_PALETTE } from "../../palette";

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
    ACCENT_PINK, ACCENT_BLUE, POSITIVE, NEGATIVE,
    SAGE, "#7EC8E3",
  ];

  // Max circle diameter (in pixels)
  const maxDiameter = 420;
  const minDiameter = 40;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 60px",
      }}
    >
      {chart.title && (
        <h2
          style={{
            color: TEXT,
            fontSize: 48,
            fontFamily,
            fontWeight: 700,
            marginBottom: 24,
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
          gap: 60,
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
                  color: TEXT,
                  fontSize: 30,
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
                  color: TEXT_MUTED,
                  fontSize: 26,
                  fontFamily,
                  fontWeight: 500,
                  textAlign: "center",
                  maxWidth: 240,
                  whiteSpace: "pre-line",
                }}
              >
                {item.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Annotation — appears below circles */}
      {chart.annotation && (
        <div
          style={{
            marginTop: 32,
            fontSize: 26,
            fontFamily,
            fontWeight: 500,
            color: TEXT_MUTED,
            textAlign: "center",
            maxWidth: 900,
            lineHeight: 1.4,
            opacity: spring({
              fps,
              frame: frame - items.length * 8 - 10,
              config: { damping: 20, stiffness: 100 },
            }),
          }}
        >
          {chart.annotation}
        </div>
      )}
    </div>
  );
};
