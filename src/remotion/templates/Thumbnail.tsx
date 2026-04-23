import React from "react";
import { AbsoluteFill } from "remotion";
import { BG, TEXT, ACCENT_PINK, TEXT_SECONDARY, TEXT_FAINT } from "../palette";

export interface ThumbnailProps {
  /** Layout variant */
  variant: "A" | "B" | "C";
  /** The "before" number, shown crossed out (e.g. "26,000%") */
  beforeNumber: string;
  /** The "after" number, hero element (e.g. "132%") */
  afterNumber: string;
  /** Label above the before number (e.g. "THE DOW") */
  topLabel?: string;
  /** Label below the after number (e.g. "PRICED IN GOLD") */
  bottomLabel?: string;
  /** Small label in corner (e.g. "100 YEARS OF DATA") */
  cornerLabel?: string;
  /** Position of corner label: "bottom-left" or "bottom-right" */
  cornerPosition?: "bottom-left" | "bottom-right";
  /** Background gradient top color */
  bgTop?: string;
  /** Background gradient bottom color */
  bgBottom?: string;
  /** Color for the crossed-out number */
  beforeColor?: string;
  /** Strikethrough line color */
  strikethroughColor?: string;
  /** Color for the hero number */
  afterColor?: string;
  /** Gold glow around the hero number */
  glowColor?: string;
  /** Corner label color */
  cornerLabelColor?: string;
  /** Font family */
  fontFamily?: string;
  /** Show thin horizontal divider line between numbers */
  showDivider?: boolean;
  /** Divider color */
  dividerColor?: string;
  /** Arrow/connector between numbers */
  connectorText?: string;
  /** Connector color */
  connectorColor?: string;
}

const defaults = {
  bgTop: BG,
  bgBottom: BG,
  beforeColor: TEXT,
  strikethroughColor: ACCENT_PINK,
  afterColor: ACCENT_PINK,
  glowColor: "rgba(232, 140, 165, 0.35)",
  cornerLabelColor: "rgba(240, 237, 232, 0.6)",
  fontFamily: "Montserrat, sans-serif",
  dividerColor: ACCENT_PINK,
  connectorColor: TEXT_FAINT,
};

/**
 * Thumbnail — Static thumbnail generator for YouTube.
 * Rendered at 1280x720 using `npx remotion still`.
 *
 * Three layout variants:
 *   A — Left-aligned vertical stack with context labels
 *   B — Horizontal: ~~26,000%~~ → 132% side by side
 *   C — Hero 132% dominant, small crossed-out text below
 */
export const Thumbnail: React.FC<ThumbnailProps> = (props) => {
  const {
    variant,
    beforeNumber,
    afterNumber,
    topLabel,
    bottomLabel,
    cornerLabel,
    cornerPosition = "bottom-left",
    bgTop = defaults.bgTop,
    bgBottom = defaults.bgBottom,
    beforeColor = defaults.beforeColor,
    strikethroughColor = defaults.strikethroughColor,
    afterColor = defaults.afterColor,
    glowColor = defaults.glowColor,
    cornerLabelColor = defaults.cornerLabelColor,
    fontFamily = defaults.fontFamily,
    showDivider = true,
    dividerColor = defaults.dividerColor,
    connectorText = "→",
    connectorColor = defaults.connectorColor,
  } = props;

  if (variant === "B") {
    return (
      <VariantB
        {...{
          beforeNumber, afterNumber, topLabel, bottomLabel, cornerLabel, cornerPosition,
          bgTop, bgBottom, beforeColor, strikethroughColor,
          afterColor, glowColor, cornerLabelColor, fontFamily,
          connectorText, connectorColor,
        }}
      />
    );
  }

  if (variant === "C") {
    return (
      <VariantC
        {...{
          beforeNumber, afterNumber, topLabel, bottomLabel, cornerLabel, cornerPosition,
          bgTop, bgBottom, beforeColor, strikethroughColor,
          afterColor, glowColor, cornerLabelColor, fontFamily,
        }}
      />
    );
  }

  // Default: Variant A
  return (
    <VariantA
      {...{
        beforeNumber, afterNumber, topLabel, bottomLabel, cornerLabel, cornerPosition,
        bgTop, bgBottom, beforeColor, strikethroughColor,
        afterColor, glowColor, cornerLabelColor, fontFamily,
        showDivider, dividerColor,
      }}
    />
  );
};

// ═══════════════════════════════════════════════════════════════
// VARIANT A — Diagonal composition with wild strikethrough
// 26,000% top-left, 132% bottom-right, faded chart background
// ═══════════════════════════════════════════════════════════════

/**
 * Generate SVG path for a rough/hand-drawn stock chart line.
 * Simulates a Dow-like trajectory: rise → crash → rise pattern.
 */
const generateChartPath = (w: number, h: number): string => {
  // Simplified Dow-like trajectory over ~100 years
  // Start low-left, rise, crash (1929), recover, big rise, dip (2008), recover higher
  const points = [
    [0, 0.75], [0.05, 0.7], [0.1, 0.55], [0.15, 0.4], // 1925-1929 rise
    [0.18, 0.85], [0.22, 0.9], // 1929 crash
    [0.28, 0.8], [0.35, 0.65], [0.42, 0.55], // recovery
    [0.5, 0.45], [0.55, 0.38], [0.6, 0.35], // post-war boom
    [0.65, 0.42], [0.68, 0.35], // 70s volatility
    [0.72, 0.3], [0.78, 0.2], [0.82, 0.15], // 80s-90s bull
    [0.85, 0.25], // 2008 dip
    [0.88, 0.18], [0.92, 0.12], [0.96, 0.08], [1.0, 0.05], // recovery to ATH
  ];

  const scaled = points.map(([x, y]) => [x * w, y * h]);
  let path = `M ${scaled[0][0]} ${scaled[0][1]}`;
  for (let i = 1; i < scaled.length; i++) {
    const prev = scaled[i - 1];
    const curr = scaled[i];
    const cpx1 = prev[0] + (curr[0] - prev[0]) * 0.5;
    const cpx2 = prev[0] + (curr[0] - prev[0]) * 0.5;
    path += ` C ${cpx1} ${prev[1]}, ${cpx2} ${curr[1]}, ${curr[0]} ${curr[1]}`;
  }
  return path;
};

const VariantA: React.FC<{
  beforeNumber: string;
  afterNumber: string;
  topLabel?: string;
  bottomLabel?: string;
  cornerLabel?: string;
  cornerPosition: "bottom-left" | "bottom-right";
  bgTop: string;
  bgBottom: string;
  beforeColor: string;
  strikethroughColor: string;
  afterColor: string;
  glowColor: string;
  cornerLabelColor: string;
  fontFamily: string;
  showDivider: boolean;
  dividerColor: string;
}> = ({
  beforeNumber, afterNumber, bottomLabel, cornerLabel,
  bgTop, bgBottom, beforeColor, strikethroughColor,
  afterColor, glowColor, cornerLabelColor, fontFamily,
}) => (
  <AbsoluteFill
    style={{
      background: `linear-gradient(180deg, ${bgTop} 0%, ${bgBottom} 100%)`,
      fontFamily,
      overflow: "hidden",
    }}
  >
    {/* Background chart silhouette */}
    <svg
      viewBox="0 0 1280 720"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    >
      {/* Filled area under chart */}
      <path
        d={generateChartPath(1280, 720) + " L 1280 720 L 0 720 Z"}
        fill="url(#chartGradient)"
        opacity={0.06}
      />
      {/* Chart line */}
      <path
        d={generateChartPath(1280, 720)}
        fill="none"
        stroke={ACCENT_PINK}
        strokeWidth={2.5}
        opacity={0.15}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ACCENT_PINK} stopOpacity={0.3} />
          <stop offset="100%" stopColor={ACCENT_PINK} stopOpacity={0} />
        </linearGradient>
      </defs>
    </svg>

    {/* Warm radial glow behind 132% area (bottom-right) */}
    <div
      style={{
        position: "absolute",
        bottom: "8%",
        right: "10%",
        width: 600,
        height: 350,
        background: `radial-gradient(ellipse, rgba(232, 140, 165, 0.15) 0%, transparent 70%)`,
        pointerEvents: "none",
      }}
    />

    {/* 26,000% — positioned top-left area */}
    <div
      style={{
        position: "absolute",
        top: 55,
        left: 60,
      }}
    >
      <div style={{ position: "relative", display: "inline-block" }}>
        <div
          style={{
            fontSize: 165,
            fontWeight: 900,
            color: beforeColor,
            letterSpacing: -5,
            lineHeight: 1,
            opacity: 0.75,
          }}
        >
          {beforeNumber}
        </div>
        {/* Wild textured strikethrough — multiple overlapping strokes */}
        <svg
          style={{
            position: "absolute",
            top: 0,
            left: "-4%",
            width: "108%",
            height: "100%",
            pointerEvents: "none",
          }}
          viewBox="0 0 800 160"
          preserveAspectRatio="none"
        >
          {/* Main thick stroke — rough/hand-drawn */}
          <path
            d="M 10 90 Q 100 70, 200 85 Q 300 100, 400 75 Q 500 50, 600 70 Q 700 88, 790 65"
            fill="none"
            stroke={strikethroughColor}
            strokeWidth={18}
            strokeLinecap="round"
            opacity={0.85}
          />
          {/* Second pass — slightly offset for texture */}
          <path
            d="M 15 82 Q 120 65, 220 80 Q 320 95, 420 72 Q 520 48, 620 68 Q 720 82, 785 60"
            fill="none"
            stroke={strikethroughColor}
            strokeWidth={10}
            strokeLinecap="round"
            opacity={0.5}
          />
          {/* Third thin pass — adds roughness */}
          <path
            d="M 5 95 Q 80 78, 180 92 Q 280 105, 380 78 Q 480 55, 580 74 Q 680 90, 795 68"
            fill="none"
            stroke={strikethroughColor}
            strokeWidth={5}
            strokeLinecap="round"
            opacity={0.35}
          />
        </svg>
      </div>
    </div>

    {/* 132% — positioned bottom-right area */}
    <div
      style={{
        position: "absolute",
        bottom: 110,
        right: 55,
      }}
    >
      <div
        style={{
          fontSize: 230,
          fontWeight: 900,
          color: afterColor,
          letterSpacing: -7,
          lineHeight: 1,
          textShadow: `0 0 50px ${glowColor}, 0 0 100px ${glowColor}, 0 0 150px rgba(232, 140, 165, 0.2)`,
        }}
      >
        {afterNumber}
      </div>

      {/* Bottom label (e.g. "PRICED IN GOLD") */}
      {bottomLabel && (
        <div
          style={{
            fontSize: 28,
            fontWeight: 600,
            color: ACCENT_PINK,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginTop: 5,
            textAlign: "right",
            opacity: 0.85,
          }}
        >
          {bottomLabel}
        </div>
      )}
    </div>

    {/* "100 YEARS OF DATA" — prominent, bottom center-left */}
    {cornerLabel && (
      <div
        style={{
          position: "absolute",
          bottom: 25,
          left: 60,
          fontSize: 30,
          fontWeight: 700,
          color: "rgba(240, 237, 232, 0.6)",
          letterSpacing: 5,
          textTransform: "uppercase",
        }}
      >
        {cornerLabel}
      </div>
    )}
  </AbsoluteFill>
);

// ═══════════════════════════════════════════════════════════════
// VARIANT B — Horizontal layout
// ═══════════════════════════════════════════════════════════════

const VariantB: React.FC<{
  beforeNumber: string;
  afterNumber: string;
  topLabel?: string;
  bottomLabel?: string;
  cornerLabel?: string;
  cornerPosition: "bottom-left" | "bottom-right";
  bgTop: string;
  bgBottom: string;
  beforeColor: string;
  strikethroughColor: string;
  afterColor: string;
  glowColor: string;
  cornerLabelColor: string;
  fontFamily: string;
  connectorText: string;
  connectorColor: string;
}> = ({
  beforeNumber, afterNumber, topLabel, bottomLabel, cornerLabel, cornerPosition,
  bgTop, bgBottom, beforeColor, strikethroughColor,
  afterColor, glowColor, cornerLabelColor, fontFamily,
  connectorText, connectorColor,
}) => (
  <AbsoluteFill
    style={{
      background: `linear-gradient(135deg, ${bgTop} 0%, ${bgBottom} 100%)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      fontFamily,
    }}
  >
    {/* Top label */}
    {topLabel && (
      <div
        style={{
          fontSize: 32,
          fontWeight: 700,
          color: TEXT_SECONDARY,
          letterSpacing: 5,
          textTransform: "uppercase",
          marginBottom: 20,
        }}
      >
        {topLabel}
      </div>
    )}

    {/* Horizontal number row */}
    <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
      {/* Crossed-out "before" number */}
      <div style={{ position: "relative", display: "inline-block" }}>
        <div
          style={{
            fontSize: 110,
            fontWeight: 900,
            color: beforeColor,
            letterSpacing: -3,
            lineHeight: 1,
            opacity: 0.7,
          }}
        >
          {beforeNumber}
        </div>
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "-3%",
            right: "-3%",
            height: 10,
            backgroundColor: strikethroughColor,
            transform: "rotate(-3deg) translateY(-50%)",
            borderRadius: 5,
          }}
        />
      </div>

      {/* Connector arrow */}
      <div
        style={{
          fontSize: 60,
          color: connectorColor,
          fontWeight: 300,
          opacity: 0.6,
          marginTop: -10,
        }}
      >
        {connectorText}
      </div>

      {/* Hero "after" number */}
      <div
        style={{
          fontSize: 150,
          fontWeight: 900,
          color: afterColor,
          letterSpacing: -4,
          lineHeight: 1,
          textShadow: `0 0 40px ${glowColor}, 0 0 80px ${glowColor}`,
        }}
      >
        {afterNumber}
      </div>
    </div>

    {/* Bottom label */}
    {bottomLabel && (
      <div
        style={{
          fontSize: 26,
          fontWeight: 600,
          color: "#B8A060",
          letterSpacing: 6,
          textTransform: "uppercase",
          marginTop: 20,
          opacity: 0.8,
        }}
      >
        {bottomLabel}
      </div>
    )}

    {/* Corner label */}
    {cornerLabel && (
      <div
        style={{
          position: "absolute",
          bottom: 30,
          ...(cornerPosition === "bottom-left"
            ? { left: 40 }
            : { right: 35 }),
          fontSize: 22,
          fontWeight: 500,
          color: cornerLabelColor,
          letterSpacing: 3,
          textTransform: "uppercase",
        }}
      >
        {cornerLabel}
      </div>
    )}
  </AbsoluteFill>
);

// ═══════════════════════════════════════════════════════════════
// VARIANT C — Hero dominant, small crossed-out below
// ═══════════════════════════════════════════════════════════════

const VariantC: React.FC<{
  beforeNumber: string;
  afterNumber: string;
  topLabel?: string;
  bottomLabel?: string;
  cornerLabel?: string;
  cornerPosition: "bottom-left" | "bottom-right";
  bgTop: string;
  bgBottom: string;
  beforeColor: string;
  strikethroughColor: string;
  afterColor: string;
  glowColor: string;
  cornerLabelColor: string;
  fontFamily: string;
}> = ({
  beforeNumber, afterNumber, topLabel, bottomLabel, cornerLabel, cornerPosition,
  bgTop, bgBottom, beforeColor, strikethroughColor,
  afterColor, glowColor, cornerLabelColor, fontFamily,
}) => (
  <AbsoluteFill
    style={{
      background: `linear-gradient(180deg, ${bgTop} 0%, ${bgBottom} 100%)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      fontFamily,
    }}
  >
    {/* Top label */}
    {topLabel && (
      <div
        style={{
          fontSize: 32,
          fontWeight: 700,
          color: TEXT_SECONDARY,
          letterSpacing: 5,
          textTransform: "uppercase",
          marginBottom: 15,
        }}
      >
        {topLabel}
      </div>
    )}

    {/* Huge hero number */}
    <div
      style={{
        fontSize: 240,
        fontWeight: 900,
        color: afterColor,
        letterSpacing: -8,
        lineHeight: 1,
        textShadow: `0 0 50px ${glowColor}, 0 0 100px ${glowColor}, 0 0 150px rgba(232, 140, 165, 0.15)`,
      }}
    >
      {afterNumber}
    </div>

    {/* Bottom label (e.g. "PRICED IN GOLD") */}
    {bottomLabel && (
      <div
        style={{
          fontSize: 28,
          fontWeight: 600,
          color: "#B8A060",
          letterSpacing: 6,
          textTransform: "uppercase",
          marginTop: 15,
          opacity: 0.8,
        }}
      >
        {bottomLabel}
      </div>
    )}

    {/* Small crossed-out "before" number */}
    <div style={{ position: "relative", display: "inline-block", marginTop: 30 }}>
      <div
        style={{
          fontSize: 52,
          fontWeight: 700,
          color: beforeColor,
          letterSpacing: -1,
          lineHeight: 1,
          opacity: 0.4,
        }}
      >
        not {beforeNumber}
      </div>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "10%",
          right: "-2%",
          height: 4,
          backgroundColor: strikethroughColor,
          transform: "rotate(-2deg) translateY(-50%)",
          borderRadius: 2,
          opacity: 0.8,
        }}
      />
    </div>

    {/* Corner label */}
    {cornerLabel && (
      <div
        style={{
          position: "absolute",
          bottom: 30,
          ...(cornerPosition === "bottom-left"
            ? { left: 40 }
            : { right: 35 }),
          fontSize: 22,
          fontWeight: 500,
          color: cornerLabelColor,
          letterSpacing: 3,
          textTransform: "uppercase",
        }}
      >
        {cornerLabel}
      </div>
    )}
  </AbsoluteFill>
);
