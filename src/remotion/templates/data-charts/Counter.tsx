import React from "react";
import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { DataChartInput } from "../../schemas";
import { TEXT, ACCENT_PINK, ACCENT_BLUE, POSITIVE, NEGATIVE, TRACK } from "../../palette";

interface CounterProps {
  chart: DataChartInput;
  brandColor: string;
  fontFamily: string;
}

const DEFAULT_FALLBACK_COLORS = [
  ACCENT_PINK,
  ACCENT_BLUE,
  POSITIVE,
  NEGATIVE,
  TEXT,
];

const TEXT_COLOR = TEXT;
const MUTED_TEXT = "rgba(240, 237, 232, 0.6)";
const TRACK_COLOR = TRACK;

/**
 * Animated counter with contextual title, accent line, and breakdown bars.
 *
 * Fixes applied:
 * - Suffix rendered in Accent Pink (was muted gray)
 * - Main counter font size increased to 220px (was 180px) for better screen utilization
 * - Suffix font size increased to 88px (was 72px)
 * - Breakdown bars use log-scale when range is extreme (e.g. 1× vs 570×)
 * - Bar widths use `maxWidth: 1200` for wider usage
 */
export const Counter: React.FC<CounterProps> = ({
  chart,
  brandColor,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const targetValue = chart.counterValue || 0;
  const prefix = chart.counterPrefix || "";
  const suffix = chart.counterSuffix || "";
  const items = chart.items || [];

  // --- Animation springs ---

  const titleProgress = spring({
    fps,
    frame,
    config: { damping: 200 },
  });

  const countProgress = spring({
    fps,
    frame: frame - 5,
    config: { damping: 30, stiffness: 40 },
  });

  const detailsProgress = spring({
    fps,
    frame: frame - 15,
    config: { damping: 200 },
  });

  const pulseStart = 45;
  const pulseMid = 55;
  const pulseEnd = 65;
  const pulseScale = interpolate(
    frame,
    [pulseStart, pulseMid, pulseEnd],
    [1.0, 1.02, 1.0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  // --- Computed values ---
  const currentValue = Math.round(targetValue * countProgress);
  const formattedValue = currentValue.toLocaleString();

  const titleOpacity = interpolate(titleProgress, [0, 1], [0, 1], {
    extrapolateRight: "clamp",
  });
  const titleTranslateY = interpolate(titleProgress, [0, 1], [12, 0], {
    extrapolateRight: "clamp",
  });

  const numberOpacity = interpolate(countProgress, [0, 0.15], [0, 1], {
    extrapolateRight: "clamp",
  });

  const detailsOpacity = interpolate(detailsProgress, [0, 1], [0, 1], {
    extrapolateRight: "clamp",
  });
  const detailsTranslateY = interpolate(detailsProgress, [0, 1], [10, 0], {
    extrapolateRight: "clamp",
  });

  const maxItemValue =
    items.length > 0 ? Math.max(...items.filter((it) => it.value != null).map((it) => it.value)) : 0;
  const minItemValue =
    items.length > 0 ? Math.min(...items.filter((it) => it.value != null && it.value > 0).map((it) => it.value)) : 0;

  // Use log-scale for bars when the ratio between max and min is > 20×
  // This prevents a 1× bar from being invisible next to a 570× bar.
  const useLogScale = minItemValue > 0 && maxItemValue / minItemValue > 20;

  const getBarPercent = (value: number): number => {
    if (maxItemValue <= 0 || value == null) return 0;
    if (useLogScale) {
      // Log-scale: map log(value) to 10%–100% range
      const logMin = Math.log10(Math.max(minItemValue, 1));
      const logMax = Math.log10(maxItemValue);
      const logVal = Math.log10(Math.max(value, 1));
      const range = logMax - logMin;
      if (range <= 0) return 50;
      return 10 + ((logVal - logMin) / range) * 90;
    }
    return (value / maxItemValue) * 100;
  };

  const formatItemValue = (v: number | null | undefined, displayValue?: string): string => {
    if (displayValue) return displayValue;
    if (v == null) return "—";
    return `${prefix}${v.toLocaleString()}${suffix}`;
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 60px",
      }}
    >
      {/* Title */}
      {chart.title && (
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleTranslateY}px)`,
            color: "rgba(240, 237, 232, 0.6)",
            fontSize: 36,
            fontFamily,
            fontWeight: 500,
            letterSpacing: 5,
            textTransform: "uppercase",
            marginBottom: chart.subtitle ? 8 : 28,
            textAlign: "center",
          }}
        >
          {chart.title}
        </div>
      )}

      {/* Subtitle */}
      {chart.subtitle && (
        <div
          style={{
            opacity: titleOpacity,
            color: "rgba(240, 237, 232, 0.45)",
            fontSize: 28,
            fontFamily,
            fontWeight: 400,
            marginBottom: 24,
            textAlign: "center",
            lineHeight: 1.5,
            maxWidth: 1000,
          }}
        >
          {chart.subtitle}
        </div>
      )}

      {/* Main counter number */}
      <div
        style={{
          opacity: numberOpacity,
          transform: `scale(${pulseScale})`,
          display: "flex",
          alignItems: "baseline",
          lineHeight: 1,
        }}
      >
        {prefix && (
          <span
            style={{
              color: brandColor,
              fontSize: 220,
              fontFamily: "JetBrains Mono, monospace",
              fontWeight: 700,
            }}
          >
            {prefix}
          </span>
        )}
        <span
          style={{
            color: TEXT,
            fontSize: 220,
            fontFamily: "JetBrains Mono, monospace",
            fontWeight: 700,
          }}
        >
          {formattedValue}
        </span>
        {suffix && (
          <span
            style={{
              color: ACCENT_PINK,
              fontSize: 88,
              fontFamily: "JetBrains Mono, monospace",
              fontWeight: 600,
              marginLeft: 10,
            }}
          >
            {suffix}
          </span>
        )}
      </div>

      {/* Accent line */}
      <div
        style={{
          opacity: detailsOpacity,
          transform: `translateY(${detailsTranslateY}px)`,
          width: 100,
          height: 3,
          backgroundColor: brandColor,
          marginTop: 28,
          marginBottom: 28,
          borderRadius: 2,
        }}
      />

      {/* Breakdown bars */}
      {items.length > 0 && (
        <div
          style={{
            opacity: detailsOpacity,
            transform: `translateY(${detailsTranslateY}px)`,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginTop: 8,
            width: "100%",
            maxWidth: 1200,
          }}
        >
          {items.map((item, i) => {
            const itemSpring = spring({
              fps,
              frame: frame - 25 - i * 5,
              config: { damping: 14, stiffness: 80 },
            });

            const barPercent = getBarPercent(item.value);
            const barColor =
              item.color || DEFAULT_FALLBACK_COLORS[i % DEFAULT_FALLBACK_COLORS.length];

            const itemOpacity = interpolate(itemSpring, [0, 0.3], [0, 1], {
              extrapolateRight: "clamp",
            });

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  opacity: itemOpacity,
                }}
              >
                {/* Label */}
                <div
                  style={{
                    width: 200,
                    minWidth: 200,
                    textAlign: "right",
                    color: MUTED_TEXT,
                    fontSize: 28,
                    fontFamily,
                    fontWeight: 500,
                    lineHeight: 1.2,
                  }}
                >
                  {item.label}
                </div>

                {/* Bar track + filled bar */}
                <div
                  style={{
                    flex: 1,
                    height: 44,
                    backgroundColor: TRACK_COLOR,
                    borderRadius: 6,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${barPercent * itemSpring}%`,
                      height: "100%",
                      backgroundColor: barColor,
                      borderRadius: 6,
                    }}
                  />
                </div>

                {/* Value */}
                <div
                  style={{
                    width: 170,
                    minWidth: 170,
                    color: TEXT_COLOR,
                    fontSize: 28,
                    fontFamily,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatItemValue(item.value, (item as any).displayValue)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
