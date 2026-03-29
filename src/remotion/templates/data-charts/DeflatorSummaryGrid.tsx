import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { BG, TEXT, NEGATIVE, POSITIVE, SAGE, TRACK } from "../../palette";

// ─── Types ────────────────────────────────────────────────────

type BarItem = string | { name: string; value: number };

interface ChartEntry {
  deflator: string;
  above: BarItem[];
  below: BarItem[];
}

interface DeflatorSummaryGridProps {
  chart: {
    type: "deflator-summary-grid";
    title?: string;
    charts: ChartEntry[];
    source?: string;
    [key: string]: unknown;
  };
  brandColor: string;
  fontFamily: string;
}

// ─── Design tokens ────────────────────────────────────────────

const BG_COLOR = BG;
const TEXT_COLOR = TEXT;
const RED = NEGATIVE;
const GREEN = POSITIVE;
const TRACK_COLOR = TRACK;

const DOT_SIZE = 2;
const DOT_SPACING = 40;
const DOT_OPACITY = 0.1;

/** Frame offset between each of the 4 quadrants */
const CHART_STAGGER = 10;
/** Frame offset between bars within a single quadrant */
const BAR_STAGGER = 6;

const SPRING_CFG = { damping: 14, stiffness: 80 };

// ─── Dot Grid Background ──────────────────────────────────────

const DotGrid: React.FC = () => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      backgroundImage: `radial-gradient(circle, ${SAGE} ${DOT_SIZE}px, transparent ${DOT_SIZE}px)`,
      backgroundSize: `${DOT_SPACING}px ${DOT_SPACING}px`,
      opacity: DOT_OPACITY,
      pointerEvents: "none",
    }}
  />
);

// ─── Single Mini Chart (one quadrant) ─────────────────────────

interface MiniChartProps {
  entry: ChartEntry;
  /** Absolute frame delay for this quadrant */
  delayFrames: number;
  fontFamily: string;
}

const MiniChart: React.FC<MiniChartProps> = ({
  entry,
  delayFrames,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Header fade-in tied to chart entrance
  const headerSpring = spring({
    fps,
    frame: frame - delayFrames,
    config: SPRING_CFG,
  });

  const headerOpacity = interpolate(headerSpring, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Build combined bar list: above (red) first, then below (green)
  // Normalize BarItem (string | {name, value}) into a uniform shape
  const normalizeItem = (item: BarItem): { name: string; value: number | null } => {
    if (typeof item === "string") return { name: item, value: null };
    return { name: item.name, value: item.value ?? null };
  };

  const bars: Array<{ name: string; value: number | null; color: string }> = [
    ...(entry.above || []).map((item) => ({ ...normalizeItem(item), color: RED })),
    ...(entry.below || []).map((item) => ({ ...normalizeItem(item), color: GREEN })),
  ];

  const totalBars = bars.length;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "10px 14px",
        borderRadius: 12,
        backgroundColor: "rgba(240, 237, 232, 0.03)",
        border: `1px solid rgba(163, 177, 138, 0.15)`,
        flex: 1,
        minWidth: 0,
      }}
    >
      {/* Deflator name header */}
      <div
        style={{
          fontFamily: "Montserrat, sans-serif",
          fontSize: 24,
          fontWeight: 700,
          color: TEXT_COLOR,
          marginBottom: 6,
          opacity: headerOpacity,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {entry.deflator}
      </div>

      {/* Count summary: "X above / Y below" */}
      <div
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 15,
          color: SAGE,
          marginBottom: 14,
          opacity: headerOpacity,
          display: "flex",
          gap: 12,
        }}
      >
        <span>
          <span style={{ color: RED }}>{(entry.above || []).length}</span> above
        </span>
        <span>
          <span style={{ color: GREEN }}>{(entry.below || []).length}</span> below
        </span>
      </div>

      {/* Bars */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {bars.map((bar, barIdx) => {
          const barDelay = delayFrames + barIdx * BAR_STAGGER;
          const barSpring = spring({
            fps,
            frame: frame - barDelay,
            config: SPRING_CFG,
          });

          const textOpacity = interpolate(barSpring, [0, 0.4], [0, 1], {
            extrapolateRight: "clamp",
          });

          // Bar width proportional to RUPI value (0.0–2.0 → 0–100%)
          // Falls back to 100% if no value provided
          const MAX_RUPI = 1.8;
          const rupiValue = bar.value;
          const widthPct =
            rupiValue != null
              ? Math.min((rupiValue / MAX_RUPI) * 100, 100)
              : 100;
          // Bar height adapts to available space
          const barHeight = totalBars <= 4 ? 40 : totalBars <= 6 ? 34 : 28;

          return (
            <div
              key={bar.name}
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                height: barHeight + 4,
              }}
            >
              {/* Label */}
              <div
                style={{
                  width: 120,
                  minWidth: 120,
                  fontFamily: fontFamily || "Inter, sans-serif",
                  fontSize: 14,
                  fontWeight: 500,
                  color: "rgba(240, 237, 232, 0.7)",
                  textAlign: "right",
                  paddingRight: 10,
                  opacity: textOpacity,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {bar.name}
              </div>

              {/* Bar track */}
              <div
                style={{
                  flex: 1,
                  height: barHeight,
                  backgroundColor: TRACK_COLOR,
                  borderRadius: 4,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: `${widthPct * barSpring}%`,
                    height: "100%",
                    backgroundColor: bar.color,
                    borderRadius: 4,
                    opacity: 0.85,
                  }}
                />
                {/* RUPI value label */}
                {rupiValue != null && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: `${widthPct * barSpring}%`,
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      paddingRight: 6,
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: barHeight <= 28 ? 11 : 13,
                      fontWeight: 600,
                      color: "#fff",
                      opacity: textOpacity,
                      pointerEvents: "none",
                    }}
                  >
                    {rupiValue.toFixed(3)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────

/**
 * DeflatorSummaryGrid — 2×2 grid of mini bar charts showing
 * how many products are above/below RUPI 1.0 for each deflator.
 * Used for Scene 026 ("Same Data. Different Ruler.").
 */
export const DeflatorSummaryGrid: React.FC<DeflatorSummaryGridProps> = ({
  chart,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const title = chart.title || "Same Data. Different Ruler.";
  const charts = chart.charts || [];
  const source = chart.source || "";

  // Title fade-in
  const titleSpring = spring({
    fps,
    frame,
    config: { damping: 18, stiffness: 60 },
  });
  const titleOpacity = interpolate(titleSpring, [0, 0.6], [0, 1], {
    extrapolateRight: "clamp",
  });
  const titleY = interpolate(titleSpring, [0, 1], [20, 0], {
    extrapolateRight: "clamp",
  });

  // Source line fade-in (delayed until all charts are in)
  const sourceDelay = charts.length * CHART_STAGGER + 40;
  const sourceOpacity = interpolate(
    frame,
    [sourceDelay, sourceDelay + 20],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: BG_COLOR,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        padding: "30px 40px 20px",
        overflow: "hidden",
      }}
    >
      {/* Dot grid background */}
      <DotGrid />

      {/* Title */}
      <div
        style={{
          fontFamily: "Montserrat, sans-serif",
          fontSize: 36,
          fontWeight: 700,
          color: TEXT_COLOR,
          textAlign: "center",
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          marginBottom: 30,
          zIndex: 1,
        }}
      >
        {title}
      </div>

      {/* 2×2 Grid */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          gap: 14,
          zIndex: 1,
          minHeight: 0,
        }}
      >
        {charts.map((entry, chartIdx) => (
          <MiniChart
            key={entry.deflator}
            entry={entry}
            delayFrames={chartIdx * CHART_STAGGER}
            fontFamily={fontFamily}
          />
        ))}
      </div>

      {/* Source line */}
      {source && (
        <div
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 13,
            color: SAGE,
            textAlign: "center",
            opacity: sourceOpacity,
            marginTop: 16,
            zIndex: 1,
          }}
        >
          Source: {source}
        </div>
      )}
    </div>
  );
};
