import React from "react";
import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { DataChartInput } from "../../schemas";
import { TEXT, ACCENT_BLUE, POSITIVE, NEGATIVE, TRACK } from "../../palette";

interface CounterProps {
  chart: DataChartInput;
  brandColor: string;
  fontFamily: string;
}

const DEFAULT_FALLBACK_COLORS = [
  ACCENT_BLUE,
  ACCENT_BLUE,
  POSITIVE,
  NEGATIVE,
  TEXT,
];

const TEXT_COLOR = TEXT;
const MUTED_TEXT = "rgba(240, 237, 232, 0.6)"; // derived from TEXT, opacity 0.6
const TRACK_COLOR = TRACK;

/**
 * Animated counter with contextual title, accent line, and breakdown bars.
 * When items are provided, renders mini horizontal bars showing composition.
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

  // Subtle scale pulse when counter reaches target
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
    items.length > 0 ? Math.max(...items.map((it) => it.value)) : 0;

  const formatItemValue = (v: number): string => {
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
        padding: 80,
      }}
    >
      {/* Title */}
      {chart.title && (
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleTranslateY}px)`,
            color: "rgba(240, 237, 232, 0.6)",
            fontSize: 24,
            fontFamily,
            fontWeight: 500,
            letterSpacing: 4,
            textTransform: "uppercase",
            marginBottom: chart.subtitle ? 8 : 24,
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
            fontSize: 20,
            fontFamily,
            fontWeight: 400,
            marginBottom: 20,
            textAlign: "center",
            lineHeight: 1.5,
            maxWidth: 700,
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
              fontSize: 140,
              fontFamily,
              fontWeight: 700,
            }}
          >
            {prefix}
          </span>
        )}
        <span
          style={{
            color: TEXT,
            fontSize: 140,
            fontFamily,
            fontWeight: 700,
          }}
        >
          {formattedValue}
        </span>
        {suffix && (
          <span
            style={{
              color: "rgba(240, 237, 232, 0.5)",
              fontSize: 48,
              fontFamily,
              fontWeight: 500,
              marginLeft: 8,
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
          width: 80,
          height: 3,
          backgroundColor: brandColor,
          marginTop: 24,
          marginBottom: 24,
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
            gap: 8,
            marginTop: 8,
            width: "100%",
            maxWidth: 700,
          }}
        >
          {items.map((item, i) => {
            const itemSpring = spring({
              fps,
              frame: frame - 25 - i * 5,
              config: { damping: 14, stiffness: 80 },
            });

            const barPercent =
              maxItemValue > 0 ? (item.value / maxItemValue) * 100 : 0;
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
                  gap: 12,
                  opacity: itemOpacity,
                }}
              >
                {/* Label */}
                <div
                  style={{
                    width: 100,
                    minWidth: 100,
                    textAlign: "right",
                    color: MUTED_TEXT,
                    fontSize: 20,
                    fontFamily,
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.label}
                </div>

                {/* Bar track + filled bar */}
                <div
                  style={{
                    flex: 1,
                    height: 18,
                    backgroundColor: TRACK_COLOR,
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${barPercent * itemSpring}%`,
                      height: "100%",
                      backgroundColor: barColor,
                      borderRadius: 4,
                    }}
                  />
                </div>

                {/* Value */}
                <div
                  style={{
                    width: 80,
                    minWidth: 80,
                    color: TEXT_COLOR,
                    fontSize: 20,
                    fontFamily,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatItemValue(item.value)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
