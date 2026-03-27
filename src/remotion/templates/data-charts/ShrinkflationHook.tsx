import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Easing,
} from "remotion";

/**
 * ShrinkflationHook — Scene 001 (20s)
 *
 * Visual sequence:
 * 0–2s: Chips bag icon shrinks (spring from 1.0 → 0.77)
 * 2–4s: Coffee can icon shrinks + weight counter 16oz → 10oz
 * ~5s: Title "Shrinkflation Decoded" fades in (Montserrat ExtraBold 72px)
 * ~8s: Title fades out
 * ~10s: Shrink props dissolve, 6 product icons emerge at RUPI=1.0 baseline
 *       with stagger. Baseline pulses gently.
 *
 * Background: #1A1B22 + dot grid (2px #A3B18A dots, 40px spacing, 10% opacity)
 */

interface ShrinkflationHookProps {
  chart: {
    type: "shrinkflation-hook";
    title?: string;
    products?: string[];
    productColors?: Record<string, string>;
    [key: string]: unknown;
  };
  brandColor: string;
  fontFamily: string;
}

const BG_COLOR = "#1A1B22";
const ACCENT_CREAM = "#EAE0D5";
const SAGE_SILVER = "#A3B18A";
const DOT_SPACING = 40;
const DOT_SIZE = 2;

const DEFAULT_PRODUCTS = ["Eggs", "Coffee", "Chips", "Milk", "Peanut Butter", "Ice Cream"];
const DEFAULT_PRODUCT_COLORS: Record<string, string> = {
  Eggs: "#D8A7B1",
  Coffee: "#90AFC5",
  Chips: "rgba(234,224,213,0.9)",
  Milk: "rgba(234,224,213,0.7)",
  "Peanut Butter": "rgba(234,224,213,0.55)",
  "Ice Cream": "rgba(234,224,213,0.4)",
};

/** Dot grid background — SVG pattern, no emoji. */
const DotGrid: React.FC = () => {
  const cols = Math.ceil(1920 / DOT_SPACING);
  const rows = Math.ceil(1080 / DOT_SPACING);
  const dots: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      dots.push(
        <circle
          key={`${r}-${c}`}
          cx={c * DOT_SPACING + DOT_SPACING / 2}
          cy={r * DOT_SPACING + DOT_SPACING / 2}
          r={DOT_SIZE / 2}
          fill={SAGE_SILVER}
        />,
      );
    }
  }
  return (
    <svg
      width={1920}
      height={1080}
      style={{ position: "absolute", top: 0, left: 0, opacity: 0.1 }}
    >
      {dots}
    </svg>
  );
};

/** Simple product icon: styled rectangle with label. */
const ProductBox: React.FC<{
  label: string;
  color: string;
  scale: number;
  opacity: number;
  width: number;
  height: number;
}> = ({ label, color, scale, opacity, width, height }) => (
  <div
    style={{
      width,
      height,
      backgroundColor: color,
      borderRadius: 8,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transform: `scale(${scale})`,
      opacity,
      transition: "none",
    }}
  >
    <span
      style={{
        fontFamily: "Montserrat, sans-serif",
        fontWeight: 700,
        fontSize: 16,
        color: BG_COLOR,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
      }}
    >
      {label}
    </span>
  </div>
);

/** Animated counter that ticks between two numbers. */
const AnimatedCounter: React.FC<{
  from: number;
  to: number;
  progress: number; // 0→1
  suffix: string;
}> = ({ from, to, progress, suffix }) => {
  const value = Math.round(from + (to - from) * progress);
  return (
    <span
      style={{
        fontFamily: "JetBrains Mono, monospace",
        fontVariantNumeric: "tabular-nums",
        fontSize: 28,
        fontWeight: 600,
        color: ACCENT_CREAM,
      }}
    >
      {value} {suffix}
    </span>
  );
};

/** Small product icon for the race lineup: colored circle + name. */
const ProductDot: React.FC<{
  name: string;
  color: string;
  opacity: number;
  translateY: number;
}> = ({ name, color, opacity, translateY }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 8,
      opacity,
      transform: `translateY(${translateY}px)`,
    }}
  >
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: color,
      }}
    />
    <span
      style={{
        fontFamily: "Inter, sans-serif",
        fontSize: 14,
        fontWeight: 500,
        color: ACCENT_CREAM,
        letterSpacing: "0.02em",
      }}
    >
      {name}
    </span>
  </div>
);

export const ShrinkflationHook: React.FC<ShrinkflationHookProps> = ({
  chart,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;

  const title = chart.title ?? "Shrinkflation Decoded";
  const products = chart.products ?? DEFAULT_PRODUCTS;
  const productColors = { ...DEFAULT_PRODUCT_COLORS, ...(chart.productColors || {}) };

  // ── Phase 1: Chips shrink (0–2s) ──────────────────────────
  const chipsShrink = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 80 },
    durationInFrames: Math.round(2 * fps),
  });
  const chipsScale = interpolate(chipsShrink, [0, 1], [1.0, 0.77]);
  const chipsOpacity = interpolate(time, [0, 0.3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Phase 2: Coffee shrink + counter (2–4s) ───────────────
  const coffeeDelay = Math.round(2 * fps);
  const coffeeShrink = spring({
    frame: frame - coffeeDelay,
    fps,
    config: { damping: 14, stiffness: 80 },
    durationInFrames: Math.round(2 * fps),
  });
  const coffeeScale = interpolate(
    Math.max(0, coffeeShrink),
    [0, 1],
    [1.0, 0.72],
  );
  const coffeeOpacity = interpolate(time, [2, 2.3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Counter: 16→10 over 2–4s
  const counterProgress = interpolate(time, [2, 4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  // ── Phase 3: Title fade in (~5s) and out (~8s) ────────────
  // cubic-bezier(0.33,1,0.68,1) over 30 frames ≈ 1s at 30fps
  const titleFadeIn = interpolate(
    frame,
    [Math.round(5 * fps), Math.round(5 * fps) + 30],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.33, 1, 0.68, 1),
    },
  );
  const titleFadeOut = interpolate(
    frame,
    [Math.round(8 * fps), Math.round(8 * fps) + 30],
    [1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.33, 1, 0.68, 1),
    },
  );
  const titleOpacity = Math.min(titleFadeIn, titleFadeOut);

  // ── Phase 4: Shrink props dissolve (~9–10s) ───────────────
  const propsDissolve = interpolate(time, [9, 10], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Phase 5: Product icons emerge at baseline (~10s+) ─────
  const STAGGER_FRAMES = 10;
  const lineupStartFrame = Math.round(10 * fps);

  // Baseline pulse: 2s cycle, opacity 0.6→1.0→0.6
  const baselinePulseTime = Math.max(0, time - 10);
  const baselineOpacity = interpolate(
    baselinePulseTime % 2,
    [0, 1, 2],
    [0.6, 1.0, 0.6],
    { extrapolateRight: "clamp" },
  );

  const showLineup = frame >= lineupStartFrame;

  // Total width for lineup (centered)
  const iconSpacing = 160;
  const lineupWidth = (products.length - 1) * iconSpacing;
  const lineupX = (1920 - lineupWidth) / 2;
  const baselineY = 600; // vertical center-ish

  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        backgroundColor: BG_COLOR,
        position: "relative",
        overflow: "hidden",
        fontFamily: fontFamily || "Inter, sans-serif",
      }}
    >
      {/* Dot grid background */}
      <DotGrid />

      {/* ── Shrink props (0–10s) ── */}
      {propsDissolve > 0 && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 120,
            opacity: propsDissolve,
            zIndex: 2,
          }}
        >
          {/* Chips box */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <ProductBox
              label="CHIPS"
              color={productColors["Chips"] || ACCENT_CREAM}
              scale={chipsScale}
              opacity={chipsOpacity}
              width={140}
              height={180}
            />
          </div>

          {/* Coffee box + counter */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <ProductBox
              label="COFFEE"
              color={productColors["Coffee"] || "#90AFC5"}
              scale={coffeeScale}
              opacity={coffeeOpacity}
              width={120}
              height={160}
            />
            {time >= 2 && (
              <div style={{ opacity: coffeeOpacity }}>
                <AnimatedCounter
                  from={16}
                  to={10}
                  progress={counterProgress}
                  suffix="oz"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Title "Shrinkflation Decoded" ── */}
      {titleOpacity > 0 && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 800,
              fontSize: 72,
              color: ACCENT_CREAM,
              opacity: titleOpacity,
              letterSpacing: "0.02em",
              textAlign: "center",
            }}
          >
            {title}
          </div>
        </div>
      )}

      {/* ── Product lineup at baseline (~10s+) ── */}
      {showLineup && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 4,
          }}
        >
          {/* Baseline reference line */}
          <div
            style={{
              position: "absolute",
              top: baselineY + 60,
              left: 160,
              right: 160,
              height: 2,
              backgroundColor: ACCENT_CREAM,
              opacity: baselineOpacity * 0.5,
            }}
          />
          {/* "RUPI = 1.0" label */}
          <div
            style={{
              position: "absolute",
              top: baselineY + 70,
              right: 160,
              fontFamily: "JetBrains Mono, monospace",
              fontVariantNumeric: "tabular-nums",
              fontSize: 14,
              color: SAGE_SILVER,
              opacity: baselineOpacity * 0.7,
            }}
          >
            RUPI = 1.0
          </div>

          {/* Product icons */}
          <div
            style={{
              position: "absolute",
              top: baselineY - 50,
              left: 0,
              width: "100%",
              display: "flex",
              justifyContent: "center",
              gap: iconSpacing - 50, // gap between dots
            }}
          >
            {products.map((name, i) => {
              const staggerDelay = i * STAGGER_FRAMES;
              const localFrame = frame - lineupStartFrame - staggerDelay;
              const entrance = spring({
                frame: Math.max(0, localFrame),
                fps,
                config: { damping: 15, stiffness: 120 },
              });
              const dotOpacity = interpolate(entrance, [0, 1], [0, 1]);
              const dotTranslateY = interpolate(entrance, [0, 1], [30, 0]);
              const color = productColors[name] || ACCENT_CREAM;

              return (
                <ProductDot
                  key={name}
                  name={name}
                  color={color}
                  opacity={localFrame >= 0 ? dotOpacity : 0}
                  translateY={localFrame >= 0 ? dotTranslateY : 30}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
