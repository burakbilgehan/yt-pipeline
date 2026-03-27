import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

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

const BG_COLOR = "#1A1B22";
const TEXT_COLOR = "#EAE0D5";     // Accent Cream
const MUTED_PINK = "#D8A7B1";    // Primary data / coffee can fill
const MUTED_RED = "#E06070";     // Negative change / per-unit price
const SAGE_SILVER = "#A3B18A";   // Grid/Detail / BLS attribution
const MUTED_TEXT = "rgba(234, 224, 213, 0.55)";

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
// Phase 1: 0–120   (can entrance + labels)
// Phase 2: 120–300  (shrink + price glow)
// Phase 3: 300–end  (per-unit counter + BLS attribution)

const PHASE1_END = 120;
const PHASE2_START = 120;
const PHASE2_SHRINK_START = 140; // slight delay after phase 2 start
const PHASE2_SHRINK_DURATION = 45; // spring over 45 frames as per notes
const PHASE2_GLOW_START = PHASE2_SHRINK_START + PHASE2_SHRINK_DURATION + 10;
const PHASE3_START = 300;
const PHASE3_COUNTER_DURATION = 30; // 30 frames for number interpolation
const PHASE3_BLS_FADE_START = 370; // BLS text fades in after counter

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

/** Parse oz value from a size string like "16 oz" */
function parseOz(s: string): number {
  const match = s.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 16;
}

// ─── Sub-components ───────────────────────────────────────────

/**
 * CSS-drawn coffee can — a rounded rectangle with elliptical top/bottom.
 * Drawn entirely with divs — no external images.
 */
const CoffeeCan: React.FC<{
  heightPx: number;
  widthPx: number;
  opacity: number;
  fillColor: string;
}> = ({ heightPx, widthPx, opacity, fillColor }) => {
  const ellipseH = 24; // height of top/bottom ellipses

  return (
    <div
      style={{
        position: "relative",
        width: widthPx,
        height: heightPx + ellipseH * 2,
        opacity,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* Top ellipse */}
      <div
        style={{
          width: widthPx,
          height: ellipseH * 2,
          borderRadius: "50%",
          backgroundColor: fillColor,
          position: "absolute",
          top: 0,
          zIndex: 2,
          border: `2px solid rgba(234, 224, 213, 0.15)`,
        }}
      />
      {/* Body cylinder */}
      <div
        style={{
          width: widthPx,
          height: heightPx,
          backgroundColor: fillColor,
          position: "absolute",
          top: ellipseH,
          borderLeft: `2px solid rgba(234, 224, 213, 0.15)`,
          borderRight: `2px solid rgba(234, 224, 213, 0.15)`,
        }}
      />
      {/* Bottom ellipse */}
      <div
        style={{
          width: widthPx,
          height: ellipseH * 2,
          borderRadius: "50%",
          backgroundColor: fillColor,
          position: "absolute",
          bottom: 0,
          zIndex: 1,
          border: `2px solid rgba(234, 224, 213, 0.1)`,
          // Slightly darker bottom for depth
          filter: "brightness(0.85)",
        }}
      />
      {/* Label stripe on body */}
      <div
        style={{
          position: "absolute",
          top: ellipseH + heightPx * 0.3,
          width: widthPx - 16,
          height: heightPx * 0.35,
          backgroundColor: "rgba(26, 27, 34, 0.35)",
          borderRadius: 4,
          left: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 3,
        }}
      >
        <span
          style={{
            fontFamily: FONT_HEADING,
            fontSize: 14,
            fontWeight: 700,
            color: TEXT_COLOR,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          COFFEE
        </span>
      </div>
    </div>
  );
};

/**
 * Price tag — the sticker price next to the can.
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
        fontSize: 18,
        color: MUTED_TEXT,
        letterSpacing: 0.5,
      }}
    >
      Sticker Price
    </div>
    <div
      style={{
        fontFamily: FONT_MONO,
        fontSize: 48,
        fontWeight: 700,
        color: TEXT_COLOR,
        fontVariantNumeric: "tabular-nums",
        fontFeatureSettings: '"tnum"',
        padding: "12px 28px",
        borderRadius: 12,
        border: `2px solid rgba(234, 224, 213, ${0.15 + glowIntensity * 0.3})`,
        backgroundColor: `rgba(234, 224, 213, ${0.04 + glowIntensity * 0.08})`,
        boxShadow: glowIntensity > 0
          ? `0 0 ${20 * glowIntensity}px rgba(234, 224, 213, ${0.15 * glowIntensity})`
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
 * Phase 1 (0–120): Coffee can entrance with size label + price tag.
 * Phase 2 (120–300): Can shrinks from startSize to endSize; price stays fixed
 *   with a brief glow to emphasize it's unchanged.
 * Phase 3 (300–end): Per-pound price counter ticks up; BLS attribution fades in.
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

  const startOz = parseOz(startSize);
  const endOz = parseOz(endSize);
  const startUnitPrice = parsePrice(startPerUnit);
  const endUnitPrice = parsePrice(endPerUnit);

  // ── Phase 1: Can entrance ──
  const canEntrance = spring({
    fps,
    frame: frame - 15,
    config: SPRING_CARD,
  });
  const canSlideY = interpolate(canEntrance, [0, 1], [60, 0]);

  const labelEntrance = spring({
    fps,
    frame: frame - 15 - STAGGER,
    config: SPRING_CARD,
  });

  const priceEntrance = spring({
    fps,
    frame: frame - 15 - STAGGER * 2,
    config: SPRING_CARD,
  });

  // ── Phase 2: Shrink animation ──
  // Can height shrinks proportionally: endOz/startOz ratio
  const shrinkRatio = endOz / startOz; // e.g., 10/16 = 0.625
  const shrinkProgress = spring({
    fps,
    frame: frame - PHASE2_SHRINK_START,
    config: SPRING_BARS, // stiffness 100, damping 20 — brand guide for bars/counters
  });

  // Interpolate can height from full to shrunk
  const fullCanHeight = 240;
  const canWidth = 140;
  const currentCanHeight = interpolate(
    shrinkProgress,
    [0, 1],
    [fullCanHeight, fullCanHeight * shrinkRatio],
  );

  // Size label morphs — crossfade between start and end labels
  const shrinkLabelProgress = interpolate(
    shrinkProgress,
    [0.3, 0.7],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Price tag glow — pulses briefly after shrink completes to emphasize it's unchanged
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

  // ── Arrow between price sections (appears in phase 3) ──
  const arrowEntrance = spring({
    fps,
    frame: frame - PHASE3_START - STAGGER,
    config: SPRING_CARD,
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG_COLOR,
        fontFamily: fontFamily || FONT_BODY,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Main layout: can + price on left/center, per-unit on right (phase 3) */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 48,
        }}
      >
        {/* Top row: Coffee can + price tag */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 80,
            opacity: canEntrance,
            transform: `translateY(${canSlideY}px)`,
          }}
        >
          {/* Can + size label column */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
            }}
          >
            <CoffeeCan
              heightPx={currentCanHeight}
              widthPx={canWidth}
              opacity={1}
              fillColor={MUTED_PINK}
            />
            {/* Size label with crossfade */}
            <div
              style={{
                position: "relative",
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: labelEntrance,
              }}
            >
              {/* Start size (fading out during shrink) */}
              <span
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 28,
                  fontWeight: 500,
                  color: TEXT_COLOR,
                  fontVariantNumeric: "tabular-nums",
                  fontFeatureSettings: '"tnum"',
                  position: "absolute",
                  opacity: 1 - shrinkLabelProgress,
                }}
              >
                {startSize}
              </span>
              {/* End size (fading in during shrink) */}
              <span
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 28,
                  fontWeight: 500,
                  color: MUTED_RED,
                  fontVariantNumeric: "tabular-nums",
                  fontFeatureSettings: '"tnum"',
                  position: "absolute",
                  opacity: shrinkLabelProgress,
                }}
              >
                {endSize}
              </span>
            </div>
          </div>

          {/* Price tag */}
          <PriceTag
            price={stickerPrice}
            opacity={priceEntrance}
            scale={interpolate(priceEntrance, [0, 1], [0.85, 1])}
            glowIntensity={glowIntensity}
          />
        </div>

        {/* Divider line */}
        {phase3Visible && (
          <div
            style={{
              width: interpolate(counterEntrance, [0, 1], [0, 500]),
              height: 1,
              backgroundColor: SAGE_SILVER,
              opacity: 0.3 * counterEntrance,
            }}
          />
        )}

        {/* Bottom row: Per-unit price counter + BLS attribution */}
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
                fontSize: 22,
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
                gap: 24,
              }}
            >
              {/* Start per-unit price (dimmed) */}
              <span
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 40,
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
                  fontSize: 32,
                  color: SAGE_SILVER,
                  opacity: arrowEntrance,
                  transform: `scaleX(${interpolate(arrowEntrance, [0, 1], [0.5, 1])})`,
                }}
              >
                {"\u2192"}
              </span>

              {/* Current (animated) per-unit price */}
              <span
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 52,
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
                fontSize: 16,
                color: SAGE_SILVER,
                letterSpacing: 0.5,
                opacity: blsFadeIn,
                marginTop: 16,
              }}
            >
              {blsAttribution}
            </div>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
