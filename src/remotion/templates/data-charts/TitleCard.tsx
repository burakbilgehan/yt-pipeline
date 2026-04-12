import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { BG, TEXT, ACCENT_PINK } from "../../palette";

/**
 * TitleCard — Scene 003 Phase 2
 *
 * Full-screen title card: "Purchasing Power Parity (PPP)"
 * with subtitle "~3,000 goods & services tracked by the OECD"
 *
 * Minimalist, centered, dark-cozy theme.
 */

interface TitleCardProps {
  chart: {
    type: string;
    title?: string;
    subtitle?: string;
    titleColor?: string;
    subtitleColor?: string;
    icon?: string;
    [key: string]: unknown;
  };
  brandColor: string;
  fontFamily: string;
}

const BG_COLOR = BG;

export const TitleCard: React.FC<TitleCardProps> = ({
  chart,
  brandColor,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const title = chart.title || "Title";
  const subtitle = chart.subtitle || "";
  const titleColor = chart.titleColor || TEXT;
  const subtitleColor = chart.subtitleColor || "rgba(240,237,232,0.6)";

  // Title entrance
  const titleSpring = spring({
    fps,
    frame: frame - 5,
    config: { damping: 18, stiffness: 50 },
  });

  const titleScale = interpolate(titleSpring, [0, 1], [0.9, 1]);
  const titleOpacity = titleSpring;

  // Subtitle entrance (delayed)
  const subtitleSpring = spring({
    fps,
    frame: frame - 20,
    config: { damping: 14, stiffness: 60 },
  });

  // Decorative line
  const lineSpring = spring({
    fps,
    frame: frame - 15,
    config: { damping: 20, stiffness: 50 },
  });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: BG_COLOR,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      {/* Title */}
      <div
        style={{
          fontFamily: fontFamily || "Inter, sans-serif",
          fontSize: 72,
          fontWeight: 700,
          color: titleColor,
          textAlign: "center",
          letterSpacing: "-0.02em",
          opacity: titleOpacity,
          transform: `scale(${titleScale})`,
          lineHeight: 1.15,
          maxWidth: 1400,
        }}
      >
        {title}
      </div>

      {/* Decorative line */}
      <div
        style={{
          width: interpolate(lineSpring, [0, 1], [0, 160]),
          height: 3,
          backgroundColor: brandColor || ACCENT_PINK,
          margin: "32px 0",
          opacity: lineSpring * 0.6,
        }}
      />

      {/* Subtitle */}
      {subtitle && (
        <div
          style={{
            fontFamily: fontFamily || "Inter, sans-serif",
            fontSize: 30,
            fontWeight: 400,
            color: subtitleColor,
            textAlign: "center",
            opacity: subtitleSpring,
            transform: `translateY(${(1 - subtitleSpring) * 15}px)`,
            maxWidth: 900,
            lineHeight: 1.5,
          }}
        >
          {subtitle}
        </div>
      )}

      {/* OECD icon/badge */}
      {chart.icon && (
        <div
          style={{
            position: "absolute",
            bottom: 80,
            fontFamily: fontFamily || "Inter, sans-serif",
            fontSize: 20,
            fontWeight: 500,
            color: "rgba(240,237,232,0.3)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            opacity: subtitleSpring,
          }}
        >
          {chart.icon}
        </div>
      )}
    </div>
  );
};
