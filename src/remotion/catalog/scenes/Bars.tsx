/**
 * compare-values (2..4 items, when not a duel) and ranked-bars (5..12 items) share one bar
 * grammar: label left (rank inline for ranked), bar from a fixed origin, value right of the
 * bar end. Labels are captions, values are value type. The block fills the content height
 * (row height capped) and sits on its vertical middle.
 *
 * Rows snap in from the left with overshoot and motion blur, staggered; each bar grows with
 * the hard ease as its row lands.
 *
 * Scale: niceTicks on max(values, reference); bars are scaled to the top tick, so they stay
 * zero-based and exactly proportional (no minimum width). Faint gridlines at each tick fade in
 * before the first bar grows; tick labels sit under the block, the unit (when short) once on
 * the last tick. When max/min > 40 (compare-values) a line states the ratio so a 1 px sliver
 * still reads.
 *
 * The aside (LAYOUT.aside) holds the annotation when its anchored bar ends left of it.
 */
import React from "react";

import { COLOR, DUR, EASE, LAYOUT, MOTION, SHAPE, TYPE, body, caption, staggerDelay, value as valueStyle } from "../tokens";
import { blurFor, overshoot, useFrame } from "../motion";
import { MINUS, formatNumber, niceTicks, progress } from "./common";

export interface BarItem {
  label: string;
  value: number;
  highlight?: boolean;
  contrast?: boolean;
}

export interface BarsProps {
  items: BarItem[];
  unit?: string;
  prefix?: string;
  decimals?: number;
  ranked?: boolean;
  reference?: { label: string; value: number };
  annotation?: { text: string; item?: string };
  /** Scene-relative frame at which the annotation lands (cue "annotation"). */
  annotationAt?: number;
  showDelta?: boolean;
}

const ORIGIN_X = 520;
const MAX_BAR = 1080;
/** Gridlines fade in over frames 0..GRID_IN while the first row snaps in. */
const GRID_IN = 2;
/** Minimum free width for an inline annotation caption right of a value label. */
const INLINE_MIN = 200;

/** Height the block may fill, and the row height cap. */
const BLOCK_H = 640;
const ROW_MAX = 120;

type LabelSize = "l" | "m" | "xs";
type ValueSize = "l" | "m" | "s";
function sizesFor(n: number): { label: LabelSize; value: ValueSize } {
  if (n <= 4) return { label: "l", value: "l" };
  if (n <= 7) return { label: "l", value: "m" };
  if (n <= 10) return { label: "m", value: "s" };
  return { label: "xs", value: "s" };
}

/** Annotation text: body m. */
const NOTE_PX = TYPE.body.sizes.m;
const NOTE_LINE = NOTE_PX * TYPE.body.lineHeight;

/**
 * Conservative width estimate of a short label in Inter at `px` (tabular digits).
 * Used only to decide placements and to reserve room; drawing uses real layout.
 */
function approxWidth(text: string, px: number): number {
  let em = 0;
  for (const ch of text) {
    if (/[0-9$+−-]/.test(ch)) em += 0.64;
    else if (/[.,:;'’ ]/.test(ch)) em += 0.3;
    else if (ch === "%") em += 0.86;
    else if (/[A-Z]/.test(ch)) em += 0.7;
    else em += 0.58;
  }
  return em * px;
}

export const Bars: React.FC<BarsProps> = ({ items, unit, prefix = "", decimals = 0, ranked = false, reference, annotation, annotationAt }) => {
  const frame = useFrame();
  const { content, aside } = LAYOUT;
  const sorted = ranked ? [...items].sort((a, b) => b.value - a.value) : items;
  const n = sorted.length;
  const max = Math.max(...sorted.map((i) => i.value));
  const min = Math.min(...sorted.map((i) => i.value));
  const gap = ranked ? 16 : 24;
  const h = Math.min(ROW_MAX, Math.floor((BLOCK_H - (n - 1) * gap) / n));
  const total = n * h + (n - 1) * gap;
  const { label: labelSize, value: valueSize } = sizesFor(n);
  const labelPx = TYPE.value.sizes[valueSize];
  // Middle of the content area, leaving room for the tick labels under the block.
  const top = Math.round(content.top + (content.bottom - content.top - 56 - total) / 2);
  const fmt = (v: number) => `${prefix}${formatNumber(v, decimals)}`;


  // Scale.
  const scale = niceTicks(Math.max(max, reference?.value ?? 0), 5);
  const topTick = scale.ticks[scale.ticks.length - 1];
  const plotW = MAX_BAR;
  const ppu = plotW / topTick;
  const xOf = (v: number) => ORIGIN_X + v * ppu;

  const rowY = (i: number) => top + i * (h + gap);
  const delayOf = (i: number) => staggerDelay(i, n);
  const landOf = (i: number) => delayOf(i) + DUR.barGrow;
  const allLanded = landOf(n - 1);
  const gridIn = progress(frame, 0, GRID_IN, EASE.settle);
  const bottom = top + total;

  // Annotation: anchored to its item's bar end (default the highlighted item).
  const anchorIndex = (() => {
    if (!annotation) return -1;
    const byLabel = annotation.item ? sorted.findIndex((i) => i.label === annotation.item) : -1;
    return byLabel >= 0 ? byLabel : sorted.findIndex((i) => i.highlight);
  })();
  // Placement, first that fits without touching another mark:
  //   aside:  anchored bar (with its value label) ends left of the aside;
  //   inline: caption right of the value label, at least INLINE_MIN px wide;
  //   above:  caption right-aligned to a rule rising from the bar end, in the gap above the row
  //           (needs clearance from the row above and from the reference caption).
  // Otherwise there is no collision-free place and it is not drawn.
  // Each placement also yields its knockout rect for the gridlines.
  type Knock = { x0: number; x1: number; y0: number; y1: number; p: number };
  type Note = { mode: "aside" | "inline" | "above"; i: number; p: number; right: number; capTop: number; knock: Knock };
  let note: Note | null = null;
  if (annotation && anchorIndex >= 0) {
    const i = anchorIndex;
    const item = sorted[i];
    const x = xOf(item.value);
    const valueEnd = x + 16 + approxWidth(fmt(item.value), labelPx);
    const at = Math.max(annotationAt ?? allLanded + 6, landOf(i));
    const p = progress(frame, at, DUR.snap, EASE.settle);
    const textW = approxWidth(annotation.text, NOTE_PX);
    const lineH = NOTE_LINE;
    const mid = rowY(i) + h / 2;
    const midKnock = (x0: number, avail: number): Knock => {
      const half = (Math.max(1, Math.ceil(textW / avail)) * lineH) / 2 + 6;
      return { x0: x0 - 10, x1: x0 + Math.min(textW, avail) + 10, y0: mid - half, y1: mid + half, p };
    };
    const inlineRight = content.right;
    const inlineX = valueEnd + 24 + 13;
    // Above: caption bottom 4 px over the bar top; the rule rises from the bar top to the caption top.
    const barTop = rowY(i) + h * 0.15;
    const capTop = barTop - 4 - lineH;
    const capLeft = x - 12 - textW;
    const aboveClear = (() => {
      if (capLeft < content.left) return false;
      if (i > 0) {
        const prev = sorted[i - 1];
        const prevEnd = xOf(prev.value) + 16 + approxWidth(fmt(prev.value), labelPx);
        const prevBarBottom = rowY(i - 1) + h * 0.85;
        if (prevEnd > capLeft - 8 && capTop - prevBarBottom < 8) return false;
      } else if (reference) {
        const rx = xOf(reference.value);
        const refLeft = rx - approxWidth(`${reference.label} ${fmt(reference.value)}`.toUpperCase(), TYPE.caption.sizes.xs) * 1.15;
        if (rx + 8 > capLeft && refLeft - 8 < x) return false;
      }
      return true;
    })();
    if (valueEnd + 48 <= aside.left) {
      note = { mode: "aside", i, p, right: aside.right, capTop, knock: midKnock(aside.left, aside.right - aside.left) };
    } else if (inlineRight - inlineX >= INLINE_MIN) {
      note = { mode: "inline", i, p, right: inlineRight, capTop, knock: midKnock(inlineX, inlineRight - inlineX) };
    } else if (aboveClear) {
      note = { mode: "above", i, p, right: x - 12, capTop, knock: { x0: capLeft - 10, x1: x + 2, y0: capTop - 4, y1: barTop, p } };
    }
  }

  // Behind text (value labels, the annotation caption) gridlines and the reference rule fade out:
  // a knockout, not a plate. Each rect fades in with its text.
  const valueKnocks: Knock[] = sorted.map((item, i) => {
    const x = xOf(item.value) + 16;
    return { x0: x - 8, x1: x + approxWidth(fmt(item.value), labelPx) + 8, y0: rowY(i) + h * 0.15, y1: rowY(i) + h * 0.85, p: progress(frame, landOf(i) - 6, 6, EASE.linear) };
  });
  const noteKnock = note ? note.knock : null;
  const knocks = noteKnock ? [...valueKnocks, noteKnock] : valueKnocks;
  const vline = (key: string, v: number, color: string, opacity: number) => {
    const x = Math.round(xOf(v));
    const hits = knocks.filter((k) => x >= k.x0 && x <= k.x1).sort((a, b) => a.y0 - b.y0);
    const segs: React.ReactNode[] = [];
    let y = top - 8;
    hits.forEach((k, j) => {
      const a = Math.max(y, k.y0);
      if (a > y) segs.push(<div key={`${key}-${j}a`} style={{ position: "absolute", left: x, top: y, width: 1, height: a - y, background: color, opacity }} />);
      if (k.y1 > a) segs.push(<div key={`${key}-${j}b`} style={{ position: "absolute", left: x, top: a, width: 1, height: k.y1 - a, background: color, opacity: opacity * (1 - k.p) }} />);
      y = Math.max(y, k.y1);
    });
    if (bottom + 8 > y) segs.push(<div key={`${key}-end`} style={{ position: "absolute", left: x, top: y, width: 1, height: bottom + 8 - y, background: color, opacity }} />);
    return segs;
  };


  return (
    <>
      {/* Gridlines behind the bars, one per tick except zero. */}
      {scale.ticks.slice(1).map((t) => vline(`g${t}`, t, COLOR.grid, gridIn))}

      {/* Optional reference: a thin rule at the value, its caption above the block, right-aligned to the rule. */}
      {reference && (
        <>
          {vline("ref", reference.value, COLOR.textTertiary, gridIn)}
          <div
            style={{
              ...caption("xs", COLOR.textSecondary),
              position: "absolute",
              right: LAYOUT.width - Math.round(xOf(reference.value)) - 1,
              top: top - 8 - 40,
              whiteSpace: "nowrap",
              opacity: gridIn,
            }}
          >
            {reference.label} {fmt(reference.value)}
          </div>
        </>
      )}

      {sorted.map((item, i) => {
        const delay = delayOf(i);
        const grow = progress(frame, delay, DUR.barGrow, EASE.hard);
        const count = progress(frame, delay, DUR.barGrow, EASE.count);
        if (frame < delay) return null;
        const dx = (f: number) => -MOTION.itemIn * (1 - overshoot((f - delay) / DUR.snap));
        const filter = frame === delay ? blurFor(MOTION.itemIn, 0) : blurFor(dx(frame) - dx(frame - 1), 0);
        const color = item.highlight ? COLOR.highlight : item.contrast ? COLOR.contrast : COLOR.dataNeutral;
        const width = item.value * ppu * grow;
        const textColor = item.highlight ? COLOR.textPrimary : COLOR.textSecondary;
        return (
          <div
            key={item.label}
            style={{ position: "absolute", left: 0, top: rowY(i), height: h, width: LAYOUT.width, transform: `translateX(${dx(frame).toFixed(1)}px)`, filter }}
          >
            <div
              style={{
                position: "absolute",
                left: content.left,
                width: ORIGIN_X - content.left - 24,
                top: 0,
                height: h,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, textAlign: "right" }}>
                {ranked && <span style={caption("xs", COLOR.textTertiary)}>{i + 1}</span>}
                <span style={caption(labelSize, item.highlight ? COLOR.highlight : textColor)}>{item.label}</span>
              </div>
            </div>
            <div style={{ position: "absolute", left: ORIGIN_X, top: h * 0.15, width, height: h * 0.7, background: color, borderRadius: `0 ${SHAPE.radius}px ${SHAPE.radius}px 0` }} />
            <div style={{ ...valueStyle(valueSize, item.highlight ? COLOR.highlight : textColor), position: "absolute", left: ORIGIN_X + width + 16, top: 0, height: h, display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>
              {prefix}
              {formatNumber(item.value * count, decimals)}
            </div>
          </div>
        );
      })}

      {/* Zero line, heavier than the gridlines. */}
      <div style={{ position: "absolute", left: ORIGIN_X, top: top - 8, width: 2, height: total + 16, background: COLOR.textTertiary, opacity: gridIn }} />

      {/* Tick labels under the block; the short unit once, on the last tick. */}
      {scale.ticks.map((t, k) => {
        const last = k === scale.ticks.length - 1;
        return (
          <div
            key={`t${t}`}
            style={{
              ...caption("xs", COLOR.textTertiary),
              position: "absolute",
              left: Math.round(xOf(t)) + (k === 0 ? 1 : 0),
              top: bottom + 16,
              transform: "translateX(-50%)",
              whiteSpace: "nowrap",
              opacity: gridIn,
            }}
          >
            {formatNumber(t, scale.decimals)}
            {last && unit && unit.length <= 6 && <span style={{ position: "absolute", left: "100%", marginLeft: 8 }}>{unit}</span>}
          </div>
        );
      })}

      {!ranked && max / min > 40 && (
        <div style={{ ...body("m", COLOR.textSecondary), position: "absolute", left: ORIGIN_X, top: bottom + 72, opacity: progress(frame, allLanded + 12, DUR.snap, EASE.settle) }}>
          {formatNumber(max / min, 0)} times larger
        </div>
      )}

      {note && (
        <Annotation
          mode={note.mode}
          text={annotation!.text}
          valueText={fmt(sorted[note.i].value)}
          valueSize={valueSize}
          x={xOf(sorted[note.i].value)}
          rowTop={rowY(note.i)}
          h={h}
          p={note.p}
          right={note.right}
          capTop={note.capTop}
        />
      )}
    </>
  );
};

/**
 * One anchored caption. aside: a 1 px leader continues the row past its value label
 * to the aside, where the caption sits on the row's centre line. inline: a short
 * 1 px rule after the value label, the caption right of it. above: a 1 px rule rises
 * from the bar end, the caption right-aligned to it just over the bar. All enter over
 * DUR.snap, snapping in from the right; leaders draw from the bar side.
 */
const Annotation: React.FC<{
  mode: "aside" | "inline" | "above";
  text: string;
  valueText: string;
  valueSize: ValueSize;
  x: number;
  rowTop: number;
  h: number;
  p: number;
  /** Right bound of an inline caption; for "above", the caption's right edge. */
  right: number;
  /** Caption top for "above". */
  capTop: number;
}> = ({ mode, text, valueText, valueSize, x, rowTop, h, p, right, capTop }) => {
  const { aside } = LAYOUT;
  const mid = rowTop + h / 2;
  // Snaps in from the right with overshoot (p is the settle progress of the note).
  const dx = MOTION.itemIn * (1 - overshoot(p * 1.4));
  const note: React.CSSProperties = { ...body("m", COLOR.textPrimary), opacity: p > 0 ? 1 : 0, transform: `translateX(${dx.toFixed(1)}px)` };
  // An invisible copy of the value label reserves its exact width, so the leader starts where the label ends.
  const ghost = <span style={{ ...valueStyle(valueSize), visibility: "hidden", whiteSpace: "nowrap" }}>{valueText}</span>;
  if (mode === "above") {
    const barTop = rowTop + h * 0.15;
    return (
      <>
        <div style={{ position: "absolute", left: x - 1, top: capTop, width: 1, height: barTop - capTop, background: COLOR.textTertiary, opacity: p, transform: `scaleY(${p})`, transformOrigin: "center bottom" }} />
        <div style={{ ...note, position: "absolute", right: LAYOUT.width - right, top: capTop, whiteSpace: "nowrap" }}>{text}</div>
      </>
    );
  }
  if (mode === "aside") {
    return (
      <>
        <div style={{ position: "absolute", left: x + 16, width: aside.left - 16 - (x + 16), top: rowTop, height: h, display: "flex", alignItems: "center" }}>
          {ghost}
          <div style={{ flex: 1, marginLeft: 16, height: 1, background: COLOR.textTertiary, transform: `scaleX(${p})`, transformOrigin: "left center" }} />
        </div>
        <div style={{ position: "absolute", left: aside.left, width: aside.right - aside.left, top: mid, transform: "translateY(-50%)" }}>
          <div style={{ ...note, whiteSpace: "normal" }}>{text}</div>
        </div>
      </>
    );
  }
  return (
    <div style={{ position: "absolute", left: x + 16, right: LAYOUT.width - right, top: rowTop, height: h, display: "flex", alignItems: "center" }}>
      {ghost}
      <div style={{ width: 1, height: h * 0.7, marginLeft: 24, background: COLOR.textTertiary, opacity: p, transform: `scaleY(${p})` }} />
      <div style={{ ...note, whiteSpace: "normal", marginLeft: 12, flex: 1, minWidth: 0 }}>{text}</div>
    </div>
  );
};
