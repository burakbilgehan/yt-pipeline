import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { BG, TEXT, TEXT_SECONDARY, POSITIVE, SAGE } from "../../palette";

// ─── Types ────────────────────────────────────────────────────

interface DeflatorItem {
  name: string;
  status: "done" | "pending";
}

interface LensSwitchPivotProps {
  chart: {
    type: "lens-switch-pivot";
    summaryText?: string; // "4 of 6 cheaper"
    pivotQuestion?: string; // "But cheaper… for whom?"
    rulerQuestion?: string; // "What if we change the ruler?"
    deflators?: Array<DeflatorItem>;
    [key: string]: unknown;
  };
  brandColor: string;
  fontFamily: string;
}

// ─── Design tokens ────────────────────────────────────────────

const BG_COLOR = BG;
const TEXT_COLOR = TEXT;
const GREEN = POSITIVE;

// Phase proportions (of total scene duration)
// Phase 1 (combined): summary text + pivot question coexist
// Phase 2: ruler question + deflators
const PHASE1_RATIO = 0.55; // Combined summary + pivot
const PHASE2_RATIO = 0.45; // Ruler question + deflators
// Minimum Phase 2 duration so deflator labels are readable
const PHASE2_MIN_SECONDS = 4;
// Minimum time deflator labels stay at full opacity before scene ends
const DEFLATOR_HOLD_MIN_SECONDS = 2;

// Timing for text appearances within Phase 1
const SUMMARY_DELAY_SEC = 0.3; // "4 of 6" appears at ~0.3s
const PIVOT_DELAY_SEC = 2.0; // "But cheaper for whom?" appears at ~2.0s

// Ellipsis delay in frames (500ms ≈ 15 frames at 30fps)
const ELLIPSIS_DELAY_FRAMES = 15;

// Crossfade duration
const CROSSFADE_FRAMES = 12;

// Deflator stagger (frames between each label appearance)
const DEFLATOR_STAGGER = 10;

const SPRING_CFG = { damping: 16, stiffness: 60 };

// ─── Component ────────────────────────────────────────────────

export const LensSwitchPivot: React.FC<LensSwitchPivotProps> = ({
  chart,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const summaryText = chart.summaryText ?? "4 of 6 cheaper";
  const pivotQuestion = chart.pivotQuestion ?? "But cheaper\u2026 for whom?";
  const rulerQuestion = chart.rulerQuestion ?? "What if we change the ruler?";
  const deflators: DeflatorItem[] = chart.deflators ?? [
    { name: "Median Wage", status: "done" },
    { name: "CPI", status: "pending" },
    { name: "Min Wage", status: "pending" },
  ];

  // ── Proportional phase boundaries ──
  const sceneDurationSec = durationInFrames / fps;

  // Guarantee Phase 2 (ruler + deflators) gets at least PHASE2_MIN_SECONDS.
  const phase2Ideal = sceneDurationSec * PHASE2_RATIO;
  const phase2Sec = Math.max(phase2Ideal, PHASE2_MIN_SECONDS);
  const phase1Sec = sceneDurationSec - phase2Sec;

  const phase1EndFrame = Math.round(phase1Sec * fps);

  // ── Phase 1 (combined): Summary text + Pivot question coexist ──

  // Summary text: spring-in at SUMMARY_DELAY_SEC
  const summaryDelayFrames = Math.round(SUMMARY_DELAY_SEC * fps);
  const summaryEntrance = spring({
    fps,
    frame: frame - summaryDelayFrames,
    config: SPRING_CFG,
  });
  // Crossfade out before Phase 2
  const summaryFadeOut = interpolate(
    frame,
    [phase1EndFrame - CROSSFADE_FRAMES, phase1EndFrame],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const summaryOpacity = Math.min(summaryEntrance, summaryFadeOut) * 0.75;

  // Pivot question: spring-in at PIVOT_DELAY_SEC
  const pivotDelayFrames = Math.round(PIVOT_DELAY_SEC * fps);

  // Split pivot question at the ellipsis for the typographic pause
  // "But cheaper… for whom?" → "But cheaper" + "… for whom?"
  const ellipsisIdx = pivotQuestion.indexOf("\u2026");
  const hasEllipsis = ellipsisIdx >= 0;
  const pivotPart1 = hasEllipsis ? pivotQuestion.slice(0, ellipsisIdx) : pivotQuestion;
  const pivotPart2 = hasEllipsis ? pivotQuestion.slice(ellipsisIdx) : "";

  const pivotEntrance = spring({
    fps,
    frame: frame - pivotDelayFrames,
    config: SPRING_CFG,
  });

  const ellipsisEntrance = hasEllipsis
    ? spring({
        fps,
        frame: frame - pivotDelayFrames - ELLIPSIS_DELAY_FRAMES,
        config: SPRING_CFG,
      })
    : 1;

  // Crossfade out before Phase 2
  const pivotFadeOut = interpolate(
    frame,
    [phase1EndFrame - CROSSFADE_FRAMES, phase1EndFrame],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const pivotOpacity = Math.min(pivotEntrance, pivotFadeOut);

  const phase1Visible = frame < phase1EndFrame;

  // ── Phase 2: Ruler question + deflators (phase1End – end) ──
  const phase2LocalFrame = frame - phase1EndFrame;
  const phase2DurationFrames = durationInFrames - phase1EndFrame;

  // Ensure deflator labels reach full opacity at least DEFLATOR_HOLD_MIN_SECONDS before scene end.
  // Budget = phase2 duration - hold time - ruler entrance (~15 frames).
  const holdFrames = DEFLATOR_HOLD_MIN_SECONDS * fps;
  const rulerEntranceFrames = 15; // frames before deflators start appearing
  const deflatorBudgetFrames = phase2DurationFrames - holdFrames - rulerEntranceFrames;
  // Each deflator spring takes ~20 frames to settle; last deflator index = deflators.length - 1
  const maxDeflatorCount = Math.max(deflators.length - 1, 1);
  const effectiveStagger = Math.min(
    DEFLATOR_STAGGER,
    Math.max(4, Math.floor((deflatorBudgetFrames - 20) / maxDeflatorCount)),
  );

  const rulerEntrance = spring({
    fps,
    frame: phase2LocalFrame,
    config: SPRING_CFG,
  });

  const phase2Visible = frame >= phase1EndFrame;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: BG_COLOR,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Phase 1 (combined): Summary text at upper portion + Pivot question centered */}
      {phase1Visible && (
        <>
          {/* Summary text — upper portion (~30% from top) */}
          <div
            style={{
              position: "absolute",
              top: "30%",
              left: 0,
              right: 0,
              textAlign: "center",
              opacity: summaryOpacity,
              fontFamily: "Inter, sans-serif",
              fontSize: 30,
              color: TEXT_COLOR,
              letterSpacing: "0.05em",
            }}
          >
            {summaryText}
          </div>

          {/* Pivot question — center of screen */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: pivotOpacity,
            }}
          >
            <div
              style={{
                fontFamily: "Montserrat, sans-serif",
                fontWeight: 700,
                fontSize: 64,
                color: TEXT_COLOR,
                textAlign: "center",
                lineHeight: 1.2,
                padding: "0 100px",
              }}
            >
              <span style={{ opacity: pivotEntrance }}>
                {pivotPart1}
              </span>
              {hasEllipsis && (
                <span style={{ opacity: ellipsisEntrance }}>
                  {pivotPart2}
                </span>
              )}
            </div>
          </div>
        </>
      )}

      {/* Phase 2: Ruler question + deflator labels */}
      {phase2Visible && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            opacity: rulerEntrance,
            gap: 48,
          }}
        >
          {/* Ruler question */}
          <div
            style={{
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 400,
              fontSize: 36,
              color: TEXT_COLOR,
              textAlign: "center",
              lineHeight: 1.3,
              padding: "0 120px",
            }}
          >
            {rulerQuestion}
          </div>

          {/* Deflator labels */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
            }}
          >
            {deflators.map((d, i) => {
              const staggerEntrance = spring({
                fps,
                frame: phase2LocalFrame - rulerEntranceFrames - i * effectiveStagger,
                config: { damping: 14, stiffness: 70 },
              });

              const isDone = d.status === "done";
              const statusSymbol = isDone ? "\u2713" : "?";
              const statusColor = isDone ? GREEN : SAGE;
              const nameColor = isDone ? TEXT_COLOR : TEXT_SECONDARY;

              return (
                <div
                  key={d.name}
                  style={{
                    opacity: staggerEntrance,
                    transform: `translateY(${interpolate(staggerEntrance, [0, 1], [12, 0])}px)`,
                    fontFamily: "Inter, sans-serif",
                    fontSize: 24,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span style={{ color: nameColor }}>
                    {d.name}
                  </span>
                  <span style={{ color: statusColor, fontWeight: 700 }}>
                    {statusSymbol}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
