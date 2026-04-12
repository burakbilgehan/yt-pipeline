import React from "react";
import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { DataChartInput } from "../../schemas";
import { TEXT, ACCENT_BLUE, ACCENT_PINK, POSITIVE, NEGATIVE, GRID, TEXT_MUTED } from "../../palette";

interface TimelineChartProps {
  chart: DataChartInput;
  brandColor: string;
  fontFamily: string;
}

const CREAM = TEXT;
const LINE_COLOR = GRID;
/** Brand-only cycle: Pink → Blue → Pink → Blue … */
const BRAND_CYCLE = [ACCENT_PINK, ACCENT_BLUE];

/**
 * Cinematic horizontal timeline with animated markers.
 * Flat/transparent — designed to sit on CinematicGradient or stock video.
 * Items appear left-to-right with staggered spring animations.
 *
 * Fixes applied:
 * - Uses `displayValue` when present (e.g. "75% share (proj.)")
 * - Always shows `item.label` (year text)
 * - Colors cycle through brand palette only (Pink/Blue)
 * - Renders `chart.annotation` text below the timeline
 */
export const TimelineChart: React.FC<TimelineChartProps> = ({
  chart,
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

  const getColor = (index: number) =>
    items[index].color ||
    chart.colors?.[index % (chart.colors?.length || 1)] ||
    BRAND_CYCLE[index % BRAND_CYCLE.length];

  /** Prefer displayValue (from storyboard) over raw numeric formatting. */
  const formatValue = (item: (typeof items)[0]) => {
    if ((item as any).displayValue) return (item as any).displayValue as string;
    const value = item.value;
    if (chart.unit === "$") return `$${value.toLocaleString()}`;
    if (chart.unit === "%") return `${value.toLocaleString()}%`;
    return `${value.toLocaleString()}${chart.unit ? ` ${chart.unit}` : ""}`;
  };

  // Timeline line sits in the upper third so all labels fit below
  const TIMELINE_HEIGHT = 600;
  const MID_Y = 240;
  const DOT_SIZE = 22;
  const PADDING_PCT = 8; // keep first/last labels inside the container
  const CONNECTOR_LENGTH = 50;
  const LABEL_GAP = 12;

  // Annotation appears after all markers
  const annotationDelay = items.length * 10 + 25;
  const annotationSpring = spring({
    fps,
    frame: frame - annotationDelay,
    config: { damping: 20, stiffness: 80 },
  });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "48px 80px",
      }}
    >
      {/* Title */}
      {chart.title && (
        <h2
          style={{
            color: CREAM,
            fontSize: 48,
            fontFamily,
            fontWeight: 600,
            textAlign: "center",
            marginTop: 0,
            marginRight: 0,
            marginBottom: 32,
            marginLeft: 0,
            padding: 0,
            lineHeight: 1.2,
          }}
        >
          {chart.title}
        </h2>
      )}

      {/* Timeline container */}
      <div style={{ position: "relative", width: "100%", height: TIMELINE_HEIGHT, flexShrink: 0, overflow: "visible" }}>
        {/* Horizontal timeline line — animated left to right */}
        <div
          style={{
            position: "absolute",
            top: MID_Y,
            left: `${PADDING_PCT}%`,
            width: `${lineProgress * (100 - 2 * PADDING_PCT)}%`,
            height: 2,
            backgroundColor: LINE_COLOR,
            transform: "translateY(-1px)",
          }}
        />

        {/* Timeline items */}
        {items.map((item, index) => {
          const staggerDelay = index * 10 + 10;

          const markerSpring = spring({
            fps,
            frame: frame - staggerDelay,
            config: { damping: 14, stiffness: 80 },
          });

          const labelSpring = spring({
            fps,
            frame: frame - staggerDelay - 4,
            config: { damping: 18, stiffness: 60 },
          });

          const leftPercent =
            items.length === 1
              ? 50
              : PADDING_PCT + (index / (items.length - 1)) * (100 - 2 * PADDING_PCT);

          const color = getColor(index);

          const labelTranslateY = interpolate(
            labelSpring,
            [0, 1],
            [12, 0],
          );

          const valueText = formatValue(item);

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
              {/* Marker dot — dashed outline for projections, solid fill for historical */}
              <div
                style={{
                  position: "absolute",
                  top: MID_Y - DOT_SIZE / 2,
                  left: -DOT_SIZE / 2,
                  width: DOT_SIZE,
                  height: DOT_SIZE,
                  borderRadius: "50%",
                  backgroundColor: (item as any).projection ? "transparent" : color,
                  border: (item as any).projection
                    ? `3px dashed ${color}`
                    : `2px solid ${CREAM}`,
                  transform: `scale(${markerSpring})`,
                }}
              />

              {/* Connector line — always below dot */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  width: 1,
                  height: CONNECTOR_LENGTH,
                  backgroundColor: LINE_COLOR,
                  opacity: labelSpring,
                  transform: "translateX(-0.5px)",
                  top: MID_Y + DOT_SIZE / 2,
                }}
              />

              {/* Label block — all labels below the timeline */}
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
                  top: MID_Y + DOT_SIZE / 2 + CONNECTOR_LENGTH + LABEL_GAP,
                }}
              >
                {/* Year */}
                <div
                  style={{
                    color: CREAM,
                    fontSize: 28,
                    fontFamily,
                    fontWeight: 600,
                    lineHeight: 1.3,
                  }}
                >
                  {item.label}
                </div>
                {/* Value */}
                <div
                  style={{
                    color,
                    fontSize: 28,
                    fontFamily: "JetBrains Mono, monospace",
                    fontWeight: 700,
                    marginTop: 4,
                    lineHeight: 1.3,
                  }}
                >
                  {valueText}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Annotation — appears below timeline */}
      {chart.annotation && (
        <div
          style={{
            textAlign: "center",
            marginTop: 20,
            opacity: annotationSpring,
            transform: `translateY(${interpolate(annotationSpring, [0, 1], [10, 0])}px)`,
          }}
        >
          <span
            style={{
              color: ACCENT_PINK,
              fontSize: 32,
              fontFamily: "JetBrains Mono, monospace",
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            {chart.annotation}
          </span>
        </div>
      )}
    </div>
  );
};
