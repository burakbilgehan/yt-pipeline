import React from "react";
import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { DataChartInput, DataChartItem } from "../../schemas";
import { TEXT, TEXT_MUTED, TEXT_FAINT, ACCENT_PINK, ACCENT_BLUE, POSITIVE, NEGATIVE, TRACK } from "../../palette";

interface Callout {
  text: string;
  style?: "warning" | "shock" | string;
}

interface BarChartProps {
  chart: DataChartInput;
  brandColor: string;
  fontFamily: string;
  /** Override title font size (default 48) */
  titleFontSize?: number;
  /** Override available height for bar sizing (default 1032) */
  availableHeight?: number;
}

/**
 * Determine bar color based on semantic meaning.
 * Priority: item.color > chart.colors[i] > semantic logic > fallback cycle
 * 
 * Semantic logic: if the chart has a contextual "highlight" field on the item,
 * use positive green for "positive", negative red for "negative", 
 * accent colors for emphasis.
 */
const getSemanticColors = (brandColor: string) => ({
  positive: POSITIVE,
  negative: NEGATIVE,
  accent1: brandColor || ACCENT_PINK,
  accent2: ACCENT_BLUE,
  neutral: TEXT,
});

const DEFAULT_COLORS = [
  ACCENT_BLUE,
  ACCENT_BLUE,
  ACCENT_BLUE,
  ACCENT_BLUE,
  ACCENT_BLUE,
];

const TEXT_COLOR = TEXT;
const MUTED_TEXT = TEXT_MUTED;
const TRACK_COLOR = TRACK;

const formatValue = (value: number, unit?: string): string => {
  if (unit === "$") {
    return `$${value.toLocaleString()}`;
  }
  return `${value.toLocaleString()}${unit ? ` ${unit}` : ""}`;
};

/**
 * Calculate visual percentage for a bar, using log-scale when the ratio
 * between max and min positive values exceeds 10×.
 * Log-scale maps values into a 15%–100% range so the smallest bar is
 * still clearly visible instead of being a sliver.
 */
const computeBarPercent = (
  value: number,
  items: { value: number }[],
  maxValue: number,
): number => {
  if (maxValue <= 0 || value <= 0) return 0;

  const positiveValues = items.map((i) => i.value).filter((v) => v > 0);
  const minPositive = Math.min(...positiveValues);

  // Only engage log-scale when the range is extreme (>10×)
  const useLog = maxValue / minPositive > 10;

  if (!useLog) {
    return (value / maxValue) * 100;
  }

  // Log-scale: map [log(minPositive) … log(maxValue)] → [15% … 100%]
  const logMin = Math.log10(minPositive);
  const logMax = Math.log10(maxValue);
  const logRange = logMax - logMin;

  if (logRange === 0) return 100;

  const normalized = (Math.log10(value) - logMin) / logRange; // 0 → 1
  return 15 + normalized * 85; // 15% → 100%
};

// ─── Callout Cards ────────────────────────────────────────────

const CALLOUT_BORDER_COLORS: Record<string, string> = {
  warning: NEGATIVE,   // #E06070
  shock: ACCENT_PINK,  // #E88CA5
};

const CALLOUT_ICONS: Record<string, string> = {
  warning: "⚠",
  shock: "●",
};

interface CalloutCardsProps {
  callouts: Callout[];
  fontFamily: string;
  /** Frame at which callouts start appearing */
  startFrame: number;
}

const CalloutCards: React.FC<CalloutCardsProps> = ({
  callouts,
  fontFamily,
  startFrame,
}) => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        gap: 20,
        width: "100%",
        marginTop: 32,
        flexWrap: "wrap",
      }}
    >
      {callouts.map((callout, index) => {
        const localFrame = frame - startFrame - index * 12;
        const opacity = interpolate(localFrame, [0, 15], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const translateY = interpolate(localFrame, [0, 15], [12, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const borderColor =
          CALLOUT_BORDER_COLORS[callout.style || ""] || TEXT_MUTED;
        const icon = CALLOUT_ICONS[callout.style || ""] || "";
        const isShock = callout.style === "shock";

        return (
          <div
            key={`callout-${index}`}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: `1px solid ${borderColor}`,
              borderRadius: 8,
              padding: "16px 24px",
              maxWidth: "80%",
              opacity,
              transform: `translateY(${translateY}px)`,
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            {icon && (
              <span
                style={{
                  fontSize: callout.style === "warning" ? 22 : 14,
                  color: borderColor,
                  flexShrink: 0,
                }}
              >
                {icon}
              </span>
            )}
            <span
              style={{
                fontFamily,
                fontSize: 24,
                color: TEXT,
                fontWeight: isShock ? 700 : 400,
                lineHeight: 1.4,
              }}
            >
              {callout.text}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// ─── Horizontal Bar Chart ─────────────────────────────────────

const HorizontalBars: React.FC<BarChartProps> = ({
  chart,
  fontFamily,
  titleFontSize = 48,
  availableHeight: availableHeightProp,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const items = chart.items || [];
  const maxValue = (chart as any).maxValue ?? Math.max(...items.map((item) => item.value));
  const annotation = chart.annotation;
  const secondaryStat = (chart as any).secondaryStat as string | undefined;

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
            fontSize: titleFontSize,
            fontFamily,
            fontWeight: 600,
            margin: 0,
            marginBottom: chart.subtitle ? 8 : 20,
            textAlign: "left",
          }}
        >
          {chart.title}
        </h2>
      )}

      {chart.subtitle && (
        <div
          style={{
            color: TEXT_FAINT,
            fontSize: 20,
            fontFamily,
            marginBottom: 20,
            lineHeight: 1.5,
          }}
        >
          {chart.subtitle}
        </div>
      )}

      {/* Group sub-title (shown when secondaryChart splits chart into groups) */}
      {(chart as any).groupTitle && (
        <div
          style={{
            color: MUTED_TEXT,
            fontSize: 26,
            fontFamily,
            fontWeight: 600,
            marginBottom: 12,
            textAlign: "left",
          }}
        >
          {(chart as any).groupTitle}
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          width: "100%",
        }}
      >
        {(() => {
          const baseHeight = availableHeightProp ?? 1032;
          const groupTitleHeight = (chart as any).groupTitle ? 50 : 0;
          const availableHeight = baseHeight - (chart.title ? 80 : 0) - (chart.subtitle ? 40 : 0) - groupTitleHeight - (annotation ? 80 : 0);
          const autoBarHeight = Math.max(48, Math.floor((availableHeight / Math.max(items.length, 1)) * 0.65));
          return items.map((item, index) => {
          const barSpring = spring({
            fps,
            frame: frame - index * 8,
            config: { damping: 14, stiffness: 80 },
          });

          const widthPercent = computeBarPercent(item.value, items, maxValue);
          const barColor =
            item.color ||
            chart.colors?.[index] ||
            DEFAULT_COLORS[index % DEFAULT_COLORS.length];
          // For zero-value bars, use a minimum width so the color is visible
          const isZeroValue = item.value === 0;

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
                  width: 320,
                  minWidth: 320,
                  color: MUTED_TEXT,
                  fontSize: 26,
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
                  height: autoBarHeight,
                  backgroundColor: TRACK_COLOR,
                  borderRadius: 6,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: isZeroValue ? 4 : `${widthPercent * barSpring}%`,
                    height: "100%",
                    backgroundColor: barColor,
                    borderRadius: 6,
                  }}
                />
              </div>

              <div
                style={{
                  width: 280,
                  minWidth: 280,
                  color: isZeroValue ? barColor : TEXT_COLOR,
                  fontSize: 26,
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
        });
        })()}
      </div>

      {/* Secondary stat line below bars */}
      {secondaryStat && (
        <div
          style={{
            textAlign: "center",
            marginTop: 24,
            opacity: interpolate(
              spring({
                fps,
                frame: frame - items.length * 8,
                config: { damping: 14, stiffness: 80 },
              }),
              [0, 1],
              [0, 1],
              { extrapolateRight: "clamp" },
            ),
          }}
        >
          <span
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 24,
              fontWeight: 600,
              color: ACCENT_PINK,
              lineHeight: 1.5,
            }}
          >
            {secondaryStat}
          </span>
        </div>
      )}

      {/* Annotation below horizontal bars */}
      {annotation && (
        <AnnotationRow
          annotation={annotation}
          fontFamily={fontFamily}
          startFrame={items.length * 8 + 30}
        />
      )}
    </div>
  );
};

// ─── Annotation Row ───────────────────────────────────────────

interface AnnotationRowProps {
  annotation: string;
  fontFamily: string;
  startFrame: number;
}

const AnnotationRow: React.FC<AnnotationRowProps> = ({
  annotation,
  fontFamily,
  startFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const annotSpring = spring({
    fps,
    frame: frame - startFrame,
    config: { damping: 20, stiffness: 100 },
  });

  return (
    <div
      style={{
        textAlign: "center",
        marginTop: 24,
        padding: "12px 24px",
        backgroundColor: "rgba(240, 237, 232, 0.05)",
        borderLeft: `3px solid ${ACCENT_PINK}`,
        borderRadius: "0 6px 6px 0",
        alignSelf: "center",
        maxWidth: "85%",
        opacity: annotSpring,
        transform: `translateY(${interpolate(annotSpring, [0, 1], [8, 0])}px)`,
      }}
    >
      <span
        style={{
          color: TEXT_MUTED,
          fontSize: 24,
          fontFamily,
          fontWeight: 500,
          lineHeight: 1.5,
        }}
      >
        {annotation}
      </span>
    </div>
  );
};

// ─── Vertical Bar Chart ───────────────────────────────────────

const MAX_BAR_HEIGHT = 680;

const VerticalBars: React.FC<BarChartProps> = ({
  chart,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const items = chart.items || [];
  const maxValue = (chart as any).maxValue ?? Math.max(...items.map((item) => item.value));
  const barWidth = items.length <= 3 ? 200 : items.length <= 5 ? 160 : 100;
  const annotation = chart.annotation;
  const annotationStartFrame = items.length * 8 + 30;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
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
            marginBottom: 24,
            textAlign: "center",
            width: "100%",
          }}
        >
          {chart.title}
        </h2>
      )}

      {/* Group sub-title (shown when secondaryChart splits chart into groups) */}
      {(chart as any).groupTitle && (
        <div
          style={{
            color: MUTED_TEXT,
            fontSize: 26,
            fontFamily,
            fontWeight: 600,
            marginBottom: 12,
            textAlign: "center",
          }}
        >
          {(chart as any).groupTitle}
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "flex-end",
          gap: items.length <= 3 ? 48 : 24,
          width: "100%",
        }}
      >
        {items.map((item, index) => {
          const barSpring = spring({
            fps,
            frame: frame - index * 8,
            config: { damping: 14, stiffness: 80 },
          });

          const heightPercent = computeBarPercent(item.value, items, maxValue);
          const calculatedHeightPx = (heightPercent / 100) * MAX_BAR_HEIGHT;
          // Show a thin colored indicator for zero-value bars so the color is visible
          const heightPx = item.value === 0 ? 4 : calculatedHeightPx;
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
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              {/* Value on top */}
              <div
                style={{
                  color: item.value === 0 ? barColor : TEXT_COLOR,
                  fontSize: 28,
                  fontFamily,
                  fontWeight: 600,
                  opacity: textOpacity,
                  whiteSpace: "nowrap",
                  marginBottom: 12,
                }}
              >
                {(item as any).displayValue || formatValue(item.value, chart.unit)}
              </div>

              {/* Bar */}
              <div
                style={{
                  width: barWidth,
                  height: MAX_BAR_HEIGHT,
                  backgroundColor: TRACK_COLOR,
                  borderRadius: 6,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: heightPx * barSpring,
                    backgroundColor: barColor,
                    borderRadius: 6,
                  }}
                />
              </div>

              {/* Label at bottom */}
              <div
                style={{
                  color: MUTED_TEXT,
                  fontSize: 24,
                  fontFamily,
                  fontWeight: 500,
                  textAlign: "center",
                  opacity: textOpacity,
                  marginTop: 12,
                  maxWidth: barWidth + 60,
                  lineHeight: 1.3,
                }}
              >
                {item.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Annotation below vertical bars */}
      {annotation && (
        <AnnotationRow
          annotation={annotation}
          fontFamily={fontFamily}
          startFrame={annotationStartFrame}
        />
      )}
    </div>
  );
};

// ─── Secondary Chart Support ────────────────────────────────

interface SecondaryChartData {
  title?: string;
  items: DataChartItem[];
  colors?: string[];
  unit?: string;
  annotation?: string;
}

// ─── Main Component ─────────────────────────────────────────

/**
 * Animated bar chart with horizontal (default) and vertical orientation.
 * Bars grow with staggered spring physics.
 * Optionally renders callout cards below bars if chart.callouts is present.
 * Supports an optional secondaryChart rendered below the primary.
 */
export const BarChart: React.FC<BarChartProps> = (props) => {
  const items = props.chart.items || [];
  if (items.length === 0) return null;

  const callouts = ((props.chart as any).callouts || []) as Callout[];
  const secondaryChart = (props.chart as any).secondaryChart as
    | SecondaryChartData
    | undefined;

  // Callouts appear ~20 frames after the last bar finishes its stagger delay.
  // Each bar is staggered by 8 frames, spring settles ~30 frames after start.
  const barAnimEndFrame = items.length * 8 + 30;
  const calloutStartFrame = barAnimEndFrame + 20;

  const BarsComponent =
    props.chart.orientation === "vertical" ? VerticalBars : HorizontalBars;

  const hasSecondary = secondaryChart && secondaryChart.items?.length > 0;
  const hasCallouts = callouts.length > 0;

  // ── With secondary chart → stacked layout ──
  if (hasSecondary) {
    // Height budget: primary 55%, gap/divider 5%, secondary 40%
    // Full composition height 1080. Padding ~48px.
    const TOTAL = 1080 - 48;
    const PRIMARY_H = Math.round(TOTAL * 0.55); // ~567
    const SECONDARY_H = Math.round(TOTAL * 0.40); // ~413

    const secondaryAsChart: DataChartInput = {
      type: props.chart.type,
      title: undefined,
      items: secondaryChart.items,
      colors: secondaryChart.colors,
      unit: secondaryChart.unit,
      orientation: props.chart.orientation,
      annotation: secondaryChart.annotation,
      groupTitle: secondaryChart.title,
    } as DataChartInput;

    const SecondaryComponent =
      props.chart.orientation === "vertical" ? VerticalBars : HorizontalBars;

    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Primary chart — 55% */}
        <div style={{ height: PRIMARY_H, minHeight: PRIMARY_H, overflow: "hidden" }}>
          <BarsComponent
            {...props}
            availableHeight={PRIMARY_H}
          />
        </div>

        {/* Divider */}
        <div
          style={{
            width: "80%",
            height: 1,
            backgroundColor: "rgba(255,255,255,0.10)",
            alignSelf: "center",
            margin: "12px 0",
          }}
        />

        {/* Secondary chart — 40% */}
        <div style={{ height: SECONDARY_H, minHeight: SECONDARY_H, overflow: "hidden" }}>
          <SecondaryComponent
            chart={secondaryAsChart}
            brandColor={props.brandColor}
            fontFamily={props.fontFamily}
            titleFontSize={32}
            availableHeight={SECONDARY_H}
          />
        </div>

        {/* Callouts below secondary if present */}
        {hasCallouts && (
          <div style={{ padding: "0 40px 24px" }}>
            <CalloutCards
              callouts={callouts}
              fontFamily={props.fontFamily}
              startFrame={calloutStartFrame}
            />
          </div>
        )}
      </div>
    );
  }

  // ── No secondary, no callouts → render bars directly ──
  if (!hasCallouts) {
    return <BarsComponent {...props} />;
  }

  // ── No secondary, with callouts → bars + callout row ──
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ flex: 1, minHeight: 0 }}>
        <BarsComponent {...props} />
      </div>
      <div style={{ padding: "0 40px 24px" }}>
        <CalloutCards
          callouts={callouts}
          fontFamily={props.fontFamily}
          startFrame={calloutStartFrame}
        />
      </div>
    </div>
  );
};
