import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { BG, TEXT, ACCENT_PINK, SURFACE, SURFACE_HOVER } from "../../palette";

/**
 * SkimpflationCard — Scene 015 Phase 1
 *
 * Skimpflation concept visual: three identical product card outlines
 * side by side. Same package, same price, but decreasing quality
 * (5 stars → 4 → 3). Uses filled/unfilled circle dots for quality.
 *
 * Design: #2A2A32 bg, #F0EDE8 text, #E88CA5 accent
 */

interface SkimpflationCardProps {
  chart: {
    type: "skimpflation-card";
    title?: string;
    subtitle?: string;
    [key: string]: unknown;
  };
  brandColor: string;
  fontFamily: string;
}

const BG_COLOR = BG;
const TEXT_COLOR = TEXT;
const MUTED_TEXT = "rgba(240, 237, 232, 0.5)"; // derived from TEXT (0.5 opacity, not in palette)
const SURFACE_BG = SURFACE;
const SURFACE_BORDER = SURFACE_HOVER;

const CARD_STAGGER = 15; // frames between each card entrance

/** Quality dot — filled or unfilled circle */
const QualityDot: React.FC<{
  filled: boolean;
  delay: number;
  frame: number;
  fps: number;
}> = ({ filled, delay, frame, fps }) => {
  const dotSpring = spring({
    fps,
    frame: frame - delay,
    config: { damping: 14, stiffness: 120 },
  });

  return (
    <div
      style={{
        width: 12,
        height: 12,
        borderRadius: "50%",
        backgroundColor: filled ? ACCENT_PINK : "transparent",
        border: `2px solid ${filled ? ACCENT_PINK : "rgba(240, 237, 232, 0.25)"}`,
        transform: `scale(${dotSpring})`,
        opacity: dotSpring,
      }}
    />
  );
};

/** Simple package rectangle icon */
const PackageOutline: React.FC = () => (
  <div
    style={{
      width: 52,
      height: 68,
      borderRadius: 8,
      border: `2px solid ${MUTED_TEXT}`,
      opacity: 0.6,
    }}
  />
);

/** A single product card with package, price, and quality dots */
const ProductPanel: React.FC<{
  filledDots: number;
  totalDots: number;
  price: string;
  index: number;
  frame: number;
  fps: number;
  fontFamily: string;
}> = ({ filledDots, totalDots, price, index, frame, fps, fontFamily }) => {
  const entranceDelay = index * CARD_STAGGER;

  const cardSpring = spring({
    fps,
    frame: frame - entranceDelay,
    config: { damping: 16, stiffness: 70 },
  });
  const slideX = interpolate(cardSpring, [0, 1], [60, 0]);

  // Dots animate after card is mostly in
  const dotsBaseDelay = entranceDelay + 20;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        backgroundColor: SURFACE_BG,
        border: `1px solid ${SURFACE_BORDER}`,
        borderRadius: 12,
        padding: "32px 36px",
        width: 200,
        opacity: cardSpring,
        transform: `translateX(${slideX}px)`,
      }}
    >
      {/* Package icon */}
      <PackageOutline />

      {/* Price tag */}
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 22,
          fontWeight: 600,
          color: TEXT_COLOR,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {price}
      </div>

      {/* Quality dots row */}
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {Array.from({ length: totalDots }).map((_, dotIdx) => (
          <QualityDot
            key={dotIdx}
            filled={dotIdx < filledDots}
            delay={dotsBaseDelay + dotIdx * 3}
            frame={frame}
            fps={fps}
          />
        ))}
      </div>

      {/* Quality label */}
      <div
        style={{
          fontFamily: fontFamily || "Inter, sans-serif",
          fontSize: 13,
          color: MUTED_TEXT,
          letterSpacing: "0.04em",
        }}
      >
        Quality
      </div>
    </div>
  );
};

export const SkimpflationCard: React.FC<SkimpflationCardProps> = ({
  chart,
  brandColor: _brandColor,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const title = chart.title || "SKIMPFLATION";
  const subtitle =
    chart.subtitle || "Same package. Cheaper ingredients. No data series.";

  // Title entrance
  const titleSpring = spring({
    fps,
    frame,
    config: { damping: 18, stiffness: 60 },
  });

  // Subtitle entrance — delayed
  const subtitleOpacity = interpolate(frame, [40, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Three cards: 5/5, 4/5, 3/5 filled dots
  const cardConfigs = [
    { filledDots: 5, price: "$3.99" },
    { filledDots: 4, price: "$3.99" },
    { filledDots: 3, price: "$3.99" },
  ];

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
        gap: 20,
        position: "relative",
      }}
    >
      {/* Title */}
      <div
        style={{
          fontFamily: "'Montserrat', sans-serif",
          fontSize: 48,
          fontWeight: 700,
          color: ACCENT_PINK,
          letterSpacing: "0.08em",
          opacity: titleSpring,
          transform: `translateY(${(1 - titleSpring) * -20}px)`,
          marginBottom: 8,
        }}
      >
        {title}
      </div>

      {/* Three product cards */}
      <div
        style={{
          display: "flex",
          gap: 32,
          alignItems: "flex-end",
        }}
      >
        {cardConfigs.map((cfg, i) => (
          <ProductPanel
            key={i}
            filledDots={cfg.filledDots}
            totalDots={5}
            price={cfg.price}
            index={i}
            frame={frame}
            fps={fps}
            fontFamily={fontFamily}
          />
        ))}
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontFamily: fontFamily || "Inter, sans-serif",
          fontSize: 20,
          color: TEXT_COLOR,
          opacity: subtitleOpacity,
          marginTop: 16,
          textAlign: "center",
          maxWidth: 700,
          lineHeight: 1.5,
        }}
      >
        {subtitle}
      </div>
    </div>
  );
};
