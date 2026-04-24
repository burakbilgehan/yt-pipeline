import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";
import { TEXT, TEXT_MUTED, TEXT_FAINT, BG } from "../../palette";

interface ScoreboardItem {
  label: string;
  value: number;
  color: string;
  suffix?: string;
  /** Optional period label (e.g. "1925-2025") */
  period?: string;
}

interface ScoreboardProps {
  /** Title above the scoreboard */
  title?: string;
  /** Items to display, should be pre-sorted */
  items: ScoreboardItem[];
  /** Footer text below the bars */
  footerText?: string;
  /** Background color */
  backgroundColor?: string;
  /** Font family */
  fontFamily?: string;
  /** Max bar width as percentage of available width */
  maxBarWidth?: number;
  /** Hide proportional bars — useful when items use different units */
  showBars?: boolean;
}

/**
 * Scoreboard — Ranked bar chart, editorial light theme.
 *
 * Phase 1 (0-0.5s): Title fades in
 * Phase 2 (0.3-3s): Bars stagger in from top to bottom
 * Phase 3 (3s+): Hold state
 */
export const Scoreboard: React.FC<ScoreboardProps> = ({
  title,
  items,
  footerText,
  backgroundColor = BG,
  fontFamily = "Montserrat, sans-serif",
  maxBarWidth = 65,
  showBars = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isDarkBg = (() => {
    if (backgroundColor.startsWith("#") && backgroundColor.length >= 7) {
      const r = parseInt(backgroundColor.slice(1, 3), 16);
      const g = parseInt(backgroundColor.slice(3, 5), 16);
      const b = parseInt(backgroundColor.slice(5, 7), 16);
      return (r * 299 + g * 587 + b * 114) / 1000 < 128;
    }
    return backgroundColor.startsWith("#0") || backgroundColor.startsWith("#1") || backgroundColor.startsWith("#2") || backgroundColor.startsWith("#3");
  })();
  const textPrimary = isDarkBg ? TEXT : "#1a1a1a";
  const textMuted = isDarkBg ? TEXT_MUTED : "rgba(0,0,0,0.25)";
  const textSubtle = isDarkBg ? TEXT_FAINT : "rgba(0,0,0,0.18)";
  const barTrackBg = isDarkBg ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.04)";

  const maxAbsValue = Math.max(...items.map((item) => Math.abs(item.value)));
  const staggerDelay = fps * 0.15;

  const titleOpacity = interpolate(frame, [0, fps * 0.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        fontFamily,
        padding: "40px 60px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Title */}
      {title && (
        <div
          style={{
            fontSize: 36,
            fontWeight: 800,
            color: textPrimary,
            opacity: titleOpacity,
            marginBottom: 32,
            textAlign: "center",
            letterSpacing: 1,
          }}
        >
          {title}
        </div>
      )}

      {/* Bars container */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 6,
        }}
      >
        {items.map((item, i) => {
          const barFrame = frame - fps * 0.3 - i * staggerDelay;
          const isPositive = item.value >= 0;

          const entrance = spring({
            fps,
            frame: barFrame,
            config: { damping: 16, stiffness: 80 },
          });

          const barWidthPercent =
            (Math.abs(item.value) / maxAbsValue) * maxBarWidth;
          const barWidth = interpolate(entrance, [0, 1], [0, barWidthPercent]);
          const displayValue = interpolate(entrance, [0, 1], [0, item.value]);

          // Use item color for bar, with reduced opacity for track-like feel
          const barColor = item.color || (isPositive
            ? "rgba(45, 139, 78, 0.6)"
            : "rgba(192, 57, 43, 0.5)");

          const textColor = item.color || (isPositive ? "#2D8B4E" : "#C0392B");

          return (
            <div
              key={item.label}
              style={{
                display: "flex",
                alignItems: "center",
                opacity: entrance,
                transform: `translateX(${interpolate(entrance, [0, 1], [-30, 0])}px)`,
                height: 52,
              }}
            >
              {/* Rank number */}
              <div
                style={{
                  width: 30,
                  fontSize: 20,
                  fontWeight: 600,
                  color: textMuted,
                  textAlign: "right",
                  marginRight: 12,
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </div>

              {/* Asset label */}
              <div
                style={{
                  width: 140,
                  fontSize: 20,
                  fontWeight: 700,
                  color: item.color,
                  flexShrink: 0,
                }}
              >
                {item.label}
              </div>

              {/* Bar */}
              {showBars && (
                <div
                  style={{
                    flex: 1,
                    height: 32,
                    backgroundColor: barTrackBg,
                    borderRadius: 0,
                    overflow: "hidden",
                    position: "relative",
                    marginRight: 16,
                  }}
                >
                  <div
                    style={{
                      width: `${barWidth}%`,
                      height: "100%",
                      backgroundColor: barColor,
                      borderRadius: 0,
                    }}
                  />
                </div>
              )}
              {!showBars && <div style={{ flex: 1 }} />}

              {/* Value + Period */}
              <div
                style={{
                  width: 200,
                  flexShrink: 0,
                  textAlign: "right",
                }}
              >
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: textColor,
                    fontVariantNumeric: "tabular-nums",
                    lineHeight: 1.2,
                  }}
                >
                  {isPositive && item.value > 0 ? "+" : ""}
                  {Number.isInteger(item.value) ? Math.round(displayValue) : displayValue.toFixed(displayValue >= 10 ? 1 : 2)}
                  {item.suffix ?? ""}
                </div>
                {item.period && (
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: textMuted,
                      lineHeight: 1.2,
                      marginTop: 2,
                    }}
                  >
                    {item.period}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {footerText && (
        <div
          style={{
            textAlign: "center",
            fontSize: 20,
            color: textSubtle,
            marginTop: 20,
            letterSpacing: 2,
            textTransform: "uppercase",
            opacity: interpolate(
              frame,
              [fps * 2.5, fps * 3.5],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            ),
          }}
        >
          {footerText}
        </div>
      )}
    </AbsoluteFill>
  );
};
