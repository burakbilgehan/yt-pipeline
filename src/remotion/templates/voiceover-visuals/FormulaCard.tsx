import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";

interface FormulaCardProps {
  /** Parts of the formula to animate in sequence */
  formulaParts?: string[];
  /** Example line (e.g. "Oil $67 ÷ Gold $2990 = 0.022 oz") */
  example?: string;
  /** Data badge text at bottom (e.g. "175,000+ daily data points · 9 assets · 100 years") */
  dataBadge?: string;
  /** Background color */
  backgroundColor?: string;
  /** Accent color */
  accentColor?: string;
  /** Font family */
  fontFamily?: string;
}

/**
 * FormulaCard — Animated formula explanation.
 *
 * Each formula part slides/fades in with staggered timing.
 * Then the example line appears below with a different style.
 *
 * Phase 1 (0-3s): Formula parts animate in one by one
 * Phase 2 (3-5s): Example line fades in
 * Phase 3 (5s+): Hold, then fade out
 *
 * Designed for Scene 2 (18s scene), first 6s are animated.
 */
export const FormulaCard: React.FC<FormulaCardProps> = ({
  formulaParts = ["Asset Price", "÷", "Gold Price", "=", "Gold Ratio"],
  example,
  dataBadge,
  backgroundColor = "#0a0a0a", // intentionally different from palette BG — dark formula-card theme
  accentColor = "#FFD700",
  fontFamily = "Inter, sans-serif",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const staggerDelay = fps * 0.4; // 0.4s between each part

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        fontFamily,
      }}
    >
      {/* Formula container */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          flexWrap: "wrap",
          justifyContent: "center",
          maxWidth: "85%",
        }}
      >
        {formulaParts.map((part, i) => {
          const partFrame = frame - i * staggerDelay;
          const isOperator = part === "÷" || part === "=" || part === "×" || part === "+";

          const entrance = spring({
            fps,
            frame: partFrame,
            config: { damping: 14, stiffness: 70 },
          });

          const slideY = interpolate(entrance, [0, 1], [30, 0]);

          return (
            <div
              key={i}
              style={{
                opacity: entrance,
                transform: `translateY(${slideY}px)`,
                display: "flex",
                alignItems: "center",
              }}
            >
              {isOperator ? (
                <span
                  style={{
                    fontSize: 56,
                    fontWeight: 300,
                    color: "rgba(255, 255, 255, 0.4)",
                    padding: "0 8px",
                  }}
                >
                  {part}
                </span>
              ) : (
                <div
                  style={{
                    backgroundColor: part.includes("Ratio")
                      ? `${accentColor}22`
                      : "rgba(255, 255, 255, 0.06)",
                    border: part.includes("Ratio")
                      ? `2px solid ${accentColor}66`
                      : "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: 12,
                    padding: "16px 28px",
                  }}
                >
                  <span
                    style={{
                      fontSize: 42,
                      fontWeight: 700,
                      color: part.includes("Ratio") ? accentColor : "#FFFFFF",
                      letterSpacing: 0.5,
                    }}
                  >
                    {part}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Example line */}
      {example && (
        <div
          style={{
            marginTop: 48,
            opacity: interpolate(
              frame,
              [fps * 3, fps * 4],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            ),
            transform: `translateY(${interpolate(
              frame,
              [fps * 3, fps * 4],
              [15, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.quad) }
            )}px)`,
          }}
        >
          <div
            style={{
              fontSize: 26,
              fontWeight: 400,
              color: "rgba(255, 255, 255, 0.45)",
              letterSpacing: 2,
              textTransform: "uppercase",
              marginBottom: 12,
              textAlign: "center",
            }}
          >
            Example
          </div>
          <div
            style={{
              fontSize: 34,
              fontWeight: 500,
              color: "rgba(255, 255, 255, 0.7)",
              backgroundColor: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 10,
              padding: "14px 32px",
              letterSpacing: 1,
              textAlign: "center",
            }}
          >
            {example}
          </div>
        </div>
      )}

      {/* Data point count badge */}
      {dataBadge && (
        <div
          style={{
            position: "absolute",
            bottom: "15%",
            opacity: interpolate(
              frame,
              [fps * 4.5, fps * 5.5],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            ),
            fontSize: 24,
            fontWeight: 500,
            color: "rgba(255, 255, 255, 0.35)",
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          {dataBadge}
        </div>
      )}
    </AbsoluteFill>
  );
};
