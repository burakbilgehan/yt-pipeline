import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { BG, TEXT, SAGE, TEXT_MUTED, NEGATIVE, POSITIVE } from "../../palette";

// ─── Types ────────────────────────────────────────────────────

interface ZoneConfig {
  color: string;
  label: string;
  opacity: number;
}

interface AtConfig {
  label: string;
}

export interface BaselineReferenceProps {
  chart: {
    type: "baseline-reference";
    baselineValue: number;
    zones: {
      above: ZoneConfig;
      below: ZoneConfig;
      at: AtConfig;
    };
    [key: string]: unknown;
  };
  brandColor: string;
  fontFamily: string;
  /** Label shown next to the baseline value (e.g. "RUPI"). */
  metricLabel?: string;
}

// ─── Design Tokens (from brand-guide.md) ──────────────────────

const BG_COLOR = BG;
const TEXT_COLOR = TEXT;
const SAGE_SILVER = SAGE;
const MUTED_TEXT = TEXT_MUTED;

const FONT_HEADING = "Montserrat, sans-serif";
const FONT_MONO = "'JetBrains Mono', monospace";
const FONT_BODY = "Inter, sans-serif";

// Spring config for cards/zones (brand guide: stiffness 80, damping 18)
const SPRING_CARD = { stiffness: 80, damping: 18 };

// 10-frame stagger between elements (brand guide)
const STAGGER_FRAMES = 10;

// ─── Component ────────────────────────────────────────────────

/**
 * BaselineReference — RUPI baseline legend diagram.
 *
 * Shows a horizontal baseline at center labeled "RUPI = X.X",
 * with colored zones above (red = more expensive) and below
 * (green = wages won), each with directional arrows and labels.
 *
 * Animation sequence (10-frame stagger):
 *   1. Baseline line + "RUPI = 1.0" label
 *   2. Above zone (red tint + upward arrow + label)
 *   3. Below zone (green tint + downward arrow + label)
 */
export const BaselineReference: React.FC<BaselineReferenceProps> = ({
  chart,
  fontFamily,
  metricLabel = "RUPI",
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // ── Destructure with defensive defaults ──
  const baselineValue = chart.baselineValue ?? 1;
  const zones = chart.zones ?? {
    above: { color: NEGATIVE, label: "More expensive relative to wages", opacity: 0.15 },
    below: { color: POSITIVE, label: "Cheaper relative to wages", opacity: 0.15 },
    at: { label: "= Same as 2000" },
  };

  const aboveZone = zones.above ?? { color: NEGATIVE, label: "More expensive relative to wages", opacity: 0.15 };
  const belowZone = zones.below ?? { color: POSITIVE, label: "Cheaper relative to wages", opacity: 0.15 };
  const atZone = zones.at ?? { label: "= Same as 2000" };

  // ── Layout constants ──
  const lineY = height * 0.5; // Baseline at vertical center
  const lineMarginX = width * 0.1; // 10% margin on each side
  const lineWidth = width - lineMarginX * 2;
  const zoneHeight = height * 0.28; // Each zone fills ~28% of frame height

  // ── Animation timing ──
  // Element 1: Baseline (starts at frame 0)
  const baselineEntrance = spring({
    fps,
    frame,
    config: SPRING_CARD,
  });

  // Element 2: Above zone (starts at STAGGER_FRAMES)
  const aboveEntrance = spring({
    fps,
    frame: frame - STAGGER_FRAMES,
    config: SPRING_CARD,
  });

  // Element 3: Below zone (starts at STAGGER_FRAMES * 2)
  const belowEntrance = spring({
    fps,
    frame: frame - STAGGER_FRAMES * 2,
    config: SPRING_CARD,
  });

  // ── Derived animation values ──
  const baselineLineScaleX = interpolate(baselineEntrance, [0, 1], [0, 1]);
  const baselineLabelOpacity = interpolate(baselineEntrance, [0, 1], [0, 1]);
  const baselineLabelSlideY = interpolate(baselineEntrance, [0, 1], [12, 0]);

  const aboveZoneOpacity = interpolate(aboveEntrance, [0, 1], [0, 1]);
  const aboveSlideY = interpolate(aboveEntrance, [0, 1], [-30, 0]);

  const belowZoneOpacity = interpolate(belowEntrance, [0, 1], [0, 1]);
  const belowSlideY = interpolate(belowEntrance, [0, 1], [30, 0]);

  // ── "= Same as 2000" label ──
  const atLabelOpacity = interpolate(baselineEntrance, [0, 1], [0, 1]);
  const atLabelSlideY = interpolate(baselineEntrance, [0, 1], [-10, 0]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG_COLOR,
        fontFamily: fontFamily || FONT_BODY,
      }}
    >
      {/* ── Above Zone (red tint) ── */}
      <div
        style={{
          position: "absolute",
          left: lineMarginX,
          width: lineWidth,
          top: lineY - zoneHeight,
          height: zoneHeight,
          opacity: aboveZoneOpacity,
          transform: `translateY(${aboveSlideY}px)`,
          background: `linear-gradient(to top, ${aboveZone.color}${Math.round((aboveZone.opacity ?? 0.15) * 255).toString(16).padStart(2, "0")}, transparent)`,
          borderRadius: "12px 12px 0 0",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        }}
      >
        {/* Upward arrow */}
        <svg width="32" height="32" viewBox="0 0 32 32" style={{ opacity: 0.8 }}>
          <path
            d="M16 4 L26 18 L20 18 L20 28 L12 28 L12 18 L6 18 Z"
            fill={aboveZone.color}
            opacity={0.7}
          />
        </svg>
        <span
          style={{
            fontFamily: FONT_BODY,
            fontSize: 28,
            fontWeight: 400,
            color: aboveZone.color,
            letterSpacing: 0.5,
            textAlign: "center",
            padding: "0 40px",
          }}
        >
          {aboveZone.label}
        </span>
      </div>

      {/* ── Below Zone (green tint) ── */}
      <div
        style={{
          position: "absolute",
          left: lineMarginX,
          width: lineWidth,
          top: lineY,
          height: zoneHeight,
          opacity: belowZoneOpacity,
          transform: `translateY(${belowSlideY}px)`,
          background: `linear-gradient(to bottom, ${belowZone.color}${Math.round((belowZone.opacity ?? 0.15) * 255).toString(16).padStart(2, "0")}, transparent)`,
          borderRadius: "0 0 12px 12px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        }}
      >
        <span
          style={{
            fontFamily: FONT_BODY,
            fontSize: 28,
            fontWeight: 400,
            color: belowZone.color,
            letterSpacing: 0.5,
            textAlign: "center",
            padding: "0 40px",
          }}
        >
          {belowZone.label}
        </span>
        {/* Downward arrow */}
        <svg width="32" height="32" viewBox="0 0 32 32" style={{ opacity: 0.8 }}>
          <path
            d="M16 28 L26 14 L20 14 L20 4 L12 4 L12 14 L6 14 Z"
            fill={belowZone.color}
            opacity={0.7}
          />
        </svg>
      </div>

      {/* ── Baseline Line ── */}
      <div
        style={{
          position: "absolute",
          left: lineMarginX,
          top: lineY - 1,
          width: lineWidth,
          height: 2,
          backgroundColor: SAGE_SILVER,
          transform: `scaleX(${baselineLineScaleX})`,
          transformOrigin: "center",
          opacity: 0.9,
        }}
      />

      {/* ── Baseline value label: "{metricLabel} = X.X" ── */}
      <div
        style={{
          position: "absolute",
          left: lineMarginX + 24,
          top: lineY - 44,
          opacity: baselineLabelOpacity,
          transform: `translateY(${baselineLabelSlideY}px)`,
          display: "flex",
          alignItems: "baseline",
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: FONT_HEADING,
            fontSize: 22,
            fontWeight: 700,
            color: SAGE_SILVER,
            letterSpacing: 1.5,
            textTransform: "uppercase",
          }}
        >
          {metricLabel}
        </span>
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 32,
            fontWeight: 500,
            color: SAGE_SILVER,
            fontFeatureSettings: '"tnum"',
          }}
        >
          = {baselineValue.toFixed(1)}
        </span>
      </div>

      {/* ── "= Same as 2000" label (right side of baseline) ── */}
      <div
        style={{
          position: "absolute",
          right: lineMarginX + 24,
          top: lineY - 44,
          opacity: atLabelOpacity,
          transform: `translateY(${atLabelSlideY}px)`,
        }}
      >
        <span
          style={{
            fontFamily: FONT_BODY,
            fontSize: 24,
            fontWeight: 400,
            color: TEXT_COLOR,
            letterSpacing: 0.5,
          }}
        >
          {atZone.label}
        </span>
      </div>

      {/* ── Subtle dashed guidelines above & below ── */}
      {/* Upper guide */}
      <div
        style={{
          position: "absolute",
          left: lineMarginX,
          top: lineY - zoneHeight,
          width: lineWidth,
          height: 1,
          borderTop: `1px dashed ${SAGE_SILVER}33`,
          opacity: aboveZoneOpacity,
        }}
      />
      {/* Lower guide */}
      <div
        style={{
          position: "absolute",
          left: lineMarginX,
          top: lineY + zoneHeight,
          width: lineWidth,
          height: 1,
          borderTop: `1px dashed ${SAGE_SILVER}33`,
          opacity: belowZoneOpacity,
        }}
      />
    </AbsoluteFill>
  );
};
