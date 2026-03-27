import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { BG, TEXT, POSITIVE, SAGE } from "../../palette";

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

// Phase boundaries (in seconds)
const PHASE1_END = 6;
const PHASE2_END = 12;
// Phase 3 runs from PHASE2_END to scene end (~18.1s)

// Ellipsis delay in frames (500ms ≈ 15 frames at 30fps)
const ELLIPSIS_DELAY_FRAMES = 15;

// Crossfade duration
const CROSSFADE_FRAMES = 8;

// Deflator stagger (frames between each label appearance)
const DEFLATOR_STAGGER = 10;

const SPRING_CFG = { damping: 16, stiffness: 60 };

// ─── Component ────────────────────────────────────────────────

export const LensSwitchPivot: React.FC<LensSwitchPivotProps> = ({
  chart,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const summaryText = chart.summaryText ?? "4 of 6 cheaper";
  const pivotQuestion = chart.pivotQuestion ?? "But cheaper\u2026 for whom?";
  const rulerQuestion = chart.rulerQuestion ?? "What if we change the ruler?";
  const deflators: DeflatorItem[] = chart.deflators ?? [
    { name: "Median Wage", status: "done" },
    { name: "CPI", status: "pending" },
    { name: "Min Wage", status: "pending" },
  ];

  // ── Frame boundaries ──
  const phase1EndFrame = PHASE1_END * fps;
  const phase2EndFrame = PHASE2_END * fps;

  // ── Phase 1: Summary text (0 – 6s) ──
  const phase1Opacity = interpolate(
    frame,
    [0, 10, phase1EndFrame - 10, phase1EndFrame],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // ── Phase 2: Pivot question (6s – 12s) ──
  const phase2LocalFrame = frame - phase1EndFrame;

  // Split pivot question at the ellipsis for the typographic pause
  // "But cheaper… for whom?" → "But cheaper" + "… for whom?"
  const ellipsisIdx = pivotQuestion.indexOf("\u2026");
  const hasEllipsis = ellipsisIdx >= 0;
  const pivotPart1 = hasEllipsis ? pivotQuestion.slice(0, ellipsisIdx) : pivotQuestion;
  const pivotPart2 = hasEllipsis ? pivotQuestion.slice(ellipsisIdx) : "";

  const pivotEntrance = spring({
    fps,
    frame: phase2LocalFrame,
    config: SPRING_CFG,
  });

  const ellipsisEntrance = hasEllipsis
    ? spring({
        fps,
        frame: phase2LocalFrame - ELLIPSIS_DELAY_FRAMES,
        config: SPRING_CFG,
      })
    : 1;

  // Fade out at phase 2 end
  const pivotFadeOut = interpolate(
    frame,
    [phase2EndFrame - CROSSFADE_FRAMES, phase2EndFrame],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const phase2Visible = frame >= phase1EndFrame && frame < phase2EndFrame + CROSSFADE_FRAMES;
  const phase2Opacity = Math.min(pivotEntrance, pivotFadeOut);

  // ── Phase 3: Ruler question + deflators (12s – end) ──
  const phase3LocalFrame = frame - phase2EndFrame;

  const rulerEntrance = spring({
    fps,
    frame: phase3LocalFrame,
    config: SPRING_CFG,
  });

  const phase3Visible = frame >= phase2EndFrame;

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
      {/* Phase 1: Summary text at top */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: phase1Opacity,
          fontFamily: "Inter, sans-serif",
          fontSize: 18,
          color: TEXT_COLOR,
          // 40% opacity on the text itself
          filter: `opacity(${0.4})`,
          letterSpacing: "0.05em",
        }}
      >
        {summaryText}
      </div>

      {/* Phase 2: Pivot question — center of screen */}
      {phase2Visible && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: phase2Opacity,
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
      )}

      {/* Phase 3: Ruler question + deflator labels */}
      {phase3Visible && (
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
                frame: phase3LocalFrame - 15 - i * DEFLATOR_STAGGER,
                config: { damping: 14, stiffness: 70 },
              });

              const isDone = d.status === "done";
              const statusSymbol = isDone ? "\u2713" : "?";
              const statusColor = isDone ? GREEN : SAGE;
              const nameColor = isDone ? TEXT_COLOR : SAGE;

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
