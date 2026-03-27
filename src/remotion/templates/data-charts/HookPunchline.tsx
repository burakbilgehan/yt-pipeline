import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Easing,
} from "remotion";

/**
 * HookPunchline — Scene 002 (5.7s)
 *
 * Visual sequence:
 * 0–2s: Quick flash showing 6 horizontal bars — 2 above baseline (red zone),
 *       4 below (green zone). Bars animate with fast spring.
 * ~2s: Everything blurs (CSS filter: blur(12px)) and darkens.
 * ~3s: Text fades in center: "So why doesn't it feel that way?"
 * 3–5.7s: Text holds, breathing room.
 *
 * Background: #1A1B22
 */

interface HookPunchlineProps {
  chart: {
    type: "hook-punchline";
    questionText?: string;
    aboveLine?: string[];
    belowLine?: string[];
    [key: string]: unknown;
  };
  brandColor: string;
  fontFamily: string;
}

const BG_COLOR = "#1A1B22";
const ACCENT_CREAM = "#EAE0D5";
const MUTED_RED = "#E06070";
const MUTED_GREEN = "#5BBF8C";

const DEFAULT_ABOVE = ["Eggs", "Coffee"];
const DEFAULT_BELOW = ["Chips", "Milk", "Peanut Butter", "Ice Cream"];

export const HookPunchline: React.FC<HookPunchlineProps> = ({
  chart,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;

  const questionText = chart.questionText ?? "So why doesn't it feel that way?";
  const aboveLine = chart.aboveLine ?? DEFAULT_ABOVE;
  const belowLine = chart.belowLine ?? DEFAULT_BELOW;

  const allBars = [
    ...aboveLine.map((name) => ({ name, zone: "above" as const })),
    ...belowLine.map((name) => ({ name, zone: "below" as const })),
  ];

  // ── Phase 1: Bars animate in (0–2s) ──────────────────────
  // Fast spring for each bar, staggered by 3 frames
  const barMaxWidth = 600; // max bar pixel width

  // ── Phase 2: Blur + darken (~2s) ─────────────────────────
  const blurAmount = interpolate(time, [1.8, 2.3], [0, 12], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const darkenOpacity = interpolate(time, [1.8, 2.5], [0, 0.75], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  // ── Phase 3: Question text fade in (~3s) ─────────────────
  const textOpacity = interpolate(
    frame,
    [Math.round(2.8 * fps), Math.round(3.3 * fps)],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.33, 1, 0.68, 1),
    },
  );

  // Baseline position
  const baselineY = 540; // vertical center
  const barHeight = 36;
  const barGap = 10;

  // Centering constants — label area 160px + bar area
  const chartLeft = 520; // label start
  const barLeft = 680;   // bar start (chartLeft + 160 label width)

  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        backgroundColor: BG_COLOR,
        position: "relative",
        overflow: "hidden",
        fontFamily: fontFamily || "Inter, sans-serif",
      }}
    >
      {/* ── Bars layer (blurs after 2s) ── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          filter: `blur(${blurAmount}px)`,
        }}
      >
        {/* Red zone background (above baseline) */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: baselineY,
            backgroundColor: MUTED_RED,
            opacity: 0.1,
          }}
        />
        {/* Green zone background (below baseline) */}
        <div
          style={{
            position: "absolute",
            top: baselineY,
            left: 0,
            width: "100%",
            height: 1080 - baselineY,
            backgroundColor: MUTED_GREEN,
            opacity: 0.1,
          }}
        />

        {/* Baseline */}
        <div
          style={{
            position: "absolute",
            top: baselineY - 1,
            left: 300,
            right: 300,
            height: 2,
            backgroundColor: ACCENT_CREAM,
            opacity: 0.4,
          }}
        />

        {/* Bars — above line (grow upward from baseline) */}
        {aboveLine.map((name, i) => {
          const barSpring = spring({
            frame,
            fps,
            config: { damping: 20, stiffness: 200 },
            delay: i * 3,
          });
          // Random-ish widths for visual interest (deterministic per index)
          const widthFraction = 0.5 + ((i * 37 + 13) % 20) / 40;
          const barW = interpolate(barSpring, [0, 1], [0, barMaxWidth * widthFraction]);
          const yPos = baselineY - (i + 1) * (barHeight + barGap);

          return (
            <div key={`above-${name}`} style={{ position: "absolute" }}>
              {/* Bar */}
              <div
                style={{
                  position: "absolute",
                  top: yPos,
                  left: barLeft,
                  width: barW,
                  height: barHeight,
                  backgroundColor: MUTED_RED,
                  borderRadius: 4,
                  opacity: 0.85,
                }}
              />
              {/* Label */}
              <div
                style={{
                  position: "absolute",
                  top: yPos + 6,
                  left: chartLeft,
                  width: 150,
                  textAlign: "right",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 18,
                  fontWeight: 600,
                  color: ACCENT_CREAM,
                  opacity: barSpring,
                  whiteSpace: "nowrap",
                }}
              >
                {name}
              </div>
            </div>
          );
        })}

        {/* Bars — below line (grow downward from baseline) */}
        {belowLine.map((name, i) => {
          const barSpring = spring({
            frame,
            fps,
            config: { damping: 20, stiffness: 200 },
            delay: (aboveLine.length + i) * 3,
          });
          const widthFraction = 0.4 + ((i * 29 + 7) % 25) / 50;
          const barW = interpolate(barSpring, [0, 1], [0, barMaxWidth * widthFraction]);
          const yPos = baselineY + barGap + i * (barHeight + barGap);

          return (
            <div key={`below-${name}`} style={{ position: "absolute" }}>
              {/* Bar */}
              <div
                style={{
                  position: "absolute",
                  top: yPos,
                  left: barLeft,
                  width: barW,
                  height: barHeight,
                  backgroundColor: MUTED_GREEN,
                  borderRadius: 4,
                  opacity: 0.85,
                }}
              />
              {/* Label */}
              <div
                style={{
                  position: "absolute",
                  top: yPos + 6,
                  left: chartLeft,
                  width: 150,
                  textAlign: "right",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 18,
                  fontWeight: 600,
                  color: ACCENT_CREAM,
                  opacity: barSpring,
                  whiteSpace: "nowrap",
                }}
              >
                {name}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Darken overlay ── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: BG_COLOR,
          opacity: darkenOpacity,
          zIndex: 2,
        }}
      />

      {/* ── Question text ── */}
      {textOpacity > 0 && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3,
          }}
        >
          <div
            style={{
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 700,
              fontSize: 48,
              color: ACCENT_CREAM,
              opacity: textOpacity,
              textAlign: "center",
              maxWidth: 1200,
              lineHeight: 1.3,
              letterSpacing: "0.01em",
            }}
          >
            {questionText}
          </div>
        </div>
      )}
    </div>
  );
};
