import React from "react";
import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { DataChartInput } from "../../schemas";
import { TEXT, ACCENT_BLUE, ACCENT_PINK, POSITIVE, TRACK } from "../../palette";
import { FrostedPanelSurface } from "../../design-system/surfaces/FrostedPanelSurface";
import { TiltCard } from "../../design-system/motion/TiltCard";

interface ComparisonTableProps {
  chart: DataChartInput;
  brandColor: string;
  fontFamily: string;
}

const DEFAULT_COLORS = [
  ACCENT_PINK,
  ACCENT_BLUE,
  ACCENT_PINK,
  ACCENT_BLUE,
  ACCENT_PINK,
];

const TEXT_COLOR = TEXT;
const MUTED_TEXT = "rgba(240, 237, 232, 0.6)"; // derived from TEXT, opacity 0.6
const TRACK_COLOR = TRACK;

const DEFAULT_ACCENT_RIGHT = ACCENT_BLUE;

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

  const leftColor = left.color || brandColor || ACCENT_PINK;
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
        padding: "32px 48px",
      }}
    >
      {chart.title && (
        <h2
          style={{
            color: TEXT_COLOR,
            fontSize: 52,
            fontFamily,
            fontWeight: 600,
            margin: 0,
            marginBottom: 72,
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
          maxWidth: 880,
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
        }}
      >

      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 28,
        }}
      >
        <div
          style={{
            color: leftColor,
            fontSize: 36,
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
            fontSize: 36,
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
          height: 72,
          borderRadius: 36,
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
            borderRadius: "36px 0 0 36px",
          }}
        />

        <div
          style={{
            width: `${rightPercent * barSpring}%`,
            height: "100%",
            backgroundColor: rightColor,
            borderRadius: "0 36px 36px 0",
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
          marginTop: 24,
        }}
      >
        <div
          style={{
            color: TEXT_COLOR,
            fontSize: 32,
            fontFamily,
            fontWeight: 600,
            opacity: valueSpring,
          }}
        >
          {(left as any).displayValue || formatValue(
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
              fontSize: 28,
              fontFamily,
              fontWeight: 500,
            }}
          >
            {Math.round(leftPercent)}%
          </span>
          <span
            style={{
              color: MUTED_TEXT,
              fontSize: 28,
              fontFamily,
              fontWeight: 400,
            }}
          >
            vs
          </span>
          <span
            style={{
              color: rightColor,
              fontSize: 28,
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
            fontSize: 32,
            fontFamily,
            fontWeight: 600,
            opacity: valueSpring,
            textAlign: "right",
          }}
        >
          {(right as any).displayValue || formatValue(
            Math.round(right.value * valueSpring),
            chart.unit,
          )}
        </div>
      </div>

      </div>{/* end maxWidth wrapper */}

      {/* Annotation card — warning style with Negative Red accent */}
      {chart.annotation && (
        <div
          style={{
            marginTop: 40,
            padding: "16px 28px",
            backgroundColor: "rgba(217, 79, 79, 0.12)",
            border: "2px solid #D94F4F",
            borderRadius: 8,
            maxWidth: "90%",
            opacity: spring({
              fps,
              frame: frame - 32,
              config: { damping: 20, stiffness: 100 },
            }),
            transform: `translateY(${interpolate(
              spring({
                fps,
                frame: frame - 32,
                config: { damping: 20, stiffness: 100 },
              }),
              [0, 1],
              [8, 0],
            )}px)`,
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 22, color: "#D94F4F", flexShrink: 0 }}>⚠</span>
          <span
            style={{
              color: TEXT_COLOR,
              fontSize: 22,
              fontFamily,
              fontWeight: 500,
              lineHeight: 1.5,
            }}
          >
            {chart.annotation}
          </span>
        </div>
      )}
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
        padding: "24px 40px",
      }}
    >
      {chart.title && (
        <h2
          style={{
            color: TEXT_COLOR,
            fontSize: 48,
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
                  width: 300,
                  minWidth: 300,
                  color: MUTED_TEXT,
                  fontSize: 30,
                  fontFamily,
                  fontWeight: 500,
                  textAlign: "right",
                  paddingRight: 20,
                  opacity: textOpacity,
                  lineHeight: 1.2,
                }}
              >
                {item.label}
              </div>

              <div
                style={{
                  flex: 1,
                  height: 84,
                  backgroundColor: TRACK_COLOR,
                  borderRadius: 8,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: `${widthPercent * barSpring}%`,
                    height: "100%",
                    backgroundColor: barColor,
                    borderRadius: 8,
                  }}
                />
              </div>

              <div
                style={{
                  width: 280,
                  minWidth: 280,
                  color: TEXT_COLOR,
                  fontSize: 30,
                  fontFamily,
                  fontWeight: 600,
                  textAlign: "left",
                  paddingLeft: 20,
                  opacity: textOpacity,
                  whiteSpace: "normal",
                  lineHeight: 1.2,
                }}
              >
                {(item as any).displayValue || formatValue(item.value, chart.unit)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Annotation callout below bars */}
      {chart.annotation && (
        <div
          style={{
            marginTop: 32,
            padding: "16px 28px",
            backgroundColor: "rgba(217, 79, 79, 0.12)",
            border: "2px solid #D94F4F",
            borderRadius: 8,
            maxWidth: "90%",
            alignSelf: "center",
            opacity: spring({
              fps,
              frame: frame - items.length * 8 - 20,
              config: { damping: 20, stiffness: 100 },
            }),
            transform: `translateY(${interpolate(
              spring({
                fps,
                frame: frame - items.length * 8 - 20,
                config: { damping: 20, stiffness: 100 },
              }),
              [0, 1],
              [8, 0],
            )}px)`,
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 22, color: "#D94F4F", flexShrink: 0 }}>⚠</span>
          <span
            style={{
              color: TEXT_COLOR,
              fontSize: 22,
              fontFamily,
              fontWeight: 500,
              lineHeight: 1.5,
            }}
          >
            {chart.annotation}
          </span>
        </div>
      )}
    </div>
  );
};

// ─── MODE 3: Duel Comparison (butterfly chart, 2 entities) ─────

// Duel entity can be a plain string or an object with label + subtitle
type DuelEntity = string | { label: string; subtitle?: string };

/** Extract display label from a duel entity (string or object). */
const getDuelLabel = (entity: DuelEntity): string =>
  typeof entity === "string" ? entity : entity.label;

/** Extract optional subtitle from a duel entity. */
const getDuelSubtitle = (entity: DuelEntity): string | undefined =>
  typeof entity === "object" ? entity.subtitle : undefined;

/**
 * Metric-row item as sent by storyboard when duel is present.
 * Values can be numbers (rendered with animated bars) or strings (rendered as text labels).
 */
interface DuelMetricItem {
  metric?: string;
  leftValue?: string | number;
  rightValue?: string | number;
  // Legacy pair format fields
  label?: string;
  value?: number;
  color?: string;
}

/** Detect whether items use the metric-row format ({metric, leftValue, rightValue}). */
const isMetricRowFormat = (items: DuelMetricItem[]): boolean =>
  items.length > 0 && items[0].metric !== undefined;

/** Normalised metric row used for rendering. */
interface NormalisedMetricRow {
  label: string;
  leftValue: string | number;
  rightValue: string | number;
  isNumeric: boolean;
  leftColor: string;
  rightColor: string;
}

const DuelComparison: React.FC<ComparisonTableProps> = ({
  chart,
  brandColor,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Cast items to the loose shape — runtime data may have metric-row fields
  const rawItems: DuelMetricItem[] = (chart.items || []) as DuelMetricItem[];
  const duel = chart.duel!;

  // Resolve duel entities (string or object)
  const leftEntity = duel.left as DuelEntity;
  const rightEntity = duel.right as DuelEntity;

  // Colors: item.color → chart.colors[i] → brand/accent defaults
  const leftColor = rawItems[0]?.color || chart.colors?.[0] || brandColor || ACCENT_PINK;
  const rightColor = rawItems[1]?.color || chart.colors?.[1] || DEFAULT_ACCENT_RIGHT;

  // Normalise items into a unified metric-row array
  const rows: NormalisedMetricRow[] = [];
  if (isMetricRowFormat(rawItems)) {
    // Storyboard metric-row format: { metric, leftValue, rightValue }
    for (const item of rawItems) {
      const lv = item.leftValue ?? 0;
      const rv = item.rightValue ?? 0;
      rows.push({
        label: item.metric || "",
        leftValue: lv,
        rightValue: rv,
        isNumeric: typeof lv === "number" && typeof rv === "number",
        leftColor,
        rightColor,
      });
    }
  } else {
    // Legacy pair format: [0,1] = pair 1, [2,3] = pair 2, etc.
    for (let i = 0; i < rawItems.length - 1; i += 2) {
      rows.push({
        label: rawItems[i].label || "",
        leftValue: rawItems[i].value ?? 0,
        rightValue: rawItems[i + 1].value ?? 0,
        isNumeric: true,
        leftColor: rawItems[i].color || leftColor,
        rightColor: rawItems[i + 1].color || rightColor,
      });
    }
  }

  // Shared spring for entire header block
  const headerSpring = spring({
    fps,
    frame,
    config: { damping: 18, stiffness: 90 },
  });

  const formatVal = (v: number): string => {
    if (v % 1 === 0) return v.toLocaleString();
    // Preserve decimal precision — show up to 2 decimal places
    return v.toFixed(2).replace(/\.?0+$/, "");
  };

  // Annotation (optional callout text — rendered ABOVE metric rows as warning card)
  const annotation = chart.annotation;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "24px 48px",
      }}
    >
     <div
      style={{
        width: "100%",
        maxWidth: 900,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
     >
      {/* ── Title ── */}
      {chart.title && (
        <div
          style={{
            color: TEXT_COLOR,
            fontSize: 54,
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

      {/* ── Annotation callout — warning card ABOVE duel bars ── */}
      {annotation && (
        <div
          style={{
            marginBottom: 28,
            padding: "12px 20px",
            backgroundColor: "rgba(217, 79, 79, 0.12)",
            border: "2px solid #D94F4F",
            borderRadius: 8,
            maxWidth: "90%",
            textAlign: "center",
            opacity: spring({
              fps,
              frame: frame - 4,
              config: { damping: 20, stiffness: 100 },
            }),
            transform: `translateY(${interpolate(
              spring({
                fps,
                frame: frame - 4,
                config: { damping: 20, stiffness: 100 },
              }),
              [0, 1],
              [8, 0],
            )}px)`,
          }}
        >
          <span
            style={{
              color: "#F0EDE8",
              fontSize: 20,
              fontFamily: "Inter, sans-serif",
              fontWeight: 500,
              lineHeight: 1.5,
            }}
          >
            {annotation}
          </span>
        </div>
      )}

      {/* ── Entity names header ── */}
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        {/* Left entity — frost panel with tilt */}
        <TiltCard maxTilt={5} style={{
          opacity: headerSpring,
          transform: `translateX(${interpolate(headerSpring, [0, 1], [-24, 0])}px)`,
        }}>
          <FrostedPanelSurface id="frosted-panel" blur={20} opacity={0.18} borderRadius={16}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 22px",
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
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    color: leftColor,
                    fontSize: 40,
                    fontFamily,
                    fontWeight: 700,
                  }}
                >
                  {getDuelLabel(leftEntity)}
                </div>
                {getDuelSubtitle(leftEntity) && (
                  <div
                    style={{
                      color: MUTED_TEXT,
                      fontSize: 22,
                      fontFamily,
                      fontWeight: 400,
                      marginTop: 2,
                    }}
                  >
                    {getDuelSubtitle(leftEntity)}
                  </div>
                )}
              </div>
            </div>
          </FrostedPanelSurface>
        </TiltCard>

        {/* Right entity — frost panel with tilt */}
        <TiltCard maxTilt={5} style={{
          opacity: headerSpring,
          transform: `translateX(${interpolate(headerSpring, [0, 1], [24, 0])}px)`,
        }}>
          <FrostedPanelSurface id="frosted-panel" blur={20} opacity={0.18} borderRadius={16}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 22px",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <div
                  style={{
                    color: rightColor,
                    fontSize: 40,
                    fontFamily,
                    fontWeight: 700,
                    textAlign: "right",
                  }}
                >
                  {getDuelLabel(rightEntity)}
                </div>
                {getDuelSubtitle(rightEntity) && (
                  <div
                    style={{
                      color: MUTED_TEXT,
                      fontSize: 22,
                      fontFamily,
                      fontWeight: 400,
                      textAlign: "right",
                      marginTop: 2,
                    }}
                  >
                    {getDuelSubtitle(rightEntity)}
                  </div>
                )}
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
          </FrostedPanelSurface>
        </TiltCard>
      </div>

      {/* ── Metric rows ── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 40,
          width: "100%",
          marginTop: 8,
        }}
      >
        {rows.map((row, rowIndex) => {
          const rowSpring = spring({
            fps,
            frame: frame - 8 - rowIndex * 10,
            config: { damping: 14, stiffness: 80 },
          });

          const textOp = interpolate(rowSpring, [0, 0.5], [0, 1], {
            extrapolateRight: "clamp",
          });

          if (row.isNumeric) {
            // Numeric values — render animated butterfly bars
            const lv = row.leftValue as number;
            const rv = row.rightValue as number;
            const total = lv + rv;
            const leftPct = total > 0 ? (lv / total) * 100 : 50;
            const rightPct = total > 0 ? (rv / total) * 100 : 50;

            return (
              <div key={row.label + rowIndex}>
                {/* Metric label */}
                <div
                  style={{
                    color: MUTED_TEXT,
                    fontSize: 24,
                    fontFamily,
                    fontWeight: 500,
                    textAlign: "center",
                    marginBottom: 8,
                    opacity: textOp,
                    letterSpacing: 1,
                  }}
                >
                  {row.label}
                </div>

                {/* Bar row */}
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
                      width: 100,
                      minWidth: 100,
                      textAlign: "right",
                      paddingRight: 12,
                      color: row.leftColor,
                      fontSize: 28,
                      fontFamily,
                      fontWeight: 700,
                      opacity: textOp,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatVal(lv)}
                  </div>

                  {/* Left bar */}
                  <div
                    style={{
                      flex: leftPct,
                      height: 70,
                      backgroundColor: TRACK_COLOR,
                      borderRadius: 6,
                      overflow: "hidden",
                      display: "flex",
                      justifyContent: "flex-end",
                    }}
                  >
                    <div
                      style={{
                        width: `${100 * rowSpring}%`,
                        height: "100%",
                        backgroundColor: row.leftColor,
                        borderRadius: 6,
                        opacity: 0.9,
                      }}
                    />
                  </div>

                  {/* Center divider */}
                  <div
                    style={{
                      width: 4,
                      height: 70,
                      backgroundColor: "rgba(240, 237, 232, 0.12)",
                      borderRadius: 2,
                      marginLeft: 8,
                      marginRight: 8,
                      flexShrink: 0,
                    }}
                  />

                  {/* Right bar */}
                  <div
                    style={{
                      flex: rightPct,
                      height: 70,
                      backgroundColor: TRACK_COLOR,
                      borderRadius: 6,
                      overflow: "hidden",
                      display: "flex",
                      justifyContent: "flex-start",
                    }}
                  >
                    <div
                      style={{
                        width: `${100 * rowSpring}%`,
                        height: "100%",
                        backgroundColor: row.rightColor,
                        borderRadius: 6,
                        opacity: 0.9,
                      }}
                    />
                  </div>

                  {/* Right value */}
                  <div
                    style={{
                      width: 100,
                      minWidth: 100,
                      textAlign: "left",
                      paddingLeft: 12,
                      color: row.rightColor,
                      fontSize: 28,
                      fontFamily,
                      fontWeight: 700,
                      opacity: textOp,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatVal(rv)}
                  </div>
                </div>
              </div>
            );
          }

          // String values — render as text comparison (no bars)
          return (
            <div key={row.label + rowIndex}>
              {/* Metric label */}
              <div
                style={{
                  color: MUTED_TEXT,
                  fontSize: 24,
                  fontFamily,
                  fontWeight: 500,
                  textAlign: "center",
                  marginBottom: 10,
                  opacity: textOp,
                  letterSpacing: 1,
                }}
              >
                {row.label}
              </div>

              {/* Text comparison row */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  width: "100%",
                }}
              >
                {/* Left text value */}
                <div
                  style={{
                    flex: 1,
                    textAlign: "center",
                    color: row.leftColor,
                    fontSize: 26,
                    fontFamily,
                    fontWeight: 600,
                    opacity: textOp,
                    transform: `translateX(${interpolate(rowSpring, [0, 1], [-12, 0])}px)`,
                    padding: "8px 12px",
                    backgroundColor: TRACK_COLOR,
                    borderRadius: 8,
                  }}
                >
                  {String(row.leftValue)}
                </div>

                {/* Center divider */}
                <div
                  style={{
                    width: 4,
                    height: 40,
                    backgroundColor: "rgba(240, 237, 232, 0.12)",
                    borderRadius: 2,
                    marginLeft: 12,
                    marginRight: 12,
                    flexShrink: 0,
                  }}
                />

                {/* Right text value */}
                <div
                  style={{
                    flex: 1,
                    textAlign: "center",
                    color: row.rightColor,
                    fontSize: 26,
                    fontFamily,
                    fontWeight: 600,
                    opacity: textOp,
                    transform: `translateX(${interpolate(rowSpring, [0, 1], [12, 0])}px)`,
                    padding: "8px 12px",
                    backgroundColor: TRACK_COLOR,
                    borderRadius: 8,
                  }}
                >
                  {String(row.rightValue)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
     </div>{/* end maxWidth wrapper */}
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
