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
  font?: string;
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
    endScreenSafe?: boolean; // keep right 20% clear
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
const STEP2_END = 6;
const STEP3_START = 6;
const STEP3_END = 9;
const STEP4_START = 9;
// Step 4 runs to scene end (~13.7s)

const FADE_FRAMES = 8;
const UNDERLINE_FRAMES = 15;

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
  const endScreenSafe = chart.endScreenSafe ?? true;

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
  const s2End = STEP2_END * fps;
  const s3Start = STEP3_START * fps;
  const s3End = STEP3_END * fps;
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
  const step2FadeOut = interpolate(
    frame,
    [s2End - FADE_FRAMES, s2End + FADE_FRAMES],
    [1, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  // Step 2 stays visible through step 3
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
  const step4Opacity = frame >= s4Start ? step4Entrance : 0;

  // Container padding to keep right 20% clear for YouTube end screen
  const containerStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    backgroundColor: BG_COLOR,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    paddingRight: endScreenSafe ? "20%" : 0,
  };

  return (
    <div style={containerStyle}>
      {/* Step 1: "Cheaper for whom?" — centered, fades in with spring, crossfades out */}
      {frame < s2Start + FADE_FRAMES && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: step1Opacity,
            paddingRight: endScreenSafe ? "20%" : 0,
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
              padding: "0 80px",
            }}
          >
            {step1Text}
          </div>
        </div>
      )}

      {/* Steps 2-3: Central text block */}
      {frame >= s2Start && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 32,
          }}
        >
          {/* Step 2: "Same data. Same math. Different ruler." */}
          <div
            style={{
              opacity: step2Opacity,
              fontFamily: seq[1]?.font ?? "Montserrat, sans-serif",
              fontWeight: seq[1]?.weight ?? 400,
              fontSize: seq[1]?.size ?? 36,
              color: TEXT_COLOR,
              textAlign: "center",
              lineHeight: 1.4,
              padding: "0 80px",
            }}
          >
            {step2Text}
          </div>

          {/* Step 3: "Different reality." with animated underline */}
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
                  fontFamily: seq[2]?.font ?? "Montserrat, sans-serif",
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
        </div>
      )}

      {/* Step 4: Channel identifier — bottom of frame */}
      {frame >= s4Start && (
        <div
          style={{
            position: "absolute",
            bottom: 80,
            left: 0,
            right: endScreenSafe ? "20%" : 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            opacity: step4Opacity,
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
  );
};
