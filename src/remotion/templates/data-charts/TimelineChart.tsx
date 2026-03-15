import React from "react";
import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { DataChartInput } from "../../schemas";

interface TimelineChartProps {
  chart: DataChartInput;
  brandColor: string;
  fontFamily: string;
}

/**
 * Horizontal timeline with animated markers.
 * Items appear left-to-right with staggered spring animation.
 * Each item shows a label and value at a point on the timeline.
 */
export const TimelineChart: React.FC<TimelineChartProps> = ({
  chart,
  brandColor,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const items = chart.items || [];
  if (items.length === 0) return null;

  const defaultColors = [
    "#6C63FF", "#FF6584", "#43E97B", "#F9D423",
    "#FF9A9E", "#A18CD1",
  ];

  // Line draw progress
  const lineProgress = spring({
    fps,
    frame,
    config: { damping: 30, stiffness: 30 },
  });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRadius: 20,
        border: "1px solid rgba(255,255,255,0.08)",
        padding: "50px 80px",
      }}
    >
      {chart.title && (
        <h2
          style={{
            color: "#FFFFFF",
            fontSize: 32,
            fontFamily,
            fontWeight: 700,
            marginBottom: 50,
            textAlign: "center",
          }}
        >
          {chart.title}
        </h2>
      )}

      {/* Timeline container */}
      <div style={{ position: "relative", width: "100%", height: 200 }}>
        {/* Horizontal line */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            width: `${lineProgress * 100}%`,
            height: 3,
            backgroundColor: "rgba(255,255,255,0.3)",
            transform: "translateY(-50%)",
          }}
        />

        {/* Timeline items */}
        {items.map((item, index) => {
          const markerSpring = spring({
            fps,
            frame: frame - index * 10 - 10,
            config: { damping: 15, stiffness: 80 },
          });

          const leftPercent = items.length === 1
            ? 50
            : (index / (items.length - 1)) * 100;
          const color = item.color || chart.colors?.[index] || defaultColors[index % defaultColors.length];
          const isEven = index % 2 === 0;

          return (
            <div
              key={item.label}
              style={{
                position: "absolute",
                left: `${leftPercent}%`,
                top: "50%",
                transform: "translateX(-50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                opacity: markerSpring,
              }}
            >
              {/* Label (alternating top/bottom) */}
              <div
                style={{
                  position: "absolute",
                  [isEven ? "bottom" : "top"]: 24,
                  whiteSpace: "nowrap",
                  textAlign: "center",
                  transform: `translateY(${interpolate(markerSpring, [0, 1], [isEven ? 10 : -10, 0])}px)`,
                }}
              >
                <div
                  style={{
                    color: "#FFFFFF",
                    fontSize: 18,
                    fontFamily,
                    fontWeight: 600,
                  }}
                >
                  {item.label}
                </div>
                {item.value !== undefined && (
                  <div
                    style={{
                      color: color,
                      fontSize: 16,
                      fontFamily,
                      fontWeight: 700,
                      marginTop: 4,
                    }}
                  >
                    {chart.unit === "$"
                      ? `$${item.value.toLocaleString()}`
                      : `${item.value.toLocaleString()}${chart.unit ? ` ${chart.unit}` : ""}`}
                  </div>
                )}
              </div>

              {/* Marker dot */}
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  backgroundColor: color,
                  border: "3px solid rgba(255,255,255,0.9)",
                  transform: `scale(${markerSpring})`,
                  boxShadow: `0 0 12px ${color}80`,
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
