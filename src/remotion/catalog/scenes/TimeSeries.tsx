/**
 * time-series: 1 to 4 lines over time. Straight segments through the real points (never smoothed).
 *
 * Scale: y from 0 unless yMin is set (or the data goes below 0), rounded out to nice steps; a y
 * axis that does not start at 0 says so under the plot. x: numeric x values are placed linearly,
 * string x values by their index (every series is expected to share the x list of the first).
 * Lines draw in one after another (neutral first, highlight last so it sits on top), each ending
 * in a dot with its value and label beside it; end labels are pushed apart so they never touch.
 * indexLine: a dashed reference rule with its value. annotations: a vertical rule at an x with a
 * caption above the plot, landing on cues annotation1..3 (default: after the lines have drawn).
 */
import React from "react";
import { useCurrentFrame } from "remotion";
import { COLOR, DUR, EASE, LAYOUT, MOTION, TYPE, caption, value as valueStyle } from "../tokens";
import { progress } from "../motion";
import { Layer, Snap } from "../ui";
import { formatNumber, niceTicks } from "./common";

type Pt = { x: number | string; y: number };
type Series = { label: string; role: "highlight" | "contrast" | "neutral"; points: Pt[] };

export interface TimeSeriesProps {
  series: Series[];
  unit?: string;
  prefix?: string;
  decimals?: number;
  yMin?: number;
  yMax?: number;
  indexLine?: number;
  annotations?: Array<{ x: number | string; text: string }>;
  annotationAt?: Array<number | undefined>;
}

const { content } = LAYOUT;
const PLOT = { left: content.left + 96, right: content.right - 348, top: content.top + 72, bottom: content.bottom - 72 };
const END_GAP = 68;
const DRAW = 40;

function niceRange(lo: number, hi: number): { lo: number; hi: number; step: number; decimals: number } {
  const { step, decimals } = niceTicks(Math.max(hi - lo, 1e-9), 5);
  const a = Math.floor(lo / step + 1e-9) * step;
  const b = Math.ceil(hi / step - 1e-9) * step;
  return { lo: a, hi: b === a ? a + step : b, step, decimals };
}

export const TimeSeries: React.FC<TimeSeriesProps> = ({ series, unit, prefix = "", decimals = 0, yMin, yMax, indexLine, annotations = [], annotationAt = [] }) => {
  const frame = useCurrentFrame();
  const fmt = (v: number) => `${v < 0 ? "−" : ""}${prefix}${formatNumber(Math.abs(v), decimals)}`;
  const all = series.flatMap((s) => s.points);
  const ys = all.map((p) => p.y).concat(indexLine !== undefined ? [indexLine] : []);
  const dataMin = Math.min(...ys);
  const range = niceRange(yMin ?? Math.min(0, dataMin), yMax ?? Math.max(...ys));
  const cropped = range.lo > 0;
  const yOf = (v: number) => PLOT.bottom - ((v - range.lo) / (range.hi - range.lo)) * (PLOT.bottom - PLOT.top);

  const numericX = all.every((p) => typeof p.x === "number");
  const xs = numericX ? (all.map((p) => p.x) as number[]) : [];
  const xMin = numericX ? Math.min(...xs) : 0;
  const xMax = numericX ? Math.max(...xs) : Math.max(...series.map((s) => s.points.length - 1));
  const xKeys = series[0].points.map((p) => p.x);
  const xPos = (x: number | string, i: number) => {
    const t = numericX ? ((x as number) - xMin) / Math.max(xMax - xMin, 1e-9) : i / Math.max(xMax, 1);
    return PLOT.left + t * (PLOT.right - PLOT.left);
  };
  const xOfKey = (x: number | string) => {
    if (numericX && typeof x === "number") return xPos(x, 0);
    const i = xKeys.findIndex((k) => String(k) === String(x));
    return i >= 0 ? xPos(xKeys[i], i) : null;
  };

  const order = [...series].sort((a, b) => rank(a.role) - rank(b.role));
  const drawAt = (k: number) => 4 + k * 12;
  const drawn = drawAt(order.length - 1) + DRAW;

  // End labels: at each line's last point, pushed apart vertically.
  const ends = order
    .map((s) => {
      const last = s.points[s.points.length - 1];
      return { s, x: xPos(last.x, s.points.length - 1), y: yOf(last.y), v: last.y };
    })
    .sort((a, b) => a.y - b.y);
  for (let k = 1; k < ends.length; k++) ends[k].y = Math.max(ends[k].y, ends[k - 1].y + END_GAP);

  const ticks: number[] = [];
  for (let v = range.lo; v <= range.hi + range.step / 2; v += range.step) ticks.push(+v.toFixed(6));
  const xLabelIdx = (() => {
    const n = xKeys.length;
    const want = Math.min(n, 6);
    return Array.from(new Set(Array.from({ length: want }, (_, i) => Math.round((i * (n - 1)) / Math.max(want - 1, 1)))));
  })();
  const gridIn = progress(frame, 0, 8, EASE.settle);

  return (
    <>
      <Layer frame={frame} z={MOTION.z.measure} flat>
        <svg width={LAYOUT.width} height={LAYOUT.height} style={{ position: "absolute", inset: 0, opacity: gridIn }}>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={PLOT.left} x2={PLOT.right} y1={yOf(v)} y2={yOf(v)} stroke={v === 0 ? COLOR.textTertiary : COLOR.grid} strokeWidth={v === 0 ? 1.5 : 1} />
              <text x={PLOT.left - 18} y={yOf(v) + 7} textAnchor="end" fontFamily={TYPE.caption.family} fontWeight={500} fontSize={TYPE.caption.sizes.xs} fill={COLOR.textTertiary} style={{ fontVariantNumeric: "tabular-nums" }}>
                {`${v < 0 ? "−" : ""}${prefix}${formatNumber(Math.abs(v), range.decimals)}`}
              </text>
            </g>
          ))}
          {xLabelIdx.map((i) => (
            <text key={i} x={xPos(xKeys[i], i)} y={PLOT.bottom + 40} textAnchor="middle" fontFamily={TYPE.caption.family} fontWeight={500} fontSize={TYPE.caption.sizes.xs} letterSpacing="0.12em" fill={COLOR.textTertiary}>
              {String(xKeys[i]).toUpperCase()}
            </text>
          ))}
          {unit && (
            <text x={PLOT.left - 18} y={PLOT.top - 28} textAnchor="start" fontFamily={TYPE.caption.family} fontWeight={500} fontSize={TYPE.caption.sizes.xs} letterSpacing="0.12em" fill={COLOR.textTertiary}>
              {unit.toUpperCase()}
            </text>
          )}
          {cropped && (
            <text x={PLOT.left - 18} y={PLOT.bottom + 80} fontFamily={TYPE.caption.family} fontWeight={500} fontSize={TYPE.caption.sizes.xs} letterSpacing="0.12em" fill={COLOR.textSecondary}>
              {"AXIS DOES NOT START AT 0"}
            </text>
          )}
          {indexLine !== undefined && (
            <g>
              <line x1={PLOT.left} x2={PLOT.right} y1={yOf(indexLine)} y2={yOf(indexLine)} stroke={COLOR.textSecondary} strokeWidth={1.5} strokeDasharray="6 6" />
              <text x={PLOT.right} y={yOf(indexLine) - 10} textAnchor="end" fontFamily={TYPE.caption.family} fontWeight={500} fontSize={TYPE.caption.sizes.xs} fill={COLOR.textSecondary}>
                {fmt(indexLine)}
              </text>
            </g>
          )}
          {annotations.map((a, i) => {
            const x = xOfKey(a.x);
            if (x === null) return null;
            const at = annotationAt[i] ?? drawn + 12 + i * 30;
            const p = progress(frame, at, DUR.snap, EASE.settle);
            if (p <= 0) return null;
            return (
              <g key={i} opacity={p}>
                <line x1={x} x2={x} y1={PLOT.top - 8} y2={PLOT.bottom} stroke={COLOR.textTertiary} strokeWidth={1} strokeDasharray="2 6" strokeLinecap="round" />
              </g>
            );
          })}
          {order.map((s, k) => {
            const pts = s.points.map((p, i) => `${xPos(p.x, i).toFixed(1)},${yOf(p.y).toFixed(1)}`).join(" ");
            const t = progress(frame, drawAt(k), DRAW, EASE.move);
            if (t <= 0) return null;
            const color = colorOf(s.role);
            return <polyline key={s.label} points={pts} fill="none" stroke={color} strokeWidth={s.role === "neutral" ? 3 : 5} strokeLinejoin="round" strokeLinecap="round" pathLength={1} strokeDasharray={`${t} 1`} />;
          })}
        </svg>
      </Layer>

      {/* annotation captions above the plot */}
      {annotations.map((a, i) => {
        const x = xOfKey(a.x);
        if (x === null) return null;
        const at = annotationAt[i] ?? drawn + 12 + i * 30;
        const left = Math.min(Math.max(x - 12, content.left), PLOT.right - 12 - a.text.length * TYPE.caption.sizes.xs * 0.78);
        return (
          <Snap key={i} frame={frame} at={at} from={{ y: 30 }}>
            <div style={{ position: "absolute", left, top: PLOT.top - 44, ...caption("xs", COLOR.textPrimary) }}>{a.text}</div>
          </Snap>
        );
      })}

      {/* end labels */}
      {ends.map((e) => {
        const at = drawAt(order.indexOf(e.s)) + DRAW - 4;
        const color = colorOf(e.s.role);
        const realY = yOf(e.v);
        return (
          <Snap key={e.s.label} frame={frame} at={at} from={{ x: -24 }}>
            <svg width={LAYOUT.width} height={LAYOUT.height} style={{ position: "absolute", inset: 0 }}>
              <circle cx={e.x} cy={realY} r={e.s.role === "neutral" ? 5 : 8} fill={color} />
              {Math.abs(e.y - realY) > 4 && <line x1={e.x + 12} y1={realY} x2={e.x + 28} y2={e.y} stroke={COLOR.textTertiary} strokeWidth={1} />}
            </svg>
            <div style={{ position: "absolute", left: e.x + 32, top: e.y - 18, display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={valueStyle("s", e.s.role === "neutral" ? COLOR.textSecondary : color)}>{fmt(e.v)}</span>
              <span style={caption("xs", COLOR.textSecondary)}>{e.s.label}</span>
            </div>
          </Snap>
        );
      })}
    </>
  );
};

function rank(role: Series["role"]): number {
  return role === "neutral" ? 0 : role === "contrast" ? 1 : 2;
}
function colorOf(role: Series["role"]): string {
  return role === "highlight" ? COLOR.highlight : role === "contrast" ? COLOR.contrast : COLOR.dataNeutral;
}
