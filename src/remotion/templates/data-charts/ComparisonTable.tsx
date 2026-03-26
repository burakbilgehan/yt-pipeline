import React from "react";
import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { DataChartInput } from "../../schemas";

interface ComparisonTableProps {
  chart: DataChartInput;
  brandColor: string;
  fontFamily: string;
}

const DEFAULT_COLORS = [
  "#90AFC5",  // Blue — neutral default; brandColor used for accent positions
  "#90AFC5",
  "#5BBF8C",
  "#E06070",
  "#EAE0D5",
];

const TEXT_COLOR = "#EAE0D5";
const MUTED_TEXT = "rgba(234, 224, 213, 0.6)";
const TRACK_COLOR = "rgba(234, 224, 213, 0.06)";

const DEFAULT_ACCENT_RIGHT = "#90AFC5";

/** Format a value with optional unit prefix/suffix. */
const formatValue = (value: number, unit?: string): string => {
  if (unit === "$") {
    return `$${value.toLocaleString()}`;
  }
  return `${value.toLocaleString()}${unit ? ` ${unit}` : ""}`;
};

// ─── MODE 1: Tug-of-War (2 items) ──────────────────────────────

const TugOfWar: React.FC<ComparisonTableProps> = ({
  chart,
  brandColor,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const items = chart.items!;
  const left = items[0];
  const right = items[1];
  const total = left.value + right.value;
  const leftPercent = total > 0 ? (left.value / total) * 100 : 50;
  const rightPercent = total > 0 ? (right.value / total) * 100 : 50;

  const titleSpring = spring({
    fps,
    frame,
    config: { damping: 200 },
  });

  const labelSpring = spring({
    fps,
    frame: frame - 6,
    config: { damping: 18, stiffness: 100 },
  });

  const barSpring = spring({
    fps,
    frame: frame - 12,
    config: { damping: 14, stiffness: 70 },
  });

  const valueSpring = spring({
    fps,
    frame: frame - 22,
    config: { damping: 200 },
  });

  const leftColor = left.color || brandColor || "#D8A7B1";
  const rightColor = right.color || DEFAULT_ACCENT_RIGHT;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: 80,
      }}
    >
      {chart.title && (
        <h2
          style={{
            color: TEXT_COLOR,
            fontSize: 40,
            fontFamily,
            fontWeight: 600,
            margin: 0,
            marginBottom: 60,
            textAlign: "center",
            opacity: titleSpring,
          }}
        >
          {chart.title}
        </h2>
      )}

      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            color: leftColor,
            fontSize: 32,
            fontFamily,
            fontWeight: 600,
            opacity: labelSpring,
            transform: `translateX(${interpolate(labelSpring, [0, 1], [-30, 0])}px)`,
          }}
        >
          {left.label}
        </div>

        <div
          style={{
            color: rightColor,
            fontSize: 32,
            fontFamily,
            fontWeight: 600,
            opacity: labelSpring,
            transform: `translateX(${interpolate(labelSpring, [0, 1], [30, 0])}px)`,
            textAlign: "right",
          }}
        >
          {right.label}
        </div>
      </div>

      <div
        style={{
          width: "100%",
          height: 48,
          borderRadius: 24,
          backgroundColor: TRACK_COLOR,
          overflow: "hidden",
          display: "flex",
          flexDirection: "row",
        }}
      >
        <div
          style={{
            width: `${leftPercent * barSpring}%`,
            height: "100%",
            backgroundColor: leftColor,
            borderRadius: "24px 0 0 24px",
          }}
        />

        <div
          style={{
            width: `${rightPercent * barSpring}%`,
            height: "100%",
            backgroundColor: rightColor,
            borderRadius: "0 24px 24px 0",
            marginLeft: "auto",
          }}
        />
      </div>

      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 16,
        }}
      >
        <div
          style={{
            color: TEXT_COLOR,
            fontSize: 28,
            fontFamily,
            fontWeight: 600,
            opacity: valueSpring,
          }}
        >
          {formatValue(
            Math.round(left.value * valueSpring),
            chart.unit,
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: 24,
            opacity: valueSpring,
          }}
        >
          <span
            style={{
              color: leftColor,
              fontSize: 22,
              fontFamily,
              fontWeight: 500,
            }}
          >
            {Math.round(leftPercent)}%
          </span>
          <span
            style={{
              color: MUTED_TEXT,
              fontSize: 22,
              fontFamily,
              fontWeight: 400,
            }}
          >
            vs
          </span>
          <span
            style={{
              color: rightColor,
              fontSize: 22,
              fontFamily,
              fontWeight: 500,
            }}
          >
            {Math.round(rightPercent)}%
          </span>
        </div>

        <div
          style={{
            color: TEXT_COLOR,
            fontSize: 28,
            fontFamily,
            fontWeight: 600,
            opacity: valueSpring,
            textAlign: "right",
          }}
        >
          {formatValue(
            Math.round(right.value * valueSpring),
            chart.unit,
          )}
        </div>
      </div>
    </div>
  );
};

// ─── MODE 2: Horizontal Bar List (3+ items) ────────────────────

const HorizontalBarList: React.FC<ComparisonTableProps> = ({
  chart,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const items = chart.items!;
  const maxValue = Math.max(...items.map((item) => item.value));

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 80,
      }}
    >
      {chart.title && (
        <h2
          style={{
            color: TEXT_COLOR,
            fontSize: 40,
            fontFamily,
            fontWeight: 600,
            margin: 0,
            marginBottom: 40,
            textAlign: "left",
          }}
        >
          {chart.title}
        </h2>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          width: "100%",
        }}
      >
        {items.map((item, index) => {
          const barSpring = spring({
            fps,
            frame: frame - index * 8,
            config: { damping: 14, stiffness: 80 },
          });

          const widthPercent =
            maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          const barColor =
            item.color ||
            chart.colors?.[index] ||
            DEFAULT_COLORS[index % DEFAULT_COLORS.length];

          const textOpacity = interpolate(barSpring, [0, 0.4], [0, 1], {
            extrapolateRight: "clamp",
          });

          return (
            <div
              key={item.label}
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                width: "100%",
              }}
            >
              <div
                style={{
                  width: 200,
                  minWidth: 200,
                  color: MUTED_TEXT,
                  fontSize: 22,
                  fontFamily,
                  fontWeight: 500,
                  textAlign: "right",
                  paddingRight: 20,
                  opacity: textOpacity,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {item.label}
              </div>

              <div
                style={{
                  flex: 1,
                  height: 40,
                  backgroundColor: TRACK_COLOR,
                  borderRadius: 6,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: `${widthPercent * barSpring}%`,
                    height: "100%",
                    backgroundColor: barColor,
                    borderRadius: 6,
                  }}
                />
              </div>

              <div
                style={{
                  width: 120,
                  minWidth: 120,
                  color: TEXT_COLOR,
                  fontSize: 22,
                  fontFamily,
                  fontWeight: 600,
                  textAlign: "left",
                  paddingLeft: 20,
                  opacity: textOpacity,
                  whiteSpace: "nowrap",
                }}
              >
                {formatValue(item.value, chart.unit)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── MODE 3: Duel Comparison (butterfly chart, 2 entities) ─────

const DuelComparison: React.FC<ComparisonTableProps> = ({
  chart,
  brandColor,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const items = chart.items || [];
  const duel = chart.duel!;

  // Use explicit item colors, fall back to entity colors from first pair
  const leftColor = items[0]?.color || brandColor || "#D8A7B1";
  const rightColor = items[1]?.color || DEFAULT_ACCENT_RIGHT;

  // Pair items: [0,1] = pair 1, [2,3] = pair 2, etc.
  interface MetricPair {
    label: string;
    leftValue: number;
    rightValue: number;
    leftColor: string;
    rightColor: string;
  }

  const pairs: MetricPair[] = [];
  for (let i = 0; i < items.length - 1; i += 2) {
    pairs.push({
      label: items[i].label,
      leftValue: items[i].value,
      rightValue: items[i + 1].value,
      leftColor: items[i].color || leftColor,
      rightColor: items[i + 1].color || rightColor,
    });
  }

  // Shared spring for entire header block
  const headerSpring = spring({
    fps,
    frame,
    config: { damping: 18, stiffness: 90 },
  });

  const formatVal = (v: number): string => {
    return v % 1 === 0
      ? v.toLocaleString()
      : v.toFixed(1);
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "48px 100px",
      }}
    >
      {/* ── Title ── */}
      {chart.title && (
        <div
          style={{
            color: TEXT_COLOR,
            fontSize: 36,
            fontFamily,
            fontWeight: 600,
            margin: 0,
            marginBottom: 32,
            textAlign: "center",
            opacity: headerSpring,
            transform: `translateY(${interpolate(headerSpring, [0, 1], [8, 0])}px)`,
          }}
        >
          {chart.title}
        </div>
      )}

      {/* ── Country names header ── */}
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            opacity: headerSpring,
            transform: `translateX(${interpolate(headerSpring, [0, 1], [-24, 0])}px)`,
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: 3,
              backgroundColor: leftColor,
              flexShrink: 0,
            }}
          />
          <div
            style={{
              color: leftColor,
              fontSize: 36,
              fontFamily,
              fontWeight: 700,
            }}
          >
            {duel.left}
          </div>
        </div>

        <div
          style={{
            color: MUTED_TEXT,
            fontSize: 14,
            fontFamily,
            fontWeight: 400,
            letterSpacing: 4,
            textTransform: "uppercase",
            opacity: headerSpring,
          }}
        >
          VS
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            opacity: headerSpring,
            transform: `translateX(${interpolate(headerSpring, [0, 1], [24, 0])}px)`,
          }}
        >
          <div
            style={{
              color: rightColor,
              fontSize: 36,
              fontFamily,
              fontWeight: 700,
              textAlign: "right",
            }}
          >
            {duel.right}
          </div>
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: 3,
              backgroundColor: rightColor,
              flexShrink: 0,
            }}
          />
        </div>
      </div>

      {/* ── Metric rows ── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 28,
          width: "100%",
          marginTop: 8,
        }}
      >
        {pairs.map((pair, pairIndex) => {
          const rowSpring = spring({
            fps,
            frame: frame - 8 - pairIndex * 10,
            config: { damping: 14, stiffness: 80 },
          });

          // Per-pair normalization (each metric compared within its own pair)
          const pairMax = Math.max(pair.leftValue, pair.rightValue);
          const leftPct = pairMax > 0 ? (pair.leftValue / pairMax) * 100 : 0;
          const rightPct = pairMax > 0 ? (pair.rightValue / pairMax) * 100 : 0;

          const textOp = interpolate(rowSpring, [0, 0.5], [0, 1], {
            extrapolateRight: "clamp",
          });

          return (
            <div key={pair.label + pairIndex}>
              {/* Metric label */}
              <div
                style={{
                  color: MUTED_TEXT,
                  fontSize: 17,
                  fontFamily,
                  fontWeight: 500,
                  textAlign: "center",
                  marginBottom: 8,
                  opacity: textOp,
                  letterSpacing: 1,
                }}
              >
                {pair.label}
              </div>

              {/* Bar row: left value | left bar || divider || right bar | right value */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  width: "100%",
                }}
              >
                {/* Left value */}
                <div
                  style={{
                    width: 80,
                    minWidth: 80,
                    textAlign: "right",
                    paddingRight: 12,
                    color: pair.leftColor,
                    fontSize: 22,
                    fontFamily,
                    fontWeight: 700,
                    opacity: textOp,
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatVal(Math.round(pair.leftValue * rowSpring))}
                </div>

                {/* Left bar (grows right from left edge) */}
                <div
                  style={{
                    flex: leftPct,
                    height: 44,
                    backgroundColor: TRACK_COLOR,
                    borderRadius: 6,
                    overflow: "hidden",
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  <div
                    style={{
                      width: `${leftPct * rowSpring}%`,
                      height: "100%",
                      backgroundColor: pair.leftColor,
                      borderRadius: 6,
                      opacity: 0.9,
                    }}
                  />
                </div>

                {/* Center divider */}
                <div
                  style={{
                    width: 4,
                    height: 44,
                    backgroundColor: "rgba(234, 224, 213, 0.12)",
                    borderRadius: 2,
                    marginLeft: 8,
                    marginRight: 8,
                    flexShrink: 0,
                  }}
                />

                {/* Right bar (grows left from right edge) */}
                <div
                  style={{
                    flex: rightPct,
                    height: 44,
                    backgroundColor: TRACK_COLOR,
                    borderRadius: 6,
                    overflow: "hidden",
                    display: "flex",
                    justifyContent: "flex-start",
                  }}
                >
                  <div
                    style={{
                      width: `${rightPct * rowSpring}%`,
                      height: "100%",
                      backgroundColor: pair.rightColor,
                      borderRadius: 6,
                      opacity: 0.9,
                    }}
                  />
                </div>

                {/* Right value */}
                <div
                  style={{
                    width: 80,
                    minWidth: 80,
                    textAlign: "left",
                    paddingLeft: 12,
                    color: pair.rightColor,
                    fontSize: 22,
                    fontFamily,
                    fontWeight: 700,
                    opacity: textOp,
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatVal(Math.round(pair.rightValue * rowSpring))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────

/**
 * Animated comparison component with three modes:
 * - Duel: butterfly chart for side-by-side entity comparison (when chart.duel is set)
 * - Tug-of-War: 2-entity proportional bar (exactly 2 items, no duel)
 * - Horizontal Bar List: multi-item horizontal bars (3+ items, no duel)
 */
export const ComparisonTable: React.FC<ComparisonTableProps> = (props) => {
  const items = props.chart.items || [];
  if (items.length === 0) return null;

  if (props.chart.duel) {
    return <DuelComparison {...props} />;
  }

  if (items.length === 2) {
    return <TugOfWar {...props} />;
  }

  return <HorizontalBarList {...props} />;
};
