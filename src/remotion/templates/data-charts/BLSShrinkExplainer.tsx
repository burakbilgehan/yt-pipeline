import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  staticFile,
  Img,
} from "remotion";
import { BG, TEXT, ACCENT_PINK, NEGATIVE, SAGE, TEXT_MUTED } from "../../palette";

// ─── Types ────────────────────────────────────────────────────

export interface BLSShrinkExplainerProps {
  chart: {
    type: "bls-shrink-explainer";
    startSize: string;   // "16 oz"
    endSize: string;     // "10 oz"
    stickerPrice: string; // "$4.99"
    startPerUnit: string; // "$4.99/lb"
    endPerUnit: string;   // "$7.99/lb"
    blsAttribution: string; // "BLS tracks per-unit price"
    [key: string]: unknown;
  };
  brandColor: string;
  fontFamily: string;
}

// ─── Design Tokens (from brand-guide.md) ──────────────────────

const BG_COLOR = BG;
const TEXT_COLOR = TEXT;
const MUTED_PINK = ACCENT_PINK;
const MUTED_RED = NEGATIVE;
const SAGE_SILVER = SAGE;
const MUTED_TEXT = TEXT_MUTED;

const FONT_HEADING = "Montserrat, sans-serif";
const FONT_MONO = "'JetBrains Mono', monospace";
const FONT_BODY = "Inter, sans-serif";

// Spring configs from brand guide
const SPRING_BARS = { stiffness: 100, damping: 20 }; // bars/counters
const SPRING_CARD = { stiffness: 80, damping: 18 };  // cards

// 10-frame stagger between elements (brand guide)
const STAGGER = 10;

// ─── Phase Timing ─────────────────────────────────────────────
// ~687 frames total at 30fps for 22.9s
// Phase 1: 0–120   (Photo entrance + product label + price tag)
// Phase 2: 120–300  (Callout overlay + price glow)
// Phase 3: 300–end  (per-unit counter + BLS attribution)

const PHASE2_AFTER_ENTRANCE = 160; // callout appears
const PHASE2_GLOW_START = 220; // price tag glows after callout is settled
const PHASE3_START = 300;
const PHASE3_COUNTER_DURATION = 30; // 30 frames for number interpolation
const PHASE3_BLS_FADE_START = 370; // BLS text fades in after counter

// ─── Photo dimensions ─────────────────────────────────────────

const PHOTO_WIDTH = 650;
const PHOTO_HEIGHT = 420;

// ─── Helpers ──────────────────────────────────────────────────

/** Parse a numeric value from a price string like "$4.99/lb" */
function parsePrice(s: string): number {
  const match = s.replace(/,/g, "").match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

/** Format a number with fixed decimal places */
function formatPrice(n: number, decimals = 2): string {
  return `$${n.toFixed(decimals)}`;
}

// ─── Sub-components ───────────────────────────────────────────

/**
 * Price tag — the sticker price below the cans.
 */
const PriceTag: React.FC<{
  price: string;
  opacity: number;
  scale: number;
  glowIntensity: number;
}> = ({ price, opacity, scale, glowIntensity }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 8,
      opacity,
      transform: `scale(${scale})`,
    }}
  >
    <div
      style={{
        fontFamily: FONT_BODY,
        fontSize: 20,
        color: MUTED_TEXT,
        letterSpacing: 0.5,
      }}
    >
      Sticker Price
    </div>
    <div
      style={{
        fontFamily: FONT_MONO,
        fontSize: 56,
        fontWeight: 700,
        color: TEXT_COLOR,
        fontVariantNumeric: "tabular-nums",
        fontFeatureSettings: '"tnum"',
        padding: "14px 32px",
        borderRadius: 12,
        border: `2px solid rgba(240, 237, 232, ${0.15 + glowIntensity * 0.3})`,
        backgroundColor: `rgba(240, 237, 232, ${0.04 + glowIntensity * 0.08})`,
        boxShadow: glowIntensity > 0
          ? `0 0 ${24 * glowIntensity}px rgba(240, 237, 232, ${0.18 * glowIntensity})`
          : "none",
        transition: "box-shadow 0.1s",
      }}
    >
      {price}
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────

/**
 * BLSShrinkExplainer — Shrinkflation explanation animation.
 *
 * Uses a single Folgers comparison photo showing before/after side by side.
 *
 * Phase 1 (0–120): Photo enters large and centered with product label.
 * Phase 2 (120–300): "Same price — less coffee" callout fades in; price tag glows.
 * Phase 3 (300–end): Photo shrinks up, per-unit price counter ticks; BLS attribution.
 */
export const BLSShrinkExplainer: React.FC<BLSShrinkExplainerProps> = ({
  chart,
  brandColor,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Props with defaults ──
  const startSize = chart.startSize || "16 oz";
  const endSize = chart.endSize || "10 oz";
  const stickerPrice = chart.stickerPrice || "$4.99";
  const startPerUnit = chart.startPerUnit || "$4.99/lb";
  const endPerUnit = chart.endPerUnit || "$7.99/lb";
  const blsAttribution = chart.blsAttribution || "BLS tracks per-unit price";

  const startUnitPrice = parsePrice(startPerUnit);
  const endUnitPrice = parsePrice(endPerUnit);

  // ── Phase 1: Photo entrance ──
  const photoEntrance = spring({
    fps,
    frame: frame - 15,
    config: SPRING_CARD,
  });
  const photoSlideY = interpolate(photoEntrance, [0, 1], [40, 0]);

  const productLabelEntrance = spring({
    fps,
    frame: frame - 15 - STAGGER,
    config: SPRING_CARD,
  });

  const priceEntrance = spring({
    fps,
    frame: frame - 15 - STAGGER * 2,
    config: SPRING_CARD,
  });

  // ── Phase 2: Emphasis callout ──
  const calloutEntrance = spring({
    fps,
    frame: frame - PHASE2_AFTER_ENTRANCE,
    config: SPRING_BARS,
  });

  // Price tag glow — pulses briefly to show price unchanged
  const glowIn = interpolate(
    frame,
    [PHASE2_GLOW_START, PHASE2_GLOW_START + 15],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const glowOut = interpolate(
    frame,
    [PHASE2_GLOW_START + 15, PHASE2_GLOW_START + 45],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const glowIntensity = Math.min(glowIn, glowOut);

  // ── Phase 3: Per-unit price counter ──
  const phase3Visible = frame >= PHASE3_START;

  const counterEntrance = spring({
    fps,
    frame: frame - PHASE3_START,
    config: SPRING_BARS,
  });

  // Number counter: interpolate from startUnitPrice to endUnitPrice over 30 frames
  const counterProgress = interpolate(
    frame,
    [PHASE3_START + 20, PHASE3_START + 20 + PHASE3_COUNTER_DURATION],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const currentUnitPrice = interpolate(
    counterProgress,
    [0, 1],
    [startUnitPrice, endUnitPrice],
  );

  // Extract per-unit suffix (e.g., "/lb")
  const perUnitSuffix = startPerUnit.replace(/[\d,.$]+/, "") || "/lb";

  // BLS attribution fade-in
  const blsFadeIn = interpolate(
    frame,
    [PHASE3_BLS_FADE_START, PHASE3_BLS_FADE_START + 20],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // ── Phase 3 arrow between price sections ──
  const arrowPhase3 = spring({
    fps,
    frame: frame - PHASE3_START - STAGGER,
    config: SPRING_CARD,
  });

  // ── Photo area scales down in phase 3 to make room for counter ──
  const photoAreaScale = phase3Visible
    ? interpolate(counterEntrance, [0, 1], [1, 0.65])
    : 1;
  const photoAreaTranslateY = phase3Visible
    ? interpolate(counterEntrance, [0, 1], [0, -80])
    : 0;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG_COLOR,
        fontFamily: fontFamily || FONT_BODY,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
      }}
    >
      {/* ═══ Photo comparison area ═══ */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
          transform: `scale(${photoAreaScale}) translateY(${photoAreaTranslateY}px)`,
          transformOrigin: "center top",
          opacity: photoEntrance,
        }}
      >
        {/* Product label */}
        <div
          style={{
            fontFamily: FONT_BODY,
            fontSize: 20,
            fontWeight: 600,
            color: TEXT_COLOR,
            letterSpacing: 0.5,
            opacity: productLabelEntrance,
            transform: `translateY(${interpolate(productLabelEntrance, [0, 1], [10, 0])}px)`,
          }}
        >
          Folgers Classic Roast{" "}
          <span style={{ color: MUTED_TEXT }}>&middot;</span>{" "}
          <span style={{ fontFamily: FONT_MONO, color: SAGE_SILVER }}>{startSize}</span>
          {" "}
          <span style={{ color: MUTED_RED }}>{"\u2192"}</span>
          {" "}
          <span style={{ fontFamily: FONT_MONO, color: MUTED_RED }}>{endSize}</span>
        </div>

        {/* Folgers comparison photo */}
        <div
          style={{
            position: "relative",
            width: PHOTO_WIDTH,
            height: PHOTO_HEIGHT,
            borderRadius: 12,
            overflow: "hidden",
            border: `2px solid rgba(240, 237, 232, 0.12)`,
            transform: `translateY(${photoSlideY}px)`,
          }}
        >
          <Img
            src={staticFile("shrinkflation-decoded/folgers.jpg")}
            style={{
              width: PHOTO_WIDTH,
              height: PHOTO_HEIGHT,
              objectFit: "contain",
            }}
          />

          {/* Phase 2: "Same price — less coffee" callout overlay */}
          <div
            style={{
              position: "absolute",
              bottom: 16,
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "center",
              opacity: calloutEntrance,
              transform: `translateY(${interpolate(calloutEntrance, [0, 1], [12, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_HEADING,
                fontSize: 22,
                fontWeight: 700,
                color: MUTED_PINK,
                backgroundColor: "rgba(26, 27, 34, 0.85)",
                padding: "8px 24px",
                borderRadius: 8,
                letterSpacing: 0.5,
              }}
            >
              Same price — less coffee
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Price tag (centered below photo) ═══ */}
      <PriceTag
        price={stickerPrice}
        opacity={priceEntrance}
        scale={interpolate(priceEntrance, [0, 1], [0.85, 1])}
        glowIntensity={glowIntensity}
      />

      {/* ═══ Divider line ═══ */}
      {phase3Visible && (
        <div
          style={{
            width: interpolate(counterEntrance, [0, 1], [0, 600]),
            height: 1,
            backgroundColor: SAGE_SILVER,
            opacity: 0.3 * counterEntrance,
          }}
        />
      )}

      {/* ═══ Bottom row: Per-unit price counter + BLS attribution ═══ */}
      {phase3Visible && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 24,
            opacity: counterEntrance,
            transform: `translateY(${interpolate(counterEntrance, [0, 1], [30, 0])}px)`,
          }}
        >
          {/* Per-unit label */}
          <div
            style={{
              fontFamily: FONT_BODY,
              fontSize: 24,
              color: MUTED_TEXT,
              letterSpacing: 0.5,
            }}
          >
            Per pound:
          </div>

          {/* Counter row: start → arrow → current */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 28,
            }}
          >
            {/* Start per-unit price (dimmed) */}
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 48,
                fontWeight: 500,
                color: MUTED_TEXT,
                fontVariantNumeric: "tabular-nums",
                fontFeatureSettings: '"tnum"',
                opacity: interpolate(
                  counterProgress,
                  [0, 0.5],
                  [1, 0.5],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
                ),
              }}
            >
              {formatPrice(startUnitPrice)}{perUnitSuffix}
            </span>

            {/* Arrow */}
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 40,
                color: SAGE_SILVER,
                opacity: arrowPhase3,
                transform: `scaleX(${interpolate(arrowPhase3, [0, 1], [0.5, 1])})`,
              }}
            >
              {"\u2192"}
            </span>

            {/* Current (animated) per-unit price */}
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 64,
                fontWeight: 700,
                color: MUTED_RED,
                fontVariantNumeric: "tabular-nums",
                fontFeatureSettings: '"tnum"',
              }}
            >
              {formatPrice(currentUnitPrice)}{perUnitSuffix}
            </span>
          </div>

          {/* BLS attribution */}
          <div
            style={{
              fontFamily: FONT_BODY,
              fontSize: 18,
              color: SAGE_SILVER,
              letterSpacing: 0.5,
              opacity: blsFadeIn,
              marginTop: 12,
            }}
          >
            {blsAttribution}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
