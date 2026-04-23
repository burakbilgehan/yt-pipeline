import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
} from "remotion";
import {
  BG,
  TEXT,
  TEXT_MUTED,
  ACCENT_PINK,
  ACCENT_BLUE,
  SAGE,
} from "../../palette";

// ─── Types ────────────────────────────────────────────────────

interface PanelData {
  year: number;
  wage: string;
  product: string;
  price: string;
}

interface MetricSceneProps {
  chart: {
    type: "metric-scene";
    phase1: {
      left: PanelData;
      right: PanelData;
    };
    phase2: {
      formulaParts: string[];
    };
    /** Seconds at which Phase 1 ends and Phase 2 begins (default 20) */
    phaseSplitSec?: number;
    /** BLS logo path for watermark (optional) */
    blsLogoSrc?: string;
    [key: string]: unknown;
  };
  brandColor: string;
  fontFamily: string;
  /** Fallback formula parts when chart.phase2.formulaParts is empty/missing. */
  defaultFormulaParts?: string[];
}

// ─── Design Tokens ────────────────────────────────────────────

const BG_COLOR = BG;
const TEXT_COLOR = TEXT;
const MUTED_TEXT = TEXT_MUTED;
const SAGE_SILVER = SAGE;

const FONT_HEADING = "Montserrat, sans-serif";
const FONT_BODY = "Montserrat, sans-serif";

const SPRING_COUNTER = { damping: 18, stiffness: 80 };
const CROSSFADE_FRAMES = 8;

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Parse a numeric value from a string like "$572/week" or "$0.91/dozen".
 * Returns the first number found (including decimals and commas).
 */
function parseNumericValue(s: string): number {
  const cleaned = s.replace(/,/g, "");
  const match = cleaned.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

/**
 * Format a number with commas and optional decimal places.
 */
function formatNumber(n: number, decimals: number): string {
  const fixed = n.toFixed(decimals);
  const [intPart, decPart] = fixed.split(".");
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decPart ? `${withCommas}.${decPart}` : withCommas;
}

// ─── Sub-components ───────────────────────────────────────────

/**
 * Comparison panel (one side of the split card).
 */
const ComparisonPanel: React.FC<{
  data: PanelData;
  side: "left" | "right";
  accentColor: string;
  frame: number;
  fps: number;
  baseDelay: number;
}> = ({ data, side, accentColor, frame, fps, baseDelay }) => {
  // Panel entrance — slides in from its side
  const slideSpring = spring({
    fps,
    frame: frame - baseDelay,
    config: { damping: 18, stiffness: 60 },
  });
  const slideX = side === "left"
    ? interpolate(slideSpring, [0, 1], [-80, 0])
    : interpolate(slideSpring, [0, 1], [80, 0]);

  // Year header — pops in
  const yearSpring = spring({
    fps,
    frame: frame - baseDelay - 5,
    config: SPRING_COUNTER,
  });

  // Wage counter — spring-animated number
  const wageTarget = parseNumericValue(data.wage);
  const wageDecimals = data.wage.includes(".") ? (data.wage.split(".")[1]?.match(/\d+/)?.[0]?.length || 0) : 0;
  const wageSpring = spring({
    fps,
    frame: frame - baseDelay - 15,
    config: SPRING_COUNTER,
  });
  const wageValue = wageSpring * wageTarget;
  // Reconstruct the formatted string: "$X/suffix"
  const wageSuffix = data.wage.replace(/[\d,.$]+/, "").trim();
  const wagePrefix = data.wage.startsWith("$") ? "$" : "";

  // Product price counter
  const priceTarget = parseNumericValue(data.price);
  const priceDecimals = data.price.includes(".")
    ? (data.price.split(".")[1]?.match(/\d+/)?.[0]?.length || 2)
    : 0;
  const priceSpring = spring({
    fps,
    frame: frame - baseDelay - 25,
    config: SPRING_COUNTER,
  });
  const priceValue = priceSpring * priceTarget;
  const priceSuffix = data.price.replace(/[\d,.$]+/, "").trim();
  const pricePrefix = data.price.startsWith("$") ? "$" : "";

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 50px",
        transform: `translateX(${slideX}px)`,
        opacity: slideSpring,
        gap: 24,
      }}
    >
      {/* Year header */}
      <div
        style={{
          fontFamily: FONT_HEADING,
          fontSize: 64,
          fontWeight: 800,
          color: TEXT_COLOR,
          opacity: yearSpring,
          transform: `scale(${interpolate(yearSpring, [0, 1], [0.7, 1])})`,
          letterSpacing: 2,
        }}
      >
        {data.year}
      </div>

      {/* Wage */}
      <div
        style={{
          fontFamily,
          fontSize: 52,
          fontWeight: 700,
          color: accentColor,
          fontVariantNumeric: "tabular-nums",
          opacity: wageSpring,
          transform: `translateY(${interpolate(wageSpring, [0, 1], [20, 0])}px)`,
        }}
      >
        {wagePrefix}{formatNumber(wageValue, wageDecimals)}{wageSuffix}
      </div>

      {/* Product line */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          opacity: priceSpring,
          transform: `translateY(${interpolate(priceSpring, [0, 1], [15, 0])}px)`,
        }}
      >
        <div
          style={{
            fontFamily: FONT_BODY,
            fontSize: 24,
            color: MUTED_TEXT,
            letterSpacing: 0.5,
          }}
        >
          {data.product}
        </div>
        <div
          style={{
            fontFamily,
            fontSize: 36,
            fontWeight: 600,
            color: TEXT_COLOR,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {pricePrefix}{formatNumber(priceValue, priceDecimals)}{priceSuffix}
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────

/**
 * MetricScene — Two-phase data visualization.
 *
 * Phase 1: Split comparison card (e.g. 2000 vs 2025 wages/prices)
 *   - Left and right panels slide in from edges
 *   - Numbers animate with spring counters
 *   - Thin vertical divider in Sage Silver
 *
 * Phase 2: Formula build (e.g. Price Growth / Wage Growth = RUPI)
 *   - Each term appears sequentially with staggered spring entrance
 *   - Operators rendered as muted text, terms in styled boxes
 *   - Optional BLS logo watermark (30% opacity)
 *
 * Transition: 8-frame crossfade between phases.
 */
export const MetricScene: React.FC<MetricSceneProps> = ({
  chart,
  brandColor,
  fontFamily,
  defaultFormulaParts = ["Price Growth", "\u00F7", "Wage Growth", "=", "RUPI"],
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Destructure with defaults ──
  const phase1 = chart.phase1 || {
    left: { year: 2000, wage: "$572/week", product: "Eggs", price: "$0.91/dozen" },
    right: { year: 2025, wage: "$1,206/week", product: "Eggs", price: "$4.25/dozen" },
  };
  const phase2 = chart.phase2 || {
    formulaParts: defaultFormulaParts,
  };
  const phaseSplitSec = chart.phaseSplitSec ?? 20;
  const blsLogoSrc = chart.blsLogoSrc as string | undefined;

  const phaseSplitFrame = phaseSplitSec * fps;
  // 500ms gap (break) before formula starts = 15 frames at 30fps
  const formulaStartFrame = phaseSplitFrame + Math.round(0.5 * fps);

  // ── Phase crossfade ──
  // Phase 1 fades out over CROSSFADE_FRAMES ending at phaseSplitFrame
  const phase1Opacity = interpolate(
    frame,
    [phaseSplitFrame - CROSSFADE_FRAMES, phaseSplitFrame],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  // Phase 2 fades in over CROSSFADE_FRAMES starting at phaseSplitFrame
  const phase2Opacity = interpolate(
    frame,
    [phaseSplitFrame, phaseSplitFrame + CROSSFADE_FRAMES],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // ── Divider animation (Phase 1) ──
  const dividerSpring = spring({
    fps,
    frame: frame - 8,
    config: { damping: 20, stiffness: 60 },
  });

  // ── Formula stagger (Phase 2) ──
  const staggerDelay = Math.round(fps * 0.4); // 0.4s between each part

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG_COLOR,
        fontFamily: fontFamily || FONT_BODY,
      }}
    >
      {/* ── Phase 1: Split Comparison ── */}
      {phase1Opacity > 0 && (
        <AbsoluteFill
          style={{
            opacity: phase1Opacity,
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          {/* Left panel */}
          <ComparisonPanel
            data={phase1.left}
            side="left"
            accentColor={ACCENT_PINK}
            frame={frame}
            fps={fps}
            baseDelay={5}
          />

          {/* Center divider */}
          <div
            style={{
              width: 2,
              height: `${dividerSpring * 65}%`,
              backgroundColor: SAGE_SILVER,
              opacity: 0.6,
              flexShrink: 0,
            }}
          />

          {/* Right panel */}
          <ComparisonPanel
            data={phase1.right}
            side="right"
            accentColor={ACCENT_BLUE}
            frame={frame}
            fps={fps}
            baseDelay={10}
          />
        </AbsoluteFill>
      )}

      {/* ── Phase 2: Formula Build ── */}
      {phase2Opacity > 0 && (
        <AbsoluteFill
          style={{
            opacity: phase2Opacity,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          {/* Formula row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 24,
              flexWrap: "wrap",
              justifyContent: "center",
              maxWidth: "88%",
            }}
          >
            {phase2.formulaParts.map((part, i) => {
              const partFrame = frame - formulaStartFrame - i * staggerDelay;
              const isOperator =
                part === "\u00F7" ||
                part === "=" ||
                part === "\u00D7" ||
                part === "+" ||
                part === "-" ||
                part === "/" ||
                part === "*";

              const entrance = spring({
                fps,
                frame: partFrame,
                config: { damping: 14, stiffness: 70 },
              });

              const slideY = interpolate(entrance, [0, 1], [30, 0]);

              // The result term (last non-operator) gets accent highlight
              const isResultTerm =
                !isOperator && i === phase2.formulaParts.length - 1;

              return (
                <div
                  key={`formula-${i}`}
                  style={{
                    opacity: entrance,
                    transform: `translateY(${slideY}px)`,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {isOperator ? (
                    <span
                      style={{
                        fontSize: 56,
                        fontWeight: 300,
                        color: MUTED_TEXT,
                        padding: "0 8px",
                        fontFamily,
                      }}
                    >
                      {part}
                    </span>
                  ) : (
                    <div
                      style={{
                        backgroundColor: isResultTerm
                          ? `${SAGE_SILVER}22`
                          : "rgba(240, 237, 232, 0.06)",
                        border: isResultTerm
                          ? `2px solid ${SAGE_SILVER}66`
                          : "1px solid rgba(240, 237, 232, 0.12)",
                        borderRadius: 12,
                        padding: "16px 28px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 42,
                          fontWeight: 700,
                          color: isResultTerm ? SAGE_SILVER : TEXT_COLOR,
                          letterSpacing: 0.5,
                          fontFamily: FONT_HEADING,
                        }}
                      >
                        {part}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* BLS logo watermark */}
          {blsLogoSrc && (
            <div
              style={{
                position: "absolute",
                bottom: 40,
                right: 50,
                opacity: 0.3,
              }}
            >
              <Img
                src={blsLogoSrc}
                style={{ height: 40, objectFit: "contain" }}
              />
            </div>
          )}

          {/* Text-based BLS attribution when no logo available */}
          {!blsLogoSrc && (
            <div
              style={{
                position: "absolute",
                bottom: 40,
                right: 50,
                opacity: 0.3,
                fontFamily: FONT_BODY,
                fontSize: 20,
                color: MUTED_TEXT,
                letterSpacing: 1,
              }}
            >
              Source: BLS
            </div>
          )}
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
