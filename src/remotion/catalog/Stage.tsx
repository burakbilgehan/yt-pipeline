/**
 * The persistent stage chrome: header caption (kicker and title) at top left, the status chip at
 * top right, the source line at bottom left. Rendered once for the whole video, outside scene
 * sequences, and inside the turning face so it turns with the scene.
 *
 * A value that changes at a scene boundary swaps: inside a section the old one is gone before
 * the incoming scene appears and the new one settles in with it; at a section boundary
 * it switches on the frame the stage is edge-on, so the back of the turn already carries it.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLOR, DUR, EASE, LAYOUT, MOTION, caption } from "./tokens";
import { progress } from "./motion";
import { Chip, type ChipTone } from "./ui";

export interface StageSlot {
  from: number;
  /** The stage turns into this slot (first scene of a section); no swap animation. */
  turn: boolean;
  kicker?: string;
  title: string;
  source?: string;
  status?: { text: string; tone: ChipTone };
}

const Swap: React.FC<{ slots: StageSlot[]; keyOf: (s: StageSlot) => string; pick: (s: StageSlot) => React.ReactNode }> = ({ slots, keyOf, pick }) => {
  const frame = useCurrentFrame();
  let i = -1;
  slots.forEach((s, idx) => {
    if (s.from <= frame) i = idx;
  });
  if (i < 0) i = 0;
  const cur = slots[i];
  const prev = i > 0 ? slots[i - 1] : undefined;
  const same = !!prev && keyOf(prev) === keyOf(cur);
  if (!prev || same || cur.turn) {
    // First slot settles in; an unchanged value stays; a turn switches while edge-on.
    const t = !prev ? progress(frame, cur.from, DUR.header, EASE.settle) : 1;
    return <div style={{ position: "absolute", inset: 0, opacity: t, transform: `translateY(${((1 - t) * 10).toFixed(1)}px)` }}>{pick(cur)}</div>;
  }
  // The old value is gone by the time the incoming scene appears (MOTION.sceneEnterDelay).
  const out = progress(frame, cur.from, MOTION.sceneEnterDelay + 1, EASE.linear);
  const inn = progress(frame, cur.from + MOTION.sceneEnterDelay, DUR.header, EASE.settle);
  return (
    <>
      {out < 1 && <div style={{ position: "absolute", inset: 0, opacity: 1 - out, transform: `translateY(${(-10 * out).toFixed(1)}px)` }}>{pick(prev)}</div>}
      <div style={{ position: "absolute", inset: 0, opacity: inn, transform: `translateY(${((1 - inn) * 10).toFixed(1)}px)` }}>{pick(cur)}</div>
    </>
  );
};

export function headerText(s: Pick<StageSlot, "kicker" | "title">): string {
  return s.kicker && s.kicker !== s.title ? `${s.kicker} · ${s.title}` : s.title;
}

export const Stage: React.FC<{ slots: StageSlot[] }> = ({ slots }) => {
  const { margin, header, chip, source, width } = LAYOUT;
  return (
    <AbsoluteFill>
      <Swap
        slots={slots}
        keyOf={headerText}
        pick={(s) => <div style={{ position: "absolute", left: margin, top: header.top, ...caption("s", COLOR.textTertiary) }}>{headerText(s)}</div>}
      />
      <Swap
        slots={slots}
        keyOf={(s) => (s.status ? `${s.status.tone}|${s.status.text}` : "")}
        pick={(s) => (s.status ? <Chip right={width - margin} top={chip.top} text={s.status.text} tone={s.status.tone} /> : null)}
      />
      <Swap
        slots={slots}
        keyOf={(s) => s.source ?? ""}
        pick={(s) => (s.source ? <div style={{ position: "absolute", left: margin, top: source.top, ...caption("xs", COLOR.textTertiary) }}>{`Source: ${s.source}`}</div> : null)}
      />
    </AbsoluteFill>
  );
};
