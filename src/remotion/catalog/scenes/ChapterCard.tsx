/**
 * chapter-card: the opening of a section. The chapter number as a giant highlight numeral at the
 * left margin, the title in giant type in the column beside it, bottom-aligned to the numeral.
 * The stage turns into it (it is always the first scene of a section), so it enters without a push:
 * the numeral snaps in from the left, the title's words snap up after it.
 */
import React from "react";

import { COLOR, DUR, LAYOUT, MOTION, TYPE, caption, giant } from "../tokens";
import { blurFor, overshoot, progress, useFrame } from "../motion";
import { Layer, Snap } from "../ui";
import { giantInkOffset, giantWidth } from "./common";

export interface ChapterCardProps {
  number: number;
  title: string;
}

const { content } = LAYOUT;
const GAP = 72;

export const ChapterCard: React.FC<ChapterCardProps> = ({ number, title }) => {
  const frame = useFrame();
  const num = String(number).padStart(2, "0");
  const size = TYPE.giant.sizes.xl;
  const numW = giantWidth(num, size);
  const top = content.top + (content.bottom - content.top - size) / 2;
  const titleSize = title.length > 24 ? TYPE.giant.sizes.statement : TYPE.giant.sizes.statementLarge;
  const words = title.split(" ");
  const titleAt = 8;
  return (
    <Layer frame={frame} z={MOTION.z.figure}>
      <Snap frame={frame} at={0} from={{ x: -600 }}>
        <div style={{ position: "absolute", left: content.left + giantInkOffset(num, size), top, ...giant(size, COLOR.highlight) }}>{num}</div>
      </Snap>
      <div
        style={{
          position: "absolute",
          left: content.left + numW + GAP,
          right: LAYOUT.width - content.right,
          top,
          height: size * 0.88,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
        }}
      >
        <div style={{ ...caption("s", COLOR.textTertiary), marginBottom: 24, opacity: progress(frame, titleAt, DUR.snap) }}>Chapter</div>
        <div style={{ ...giant(titleSize), whiteSpace: "normal", lineHeight: 1.04 }}>
          {words.map((w, i) => {
            const at = titleAt + i * DUR.stagger;
            if (frame < at) return null;
            const y = (f: number) => MOTION.itemIn * (1 - overshoot((f - at) / DUR.snap));
            const filter = frame === at ? blurFor(0, MOTION.itemIn) : blurFor(0, y(frame) - y(frame - 1));
            return (
              <span key={i} style={{ display: "inline-block", whiteSpace: "pre", transform: `translateY(${y(frame).toFixed(1)}px)`, filter }}>
                {w}
                {i < words.length - 1 ? " " : ""}
              </span>
            );
          })}
        </div>
      </div>
    </Layer>
  );
};
