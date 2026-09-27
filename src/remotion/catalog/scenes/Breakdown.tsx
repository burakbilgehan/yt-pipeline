/**
 * breakdown: how a whole splits into 2 to 8 parts.
 *
 * bar: one bar across the content width, zero at the left margin and the whole (total, or the
 * sum of the parts) at the right margin, both ends marked. Segments are separated by a thin gap;
 * the part with role highlight is neutral until cue "highlight" (default: after the bar has
 * filled) and then turns highlight. When every label fits under its segment, labels sit there
 * (value over caption); otherwise a legend lists the parts under the bar.
 *
 * waffle: 100 cells (10 x 10), each part taking its share by largest remainder, the rest of the
 * total empty. The legend sits beside the grid.
 *
 * Shares in the legend are of the whole and are rounded; the drawn cells or lengths are exact.
 */
import React from "react";

import { COLOR, DUR, EASE, LAYOUT, MOTION, SHAPE, caption, value as valueStyle } from "../tokens";
import { progress, useFrame } from "../motion";
import { Layer, Snap } from "../ui";
import { SegLabel, formatNumber, segLabelWidth, segLabels } from "./common";

type Part = { label: string; value: number; role?: "highlight" | "contrast" };

export interface BreakdownProps {
  parts: Part[];
  total?: number;
  unit?: string;
  prefix?: string;
  decimals?: number;
  variant: "bar" | "waffle";
  highlightAt?: number;
}

const { content } = LAYOUT;
const WIDTH = content.right - content.left;
const BAR = { top: 440, h: 72, gap: 3 };
const FILL = 36;

export const Breakdown: React.FC<BreakdownProps> = (props) => (props.variant === "waffle" ? <Waffle {...props} /> : <BarBreakdown {...props} />);

function colorAt(p: Part, lit: boolean): string {
  if (p.role === "contrast") return COLOR.contrast;
  if (p.role === "highlight") return lit ? COLOR.highlight : COLOR.dataNeutral;
  return COLOR.dataNeutral;
}

/** A percent unit is written on the number itself; any other unit is named once, on the axis end. */
const formatter = (prefix: string, decimals: number, unit?: string) => (v: number) => `${prefix}${formatNumber(v, decimals)}${unit === "%" ? "%" : ""}`;

const BarBreakdown: React.FC<BreakdownProps> = ({ parts, total, unit, prefix = "", decimals = 0, highlightAt }) => {
  const frame = useFrame();
  const fmt = formatter(prefix, decimals, unit);
  const whole = total ?? parts.reduce((s, p) => s + p.value, 0);
  const px = (v: number) => (v / whole) * WIDTH;
  const lightAt = Math.max(highlightAt ?? FILL + 16, FILL);
  const lit = frame >= lightAt;
  const draw = progress(frame, 0, FILL, EASE.move);

  let x = 0;
  const segs = parts.map((p) => {
    const s = { p, x, w: px(p.value) };
    x += s.w;
    return s;
  });
  const items = segs.map((s) => ({ cx: content.left + s.x + s.w / 2, w: segLabelWidth(fmt(s.p.value), s.p.label) }));
  const fits = items.reduce((a, i) => a + i.w + 48, -48) <= WIDTH && segs.every((s, k) => Math.abs(segLabels(items)[k] + items[k].w / 2 - items[k].cx) < Math.max(s.w, 120));
  const labelsX = segLabels(items);
  const axisTop = BAR.top + BAR.h + 6;

  return (
    <Layer frame={frame} z={MOTION.z.measure} flat>
      <div style={{ position: "absolute", left: content.left, top: BAR.top, width: WIDTH * draw, height: BAR.h, overflow: "hidden", borderRadius: SHAPE.radius, background: COLOR.surface2 }}>
        {segs.map((s, k) => (
          <div
            key={k}
            style={{
              position: "absolute",
              left: s.x + (k > 0 ? BAR.gap / 2 : 0),
              top: 0,
              width: Math.max(0, s.w - (k > 0 ? BAR.gap / 2 : 0) - (k < segs.length - 1 ? BAR.gap / 2 : 0)),
              height: BAR.h,
              background: colorAt(s.p, lit),
            }}
          />
        ))}
      </div>
      <div style={{ position: "absolute", left: content.left, top: axisTop, width: WIDTH * draw, height: 1, background: COLOR.textTertiary, opacity: 0.6 }} />
      <div style={{ position: "absolute", left: content.left, top: axisTop + 18, ...caption("xs", COLOR.textTertiary), opacity: draw }}>0</div>
      {draw >= 1 && <div style={{ position: "absolute", right: LAYOUT.width - content.right, top: axisTop + 18, ...caption("xs", COLOR.textTertiary) }}>{`${fmt(whole)}${unit && unit !== "%" ? ` ${unit}` : ""}`}</div>}
      {fits
        ? segs.map((s, k) => (
            <Snap key={k} frame={frame} at={Math.round((FILL * (s.x + s.w / 2)) / WIDTH)} from={{ y: 40 }}>
              <SegLabel x={labelsX[k]} top={axisTop + 64} v={fmt(s.p.value)} text={s.p.label} color={s.p.role === "contrast" ? COLOR.contrast : s.p.role === "highlight" && lit ? COLOR.highlight : COLOR.textPrimary} />
            </Snap>
          ))
        : <Legend frame={frame} parts={parts} whole={whole} fmt={fmt} lit={lit} left={content.left} top={axisTop + 72} columns={2} share={unit !== "%"} />}
    </Layer>
  );
};

const Legend: React.FC<{ frame: number; parts: Part[]; whole: number; fmt: (v: number) => string; lit: boolean; left: number; top: number; columns: number; share: boolean }> = ({
  frame,
  parts,
  whole,
  fmt,
  lit,
  left,
  top,
  columns,
  share,
}) => {
  const rows = Math.ceil(parts.length / columns);
  const colW = columns === 1 ? 760 : WIDTH / columns;
  return (
    <>
      {parts.map((p, i) => {
        const c = Math.floor(i / rows);
        const r = i % rows;
        const color = colorAt(p, lit);
        const hot = p.role === "highlight" && lit;
        return (
          <Snap key={i} frame={frame} at={FILL / 2 + i * DUR.stagger} from={{ x: -40 }}>
            <div style={{ position: "absolute", left: left + c * colW, top: top + r * 76, width: colW - 48, height: 60, display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ width: 28, height: 28, borderRadius: SHAPE.radius, background: color, flex: "none" }} />
              <span style={{ ...caption("m", hot ? COLOR.highlight : COLOR.textSecondary), flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{p.label}</span>
              <span style={valueStyle("m", hot ? COLOR.highlight : COLOR.textPrimary)}>{fmt(p.value)}</span>
              {share && <span style={{ ...caption("xs", COLOR.textTertiary), width: 72, textAlign: "right" }}>{`${Math.round((100 * p.value) / whole)}%`}</span>}
            </div>
          </Snap>
        );
      })}
    </>
  );
};

/** Cells per part out of 100 by largest remainder, so they add up exactly to the rounded share of the whole. */
function allocate(parts: Part[], whole: number): number[] {
  const exact = parts.map((p) => (100 * p.value) / whole);
  const cells = exact.map(Math.floor);
  const target = Math.round(exact.reduce((a, b) => a + b, 0));
  const order = exact.map((e, i) => ({ i, r: e - Math.floor(e) })).sort((a, b) => b.r - a.r);
  for (let k = 0; cells.reduce((a, b) => a + b, 0) < target && k < order.length; k++) cells[order[k].i]++;
  return cells;
}

const Waffle: React.FC<BreakdownProps> = ({ parts, total, unit, prefix = "", decimals = 0, highlightAt }) => {
  const frame = useFrame();
  const fmt = formatter(prefix, decimals, unit);
  const whole = total ?? parts.reduce((s, p) => s + p.value, 0);
  const cells = allocate(parts, whole);
  const owner: number[] = [];
  cells.forEach((n, i) => {
    for (let k = 0; k < n; k++) owner.push(i);
  });
  const CELL = 60;
  const GAP = 10;
  const gridH = 10 * CELL + 9 * GAP;
  const top = content.top + (content.bottom - content.top - gridH) / 2;
  const lightAt = Math.max(highlightAt ?? FILL + 16, FILL);
  const lit = frame >= lightAt;
  return (
    <Layer frame={frame} z={MOTION.z.measure} flat>
      {Array.from({ length: 100 }, (_, k) => {
        const row = Math.floor(k / 10);
        const col = k % 10;
        const at = Math.round((k / 100) * FILL);
        const p = progress(frame, at, 6, EASE.hard);
        const o = owner[k];
        const color = o === undefined ? COLOR.surface2 : colorAt(parts[o], lit);
        return (
          <div
            key={k}
            style={{
              position: "absolute",
              left: content.left + col * (CELL + GAP),
              top: top + row * (CELL + GAP),
              width: CELL,
              height: CELL,
              borderRadius: SHAPE.radius,
              background: color,
              opacity: p,
              transform: `scale(${(0.6 + 0.4 * p).toFixed(3)})`,
            }}
          />
        );
      })}
      <div style={{ position: "absolute", left: content.left, top: top + gridH + 18, ...caption("xs", COLOR.textTertiary) }}>{"1 cell = 1% of the whole"}</div>
      <Legend frame={frame} parts={parts} whole={whole} fmt={fmt} lit={lit} left={content.left + 10 * (CELL + GAP) + 40} top={top} columns={1} share={unit !== "%"} />
    </Layer>
  );
};
