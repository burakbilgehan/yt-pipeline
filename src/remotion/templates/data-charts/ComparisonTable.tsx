import React from "react";
import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { DataChartInput, DataChartItem } from "../../schemas";

interface ComparisonTableProps {
  chart: DataChartInput;
  brandColor: string;
  fontFamily: string;
}

/**
 * Animated comparison table showing items side by side.
 * Each row slides in with staggered spring animation.
 * Useful for "vs" comparisons, ranked lists, price comparisons.
 */
export const ComparisonTable: React.FC<ComparisonTableProps> = ({
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

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "50px 80px",
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        borderRadius: 20,
      }}
    >
      {/* Title */}
      {chart.title && (
        <h2
          style={{
            color: "#FFFFFF",
            fontSize: 36,
            fontFamily,
            fontWeight: 700,
            marginBottom: 30,
            textAlign: "center",
          }}
        >
          {chart.title}
        </h2>
      )}

      {/* Rows */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 16,
        }}
      >
        {items.map((item, index) => {
          const rowSpring = spring({
            fps,
            frame: frame - index * 8,
            config: { damping: 15, stiffness: 80 },
          });

          const barWidthPercent = (item.value / maxValue) * 100;
          const barColor =
            item.color || chart.colors?.[index] || defaultColors[index % defaultColors.length];

          return (
            <div
              key={item.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                opacity: rowSpring,
                transform: `translateX(${interpolate(rowSpring, [0, 1], [-40, 0])}px)`,
              }}
            >
              {/* Rank */}
              <div
                style={{
                  color: brandColor,
                  fontSize: 24,
                  fontFamily,
                  fontWeight: 800,
                  width: 40,
                  textAlign: "right",
                }}
              >
                #{index + 1}
              </div>

              {/* Label */}
              <div
                style={{
                  color: "#FFFFFF",
                  fontSize: 22,
                  fontFamily,
                  fontWeight: 600,
                  width: 200,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {item.label}
              </div>

              {/* Bar + Value */}
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    flex: 1,
                    height: 28,
                    backgroundColor: "rgba(255,255,255,0.1)",
                    borderRadius: 14,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${barWidthPercent * rowSpring}%`,
                      height: "100%",
                      backgroundColor: barColor,
                      borderRadius: 14,
                    }}
                  />
                </div>
                <div
                  style={{
                    color: "#FFFFFF",
                    fontSize: 20,
                    fontFamily,
                    fontWeight: 700,
                    minWidth: 100,
                    textAlign: "right",
                  }}
                >
                  {chart.unit === "$"
                    ? `$${Math.round(item.value * rowSpring).toLocaleString()}`
                    : `${Math.round(item.value * rowSpring).toLocaleString()}${chart.unit ? ` ${chart.unit}` : ""}`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
