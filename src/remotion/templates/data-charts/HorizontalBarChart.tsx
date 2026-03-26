import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";

/**
 * HorizontalBarChart — Scene 002 (Nominal USD) and Scene 003 Phase 3 (PPP-Adjusted)
 *
 * Features:
 * - Stagger-top-down bar entrance animation
 * - Gradient colors (green→red) when gradientColors provided
 * - displayValue per bar (e.g. "$94,447")
 * - Re-sort animation when animation="re-sort-from-nominal"
 * - Dark-cozy theme matching channel design
 */

interface BarItem {
  label: string;
  code: string;
  value: number;
  displayValue: string;
  color?: string;
}

interface HorizontalBarChartProps {
  chart: {
    type: string;
    title?: string;
    bars?: BarItem[];
    barColor?: string;
    barHeight?: number;
    barGap?: number;
    labelColor?: string;
    valueColor?: string;
    gradientColors?: { highest: string; lowest: string };
    animationStyle?: string;
    staggerDelay?: string;
    backgroundColor?: string;
    animation?: string;
    [key: string]: unknown;
  };
  brandColor: string;
  fontFamily: string;
}

const TEXT_COLOR = "#EAE0D5";
const MUTED_TEXT = "rgba(234, 224, 213, 0.6)";
const BG_COLOR = "#1A1B22";

function interpolateColor(
  color1: string,
  color2: string,
  t: number
): string {
  // Parse hex to RGB
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  if (!c1 || !c2) return color1;
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r},${g},${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!match) return null;
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}

export const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({
  chart,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bars = chart.bars || [];
  const barHeight = chart.barHeight || 36;
  const barGap = chart.barGap || 12;
  const barColor = chart.barColor || "#90AFC5";
  const labelColor = chart.labelColor || TEXT_COLOR;
  const valueColor = chart.valueColor || MUTED_TEXT;
  const staggerDelayFrames = parseFloat(chart.staggerDelay || "0.3") * fps;

  const maxValue = Math.max(...bars.map((b) => b.value), 1);

  // Get bar color: gradient if provided, otherwise single color
  const getBarColor = (index: number, total: number): string => {
    if (chart.gradientColors) {
      const t = total <= 1 ? 0 : index / (total - 1);
      return interpolateColor(chart.gradientColors.highest, chart.gradientColors.lowest, t);
    }
    return barColor;
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: BG_COLOR,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "60px 80px",
      }}
    >
      {/* Title */}
      {chart.title && (
        <div
          style={{
            fontFamily: fontFamily || "Inter, sans-serif",
            fontSize: 28,
            fontWeight: 600,
            color: TEXT_COLOR,
            marginBottom: 40,
            opacity: interpolate(frame, [0, 15], [0, 1], {
              extrapolateRight: "clamp",
            }),
          }}
        >
          {chart.title}
        </div>
      )}

      {/* Bars */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: barGap,
          width: "100%",
        }}
      >
        {bars.map((bar, index) => {
          const delay = index * staggerDelayFrames;
          const barSpring = spring({
            fps,
            frame: frame - delay,
            config: { damping: 14, stiffness: 80 },
          });

          const widthPct = (bar.value / maxValue) * 100;
          const color = bar.color || getBarColor(index, bars.length);

          const labelOpacity = interpolate(
            barSpring,
            [0, 0.3],
            [0, 1],
            { extrapolateRight: "clamp" }
          );

          return (
            <div
              key={bar.code || bar.label}
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                width: "100%",
                height: barHeight + 8,
              }}
            >
              {/* Country label */}
              <div
                style={{
                  width: 180,
                  minWidth: 180,
                  fontFamily: fontFamily || "Inter, sans-serif",
                  fontSize: 18,
                  fontWeight: 500,
                  color: labelColor,
                  textAlign: "right",
                  paddingRight: 16,
                  opacity: labelOpacity,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {bar.label}
              </div>

              {/* Bar track */}
              <div
                style={{
                  flex: 1,
                  height: barHeight,
                  backgroundColor: "rgba(234,224,213,0.06)",
                  borderRadius: 4,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                {/* Filled bar */}
                <div
                  style={{
                    width: `${widthPct * barSpring}%`,
                    height: "100%",
                    backgroundColor: color,
                    borderRadius: 4,
                    transition: "none",
                  }}
                />
              </div>

              {/* Value label */}
              <div
                style={{
                  width: 120,
                  minWidth: 120,
                  fontFamily: fontFamily || "Inter, sans-serif",
                  fontSize: 18,
                  fontWeight: 600,
                  color: valueColor,
                  textAlign: "left",
                  paddingLeft: 16,
                  opacity: labelOpacity,
                  whiteSpace: "nowrap",
                }}
              >
                {bar.displayValue}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
