import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  interpolateColors,
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
      backgroundImage: `radial-gradient(circle, rgba(240,237,232,0.04) ${DOT_SIZE}px, transparent ${DOT_SIZE}px)`,
      backgroundSize: `${DOT_SPACING}px ${DOT_SPACING}px`,
      opacity: DOT_OPACITY,
      pointerEvents: "none",
    }}
  />
);

// ─── Color scaling helpers ─────────────────────────────────────

/** Normalize a BarItem to { name, value | null } */
const normalizeItem = (
  item: BarItem
): { name: string; value: number | null } => {
  if (typeof item === "string") return { name: item, value: null };
  return { name: item.name, value: item.value ?? null };
};

/**
 * Compute the global value range across ALL charts so that color
 * interpolation is consistent grid-wide. For string-only items we
 * synthesize values from their position (above → negative end,
 * below → positive end).
 */
function computeGlobalRange(charts: ChartEntry[]): {
  globalMin: number;
  globalMax: number;
} {
  const allValues: number[] = [];
  for (const chart of charts) {
    const above = chart.above || [];
    const below = chart.below || [];
    above.forEach((item, i) => {
      const n = normalizeItem(item);
      if (n.value != null) {
        allValues.push(n.value);
      } else {
        // Synthesize: first item in above is worst → highest value
        const synth = above.length - i; // e.g. 3,2,1 for 3 items
        allValues.push(synth);
      }
    });
    below.forEach((item, i) => {
      const n = normalizeItem(item);
      if (n.value != null) {
        allValues.push(n.value);
      } else {
        // Synthesize: last item in below is best → lowest (most negative) value
        const synth = -(i + 1); // e.g. -1,-2,-3
        allValues.push(synth);
      }
    });
  }
  if (allValues.length === 0) return { globalMin: 0, globalMax: 1 };
  return { globalMin: Math.min(...allValues), globalMax: Math.max(...allValues) };
}

/**
 * Map a single item's value to a gradient color between NEGATIVE ↔ POSITIVE.
 * t = 0 → NEGATIVE (worst), t = 1 → POSITIVE (best).
 */
function itemColor(
  value: number,
  globalMin: number,
  globalMax: number
): string {
  if (globalMax === globalMin) return interpolateColors(0.5, [0, 1], [NEGATIVE, POSITIVE]);
  // Higher value = worse = NEGATIVE end; lower value = better = POSITIVE end
  const t = 1 - (value - globalMin) / (globalMax - globalMin);
  return interpolateColors(t, [0, 1], [NEGATIVE, POSITIVE]);
}

// ─── Single Mini Chart (one quadrant) ─────────────────────────

interface MiniChartProps {
  entry: ChartEntry;
  /** Absolute frame delay for this quadrant */
  delayFrames: number;
  fontFamily: string;
  globalMin: number;
  globalMax: number;
}

const MiniChart: React.FC<MiniChartProps> = ({
  entry,
  delayFrames,
  fontFamily,
  globalMin,
  globalMax,
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

  // Build combined bar list: above first, then below
  // Each item gets a gradient color based on its value magnitude
  const aboveItems = (entry.above || []);
  const belowItems = (entry.below || []);

  const bars: Array<{ name: string; value: number | null; color: string; rawValue: number }> = [
    ...aboveItems.map((item, i) => {
      const n = normalizeItem(item);
      const raw = n.value != null ? n.value : aboveItems.length - i;
      return { ...n, color: itemColor(raw, globalMin, globalMax), rawValue: raw };
    }),
    ...belowItems.map((item, i) => {
      const n = normalizeItem(item);
      const raw = n.value != null ? n.value : -(i + 1);
      return { ...n, color: itemColor(raw, globalMin, globalMax), rawValue: raw };
    }),
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
        border: `1px solid rgba(240, 237, 232, 0.08)`,
        flex: 1,
        minWidth: 0,
      }}
    >
      {/* Deflator name header */}
      <div
        style={{
          fontFamily: "Montserrat, sans-serif",
          fontSize: 48,
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
          fontFamily,
          fontSize: 24,
          color: SAGE,
          marginBottom: 14,
          opacity: headerOpacity,
          display: "flex",
          gap: 12,
        }}
      >
        <span>
          <span style={{ color: NEGATIVE }}>{(entry.above || []).length}</span> above
        </span>
        <span>
          <span style={{ color: POSITIVE }}>{(entry.below || []).length}</span> below
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
          const barHeight = totalBars <= 4 ? 40 : totalBars <= 6 ? 36 : 30;

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
                  fontFamily: fontFamily || "Montserrat, sans-serif",
                  fontSize: 24,
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
                      fontFamily,
                      fontSize: 20,
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

  // Compute global value range for gradient color mapping (VB-2)
  const { globalMin, globalMax } = computeGlobalRange(charts);

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
          fontSize: 48,
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
            globalMin={globalMin}
            globalMax={globalMax}
          />
        ))}
      </div>

      {/* Source line */}
      {source && (
        <div
          style={{
            fontFamily,
            fontSize: 20,
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
