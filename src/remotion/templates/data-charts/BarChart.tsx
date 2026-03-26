import React from "react";
import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { DataChartInput, DataChartItem } from "../../schemas";

interface BarChartProps {
  chart: DataChartInput;
  brandColor: string;
  fontFamily: string;
}

/**
 * Determine bar color based on semantic meaning.
 * Priority: item.color > chart.colors[i] > semantic logic > fallback cycle
 * 
 * Semantic logic: if the chart has a contextual "highlight" field on the item,
 * use positive green for "positive", negative red for "negative", 
 * accent colors for emphasis.
 */
const getSemanticColors = (brandColor: string) => ({
  positive: "#5BBF8C",
  negative: "#E06070",
  accent1: brandColor || "#D8A7B1",
  accent2: "#90AFC5",
  neutral: "#EAE0D5",
});

const DEFAULT_COLORS = [
  "#90AFC5",  // Blue — default for most bars
  "#90AFC5",
  "#90AFC5",
  "#90AFC5",
  "#90AFC5",
];

const TEXT_COLOR = "#EAE0D5";
const MUTED_TEXT = "rgba(234, 224, 213, 0.6)";
const TRACK_COLOR = "rgba(234, 224, 213, 0.06)";

const formatValue = (value: number, unit?: string): string => {
  if (unit === "$") {
    return `$${value.toLocaleString()}`;
  }
  return `${value.toLocaleString()}${unit ? ` ${unit}` : ""}`;
};

// ─── Horizontal Bar Chart ─────────────────────────────────────

const HorizontalBars: React.FC<BarChartProps> = ({
  chart,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const items = chart.items || [];
  const maxValue = Math.max(...items.map((item) => item.value));

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 80,
      }}
    >
      {chart.title && (
        <h2
          style={{
            color: TEXT_COLOR,
            fontSize: 40,
            fontFamily,
            fontWeight: 600,
            margin: 0,
            marginBottom: chart.subtitle ? 8 : 40,
            textAlign: "left",
          }}
        >
          {chart.title}
        </h2>
      )}

      {chart.subtitle && (
        <div
          style={{
            color: "rgba(234, 224, 213, 0.45)",
            fontSize: 16,
            fontFamily,
            marginBottom: 20,
            lineHeight: 1.5,
          }}
        >
          {chart.subtitle}
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          width: "100%",
        }}
      >
        {items.map((item, index) => {
          const barSpring = spring({
            fps,
            frame: frame - index * 8,
            config: { damping: 14, stiffness: 80 },
          });

          const widthPercent =
            maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          const barColor =
            item.color ||
            chart.colors?.[index] ||
            DEFAULT_COLORS[index % DEFAULT_COLORS.length];

          const textOpacity = interpolate(barSpring, [0, 0.4], [0, 1], {
            extrapolateRight: "clamp",
          });

          return (
            <div
              key={item.label}
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                width: "100%",
              }}
            >
              <div
                style={{
                  width: 200,
                  minWidth: 200,
                  color: MUTED_TEXT,
                  fontSize: 22,
                  fontFamily,
                  fontWeight: 500,
                  textAlign: "right",
                  paddingRight: 20,
                  opacity: textOpacity,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {item.label}
              </div>

              <div
                style={{
                  flex: 1,
                  height: 40,
                  backgroundColor: TRACK_COLOR,
                  borderRadius: 6,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: `${widthPercent * barSpring}%`,
                    height: "100%",
                    backgroundColor: barColor,
                    borderRadius: 6,
                  }}
                />
              </div>

              <div
                style={{
                  width: 120,
                  minWidth: 120,
                  color: TEXT_COLOR,
                  fontSize: 22,
                  fontFamily,
                  fontWeight: 600,
                  textAlign: "left",
                  paddingLeft: 20,
                  opacity: textOpacity,
                  whiteSpace: "nowrap",
                }}
              >
                {formatValue(item.value, chart.unit)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Vertical Bar Chart ───────────────────────────────────────

const MAX_BAR_HEIGHT = 550;

const VerticalBars: React.FC<BarChartProps> = ({
  chart,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const items = chart.items || [];
  const maxValue = Math.max(...items.map((item) => item.value));
  const barWidth = items.length <= 3 ? 140 : items.length <= 5 ? 100 : 70;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: 80,
      }}
    >
      {chart.title && (
        <h2
          style={{
            color: TEXT_COLOR,
            fontSize: 40,
            fontFamily,
            fontWeight: 600,
            margin: 0,
            marginBottom: 48,
            textAlign: "center",
            width: "100%",
          }}
        >
          {chart.title}
        </h2>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "flex-end",
          gap: items.length <= 3 ? 60 : 32,
          width: "100%",
        }}
      >
        {items.map((item, index) => {
          const barSpring = spring({
            fps,
            frame: frame - index * 8,
            config: { damping: 14, stiffness: 80 },
          });

          const heightPx =
            maxValue > 0 ? (item.value / maxValue) * MAX_BAR_HEIGHT : 0;
          const barColor =
            item.color ||
            chart.colors?.[index] ||
            DEFAULT_COLORS[index % DEFAULT_COLORS.length];
          const textOpacity = interpolate(barSpring, [0, 0.4], [0, 1], {
            extrapolateRight: "clamp",
          });

          return (
            <div
              key={item.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              {/* Value on top */}
              <div
                style={{
                  color: TEXT_COLOR,
                  fontSize: 24,
                  fontFamily,
                  fontWeight: 600,
                  opacity: textOpacity,
                  whiteSpace: "nowrap",
                  marginBottom: 12,
                }}
              >
                {formatValue(item.value, chart.unit)}
              </div>

              {/* Bar */}
              <div
                style={{
                  width: barWidth,
                  height: MAX_BAR_HEIGHT,
                  backgroundColor: TRACK_COLOR,
                  borderRadius: 8,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: heightPx * barSpring,
                    backgroundColor: barColor,
                    borderRadius: 8,
                  }}
                />
              </div>

              {/* Label at bottom */}
              <div
                style={{
                  color: MUTED_TEXT,
                  fontSize: 18,
                  fontFamily,
                  fontWeight: 500,
                  textAlign: "center",
                  opacity: textOpacity,
                  marginTop: 12,
                  maxWidth: barWidth + 40,
                  lineHeight: 1.3,
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

// ─── Main Component ─────────────────────────────────────────

/**
 * Animated bar chart with horizontal (default) and vertical orientation.
 * Bars grow with staggered spring physics.
 */
export const BarChart: React.FC<BarChartProps> = (props) => {
  const items = props.chart.items || [];
  if (items.length === 0) return null;

  if (props.chart.orientation === "vertical") {
    return <VerticalBars {...props} />;
  }

  return <HorizontalBars {...props} />;
};
