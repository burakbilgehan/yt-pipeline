import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { TEXT, BG, TRACK, ACCENT_BLUE, ACCENT_PINK, TEXT_MUTED } from "../../palette";

/**
 * HorizontalBarChart — Standalone horizontal bar chart with gradient colors.
 *
 * Fixes applied:
 * - Value label width increased to 280px to prevent clipping of long text
 * - Annotation support added
 * - Label width increased to 360px for certification names
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
    annotation?: string;
    [key: string]: unknown;
  };
  brandColor: string;
  fontFamily: string;
}

const TEXT_COLOR = TEXT;
const MUTED_TEXT = TEXT_MUTED;
const BG_COLOR = BG;

function interpolateColor(
  color1: string,
  color2: string,
  t: number
): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  if (!c1 || !c2) return color1;
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r},${g},${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  if (!hex || typeof hex !== "string") return null;
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
  const annotation = chart.annotation;
  // Auto-scale bar height to fill available vertical space
  const availableHeight = 820 - (chart.title ? 80 : 0) - (annotation ? 80 : 0);
  const autoBarHeight = Math.max(48, Math.floor((availableHeight / Math.max(bars.length, 1)) * 0.7));
  const barHeight = chart.barHeight || autoBarHeight;
  const barGap = chart.barGap || Math.max(8, Math.floor((availableHeight / Math.max(bars.length, 1)) * 0.15));
  const barColor = chart.barColor || ACCENT_BLUE;
  const labelColor = chart.labelColor || TEXT_COLOR;
  const valueColor = chart.valueColor || MUTED_TEXT;
  const staggerDelayFrames = parseFloat(chart.staggerDelay || "0.3") * fps;

  const maxValue = Math.max(...bars.map((b) => b.value), 1);

  // Get bar color: gradient if provided, otherwise single color
  const getBarColor = (index: number, total: number): string => {
    if (chart.gradientColors) {
      const gc = chart.gradientColors as any;
      let highColor: string;
      let lowColor: string;
      if (Array.isArray(gc)) {
        highColor = gc[0] || barColor;
        lowColor = gc[gc.length - 1] || barColor;
      } else {
        highColor = gc.highest || barColor;
        lowColor = gc.lowest || barColor;
      }
      const t = total <= 1 ? 0 : index / (total - 1);
      return interpolateColor(highColor, lowColor, t);
    }
    return barColor;
  };

  const annotationStartFrame = bars.length * staggerDelayFrames + 30;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: BG_COLOR,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "24px 40px",
      }}
    >
      {/* Title */}
      {chart.title && (
        <div
          style={{
            fontFamily: fontFamily || "Inter, sans-serif",
            fontSize: 52,
            fontWeight: 600,
            color: TEXT_COLOR,
            marginBottom: 24,
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
              {/* Label */}
              <div
                style={{
                  width: 360,
                  minWidth: 360,
                  fontFamily: fontFamily || "Inter, sans-serif",
                  fontSize: 28,
                  fontWeight: 500,
                  color: labelColor,
                  textAlign: "right",
                  paddingRight: 16,
                  opacity: labelOpacity,
                  lineHeight: 1.2,
                }}
              >
                {bar.label}
              </div>

              {/* Bar track */}
              <div
                style={{
                  flex: 1,
                  height: barHeight,
                  backgroundColor: TRACK,
                  borderRadius: 6,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: `${widthPct * barSpring}%`,
                    height: "100%",
                    backgroundColor: color,
                    borderRadius: 6,
                    transition: "none",
                  }}
                />
              </div>

              {/* Value label — wider to prevent clipping */}
              <div
                style={{
                  width: 320,
                  minWidth: 320,
                  fontFamily: fontFamily || "Inter, sans-serif",
                  fontSize: 24,
                  fontWeight: 600,
                  color: valueColor,
                  textAlign: "left",
                  paddingLeft: 16,
                  opacity: labelOpacity,
                  whiteSpace: "normal",
                  lineHeight: 1.3,
                }}
              >
                {bar.displayValue}
              </div>
            </div>
          );
        })}
      </div>

      {/* Annotation */}
      {annotation && (
        <div
          style={{
            textAlign: "center",
            marginTop: 28,
            padding: "12px 24px",
            backgroundColor: "rgba(240, 237, 232, 0.05)",
            borderLeft: `3px solid ${ACCENT_PINK}`,
            borderRadius: "0 6px 6px 0",
            alignSelf: "center",
            maxWidth: "85%",
            opacity: interpolate(
              frame - annotationStartFrame,
              [0, 15],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            ),
            transform: `translateY(${interpolate(
              frame - annotationStartFrame,
              [0, 15],
              [8, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            )}px)`,
          }}
        >
          <span
            style={{
              color: TEXT_MUTED,
              fontSize: 24,
              fontFamily: fontFamily || "Inter, sans-serif",
              fontWeight: 500,
              lineHeight: 1.5,
            }}
          >
            {annotation}
          </span>
        </div>
      )}
    </div>
  );
};
