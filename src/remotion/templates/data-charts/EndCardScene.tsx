import React from "react";
import {
  spring,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import type { DataChartInput } from "../../schemas";
import { BG, TEXT, TEXT_FAINT, ACCENT_PINK } from "../../palette";

// ─── Types ────────────────────────────────────────────────────

export interface EndCardConfig {
  type: "end-card";
  fadeToBlack: boolean;
  fadeToBlackDuration?: string;
  backgroundColor: string;
  watermark: boolean;
  channelName?: string;
  silenceHold?: string;
  finalQuestion?: string;
  finalQuestionColor?: string;
  gapLabel?: string;
  youtubeEndScreen?: {
    enabled: boolean;
    startAt?: string;
    subscribePlacement?: string;
    nextVideoPlacement?: string;
  };
}

interface EndCardSceneProps {
  chart: DataChartInput;
  brandColor: string;
  fontFamily: string;
}

// ─── Theme (defaults — overridden by brandColor prop) ─────────

const DEFAULT_BG = BG;
const DEFAULT_TEXT = TEXT;
const DEFAULT_MUTED = TEXT_FAINT;

// ─── Component ────────────────────────────────────────────────

export const EndCardScene: React.FC<EndCardSceneProps> = ({
  chart,
  brandColor,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const cfg = chart as unknown as EndCardConfig;
  const accent = brandColor || ACCENT_PINK;
  const finalQuestion = cfg.finalQuestion || "";
  const finalQuestionColor = cfg.finalQuestionColor || DEFAULT_TEXT;
  const gapLabel = cfg.gapLabel || "";
  const bgColor = cfg.backgroundColor || DEFAULT_BG;
  const channelName = cfg.channelName || "";

  // ── Animation phases ──
  // Phase 1: Gap label pulses (0 → 3s)
  const gapIn = spring({
    fps,
    frame,
    config: { damping: 18, stiffness: 60 },
  });

  // Gap label pulse effect
  const gapPulse = frame > 10
    ? interpolate(
        Math.sin((frame - 10) * 0.08),
        [-1, 1],
        [0.85, 1.0]
      )
    : 1;

  // Phase 2: Final question fades in (~4s)
  const questionTrigger = Math.round(fps * 4);
  const questionIn = spring({
    fps,
    frame: Math.max(0, frame - questionTrigger),
    config: { damping: 15, stiffness: 40 },
  });

  // Phase 3: Fade to black (last ~2s of scene)
  const fadeToBlackStart = durationInFrames - Math.round(fps * 2);
  const fadeToBlack = cfg.fadeToBlack
    ? interpolate(
        frame,
        [fadeToBlackStart, durationInFrames],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      )
    : 0;

  // Phase 4: Watermark appears after fade starts
  const watermarkIn = cfg.watermark
    ? spring({
        fps,
        frame: Math.max(0, frame - fadeToBlackStart + Math.round(fps * 0.5)),
        config: { damping: 25, stiffness: 60 },
      })
    : 0;

  // YouTube end screen area (last 20s)
  const endScreenStart = durationInFrames - Math.round(fps * 20);
  const showEndScreen = frame >= endScreenStart && cfg.youtubeEndScreen?.enabled;

  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        backgroundColor: bgColor,
        position: "relative",
        overflow: "hidden",
        fontFamily,
      }}
    >
      {/* ── Gap Label (pulsing numbers) ── */}
      {gapLabel && (
        <div
          style={{
            position: "absolute",
            top: 280,
            left: 0,
            right: 0,
            textAlign: "center" as const,
            opacity: gapIn * (1 - fadeToBlack),
          }}
        >
          <span
            style={{
              color: accent,
              fontSize: 42,
              fontWeight: 700,
              fontFamily: "JetBrains Mono, monospace",
              letterSpacing: 4,
              transform: `scale(${gapPulse})`,
              display: "inline-block",
              textShadow: `0 0 40px ${accent}30`,
            }}
          >
            {gapLabel}
          </span>
        </div>
      )}

      {/* ── Final Question ── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 200px",
          opacity: questionIn * (1 - fadeToBlack * 0.5),
        }}
      >
        <h1
          style={{
            color: finalQuestionColor,
            fontSize: 52,
            fontWeight: 600,
            textAlign: "center" as const,
            lineHeight: 1.4,
            transform: `translateY(${interpolate(questionIn, [0, 1], [30, 0])}px)`,
            textShadow: "0 2px 30px rgba(0,0,0,0.5)",
            margin: 0,
          }}
        >
          {finalQuestion}
        </h1>
      </div>

      {/* ── Fade to black overlay ── */}
      {cfg.fadeToBlack && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: bgColor,
            opacity: fadeToBlack,
            pointerEvents: "none" as const,
          }}
        />
      )}

      {/* ── Channel Watermark ── */}
      {cfg.watermark && watermarkIn > 0.05 && channelName && (
        <div
          style={{
            position: "absolute",
            bottom: 60,
            left: 0,
            right: 0,
            textAlign: "center" as const,
            opacity: watermarkIn * 0.6,
          }}
        >
          <span
            style={{
              color: DEFAULT_MUTED,
              fontSize: 16,
              fontWeight: 500,
              letterSpacing: 4,
              textTransform: "uppercase" as const,
            }}
          >
            {channelName}
          </span>
        </div>
      )}

      {/* ── YouTube End Screen Placeholders ── */}
      {showEndScreen && (
        <>
          {/* Subscribe button placeholder (bottom-right) */}
          <div
            style={{
              position: "absolute",
              bottom: 140,
              right: 160,
              width: 200,
              height: 200,
              borderRadius: "50%",
              border: `2px dashed rgba(240, 237, 232, 0.15)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: interpolate(
                frame,
                [endScreenStart, endScreenStart + 30],
                [0, 0.4],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              ),
            }}
          >
            <span
              style={{
                color: "rgba(240, 237, 232, 0.2)",
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: 1,
                textTransform: "uppercase" as const,
              }}
            >
              Subscribe
            </span>
          </div>

          {/* Next video placeholder (bottom-left) */}
          <div
            style={{
              position: "absolute",
              bottom: 140,
              left: 160,
              width: 320,
              height: 180,
              borderRadius: 12,
              border: `2px dashed rgba(240, 237, 232, 0.15)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: interpolate(
                frame,
                [endScreenStart, endScreenStart + 30],
                [0, 0.4],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              ),
            }}
          >
            <span
              style={{
                color: "rgba(240, 237, 232, 0.2)",
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: 1,
                textTransform: "uppercase" as const,
              }}
            >
              Next Video
            </span>
          </div>
        </>
      )}
    </div>
  );
};
