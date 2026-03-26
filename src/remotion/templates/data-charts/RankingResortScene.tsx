import React from "react";
import {
  spring,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import type { DataChartInput } from "../../schemas";

// ─── Types ────────────────────────────────────────────────────

interface RankItem {
  rank: number;
  label: string;
  value: string;
  highlight?: "positive" | "negative";
}

export interface RankingResortConfig {
  type: "ranking-resort";
  source?: string;
  leftColumn: {
    title: string;
    items: RankItem[];
  };
  rightColumn: {
    title: string;
    items: RankItem[];
  };
  spotlightDelay?: {
    switzerlandDrop?: "first" | "second";
    japanRise?: "first" | "second";
  };
}

interface RankingResortSceneProps {
  chart: DataChartInput;
  brandColor: string;
  fontFamily: string;
}

// ─── Theme ────────────────────────────────────────────────────

const BG = "#1A1B22";
const TEXT = "#EAE0D5";
const MUTED = "rgba(234, 224, 213, 0.4)";
const POSITIVE = "#5BBF8C";
const NEGATIVE = "#E06070";
const CARD_BG = "rgba(234, 224, 213, 0.04)";
const CARD_BORDER = "rgba(234, 224, 213, 0.08)";

/** Country code badge (replaces emoji flags which render black in headless Chrome) */
const CountryBadge: React.FC<{ label: string }> = ({ label }) => {
  // Extract 2-3 letter code from country name
  const COUNTRY_CODES: Record<string, string> = {
    Luxembourg: "LUX", Switzerland: "CHE", USA: "USA", Belgium: "BEL",
    Denmark: "DNK", Japan: "JPN", Germany: "DEU", Netherlands: "NLD",
    Austria: "AUT", Australia: "AUS", Norway: "NOR", Canada: "CAN",
    "South Korea": "KOR", "United States": "USA",
  };
  const code = COUNTRY_CODES[label] || label.slice(0, 3).toUpperCase();
  return (
    <span style={{
      fontSize: 12, fontWeight: 700, color: "#1A1B22",
      backgroundColor: "rgba(234, 224, 213, 0.85)",
      borderRadius: 4, padding: "3px 6px", letterSpacing: 1,
      minWidth: 36, textAlign: "center" as const,
    }}>
      {code}
    </span>
  );
};

// ─── Component ────────────────────────────────────────────────

export const RankingResortScene: React.FC<RankingResortSceneProps> = ({
  chart,
  brandColor,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cfg = chart as unknown as RankingResortConfig;
  const accent = brandColor || "#D8A7B1";
  const source = cfg.source || "";
  const leftItems = cfg.leftColumn?.items || [];
  const rightItems = cfg.rightColumn?.items || [];
  const leftTitle = cfg.leftColumn?.title || "Rank A";
  const rightTitle = cfg.rightColumn?.title || "Rank B";

  const ROW_HEIGHT = 88;
  const TOP_Y = 180;
  const COL_LEFT_X = 100;
  const COL_RIGHT_X = 1020;
  const COL_WIDTH = 800;

  // ── Phase 1: Left column appears (0 → ~2s) ──
  const leftColIn = spring({
    fps,
    frame,
    config: { damping: 25, stiffness: 100 },
  });

  // ── Phase 2: Right column appears (~3s) ──
  const rightColTrigger = Math.round(fps * 3);
  const rightColIn = spring({
    fps,
    frame: Math.max(0, frame - rightColTrigger),
    config: { damping: 25, stiffness: 100 },
  });

  // ── Phase 3: Switzerland drop spotlight (~5s) ──
  const swissDropTrigger = Math.round(fps * 5);
  const swissDropSpring = spring({
    fps,
    frame: Math.max(0, frame - swissDropTrigger),
    config: { damping: 14, stiffness: 50 },
  });

  // ── Phase 4: Japan rise spotlight (~7.5s) ──
  const japanRiseTrigger = Math.round(fps * 7.5);
  const japanRiseSpring = spring({
    fps,
    frame: Math.max(0, frame - japanRiseTrigger),
    config: { damping: 14, stiffness: 50 },
  });

  // Arrow connector between columns
  const arrowIn = spring({
    fps,
    frame: Math.max(0, frame - rightColTrigger - 10),
    config: { damping: 30, stiffness: 80 },
  });

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
      {/* ── Left Column ── */}
      <div
        style={{
          position: "absolute",
          top: TOP_Y - 60,
          left: COL_LEFT_X,
          width: COL_WIDTH,
          opacity: leftColIn,
        }}
      >
        <div
          style={{
            color: MUTED,
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: 3,
            textTransform: "uppercase" as const,
            marginBottom: 20,
          }}
        >
          {leftTitle}
        </div>

        {/* Divider */}
        <div
          style={{
            width: "100%",
            height: 1,
            backgroundColor: CARD_BORDER,
            marginBottom: 12,
          }}
        />

        {leftItems.map((item, i) => {
          const rowIn = spring({
            fps,
            frame: Math.max(0, frame - i * 8),
            config: { damping: 18, stiffness: 80 },
          });

          const isSwiss = item.label === "Switzerland";
          const isJapan = item.label === "Japan";

          // Dim left-side Switzerland after drop spotlight
          const swissDimOpacity = isSwiss
            ? interpolate(swissDropSpring, [0, 1], [1, 0.35])
            : 1;

          // Dim left-side Japan after rise spotlight
          const japanDimOpacity = isJapan
            ? interpolate(japanRiseSpring, [0, 1], [1, 0.35])
            : 1;

          const rowOpacity = swissDimOpacity * japanDimOpacity;

          return (
            <div
              key={`left-${item.label}`}
              style={{
                display: "flex",
                alignItems: "center",
                height: ROW_HEIGHT,
                opacity: rowIn * rowOpacity,
                transform: `translateX(${interpolate(rowIn, [0, 1], [-40, 0])}px)`,
                gap: 16,
                padding: "0 12px",
                borderRadius: 8,
                backgroundColor: (isSwiss && swissDropSpring > 0.1) || (isJapan && japanRiseSpring > 0.1)
                  ? "transparent"
                  : "transparent",
              }}
            >
              {/* Rank */}
              <div
                style={{
                  width: 50,
                  color: MUTED,
                  fontSize: 20,
                  fontWeight: 700,
                  fontFamily: "JetBrains Mono, monospace",
                  textAlign: "center" as const,
                }}
              >
                #{item.rank}
              </div>

              {/* Flag + Name */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                <CountryBadge label={item.label} />
                <span
                  style={{
                    color: TEXT,
                    fontSize: 24,
                    fontWeight: 600,
                  }}
                >
                  {item.label}
                </span>
              </div>

              {/* Value */}
              <div
                style={{
                  color: TEXT,
                  fontSize: 22,
                  fontWeight: 600,
                  fontFamily: "JetBrains Mono, monospace",
                  opacity: 0.8,
                }}
              >
                {item.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Arrow / Connector between columns ── */}
      <div
        style={{
          position: "absolute",
          top: TOP_Y + (leftItems.length * ROW_HEIGHT) / 2 - 20,
          left: COL_LEFT_X + COL_WIDTH + 10,
          width: COL_RIGHT_X - COL_LEFT_X - COL_WIDTH - 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: arrowIn,
        }}
      >
        <div
          style={{
            color: accent,
            fontSize: 32,
            fontWeight: 300,
          }}
        >
          →
        </div>
      </div>

      {/* ── Right Column ── */}
      <div
        style={{
          position: "absolute",
          top: TOP_Y - 60,
          left: COL_RIGHT_X,
          width: COL_WIDTH,
          opacity: rightColIn,
          transform: `translateX(${interpolate(rightColIn, [0, 1], [60, 0])}px)`,
        }}
      >
        <div
          style={{
            color: accent,
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: 3,
            textTransform: "uppercase" as const,
            marginBottom: 20,
          }}
        >
          {rightTitle}
        </div>

        {/* Divider */}
        <div
          style={{
            width: "100%",
            height: 1,
            backgroundColor: CARD_BORDER,
            marginBottom: 12,
          }}
        />

        {rightItems.map((item, i) => {
          const isSwiss = item.label === "Switzerland";
          const isJapan = item.label === "Japan";
          const isLux = item.label === "Luxembourg";

          // Stagger entrance after right column appears
          const rowIn = spring({
            fps,
            frame: Math.max(0, frame - rightColTrigger - i * 10),
            config: { damping: 18, stiffness: 80 },
          });

          // Switzerland drop: red trail + glow
          const swissActive = isSwiss ? swissDropSpring : 0;
          // Japan rise: green trail + glow
          const japanActive = isJapan ? japanRiseSpring : 0;
          // Luxembourg gold glow
          const luxGlow = isLux
            ? spring({
                fps,
                frame: Math.max(0, frame - rightColTrigger - 15),
                config: { damping: 20, stiffness: 60 },
              })
            : 0;

          const highlightColor = item.highlight === "positive"
            ? POSITIVE
            : item.highlight === "negative"
            ? NEGATIVE
            : TEXT;

          const glowShadow = swissActive > 0.1
            ? `0 0 30px ${NEGATIVE}40, inset 0 0 20px ${NEGATIVE}10`
            : japanActive > 0.1
            ? `0 0 30px ${POSITIVE}40, inset 0 0 20px ${POSITIVE}10`
            : luxGlow > 0.1
            ? `0 0 20px rgba(255, 215, 0, 0.15)`
            : "none";

          const bgColor = swissActive > 0.1
            ? `rgba(224, 96, 112, ${0.08 * swissActive})`
            : japanActive > 0.1
            ? `rgba(91, 191, 140, ${0.08 * japanActive})`
            : luxGlow > 0.1
            ? `rgba(255, 215, 0, ${0.04 * luxGlow})`
            : "transparent";

          // Rank change indicator
          const rankChange = isSwiss
            ? { from: 2, to: item.rank, color: NEGATIVE, arrow: "▼" }
            : isJapan
            ? { from: 6, to: item.rank, color: POSITIVE, arrow: "▲" }
            : null;

          const changeActive = isSwiss ? swissActive : isJapan ? japanActive : 0;

          return (
            <div
              key={`right-${item.label}`}
              style={{
                display: "flex",
                alignItems: "center",
                height: ROW_HEIGHT,
                opacity: rowIn,
                transform: `translateX(${interpolate(rowIn, [0, 1], [40, 0])}px)`,
                gap: 16,
                padding: "0 12px",
                borderRadius: 8,
                backgroundColor: bgColor,
                boxShadow: glowShadow,
                borderLeft: swissActive > 0.3
                  ? `3px solid ${NEGATIVE}`
                  : japanActive > 0.3
                  ? `3px solid ${POSITIVE}`
                  : luxGlow > 0.3
                  ? "3px solid rgba(255, 215, 0, 0.3)"
                  : "3px solid transparent",
                transition: "border-left 0.3s",
              }}
            >
              {/* Rank */}
              <div
                style={{
                  width: 50,
                  color: highlightColor,
                  fontSize: 22,
                  fontWeight: 700,
                  fontFamily: "JetBrains Mono, monospace",
                  textAlign: "center" as const,
                }}
              >
                #{item.rank}
              </div>

              {/* Flag + Name */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                <CountryBadge label={item.label} />
                <span
                  style={{
                    color: highlightColor,
                    fontSize: 24,
                    fontWeight: 600,
                  }}
                >
                  {item.label}
                </span>
              </div>

              {/* Value */}
              <div
                style={{
                  color: highlightColor,
                  fontSize: 22,
                  fontWeight: 700,
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {item.value}
              </div>

              {/* Rank change badge */}
              {rankChange && changeActive > 0.2 && (
                <div
                  style={{
                    position: "absolute",
                    right: -90,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    opacity: interpolate(changeActive, [0.2, 0.6], [0, 1], {
                      extrapolateRight: "clamp",
                    }),
                  }}
                >
                  <span
                    style={{
                      color: rankChange.color,
                      fontSize: 18,
                      fontWeight: 700,
                    }}
                  >
                    {rankChange.arrow} {Math.abs(rankChange.from - rankChange.to)}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Trail effects (SVG overlay) ── */}
      <svg
        width={1920}
        height={1080}
        style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
      >
        {/* Switzerland drop trail (red dashed line) */}
        {swissDropSpring > 0.05 && (() => {
          // Left column Switzerland position (rank 2 → index 1)
          const swissLeftIdx = leftItems.findIndex(it => it.label === "Switzerland");
          const swissRightIdx = rightItems.findIndex(it => it.label === "Switzerland");
          if (swissLeftIdx < 0 || swissRightIdx < 0) return null;

          const fromY = TOP_Y + swissLeftIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
          const toY = TOP_Y + swissRightIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
          const fromX = COL_LEFT_X + COL_WIDTH;
          const toX = COL_RIGHT_X;

          const currentToY = interpolate(swissDropSpring, [0, 1], [fromY, toY]);

          return (
            <line
              x1={fromX + 10}
              y1={fromY}
              x2={toX - 10}
              y2={currentToY}
              stroke={NEGATIVE}
              strokeWidth={2}
              strokeDasharray="8,6"
              opacity={swissDropSpring * 0.6}
            />
          );
        })()}

        {/* Japan rise trail (green dashed line) */}
        {japanRiseSpring > 0.05 && (() => {
          const japanLeftIdx = leftItems.findIndex(it => it.label === "Japan");
          const japanRightIdx = rightItems.findIndex(it => it.label === "Japan");
          if (japanLeftIdx < 0 || japanRightIdx < 0) return null;

          const fromY = TOP_Y + japanLeftIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
          const toY = TOP_Y + japanRightIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
          const fromX = COL_LEFT_X + COL_WIDTH;
          const toX = COL_RIGHT_X;

          const currentToY = interpolate(japanRiseSpring, [0, 1], [fromY, toY]);

          return (
            <line
              x1={fromX + 10}
              y1={fromY}
              x2={toX - 10}
              y2={currentToY}
              stroke={POSITIVE}
              strokeWidth={2}
              strokeDasharray="8,6"
              opacity={japanRiseSpring * 0.6}
            />
          );
        })()}
      </svg>

      {/* Data source */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          right: 30,
          color: "rgba(234, 224, 213, 0.15)",
          fontSize: 11,
          fontWeight: 400,
          opacity: leftColIn,
        }}
      >
        {source}
      </div>
    </div>
  );
};
