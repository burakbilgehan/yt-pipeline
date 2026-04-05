import React from "react";
import {
  spring,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import type { DataChartInput } from "../../schemas";
import { BG, TEXT, TEXT_FAINT, TRACK, CARD_BORDER, ACCENT_PINK, NEGATIVE } from "../../palette";

// ─── Types ────────────────────────────────────────────────────

interface CalendarLabel {
  text: string;
  delay?: string;
  color?: string;
  size?: "normal" | "large";
}

export interface CalendarGridConfig {
  type: "calendar-grid";
  months: number;
  highlightedDays: number;
  highlightColor: string;
  source?: string;
  labels?: CalendarLabel[];
  /** Comparison card data (displayed alongside calendar) */
  comparisonCard?: {
    left: {
      flag: string;
      label: string;
      stats: Record<string, number>;
    };
    right: {
      flag: string;
      label: string;
      stats: Record<string, number>;
    };
  };
  /** Connector info (displayed as header) */
  connectorLabel?: string;
}

interface CalendarGridProps {
  chart: DataChartInput;
  brandColor: string;
  fontFamily: string;
}

// ─── Theme ────────────────────────────────────────────────────

const MUTED = TEXT_FAINT;
const CELL_DEFAULT = TRACK;
const CELL_BORDER = "rgba(240, 237, 232, 0.04)"; // derived from TEXT

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// ─── Component ────────────────────────────────────────────────

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  chart,
  brandColor,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cfg = chart as unknown as CalendarGridConfig;
  const accent = brandColor || ACCENT_PINK;
  const months = cfg.months || 12;
  const highlightedDays = cfg.highlightedDays || 55;
  const highlightColor = cfg.highlightColor || NEGATIVE;
  const labels = cfg.labels || [];
  const source = cfg.source || "";
  const comparisonCard = cfg.comparisonCard;
  const connectorLabel = cfg.connectorLabel;

  // Grid layout: 12 months, ~30 days each
  // Display as 4 rows × 3 columns of month blocks
  const COLS = 3;
  const ROWS = Math.ceil(months / COLS);
  const DAYS_PER_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  // Grid dimensions
  const GRID_LEFT = comparisonCard ? 520 : 200;
  const GRID_TOP = connectorLabel ? 160 : 100;
  const MONTH_W = 380;
  const MONTH_H = 180;
  const MONTH_GAP_X = 30;
  const MONTH_GAP_Y = 20;

  const DAY_SIZE = 20;
  const DAY_GAP = 3;
  const DAYS_PER_ROW = 7;

  // Determine which days to highlight (spread across the year, back-loaded)
  // Highlight the LAST N days of the year (conceptually: extra work days at the end)
  const totalDays = DAYS_PER_MONTH.slice(0, months).reduce((a, b) => a + b, 0);
  const highlightStart = totalDays - highlightedDays;

  // ── Animation phases ──
  const gridBuildIn = spring({
    fps,
    frame,
    config: { damping: 25, stiffness: 80 },
  });

  // Calendar highlights build row by row
  const highlightTrigger = Math.round(fps * 1.5);
  const highlightBuild = spring({
    fps,
    frame: Math.max(0, frame - highlightTrigger),
    config: { damping: 12, stiffness: 30 },
  });

  // ── Comparison card animation ──
  const cardIn = comparisonCard
    ? spring({
        fps,
        frame: Math.max(0, frame - 5),
        config: { damping: 18, stiffness: 80 },
      })
    : 0;

  // ── Label animations ──
  const labelAnimations = labels.map((label, i) => {
    const delaySeconds = parseFloat(label.delay || "0") || (i * 2);
    const delayFrames = highlightTrigger + Math.round(delaySeconds * fps) + Math.round(fps * 2);
    return spring({
      fps,
      frame: Math.max(0, frame - delayFrames),
      config: { damping: 18, stiffness: 80 },
    });
  });

  let dayCounter = 0;

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
      {/* ── Connector label / header ── */}
      {connectorLabel && (
        <div
          style={{
            position: "absolute",
            top: 40,
            left: 0,
            right: 0,
            textAlign: "center" as const,
            opacity: gridBuildIn,
          }}
        >
          <span
            style={{
              color: accent,
              fontSize: 24,
              fontWeight: 600,
              fontFamily: "JetBrains Mono, monospace",
              letterSpacing: 2,
            }}
          >
            {connectorLabel}
          </span>
        </div>
      )}

      {/* ── Comparison Card (left side) ── */}
      {comparisonCard && (
        <div
          style={{
            position: "absolute",
            top: GRID_TOP + 20,
            left: 40,
            width: 440,
            opacity: cardIn,
            transform: `translateX(${interpolate(cardIn, [0, 1], [-40, 0])}px)`,
          }}
        >
          {/* Left country */}
          <ComparisonSide
            flag={comparisonCard.left.flag}
            label={comparisonCard.left.label}
            stats={comparisonCard.left.stats}
            fontFamily={fontFamily}
            accent={accent}
            frame={frame}
            fps={fps}
            delay={8}
          />

          {/* VS divider */}
          <div
            style={{
              textAlign: "center" as const,
              color: MUTED,
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: 4,
              margin: "16px 0",
            }}
          >
            VS
          </div>

          {/* Right country */}
          <ComparisonSide
            flag={comparisonCard.right.flag}
            label={comparisonCard.right.label}
            stats={comparisonCard.right.stats}
            fontFamily={fontFamily}
            accent={accent}
            frame={frame}
            fps={fps}
            delay={16}
          />
        </div>
      )}

      {/* ── Calendar Grid ── */}
      <div
        style={{
          position: "absolute",
          top: GRID_TOP,
          left: GRID_LEFT,
          opacity: gridBuildIn,
        }}
      >
        {Array.from({ length: ROWS }).map((_, rowIdx) =>
          Array.from({ length: COLS }).map((_, colIdx) => {
            const monthIdx = rowIdx * COLS + colIdx;
            if (monthIdx >= months) return null;

            const daysInMonth = DAYS_PER_MONTH[monthIdx];
            const monthStartDay = dayCounter;
            dayCounter += daysInMonth;

            const mx = colIdx * (MONTH_W + MONTH_GAP_X);
            const my = rowIdx * (MONTH_H + MONTH_GAP_Y);

            // Month entrance stagger
            const monthIn = spring({
              fps,
              frame: Math.max(0, frame - monthIdx * 2),
              config: { damping: 20, stiffness: 100 },
            });

            return (
              <div
                key={`month-${monthIdx}`}
                style={{
                  position: "absolute",
                  left: mx,
                  top: my,
                  width: MONTH_W,
                  opacity: monthIn,
                }}
              >
                {/* Month label */}
                <div
                  style={{
                    color: MUTED,
                    fontSize: 20,
                    fontWeight: 600,
                    letterSpacing: 2,
                    marginBottom: 6,
                    textTransform: "uppercase" as const,
                  }}
                >
                  {MONTH_NAMES[monthIdx]}
                </div>

                {/* Day cells */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap" as const,
                    gap: DAY_GAP,
                  }}
                >
                  {Array.from({ length: daysInMonth }).map((_, dayIdx) => {
                    const globalDay = monthStartDay + dayIdx;
                    const isHighlighted = globalDay >= highlightStart;

                    // Staggered highlight animation
                    const highlightProgress = isHighlighted
                      ? interpolate(
                          highlightBuild,
                          [
                            Math.max(0, (globalDay - highlightStart) / highlightedDays - 0.1),
                            Math.min(1, (globalDay - highlightStart) / highlightedDays + 0.1),
                          ],
                          [0, 1],
                          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                        )
                      : 0;

                    const cellColor = isHighlighted && highlightProgress > 0.1
                      ? highlightColor
                      : CELL_DEFAULT;

                    const cellGlow = isHighlighted && highlightProgress > 0.5
                      ? `0 0 6px ${highlightColor}40`
                      : "none";

                    return (
                      <div
                        key={`day-${monthIdx}-${dayIdx}`}
                        style={{
                          width: DAY_SIZE,
                          height: DAY_SIZE,
                          borderRadius: 3,
                          backgroundColor: cellColor,
                          boxShadow: cellGlow,
                          opacity: interpolate(highlightProgress, [0, 1], [0.6, 1]),
                          transform: `scale(${interpolate(highlightProgress, [0, 0.5, 1], [1, 1.15, 1])})`,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Labels (sequential text reveals) ── */}
      <div
        style={{
          position: "absolute",
          bottom: 120,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column" as const,
          alignItems: "center",
          gap: 16,
        }}
      >
        {labels.map((label, i) => {
          const anim = labelAnimations[i];
          const isLarge = label.size === "large";
          const labelColor = label.color || TEXT;

          return (
            <div
              key={i}
              style={{
                opacity: anim,
                transform: `translateY(${interpolate(anim, [0, 1], [20, 0])}px) scale(${interpolate(anim, [0, 1], [0.95, 1])})`,
              }}
            >
              <span
                style={{
                  color: labelColor,
                  fontSize: isLarge ? 48 : 28,
                  fontWeight: isLarge ? 700 : 600,
                  fontFamily: isLarge ? fontFamily : "JetBrains Mono, monospace",
                  textShadow: isLarge
                    ? `0 0 30px ${labelColor}40`
                    : "none",
                }}
              >
                {label.text}
              </span>
            </div>
          );
        })}
      </div>

      {/* Data source */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          right: 30,
          color: "rgba(240, 237, 232, 0.15)",
          fontSize: 20,
        }}
      >
        {source}
      </div>
    </div>
  );
};

// ─── Comparison Side (country stats card) ─────────────────────

const ComparisonSide: React.FC<{
  flag: string;
  label: string;
  stats: Record<string, number>;
  fontFamily: string;
  accent: string;
  frame: number;
  fps: number;
  delay: number;
}> = ({ flag, label, stats, fontFamily, accent, frame, fps, delay }) => {
  const cardSpring = spring({
    fps,
    frame: Math.max(0, frame - delay),
    config: { damping: 18, stiffness: 80 },
  });

  const statLabels: Record<string, string> = {
    hourlyRate: "$/hr",
    hours: "Hours/yr",
    annualPPP: "PPP $/yr",
  };

  return (
    <div
      style={{
        backgroundColor: "rgba(240, 237, 232, 0.04)",
        borderRadius: 12,
        padding: "16px 20px",
        border: `1px solid ${CARD_BORDER}`,
        opacity: cardSpring,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <span style={{ 
          fontSize: 20, 
          fontWeight: 700,
          color: BG,
          backgroundColor: "rgba(240, 237, 232, 0.85)",
          borderRadius: 4,
          padding: "3px 6px",
          letterSpacing: 1,
        }}>{label?.slice(0, 3).toUpperCase() || flag}</span>
        <span
          style={{
            color: TEXT,
            fontSize: 20,
            fontWeight: 600,
            fontFamily,
          }}
        >
          {label}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          gap: 20,
        }}
      >
        {Object.entries(stats).map(([key, value]) => (
          <div key={key}>
            <div
              style={{
              color: MUTED,
              fontSize: 20,
              fontWeight: 500,
              letterSpacing: 1,
              textTransform: "uppercase" as const,
              marginBottom: 4,
              }}
            >
              {statLabels[key] || key}
            </div>
            <div
              style={{
                color: accent,
                fontSize: 20,
                fontWeight: 700,
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {typeof value === "number" ? value.toLocaleString() : value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
