import React from "react";
import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

interface SectionTitleProps {
  title: string;
  brandColor: string;
  fontFamily: string;
}

/**
 * Section title — only shows for major section transitions.
 * Filters out per-scene labels (e.g., "#8 Printer Ink — Intro")
 * and only displays clean section names (e.g., "The Big Leagues").
 *
 * Shows as a quick cinematic text flash — appears, holds briefly, fades.
 */
export const SectionTitle: React.FC<SectionTitleProps> = ({
  title,
  brandColor,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Only show for "meta" section transitions, not individual items.
  // Skip titles that look like ranking items (#N ...) or sub-scenes (... — Data/Intro/etc.)
  const isRankingItem = /^#\d+/.test(title);
  const isSubScene = /[—–-]\s*(Visual|Data|Intro|Brain|Danger|Market|Business|Extraction|Dose|Ancient|Medical|Dramatic|Price|Why|Sales|Recap)/i.test(title);

  if (isRankingItem || isSubScene) {
    return null;
  }

  // Also skip generic labels
  const skipLabels = ["CTA", "Subscribe", "Full Rankings"];
  if (skipLabels.some((s) => title.includes(s))) {
    return null;
  }

  // Entrance spring
  const enterSpring = spring({
    fps,
    frame,
    config: { damping: 14, stiffness: 70 },
  });

  // Fade out after ~1.5s
  const fadeOut = interpolate(frame, [40, 55], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const opacity = Math.min(enterSpring, fadeOut);

  if (opacity <= 0.01) return null;

  // Clean up the title for display
  const displayTitle = title
    .replace(/^Hook\s*[—–-]\s*/i, "")
    .replace(/^Section \d+\s*[—–-]?\s*/i, "")
    .replace(/Recap.*$/i, "")
    .trim();

  if (!displayTitle) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 40,
        opacity,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          textAlign: "center",
          transform: `translateY(${interpolate(enterSpring, [0, 1], [30, 0])}px)`,
        }}
      >
        <div
          style={{
            color: brandColor,
            fontSize: 20,
            fontFamily,
            fontWeight: 600,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          ▬▬▬
        </div>
        <h2
          style={{
            color: "#FFFFFF",
            fontSize: 52,
            fontFamily,
            fontWeight: 800,
            margin: 0,
            textShadow: "0 4px 24px rgba(0,0,0,0.8)",
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          {displayTitle}
        </h2>
      </div>
    </div>
  );
};
