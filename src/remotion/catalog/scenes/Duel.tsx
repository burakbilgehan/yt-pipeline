/**
 * compare-values with two items and the delta on (the default): a before/after duel.
 * Left: the first value on a board of digit cells. Right: a zero-based measure with both bars.
 * The second bar starts at the first value's level and rises to the second, landing on cue
 * "second" (the phrase that names the second value); when it lands, every cell whose digit changes turns on its horizontal axis straight to the
 * new digit (never an intermediate number), the second value's labels appear, and the change
 * slams in on a highlight panel: percent as the giant figure, the signed difference beside it.
 *
 * Board: the two values are right-aligned; a position may hold a digit or blank in either value,
 * or the same separator in both. Otherwise (or over BOARD_MAX characters) the first figure
 * snaps out and the second snaps in instead of turning cells.
 */
import React from "react";
import { Easing, useCurrentFrame } from "remotion";
import { COLOR, DUR, EASE, LAYOUT, MOTION, SHAPE, TYPE, body, caption, giant, value as valueStyle } from "../tokens";
import { progress, ramp } from "../motion";
import { Layer, Panel, Snap } from "../ui";
import { MINUS, fitGiant, formatNumber, niceTicks } from "./common";
import type { BarItem } from "./Bars";

export interface DuelProps {
  items: BarItem[];
  unit?: string;
  prefix?: string;
  decimals?: number;
  reference?: { label: string; value: number };
  annotation?: { text: string; item?: string };
  /** Frame at which the second value lands. */
  secondAt?: number;
  annotationAt?: number;
}

const { content, margin } = LAYOUT;
const BOARD = { top: 186, h: 400, gap: 14, right: 1040, prefixGap: 24 };
const BOARD_MAX = 5;
const PLOT = { left: 1180, right: content.right, top: 180, y0: 930 };
const PANEL = { top: 660, h: 180 };

type Cell = { a: string; b: string; digit: boolean };

function boardCells(a: string, b: string): Cell[] | null {
  const n = Math.max(a.length, b.length);
  if (n > BOARD_MAX) return null;
  const pa = a.padStart(n, " ");
  const pb = b.padStart(n, " ");
  const cells: Cell[] = [];
  for (let i = 0; i < n; i++) {
    const ca = pa[i];
    const cb = pb[i];
    const da = ca === " " || /\d/.test(ca);
    const db = cb === " " || /\d/.test(cb);
    if (da && db) cells.push({ a: ca.trim(), b: cb.trim(), digit: true });
    else if (ca === cb) cells.push({ a: ca, b: cb, digit: false });
    else return null;
  }
  return cells;
}

export const Duel: React.FC<DuelProps> & { applies: (p: { items: unknown[]; showDelta?: boolean }) => boolean } = ({
  items,
  unit,
  prefix = "",
  decimals = 0,
  reference,
  annotation,
  secondAt,
  annotationAt,
}) => {
  const frame = useCurrentFrame();
  const [A, B] = items;
  const fmt = (v: number) => `${prefix}${formatNumber(v, decimals)}`;
  const lock = Math.max(secondAt ?? 80, 16 + DUR.rise);
  const reveal = lock - DUR.rise;
  const landed = frame >= lock + DUR.flip - 2;
  const pctAt = lock + 22;

  // Measure
  const scale = niceTicks(Math.max(A.value, B.value, reference?.value ?? 0), 6);
  const top = scale.ticks[scale.ticks.length - 1];
  const yOf = (v: number) => PLOT.y0 - (v / top) * (PLOT.y0 - PLOT.top);
  const plotW = PLOT.right - PLOT.left;
  const barW = Math.round(plotW * 0.31);
  const bx = [PLOT.left + Math.round(plotW * 0.14), PLOT.left + Math.round(plotW * 0.59)];
  const rise = ramp(frame, reveal + 4, lock, A.value, B.value, Easing.inOut(Easing.cubic));
  const peakIn = progress(frame, reveal, 8, EASE.hard);
  const bColor = B.highlight || !A.highlight ? COLOR.highlight : COLOR.dataNeutral;
  const aColor = A.highlight ? COLOR.highlight : A.contrast ? COLOR.contrast : COLOR.dataNeutral;

  // Change
  const d = B.value - A.value;
  const sign = d > 0 ? "+" : d < 0 ? MINUS : "";
  const pct = A.value > 0 ? Math.round((100 * Math.abs(d)) / A.value) : null;
  const deltaAbs = `${sign}${fmt(Math.abs(d))}${unit ? ` ${unit}` : ""}`;

  // Board
  const cells = boardCells(formatNumber(A.value, decimals), formatNumber(B.value, decimals));
  const prefixW = prefix ? Math.round(TYPE.giant.sizes.m * 0.62 * prefix.length) : 0;
  const boardLeft = margin + (prefix ? prefixW + BOARD.prefixGap : 0);
  const units = cells ? cells.reduce((s, c) => s + (c.digit ? 1 : 0.42), 0) : 0;
  const unitW = cells ? Math.min(250, (BOARD.right - boardLeft - (cells.length - 1) * BOARD.gap) / units) : 0;
  const digitPx = Math.min(TYPE.giant.sizes.l + 30, Math.round(unitW * 1.32));

  return (
    <>
      {/* The measure: zero-based, behind the board */}
      <Layer frame={frame} z={MOTION.z.measure} flat>
        <svg width={LAYOUT.width} height={LAYOUT.height} style={{ position: "absolute", inset: 0, opacity: progress(frame, 0, 8, EASE.settle) }}>
          {scale.ticks.map((v) => (
            <g key={v}>
              <line x1={PLOT.left} x2={PLOT.right} y1={yOf(v)} y2={yOf(v)} stroke={v === 0 ? COLOR.textTertiary : COLOR.grid} strokeWidth={v === 0 ? 1.5 : 1} opacity={v === 0 ? 0.9 : 0.7} />
              <text x={PLOT.left - 18} y={yOf(v) + 7} textAnchor="end" fontFamily={TYPE.caption.family} fontWeight={500} fontSize={TYPE.caption.sizes.xs} fill={COLOR.textTertiary} style={{ fontVariantNumeric: "tabular-nums" }}>
                {`${prefix}${formatNumber(v, scale.decimals)}`}
              </text>
            </g>
          ))}
          {reference && (
            <g>
              <line x1={PLOT.left} x2={PLOT.right} y1={yOf(reference.value)} y2={yOf(reference.value)} stroke={COLOR.textSecondary} strokeWidth={1} strokeDasharray="6 6" />
              <text x={PLOT.right} y={yOf(reference.value) - 10} textAnchor="end" fontFamily={TYPE.caption.family} fontWeight={500} fontSize={TYPE.caption.sizes.xs} letterSpacing="0.12em" fill={COLOR.textSecondary}>
                {`${reference.label} ${fmt(reference.value)}`.toUpperCase()}
              </text>
            </g>
          )}
          <path d={topRounded(bx[0], yOf(A.value), barW, PLOT.y0 - yOf(A.value))} fill={aColor} />
          <BarText x={bx[0] + barW / 2} y={yOf(A.value) - 18} text={fmt(A.value)} color={COLOR.textPrimary} />
          <CatText x={bx[0] + barW / 2} y={PLOT.y0 + 36} text={A.label} color={COLOR.textSecondary} />
          {peakIn > 0 && (
            <g opacity={peakIn}>
              <line x1={bx[0] + barW} x2={bx[1]} y1={yOf(A.value)} y2={yOf(A.value)} stroke={COLOR.textTertiary} strokeWidth={1} strokeDasharray="2 7" strokeLinecap="round" />
              <path d={topRounded(bx[1], yOf(rise), barW, PLOT.y0 - yOf(rise))} fill={bColor} />
              <CatText x={bx[1] + barW / 2} y={PLOT.y0 + 36} text={B.label} color={landed ? bColor : COLOR.textSecondary} />
            </g>
          )}
          {landed && <BarText x={bx[1] + barW / 2} y={yOf(B.value) - 18} text={fmt(B.value)} color={bColor} />}
        </svg>
      </Layer>

      {/* The board */}
      <Layer frame={frame} z={MOTION.z.figure}>
        <Snap frame={frame} at={0} from={{ x: -500 }}>
          {prefix && (
            <div style={{ position: "absolute", left: margin, top: BOARD.top, height: BOARD.h, display: "flex", alignItems: "center", ...giant("m", COLOR.textSecondary) }}>{prefix}</div>
          )}
          {cells ? (
            (() => {
              let x = boardLeft;
              return cells.map((c, i) => {
                const w = c.digit ? unitW : unitW * 0.42;
                const el = c.digit ? (
                  <DigitCell key={i} frame={frame} x={x} w={w} oldDigit={c.a} newDigit={c.b} flipAt={lock} px={digitPx} ink={bColor} />
                ) : (
                  <div key={i} style={{ position: "absolute", left: x, top: BOARD.top, width: w, height: BOARD.h, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: BOARD.h * 0.2, boxSizing: "border-box", ...giant(digitPx, landed ? bColor : COLOR.textPrimary) }}>
                    {c.a}
                  </div>
                );
                x += w + BOARD.gap;
                return el;
              });
            })()
          ) : (
            <SwapFigure frame={frame} at={lock} a={formatNumber(A.value, decimals)} b={formatNumber(B.value, decimals)} left={boardLeft} color={bColor} />
          )}
        </Snap>
      </Layer>

      {/* The change */}
      <Layer frame={frame} z={MOTION.z.panel}>
        <Snap frame={frame} at={pctAt} from={{ x: -1100 }}>
          <Panel x={margin} y={PANEL.top} w={900} h={PANEL.h} fill={COLOR.highlight} skew={SHAPE.panelSkewLarge}>
            <div style={{ ...giant(fitGiant(pct !== null ? `${sign}${pct}%` : deltaAbs, TYPE.giant.sizes.s, 560), COLOR.bg), position: "absolute", left: 64, top: 10 }}>{pct !== null ? `${sign}${pct}%` : deltaAbs}</div>
            {pct !== null && <div style={{ ...valueStyle("m", COLOR.bg), position: "absolute", right: 64 + SHAPE.panelSkewLarge / 2, bottom: 42 }}>{deltaAbs}</div>}
          </Panel>
        </Snap>
        {annotation && (
          <Snap frame={frame} at={Math.max(annotationAt ?? pctAt + 18, pctAt + 6)} from={{ y: 60 }}>
            <div style={{ position: "absolute", left: margin, top: PANEL.top + PANEL.h + 40, ...body("m", COLOR.textSecondary) }}>{annotation.text}</div>
          </Snap>
        )}
      </Layer>
    </>
  );
};
Duel.applies = (p) => p.items.length === 2 && p.showDelta !== false;

/** A vertical bar with its value end (top) rounded by SHAPE.radius; the baseline stays square. */
function topRounded(x: number, y: number, w: number, h: number): string {
  const r = Math.min(SHAPE.radius, h, w / 2);
  return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`;
}

const BarText: React.FC<{ x: number; y: number; text: string; color: string }> = ({ x, y, text, color }) => (
  <text x={x} y={y} textAnchor="middle" fontFamily={TYPE.value.family} fontWeight={TYPE.value.weight} fontSize={TYPE.value.sizes.m} letterSpacing="-0.03em" fill={color} style={{ fontVariantNumeric: "tabular-nums" }}>
    {text}
  </text>
);

const CatText: React.FC<{ x: number; y: number; text: string; color: string }> = ({ x, y, text, color }) => (
  <text x={x} y={y} textAnchor="middle" fontFamily={TYPE.caption.family} fontWeight={TYPE.caption.weight} fontSize={TYPE.caption.sizes.xs} letterSpacing="0.12em" fill={color}>
    {text.toUpperCase()}
  </text>
);

/**
 * One digit cell: a slab that turns around its horizontal axis from the old digit to the new one.
 * The housing stays put so the board never reads empty while the slab is edge-on. A blank old
 * digit is an unlit cell. Unchanged digits do not turn.
 */
const DigitCell: React.FC<{ frame: number; x: number; w: number; oldDigit: string; newDigit: string; flipAt: number; px: number; ink: string }> = ({
  frame,
  x,
  w,
  oldDigit,
  newDigit,
  flipAt,
  px,
  ink,
}) => {
  const ease = Easing.inOut(Easing.cubic);
  const turns = oldDigit !== newDigit;
  const t = turns ? ramp(frame, flipAt, flipAt + DUR.flip, 0, 1, ease) : frame >= flipAt ? 1 : 0;
  const tPrev = turns ? ramp(frame - 1, flipAt, flipAt + DUR.flip, 0, 1, ease) : t;
  const a = turns ? 180 * t : 0;
  const speed = Math.abs(180 * (t - tPrev));
  const front = !turns ? t < 1 : a < 90;
  const rot = !turns ? 0 : front ? -a : 180 - a;
  const blur = speed < 6 ? undefined : speed < 14 ? "url(#cat-blur-y1)" : speed < 24 ? "url(#cat-blur-y2)" : "url(#cat-blur-y3)";
  const digit = front ? oldDigit : newDigit;
  const color = front ? COLOR.textPrimary : ink;
  return (
    <div style={{ position: "absolute", left: x, top: BOARD.top, width: w, height: BOARD.h, perspective: 1600 }}>
      <Panel x={0} y={0} w={w} h={BOARD.h} fill={COLOR.surface} skew={16}>
        <div />
      </Panel>
      <div style={{ position: "absolute", inset: 0, transform: `rotateX(${rot.toFixed(2)}deg)`, transformOrigin: "50% 50%", filter: blur }}>
        <Panel x={0} y={0} w={w} h={BOARD.h} fill={COLOR.surface2} skew={16}>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", ...giant(px, color), letterSpacing: "0" }}>{digit}</div>
        </Panel>
      </div>
    </div>
  );
};

/** Fallback when the two figures do not share a board: the first leaves upward, the second slams in. */
const SwapFigure: React.FC<{ frame: number; at: number; a: string; b: string; left: number; color: string }> = ({ frame, at, a, b, left, color }) => {
  const px = fitGiant(a.length > b.length ? a : b, TYPE.giant.sizes.l, BOARD.right - left);
  const y = BOARD.top + (BOARD.h - px) / 2;
  return (
    <>
      <Snap frame={frame} at={0} from={{}} out={{ at: at - DUR.snapOut + 1, y: -240 }}>
        <div style={{ position: "absolute", left, top: y, ...giant(px, COLOR.textPrimary) }}>{a}</div>
      </Snap>
      <Snap frame={frame} at={at} from={{ x: 700 }}>
        <div style={{ position: "absolute", left, top: y, ...giant(px, color) }}>{b}</div>
      </Snap>
    </>
  );
};
