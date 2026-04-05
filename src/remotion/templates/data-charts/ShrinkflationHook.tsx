import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  staticFile,
  Img,
} from "remotion";
import { BG, TEXT, TEXT_SECONDARY, SAGE, ACCENT_PINK } from "../../palette";

/**
 * ShrinkflationHook — Scene 001
 *
 * Two-row single-photo product comparison synced to voiceover:
 *   Row 1 (0.5s):  Häagen-Dazs — single photo showing 16oz → 14oz
 *   Row 2 (4.0s):  Folgers     — single photo showing 39oz → 30.5oz
 *   Hold (8s+):    Both rows visible with subtle breathe animation
 *
 * Each photo already contains the before/after comparison in one image.
 * NO title text — title handled by scene-002.
 */

// ─── Types ──────────────────────────────────────────────────────

interface ProductData {
  name: string;
  image: string;
  oldSize: string;
  newSize: string;
}

interface ShrinkflationHookProps {
  chart: {
    type: "shrinkflation-hook";
    [key: string]: unknown;
  };
  brandColor: string;
  fontFamily: string;
  /** Product comparison data. Falls back to default Häagen-Dazs + Folgers examples. */
  products?: ProductData[];
}

// ─── Constants ──────────────────────────────────────────────────

const DOT_SPACING = 40;
const DOT_SIZE = 2;
const PHOTO_WIDTH = 760;
const PHOTO_HEIGHT = 340;

// ─── Product Data ───────────────────────────────────────────────

const DEFAULT_PRODUCTS: ProductData[] = [
  { name: "Ice Cream", image: "shrinkflation-decoded/haagen-dazs.jpg", oldSize: "16 oz", newSize: "14 oz" },
  { name: "Coffee", image: "shrinkflation-decoded/folgers.jpg", oldSize: "39 oz", newSize: "30.5 oz" },
];

// Entrance times per row index (seconds)
const ENTRANCE_TIMES = [0.5, 4.0, 7.5, 11.0];

interface ProductRow {
  name: string;
  sizeLabel: string;
  image: string;
  entranceTime: number;
}

/** Convert ProductData[] to internal ProductRow[] with computed fields */
function toProductRows(products: ProductData[]): ProductRow[] {
  return products.map((p, i) => ({
    name: p.name,
    sizeLabel: `${p.oldSize} → ${p.newSize}`,
    image: p.image,
    entranceTime: ENTRANCE_TIMES[i] ?? 0.5 + i * 3.5,
  }));
}

// ─── Sub-components ─────────────────────────────────────────────

/** Dot grid background — subtle texture */
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
          fill={SAGE}
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

// ─── Main Component ─────────────────────────────────────────────

export const ShrinkflationHook: React.FC<ShrinkflationHookProps> = ({
  fontFamily,
  products = DEFAULT_PRODUCTS,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;

  const ROWS = toProductRows(products);

  // ── Breathe animation for hold phase (8s+) ─────────────────
  const breathePhase = Math.max(0, time - 8);
  const breatheScale = 1 + 0.015 * Math.sin(breathePhase * Math.PI * 0.8);
  const breatheGlow = interpolate(
    Math.sin(breathePhase * Math.PI * 0.8),
    [-1, 1],
    [0, 0.25],
  );

  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        backgroundColor: BG,
        position: "relative",
        overflow: "hidden",
        fontFamily: fontFamily || "Inter, sans-serif",
      }}
    >
      <DotGrid />

      {/* Two product rows centered vertically */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 48,
          zIndex: 2,
        }}
      >
        {ROWS.map((row) => {
          // Photo: fade + scale in via spring
          const entrance = spring({
            frame: Math.max(0, frame - Math.round(row.entranceTime * fps)),
            fps,
            config: { damping: 14, stiffness: 80 },
          });
          const photoOpacity = interpolate(entrance, [0, 0.5], [0, 1], {
            extrapolateRight: "clamp",
          });
          const photoScale = interpolate(entrance, [0, 1], [0.9, 1], {
            extrapolateRight: "clamp",
          });

          // Apply breathe effect only after row is fully visible
          const rowFullyVisible = time > row.entranceTime + 2;
          const applyBreathe = time >= 8 && rowFullyVisible;
          const rowBreatheScale = applyBreathe ? breatheScale : 1;

          return (
            <div
              key={row.name}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                opacity: photoOpacity,
                transform: `scale(${photoScale * rowBreatheScale})`,
                filter: applyBreathe
                  ? `drop-shadow(0 0 ${20 + breatheGlow * 30}px rgba(138, 154, 122, ${0.1 + breatheGlow * 0.15}))`
                  : "none",
              }}
            >
              {/* Product photo */}
              <div
                style={{
                  width: PHOTO_WIDTH,
                  height: PHOTO_HEIGHT,
                  borderRadius: 12,
                  overflow: "hidden",
                  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
                }}
              >
                <Img
                  src={staticFile(row.image)}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              </div>

              {/* Label: "Product Name · before → after" */}
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                  marginTop: 16,
                }}
              >
                <span
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: 24,
                    fontWeight: 700,
                    color: TEXT,
                  }}
                >
                  {row.name}
                </span>
                <span
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: 20,
                    fontWeight: 500,
                    color: TEXT_SECONDARY,
                  }}
                >
                  ·
                </span>
                <span
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    fontVariantNumeric: "tabular-nums",
                    fontSize: 22,
                    fontWeight: 600,
                    color: ACCENT_PINK,
                  }}
                >
                  {row.sizeLabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
