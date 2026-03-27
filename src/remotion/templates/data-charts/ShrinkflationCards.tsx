import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";

/**
 * ShrinkflationCards — Scene 014
 *
 * Full-screen pattern interrupt: before/after split cards showing
 * how products physically shrunk (e.g., Doritos 12 oz → 9.25 oz).
 * Two cards stacked vertically with staggered entrance + red badge bounce.
 * Optional BLS stat callout fades in at bottom after a configurable delay.
 *
 * Design: #1A1B22 bg, #EAE0D5 text, #E06070 badge, surface cards
 */

interface ShrinkflationCardData {
  product: string;
  from: string;
  to: string;
  change: string;
  changeColor?: string;
}

interface ShrinkflationCardsProps {
  chart: {
    type: "shrinkflation-cards";
    cards: Array<ShrinkflationCardData>;
    blsStat?: { text: string; source?: string };
    blsStatDelaySec?: number;
    [key: string]: unknown;
  };
  brandColor: string;
  fontFamily: string;
}

const BG_COLOR = "#1A1B22";
const TEXT_COLOR = "#EAE0D5";
const MUTED_TEXT = "rgba(234, 224, 213, 0.5)";
const BADGE_COLOR = "#E06070";
const SURFACE_BG = "rgba(255, 255, 255, 0.06)";
const SURFACE_BORDER = "rgba(255, 255, 255, 0.08)";

/** Simple package rectangle icon — larger = bigger rect */
const PackageIcon: React.FC<{ size: "large" | "small"; color: string }> = ({
  size,
  color,
}) => {
  const w = size === "large" ? 48 : 34;
  const h = size === "large" ? 64 : 46;
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: 6,
        border: `2px solid ${color}`,
        opacity: 0.7,
        flexShrink: 0,
      }}
    />
  );
};

/** A single before/after product card */
const ProductCard: React.FC<{
  card: ShrinkflationCardData;
  frame: number;
  fps: number;
  entranceDelay: number;
  fontFamily: string;
}> = ({ card, frame, fps, entranceDelay, fontFamily }) => {
  // Card entrance
  const cardSpring = spring({
    fps,
    frame: frame - entranceDelay,
    config: { damping: 16, stiffness: 70 },
  });
  const slideY = interpolate(cardSpring, [0, 1], [40, 0]);

  // Badge bounce — delayed after card appears
  const badgeDelay = entranceDelay + 18;
  const badgeSpring = spring({
    fps,
    frame: frame - badgeDelay,
    config: { damping: 14, stiffness: 100 },
  });
  const badgeScale = interpolate(badgeSpring, [0, 1], [0, 1]);

  const changeColor = card.changeColor || BADGE_COLOR;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        backgroundColor: SURFACE_BG,
        border: `1px solid ${SURFACE_BORDER}`,
        borderRadius: 12,
        padding: "24px 36px",
        opacity: cardSpring,
        transform: `translateY(${slideY}px)`,
        position: "relative",
        width: 720,
      }}
    >
      {/* Before side */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          flex: 1,
        }}
      >
        <PackageIcon size="large" color={TEXT_COLOR} />
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 28,
            fontWeight: 600,
            color: TEXT_COLOR,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {card.from}
        </div>
        <div
          style={{
            fontFamily: fontFamily || "Inter, sans-serif",
            fontSize: 14,
            color: MUTED_TEXT,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Before
        </div>
      </div>

      {/* Badge in center */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: `translate(-50%, -50%) scale(${badgeScale})`,
          backgroundColor: changeColor,
          color: "#fff",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 20,
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
          padding: "6px 16px",
          borderRadius: 20,
          whiteSpace: "nowrap",
          zIndex: 2,
        }}
      >
        {card.change}
      </div>

      {/* After side */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          flex: 1,
        }}
      >
        <PackageIcon size="small" color={MUTED_TEXT} />
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 28,
            fontWeight: 600,
            color: TEXT_COLOR,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {card.to}
        </div>
        <div
          style={{
            fontFamily: fontFamily || "Inter, sans-serif",
            fontSize: 14,
            color: MUTED_TEXT,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          After
        </div>
      </div>

      {/* Product label top-left */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 20,
          fontFamily: fontFamily || "Inter, sans-serif",
          fontSize: 20,
          fontWeight: 500,
          color: TEXT_COLOR,
        }}
      >
        {card.product}
      </div>
    </div>
  );
};

export const ShrinkflationCards: React.FC<ShrinkflationCardsProps> = ({
  chart,
  brandColor: _brandColor,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cards = chart.cards || [];
  const blsStat = chart.blsStat;
  const blsStatDelaySec = chart.blsStatDelaySec ?? 25;

  // BLS stat callout fade-in
  const blsStatDelayFrames = Math.round(blsStatDelaySec * fps);
  const blsOpacity = blsStat
    ? interpolate(
        frame,
        [blsStatDelayFrames, blsStatDelayFrames + 30],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      )
    : 0;

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
        gap: 28,
        position: "relative",
      }}
    >
      {/* Product cards */}
      {cards.map((card, i) => (
        <ProductCard
          key={card.product}
          card={card}
          frame={frame}
          fps={fps}
          entranceDelay={i * 15}
          fontFamily={fontFamily}
        />
      ))}

      {/* BLS stat callout at bottom */}
      {blsStat && (
        <div
          style={{
            position: "absolute",
            bottom: 60,
            left: "50%",
            transform: "translateX(-50%)",
            opacity: blsOpacity,
            backgroundColor: SURFACE_BG,
            border: `1px solid ${SURFACE_BORDER}`,
            borderRadius: 10,
            padding: "14px 28px",
            maxWidth: 760,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 18,
              fontWeight: 500,
              color: TEXT_COLOR,
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1.5,
            }}
          >
            {blsStat.text}
          </div>
          {blsStat.source && (
            <div
              style={{
                fontFamily: fontFamily || "Inter, sans-serif",
                fontSize: 13,
                color: MUTED_TEXT,
                marginTop: 6,
              }}
            >
              Source: {blsStat.source}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
