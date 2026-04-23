import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";
import { TEXT, TEXT_SECONDARY } from "../../palette";

interface ClosingCTAProps {
  /** Main closing message */
  message?: string;
  /** Channel name */
  channelName?: string;
  /** Subscribe CTA text */
  ctaText?: string;
  /** Background color */
  backgroundColor?: string;
  /** Brand/accent color */
  accentColor?: string;
  /** Font family */
  fontFamily?: string;
  /** Show end screen placeholders (YouTube video slots) */
  showEndScreen?: boolean;
}

/**
 * ClosingCTA — Clean, editorial closing card (light theme) with end screen elements.
 *
 * Phase 1 (0-1.5s): Main message fades in
 * Phase 2 (1.5-3s): Channel name + separator
 * Phase 3 (3-4s): Subscribe text + end screen placeholders
 * Phase 4 (4s+): Hold — end screen elements remain visible for YouTube overlay
 */
export const ClosingCTA: React.FC<ClosingCTAProps> = ({
  message = "Nominal returns are an illusion.",
  channelName = "The World With Numbers",
  ctaText = "Subscribe",
  backgroundColor = "#F5F0E8",
  accentColor = "#C8A94E",
  fontFamily = "Montserrat, sans-serif",
  showEndScreen = true,
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
  const textMuted = isDarkBg ? "rgba(240,237,232,0.65)" : "rgba(0,0,0,0.35)";
  const ctaBg = isDarkBg ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)";
  const ctaBorder = isDarkBg ? "rgba(240,237,232,0.18)" : "rgba(0,0,0,0.1)";
  const ctaTextColor = isDarkBg ? TEXT_SECONDARY : "rgba(0,0,0,0.4)";
  const iconStroke = isDarkBg ? TEXT_SECONDARY : "rgba(0,0,0,0.35)";

  // ── Phase 1: Main message ──
  const messageEntrance = spring({
    fps,
    frame,
    config: { damping: 14, stiffness: 50, mass: 1.0 },
  });

  const messageScale = interpolate(messageEntrance, [0, 1], [0.92, 1]);
  const messageOpacity = interpolate(frame, [0, fps * 0.8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Phase 2: Channel name ──
  const channelDelay = fps * 1.5;
  const channelOpacity = interpolate(
    frame,
    [channelDelay, channelDelay + fps * 0.8],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const channelY = interpolate(
    frame,
    [channelDelay, channelDelay + fps * 1.0],
    [12, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.quad) }
  );

  // ── Phase 3: Subscribe + end screen ──
  const ctaDelay = fps * 3;
  const ctaEntrance = spring({
    fps,
    frame: frame - ctaDelay,
    config: { damping: 16, stiffness: 60 },
  });

  // ── End screen elements ──
  const endScreenDelay = fps * 3.5;
  const endScreenEntrance = spring({
    fps,
    frame: frame - endScreenDelay,
    config: { damping: 14, stiffness: 50 },
  });

  // ── Separator line ──
  const lineWidth = interpolate(
    frame,
    [fps * 0.5, fps * 1.5],
    [0, 120],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.quad) }
  );

  // End screen box dimensions (YouTube standard)
  const endScreenBoxW = 280;
  const endScreenBoxH = 158;

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
      {/* Main message — positioned higher to leave room for end screen */}
      <div
        style={{
          fontSize: 48,
          fontWeight: 700,
          color: textPrimary,
          opacity: messageOpacity,
          transform: `scale(${messageScale})`,
          textAlign: "center",
          maxWidth: "70%",
          lineHeight: 1.3,
          letterSpacing: -0.5,
          marginTop: -80,
        }}
      >
        {message}
      </div>

      {/* Separator line */}
      <div
        style={{
          width: lineWidth,
          height: 2,
          backgroundColor: accentColor,
          marginTop: 20,
          marginBottom: 20,
          opacity: 0.6,
          borderRadius: 1,
        }}
      />

      {/* Channel name */}
      <div
        style={{
          fontSize: 20,
          fontWeight: 500,
          color: textMuted,
          opacity: channelOpacity,
          transform: `translateY(${channelY}px)`,
          letterSpacing: 4,
          textTransform: "uppercase",
        }}
      >
        {channelName}
      </div>

      {/* Subscribe button — between message and end screen */}
      <div
        style={{
          marginTop: 24,
          opacity: ctaEntrance,
          transform: `translateY(${interpolate(ctaEntrance, [0, 1], [10, 0])}px)`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            backgroundColor: ctaBg,
            border: `1px solid ${ctaBorder}`,
            borderRadius: 24,
            padding: "10px 28px",
          }}
        >
          <svg
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke={iconStroke}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: ctaTextColor,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            {ctaText}
          </span>
        </div>
      </div>

      {/* ═══ End Screen Placeholders (YouTube standard positions) ═══ */}
      {showEndScreen && (
        <div
          style={{
            position: "absolute",
            bottom: 80,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            gap: 40,
            opacity: endScreenEntrance,
            transform: `translateY(${interpolate(endScreenEntrance, [0, 1], [20, 0])}px)`,
          }}
        >
          {/* Video slot 1 — "Best for viewer" */}
          <div
            style={{
              width: endScreenBoxW,
              height: endScreenBoxH,
              borderRadius: 12,
              border: `2px dashed ${isDarkBg ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)"}`,
              backgroundColor: isDarkBg ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <svg
              width={28}
              height={28}
              viewBox="0 0 24 24"
              fill="none"
              stroke={isDarkBg ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <span
              style={{
                fontSize: 20,
                fontWeight: 500,
                color: isDarkBg ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)",
                letterSpacing: 1,
                textTransform: "uppercase",
              }}
            >
              Next Video
            </span>
          </div>

          {/* Video slot 2 — "Best for viewer" or playlist */}
          <div
            style={{
              width: endScreenBoxW,
              height: endScreenBoxH,
              borderRadius: 12,
              border: `2px dashed ${isDarkBg ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)"}`,
              backgroundColor: isDarkBg ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <svg
              width={28}
              height={28}
              viewBox="0 0 24 24"
              fill="none"
              stroke={isDarkBg ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="14" rx="2" />
              <line x1="3" y1="20" x2="21" y2="20" />
              <line x1="3" y1="23" x2="21" y2="23" />
            </svg>
            <span
              style={{
                fontSize: 20,
                fontWeight: 500,
                color: isDarkBg ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)",
                letterSpacing: 1,
                textTransform: "uppercase",
              }}
            >
              More Data Stories
            </span>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
