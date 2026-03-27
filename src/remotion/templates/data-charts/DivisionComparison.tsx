import React from "react";
import {
  spring,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import type { DataChartInput } from "../../schemas";
import { BG, TEXT, TEXT_FAINT, CARD_BORDER, ACCENT_PINK } from "../../palette";

// ─── Types ────────────────────────────────────────────────────

interface DivisionSide {
  flag: string;
  label: string;
  wage: number;
  hours: number;
  result: number;
  resultColor: string;
}

export interface DivisionComparisonConfig {
  type: "division-comparison";
  title?: string;
  source?: string;
  left: DivisionSide;
  right: DivisionSide;
  operator: string;
  conclusion: string;
}

interface DivisionComparisonProps {
  chart: DataChartInput;
  brandColor: string;
  fontFamily: string;
}

// ─── Theme (defaults — brandColor prop overrides accent) ──────

const MUTED = TEXT_FAINT;
const CARD_BG = "rgba(240, 237, 232, 0.04)"; // not palette CARD_BG (different base)

// ─── Component ────────────────────────────────────────────────

export const DivisionComparison: React.FC<DivisionComparisonProps> = ({
  chart,
  brandColor,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cfg = chart as unknown as DivisionComparisonConfig;
  const accent = brandColor || ACCENT_PINK;
  const title = cfg.title || "";
  const source = cfg.source || "";
  const left = cfg.left;
  const right = cfg.right;
  const operator = cfg.operator || ">";
  const conclusion = cfg.conclusion || "";

  // ── Animation phases ──
  // Phase 1: Left card appears (0 → 1.5s)
  const leftIn = spring({
    fps,
    frame,
    config: { damping: 18, stiffness: 80 },
  });

  // Phase 2: Right card appears (~1.5s)
  const rightDelay = Math.round(fps * 1.5);
  const rightIn = spring({
    fps,
    frame: Math.max(0, frame - rightDelay),
    config: { damping: 18, stiffness: 80 },
  });

  // Phase 3: Division animation on left (~3s)
  const divLeftTrigger = Math.round(fps * 3);
  const divLeftSpring = spring({
    fps,
    frame: Math.max(0, frame - divLeftTrigger),
    config: { damping: 14, stiffness: 50 },
  });

  // Phase 4: Division animation on right (~5s)
  const divRightTrigger = Math.round(fps * 5);
  const divRightSpring = spring({
    fps,
    frame: Math.max(0, frame - divRightTrigger),
    config: { damping: 14, stiffness: 50 },
  });

  // Phase 5: Operator reveal (~7s)
  const operatorTrigger = Math.round(fps * 7);
  const operatorSpring = spring({
    fps,
    frame: Math.max(0, frame - operatorTrigger),
    config: { damping: 12, stiffness: 60 },
  });

  // Phase 6: Conclusion text (~8.5s)
  const conclusionTrigger = Math.round(fps * 8.5);
  const conclusionSpring = spring({
    fps,
    frame: Math.max(0, frame - conclusionTrigger),
    config: { damping: 18, stiffness: 80 },
  });

  const CARD_WIDTH = 700;
  const CARD_GAP = 120;
  const CENTER_X = 1920 / 2;
  const CARD_Y = 180;

  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        backgroundColor: BG,
        position: "relative",
        overflow: "hidden",
        fontFamily,
      }}
    >
      {/* ── Title ── */}
      <div
        style={{
          position: "absolute",
          top: 50,
          left: 0,
          right: 0,
          textAlign: "center" as const,
          opacity: leftIn,
        }}
      >
        <span
          style={{
            color: MUTED,
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: 3,
            textTransform: "uppercase" as const,
          }}
        >
          {title}
        </span>
      </div>

      {/* ── Left Card ── */}
      <div
        style={{
          position: "absolute",
          top: CARD_Y,
          left: CENTER_X - CARD_WIDTH - CARD_GAP / 2,
          width: CARD_WIDTH,
          opacity: leftIn,
          transform: `translateX(${interpolate(leftIn, [0, 1], [-60, 0])}px)`,
        }}
      >
        <DivisionCard
          side={left}
          divisionProgress={divLeftSpring}
          fontFamily={fontFamily}
          accent={accent}
          frame={frame}
          fps={fps}
        />
      </div>

      {/* ── Right Card ── */}
      <div
        style={{
          position: "absolute",
          top: CARD_Y,
          left: CENTER_X + CARD_GAP / 2,
          width: CARD_WIDTH,
          opacity: rightIn,
          transform: `translateX(${interpolate(rightIn, [0, 1], [60, 0])}px)`,
        }}
      >
        <DivisionCard
          side={right}
          divisionProgress={divRightSpring}
          fontFamily={fontFamily}
          accent={accent}
          frame={frame}
          fps={fps}
        />
      </div>

      {/* ── Operator (> or <) between results ── */}
      <div
        style={{
          position: "absolute",
          top: CARD_Y + 420,
          left: CENTER_X - 40,
          width: 80,
          textAlign: "center" as const,
          opacity: operatorSpring,
          transform: `scale(${interpolate(operatorSpring, [0, 0.5, 1], [0.3, 1.2, 1])})`,
        }}
      >
        <span
          style={{
            color: accent,
            fontSize: 56,
            fontWeight: 700,
          }}
        >
          {/* Flip operator: right side wins if result is higher */}
          {right.result > left.result ? "<" : operator}
        </span>
      </div>

      {/* ── Conclusion text ── */}
      <div
        style={{
          position: "absolute",
          bottom: 120,
          left: 0,
          right: 0,
          textAlign: "center" as const,
          opacity: conclusionSpring,
          transform: `translateY(${interpolate(conclusionSpring, [0, 1], [20, 0])}px)`,
        }}
      >
        <span
          style={{
            color: TEXT,
            fontSize: 28,
            fontWeight: 600,
            fontStyle: "italic" as const,
          }}
        >
          {conclusion}
        </span>
      </div>

      {/* Data source */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          right: 30,
          color: "rgba(240, 237, 232, 0.15)",
          fontSize: 11,
        }}
      >
        {source}
      </div>
    </div>
  );
};

// ─── Division Card ────────────────────────────────────────────

const DivisionCard: React.FC<{
  side: DivisionSide;
  divisionProgress: number;
  fontFamily: string;
  accent: string;
  frame: number;
  fps: number;
}> = ({ side, divisionProgress, fontFamily, accent }) => {
  // Animated division: wage shrinks, divides by price, becomes result
  const wageScale = interpolate(divisionProgress, [0, 0.5, 1], [1, 0.7, 0.5]);
  const wageOpacity = interpolate(divisionProgress, [0, 0.8, 1], [1, 0.6, 0.3]);
  const priceScale = interpolate(divisionProgress, [0, 0.3, 0.7], [1, 0.8, 0.5], {
    extrapolateRight: "clamp",
  });
  const priceOpacity = interpolate(divisionProgress, [0, 0.8, 1], [1, 0.6, 0.3]);
  const resultOpacity = interpolate(divisionProgress, [0.4, 0.8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const resultScale = interpolate(divisionProgress, [0.4, 0.7, 1], [0.5, 1.05, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Division sign appears mid-animation
  const divSignOpacity = interpolate(divisionProgress, [0.1, 0.3, 0.7, 0.9], [0, 1, 1, 0.3], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        backgroundColor: CARD_BG,
        borderRadius: 16,
        padding: "32px 40px",
        border: `1px solid ${CARD_BORDER}`,
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        gap: 20,
      }}
    >
      {/* Country header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 8,
        }}
      >
        <span style={{ 
          fontSize: 14, 
          fontWeight: 700,
          color: BG,
          backgroundColor: "rgba(240, 237, 232, 0.85)",
          borderRadius: 4,
          padding: "4px 8px",
          letterSpacing: 1,
        }}>{side.label?.slice(0, 3).toUpperCase() || side.flag}</span>
        <span
          style={{
            color: TEXT,
            fontSize: 26,
            fontWeight: 700,
            fontFamily,
          }}
        >
          {side.label}
        </span>
      </div>

      {/* Wage */}
      <div
        style={{
          textAlign: "center" as const,
          opacity: wageOpacity,
          transform: `scale(${wageScale})`,
        }}
      >
        <div
          style={{
            color: "rgba(240, 237, 232, 0.35)",
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: 2,
            textTransform: "uppercase" as const,
            marginBottom: 4,
          }}
        >
          PPP Wage
        </div>
        <span
          style={{
            color: TEXT,
            fontSize: 40,
            fontWeight: 700,
            fontFamily: "JetBrains Mono, monospace",
          }}
        >
          ${side.wage.toLocaleString()}
        </span>
      </div>

      {/* Division sign */}
      <div
        style={{
          color: accent,
          fontSize: 36,
          fontWeight: 300,
          opacity: divSignOpacity,
        }}
      >
        ÷
      </div>

      {/* Hours / Year */}
      <div
        style={{
          textAlign: "center" as const,
          opacity: priceOpacity,
          transform: `scale(${priceScale})`,
        }}
      >
        <div
          style={{
            color: "rgba(240, 237, 232, 0.35)",
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: 2,
            textTransform: "uppercase" as const,
            marginBottom: 4,
          }}
        >
          Hours / Year
        </div>
        <span
          style={{
            color: TEXT,
            fontSize: 36,
            fontWeight: 700,
            fontFamily: "JetBrains Mono, monospace",
          }}
        >
          {side.hours.toLocaleString()}
        </span>
      </div>

      {/* Equals sign */}
      <div
        style={{
          color: accent,
          fontSize: 28,
          fontWeight: 300,
          opacity: resultOpacity * 0.6,
          marginTop: -4,
        }}
      >
        =
      </div>

      {/* Result */}
      <div
        style={{
          textAlign: "center" as const,
          opacity: resultOpacity,
          transform: `scale(${resultScale})`,
        }}
      >
        <div
          style={{
            color: "rgba(240, 237, 232, 0.35)",
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: 2,
            textTransform: "uppercase" as const,
            marginBottom: 6,
          }}
        >
          $/hr (PPP)
        </div>
        <span
          style={{
            color: side.resultColor,
            fontSize: 56,
            fontWeight: 800,
            fontFamily: "JetBrains Mono, monospace",
            textShadow: `0 0 30px ${side.resultColor}40`,
          }}
        >
          {side.result.toFixed(2)}
        </span>
      </div>
    </div>
  );
};
