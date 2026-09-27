/**
 * statement: one claim, quote, definition or question, set in giant type across the full width.
 * Words snap up in groups of 3 with motion blur while fast; the emphasis phrase turns highlight
 * on cue "emphasis" (default 12 f after the sentence has landed). The sentence sits on a drifting
 * depth layer; the fraction bar is flat. The giant size steps down at 65 and 91 characters.
 * fraction {n, d}: the fraction the sentence states, drawn as one full-width bar of d equal
 * segments under the sentence; the first n fill with highlight on the emphasis beat and
 * "n in d" lands centered under them.
 */
import React from "react";
import { useCurrentFrame } from "remotion";
import { COLOR, DUR, EASE, LAYOUT, MOTION, SHAPE, TYPE, body, giant, value } from "../tokens";
import { blurFor, mixColor, overshoot, progress } from "../motion";
import { Layer } from "../ui";

export interface StatementProps {
  text: string;
  emphasis?: string;
  attribution?: string;
  fraction?: { n: number; d: number };
  emphasisAt?: number;
}

const BAR = { top: 800, h: 40, gap: 8 };

export const Statement: React.FC<StatementProps> = ({ text, emphasis, attribution, fraction, emphasisAt }) => {
  const frame = useCurrentFrame();
  const { content } = LAYOUT;
  const size = text.length > 90 ? TYPE.giant.sizes.statementSmall : text.length > 64 ? TYPE.giant.sizes.statement : TYPE.giant.sizes.statementLarge;
  const words = text.split(" ");
  const groups: string[][] = [];
  for (let i = 0; i < words.length; i += 3) groups.push(words.slice(i, i + 3));
  const landed = (groups.length - 1) * DUR.stagger + DUR.snap;
  const emAt = Math.max(emphasisAt ?? landed + 12, landed);

  const emStart = emphasis ? text.indexOf(emphasis) : -1;
  const emEnd = emStart >= 0 ? emStart + emphasis!.length : -1;
  const emT = progress(frame, emAt, DUR.snap, EASE.hard);

  // Without a fraction the sentence sits on the optical middle of the content area; with one it hangs above the bar.
  const textBottom = fraction ? BAR.top - 72 : undefined;
  let cursor = 0;
  return (
    <>
      <Layer frame={frame} z={MOTION.z.figure}>
      <div
        style={{
          position: "absolute",
          left: content.left,
          width: content.right - content.left,
          top: content.top,
          height: (textBottom ?? content.bottom - 40) - content.top,
          display: "flex",
          flexDirection: "column",
          justifyContent: fraction ? "flex-end" : "center",
        }}
      >
        <div style={{ ...giant(size), whiteSpace: "normal", lineHeight: 1.04, maxWidth: content.right - content.left }}>
          {groups.map((g, gi) => {
            const at = gi * DUR.stagger;
            if (frame < at) return null;
            const y = (f: number) => MOTION.itemIn * (1 - overshoot((f - at) / DUR.snap));
            const dy = y(frame);
            const filter = frame === at ? blurFor(0, MOTION.itemIn) : blurFor(0, dy - y(frame - 1));
            return (
              <span key={gi} style={{ display: "inline-block", whiteSpace: "pre", transform: `translateY(${dy.toFixed(1)}px)`, filter }}>
                {g.map((w, wi) => {
                  const start = cursor;
                  cursor += w.length + 1;
                  const inEm = emStart >= 0 && start >= emStart && start < emEnd;
                  return (
                    <span key={wi} style={{ color: inEm ? mixColor(COLOR.textPrimary, COLOR.highlight, emT) : COLOR.textPrimary }}>
                      {w}
                      {wi < g.length - 1 || gi < groups.length - 1 ? " " : ""}
                    </span>
                  );
                })}
              </span>
            );
          })}
        </div>
        {attribution && <div style={{ ...body("l", COLOR.textSecondary), marginTop: 32, opacity: progress(frame, landed, DUR.snap) }}>{attribution}</div>}
      </div>
      </Layer>
      {fraction && <FractionBar n={fraction.n} d={fraction.d} at={emAt} />}
    </>
  );
};

/** d equal segments across the content width; the first n fill left to right with highlight. */
const FractionBar: React.FC<{ n: number; d: number; at: number }> = ({ n, d, at }) => {
  const frame = useCurrentFrame();
  const { content } = LAYOUT;
  const width = content.right - content.left;
  const w = (width - (d - 1) * BAR.gap) / d;
  const draw = progress(frame, at - DUR.barGrow, DUR.barGrow, EASE.move);
  const fill = progress(frame, at, DUR.barGrow, EASE.hard);
  const filledW = n * w + (n - 1) * BAR.gap;
  const labelIn = progress(frame, at + 6, DUR.snap, EASE.settle);
  return (
    <>
      {Array.from({ length: d }, (_, i) => {
        const segFill = Math.max(0, Math.min(1, fill * n - i));
        const x = content.left + i * (w + BAR.gap);
        return (
          <div key={i} style={{ position: "absolute", left: x, top: BAR.top, width: w, height: BAR.h, background: COLOR.surface2, overflow: "hidden", borderRadius: SHAPE.radius, clipPath: `inset(0 ${((1 - Math.min(1, Math.max(0, draw * d - i))) * 100).toFixed(2)}% 0 0 round ${SHAPE.radius}px)` }}>
            {i < n && <div style={{ position: "absolute", inset: 0, width: `${segFill * 100}%`, background: COLOR.highlight }} />}
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          left: content.left + filledW / 2,
          top: BAR.top + BAR.h + 32,
          transform: `translate(-50%, ${((1 - labelIn) * 24).toFixed(1)}px)`,
          opacity: labelIn,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div style={value("l", COLOR.highlight)}>{`${n} in ${d}`}</div>
      </div>
    </>
  );
};
