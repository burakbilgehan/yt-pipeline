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
  const channelName = (cfg as any).channelName || (chart as any).channelName || "";
  const showSourcesNote = (chart as any).showSourcesNote === true;

  // ── Animation phases ──
  const channelNameIn = spring({
    fps,
    frame,
    config: { damping: 18, stiffness: 60 },
  });

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
  const showEndScreen = frame >= endScreenStart && (cfg.youtubeEndScreen?.enabled || (chart as any).youtubeEndScreen?.enabled);

  // Determine if this is a simple end card (channelName present, no question/gap)
  const isSimpleEndCard = channelName && !finalQuestion && !gapLabel;

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
      {/* ── Simple End Card: Channel Name + Sources Note centered ── */}
      {isSimpleEndCard && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 24,
            opacity: channelNameIn,
            transform: `translateY(${interpolate(channelNameIn, [0, 1], [20, 0])}px)`,
          }}
        >
          {/* Channel name */}
          <h1
            style={{
              color: DEFAULT_TEXT,
              fontSize: 64,
              fontWeight: 700,
              fontFamily: "Montserrat, sans-serif",
              letterSpacing: 2,
              textAlign: "center",
              margin: 0,
              padding: "0 100px",
            }}
          >
            {channelName}
          </h1>

          {/* Accent underline */}
          <div
            style={{
              width: 120,
              height: 3,
              backgroundColor: accent,
              borderRadius: 2,
              opacity: 0.8,
            }}
          />

          {/* Sources in description */}
          {showSourcesNote && (
            <p
              style={{
                color: DEFAULT_MUTED,
                fontSize: 28,
                fontWeight: 400,
                fontFamily: "Montserrat, sans-serif",
                letterSpacing: 1,
                margin: 0,
                marginTop: 8,
              }}
            >
              Sources in description
            </p>
          )}
        </div>
      )}

      {/* ── Gap Label (pulsing numbers) — only for non-simple end cards ── */}
      {!isSimpleEndCard && gapLabel && (
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
              fontFamily,
              fontVariantNumeric: "tabular-nums lining-nums",
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

      {/* ── Final Question — only for non-simple end cards ── */}
      {!isSimpleEndCard && finalQuestion && (
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
      )}

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

      {/* ── Channel Watermark (for non-simple end cards with watermark enabled) ── */}
      {!isSimpleEndCard && cfg.watermark && watermarkIn > 0.05 && channelName && (
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
              fontSize: 20,
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
          {/* Next video placeholder (bottom-right per storyboard spec) */}
          <div
            style={{
              position: "absolute",
              bottom: 140,
              right: 160,
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
                fontSize: 20,
                fontWeight: 500,
                letterSpacing: 1,
                textTransform: "uppercase" as const,
              }}
            >
              Next Video
            </span>
          </div>

          {/* Subscribe button placeholder (bottom-left per storyboard spec) */}
          <div
            style={{
              position: "absolute",
              bottom: 140,
              left: 160,
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
                fontSize: 20,
                fontWeight: 500,
                letterSpacing: 1,
                textTransform: "uppercase" as const,
              }}
            >
              Subscribe
            </span>
          </div>
        </>
      )}
    </div>
  );
};
