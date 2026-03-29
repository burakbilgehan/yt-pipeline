import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { BG, TEXT, ACCENT_PINK, SAGE } from "../../palette";

// ─── Types ────────────────────────────────────────────────────

interface TextStep {
  text: string;
  weight?: number;
  size?: number;
  holdSec?: number;
  underlineColor?: string;
}

interface ClosingSequenceProps {
  chart: {
    type: "closing-sequence";
    textSequence?: TextStep[];
    channelName?: string;
    showSubscribe?: boolean;
    [key: string]: unknown;
  };
  brandColor: string;
  fontFamily: string;
}

// ─── Design tokens ────────────────────────────────────────────

const BG_COLOR = BG;
const TEXT_COLOR = TEXT;
const MUTED_PINK = ACCENT_PINK;

// Timing constants (seconds)
const STEP1_START = 0;
const STEP1_END = 3;
const STEP2_START = 3;
const STEP3_START = 6;
const STEP4_START = 9;
// Step 4 runs to scene end (~13.7s)

const FADE_FRAMES = 8;
const UNDERLINE_FRAMES = 15;

// ── YouTube End Screen Safe Zone ──────────────────────────────
// Bottom 35% of the screen is reserved for YouTube end screen
// overlays (subscribe button, next video recommendation).
// All text content must stay in the upper 65%.
const END_SCREEN_SAFE_TOP_PCT = 65; // max % from top for text content

const SPRING_CFG = { damping: 16, stiffness: 60 };

// ─── Component ────────────────────────────────────────────────

export const ClosingSequence: React.FC<ClosingSequenceProps> = ({
  chart,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const channelName = chart.channelName ?? "The World With Numbers";
  const showSubscribe = chart.showSubscribe ?? false;

  // Pull custom text from textSequence if provided, else use defaults
  const seq = chart.textSequence ?? [];
  const step1Text = seq[0]?.text ?? "Cheaper for whom?";
  const step2Text = seq[1]?.text ?? "Same data. Same math. Different ruler.";
  const step3Text = seq[2]?.text ?? "Different reality.";
  const step3Underline = seq[2]?.underlineColor ?? MUTED_PINK;

  // ── Frame boundaries ──
  const s1Start = STEP1_START * fps;
  const s1End = STEP1_END * fps;
  const s2Start = STEP2_START * fps;
  const s3Start = STEP3_START * fps;
  const s4Start = STEP4_START * fps;

  // ── Step 1: "Cheaper for whom?" ──
  const step1Entrance = spring({
    fps,
    frame: frame - s1Start,
    config: SPRING_CFG,
  });
  const step1FadeOut = interpolate(
    frame,
    [s1End - FADE_FRAMES, s1End],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const step1Opacity = frame < s1End
    ? Math.min(step1Entrance, 1) * (frame >= s1End - FADE_FRAMES ? step1FadeOut : 1)
    : 0;

  // ── Step 2: "Same data. Same math. Different ruler." ──
  const step2Entrance = spring({
    fps,
    frame: frame - s2Start,
    config: SPRING_CFG,
  });
  // Step 2 stays visible through to the end (no fade-out)
  const step2Opacity = frame >= s2Start
    ? Math.min(step2Entrance, 1)
    : 0;

  // ── Step 3: "Different reality." with underline ──
  const step3Entrance = spring({
    fps,
    frame: frame - s3Start,
    config: SPRING_CFG,
  });
  const step3Y = interpolate(step3Entrance, [0, 1], [16, 0]);
  // Step 3 stays visible through to the end (no fade-out)
  const step3Opacity = frame >= s3Start ? step3Entrance : 0;

  // Underline width animation (0 → 100% over UNDERLINE_FRAMES)
  const underlineProgress = interpolate(
    frame,
    [s3Start + 10, s3Start + 10 + UNDERLINE_FRAMES],
    [0, 100],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // ── Step 4: Channel identifier ──
  const step4Entrance = spring({
    fps,
    frame: frame - s4Start,
    config: { damping: 18, stiffness: 50 },
  });
  // Step 4 stays visible through to the end (no fade-out)
  const step4Opacity = frame >= s4Start ? step4Entrance : 0;

  const containerStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    backgroundColor: BG_COLOR,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    position: "relative",
    overflow: "hidden",
  };

  return (
    <div style={containerStyle}>
      {/* Step 1: "Cheaper for whom?" — upper-center, ~30% from top */}
      {frame < s2Start + FADE_FRAMES && (
        <div
          style={{
            position: "absolute",
            top: "30%",
            left: 0,
            right: 0,
            transform: "translateY(-50%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: step1Opacity,
          }}
        >
          <div
            style={{
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 700,
              fontSize: seq[0]?.size ?? 56,
              color: TEXT_COLOR,
              textAlign: "center",
              lineHeight: 1.2,
              padding: "0 120px",
              width: "100%",
            }}
          >
            {step1Text}
          </div>
        </div>
      )}

      {/* Steps 2-4: Upper text block — all above end screen safe zone */}
      {frame >= s2Start && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: `${END_SCREEN_SAFE_TOP_PCT}%`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 32,
            padding: "0 120px",
          }}
        >
          {/* Step 2: "Same data. Same math. Different ruler." — ~45% from top */}
          <div
            style={{
              opacity: step2Opacity,
              fontFamily: "Montserrat, sans-serif",
              fontWeight: seq[1]?.weight ?? 400,
              fontSize: seq[1]?.size ?? 36,
              color: TEXT_COLOR,
              textAlign: "center",
              lineHeight: 1.4,
              width: "100%",
            }}
          >
            {step2Text}
          </div>

          {/* Step 3: "Different reality." with animated underline — ~55% from top */}
          {frame >= s3Start && (
            <div
              style={{
                opacity: step3Opacity,
                transform: `translateY(${step3Y}px)`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  fontFamily: "Montserrat, sans-serif",
                  fontWeight: seq[2]?.weight ?? 600,
                  fontSize: seq[2]?.size ?? 40,
                  color: TEXT_COLOR,
                  textAlign: "center",
                  lineHeight: 1.4,
                  position: "relative",
                  display: "inline-block",
                }}
              >
                {step3Text}
                {/* Animated underline */}
                <div
                  style={{
                    position: "absolute",
                    bottom: -6,
                    left: "50%",
                    transform: "translateX(-50%)",
                    height: 3,
                    width: `${underlineProgress}%`,
                    backgroundColor: step3Underline,
                    borderRadius: 2,
                  }}
                />
              </div>
            </div>
          )}

          {/* Step 4: Channel identifier — inside safe zone, below step 3 */}
          {frame >= s4Start && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                opacity: step4Opacity,
                marginTop: 16,
              }}
            >
              <div
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 18,
                  color: SAGE,
                  letterSpacing: "0.04em",
                }}
              >
                {channelName}
              </div>
              {showSubscribe && (
                <div
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: 14,
                    color: TEXT_COLOR,
                    opacity: 0.4,
                  }}
                >
                  Subscribe
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* End screen safe zone — bottom 35%, kept empty for YouTube overlays */}
    </div>
  );
};
