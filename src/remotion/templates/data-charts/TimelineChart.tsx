import React from "react";
import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { DataChartInput } from "../../schemas";

interface TimelineChartProps {
  chart: DataChartInput;
  brandColor: string;
  fontFamily: string;
}

const DEFAULT_PALETTE = ["#90AFC5", "#5BBF8C", "#E06070", "#EAE0D5"];
const CREAM = "#EAE0D5";
const MUTED = "rgba(234, 224, 213, 0.6)";
const LINE_COLOR = "rgba(234, 224, 213, 0.15)";

/**
 * Cinematic horizontal timeline with animated markers.
 * Flat/transparent — designed to sit on CinematicGradient or stock video.
 * Items appear left-to-right with staggered spring animations.
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

  // Line draws left-to-right
  const lineProgress = spring({
    fps,
    frame,
    config: { damping: 30, stiffness: 30 },
  });

  const palette = [brandColor || "#D8A7B1", ...DEFAULT_PALETTE];

  const getColor = (index: number) =>
    items[index].color ||
    chart.colors?.[index] ||
    palette[index % palette.length];

  const formatValue = (value: number) => {
    if (chart.unit === "$") return `$${value.toLocaleString()}`;
    if (chart.unit === "%" ) return `${value.toLocaleString()}%`;
    return `${value.toLocaleString()}${chart.unit ? ` ${chart.unit}` : ""}`;
  };

  // Vertical midpoint of the 300px timeline area
  const MID_Y = 150;
  const DOT_SIZE = 14;
  const CONNECTOR_LENGTH = 20;
  const LABEL_GAP = 6; // gap between connector end and label block

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "60px 80px",
      }}
    >
      {/* Title */}
      {chart.title && (
        <h2
          style={{
            color: CREAM,
            fontSize: 40,
            fontFamily,
            fontWeight: 600,
            textAlign: "center",
            marginTop: 0,
            marginRight: 0,
            marginBottom: 50,
            marginLeft: 0,
            padding: 0,
            lineHeight: 1.2,
          }}
        >
          {chart.title}
        </h2>
      )}

      {/* Timeline container */}
      <div style={{ position: "relative", width: "100%", height: 300 }}>
        {/* Horizontal timeline line — animated left to right */}
        <div
          style={{
            position: "absolute",
            top: MID_Y,
            left: 0,
            width: `${lineProgress * 100}%`,
            height: 2,
            backgroundColor: LINE_COLOR,
            transform: "translateY(-1px)",
          }}
        />

        {/* Timeline items */}
        {items.map((item, index) => {
          const staggerDelay = index * 10 + 10;

          // Marker scales in
          const markerSpring = spring({
            fps,
            frame: frame - staggerDelay,
            config: { damping: 14, stiffness: 80 },
          });

          // Label fades in with subtle Y offset
          const labelSpring = spring({
            fps,
            frame: frame - staggerDelay - 4,
            config: { damping: 18, stiffness: 60 },
          });

          const leftPercent =
            items.length === 1
              ? 50
              : (index / (items.length - 1)) * 100;

          const color = getColor(index);
          const isTop = index % 2 === 0; // even = label on top, odd = bottom

          // Label translateY direction: top labels slide down into place, bottom slide up
          const labelTranslateY = interpolate(
            labelSpring,
            [0, 1],
            [isTop ? -12 : 12, 0],
          );

          return (
            <div
              key={`${item.label}-${index}`}
              style={{
                position: "absolute",
                left: `${leftPercent}%`,
                top: 0,
                width: 0,
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Marker dot — centered on the timeline */}
              <div
                style={{
                  position: "absolute",
                  top: MID_Y - DOT_SIZE / 2,
                  left: -DOT_SIZE / 2,
                  width: DOT_SIZE,
                  height: DOT_SIZE,
                  borderRadius: "50%",
                  backgroundColor: color,
                  border: `2px solid ${CREAM}`,
                  transform: `scale(${markerSpring})`,
                }}
              />

              {/* Connector line from dot to label */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  width: 1,
                  height: CONNECTOR_LENGTH,
                  backgroundColor: LINE_COLOR,
                  opacity: labelSpring,
                  transform: "translateX(-0.5px)",
                  ...(isTop
                    ? { top: MID_Y - DOT_SIZE / 2 - CONNECTOR_LENGTH }
                    : { top: MID_Y + DOT_SIZE / 2 }),
                }}
              />

              {/* Label block */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  transform: `translateX(-50%) translateY(${labelTranslateY}px)`,
                  opacity: labelSpring,
                  whiteSpace: "nowrap",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  ...(isTop
                    ? { bottom: 300 - MID_Y + DOT_SIZE / 2 + CONNECTOR_LENGTH + LABEL_GAP }
                    : { top: MID_Y + DOT_SIZE / 2 + CONNECTOR_LENGTH + LABEL_GAP }),
                }}
              >
                {isTop ? (
                  <>
                    {item.value !== undefined && (
                      <div
                        style={{
                          color,
                          fontSize: 18,
                          fontFamily,
                          fontWeight: 700,
                          lineHeight: 1.3,
                        }}
                      >
                        {formatValue(item.value)}
                      </div>
                    )}
                    <div
                      style={{
                        color: CREAM,
                        fontSize: 20,
                        fontFamily,
                        fontWeight: 600,
                        marginTop: 2,
                        lineHeight: 1.3,
                      }}
                    >
                      {item.label}
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      style={{
                        color: CREAM,
                        fontSize: 20,
                        fontFamily,
                        fontWeight: 600,
                        lineHeight: 1.3,
                      }}
                    >
                      {item.label}
                    </div>
                    {item.value !== undefined && (
                      <div
                        style={{
                          color,
                          fontSize: 18,
                          fontFamily,
                          fontWeight: 700,
                          marginTop: 2,
                          lineHeight: 1.3,
                        }}
                      >
                        {formatValue(item.value)}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
