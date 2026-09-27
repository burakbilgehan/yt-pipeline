/**
 * Beat 2 (frames 180-360): the price board is the stage.
 * Left: Brent in giant digit cells, $73. Right: a zero-based measure, the $73 bar standing.
 *  216  "Blockade · day 0" panel slams in; a second bar starts at the $73 level and rises
 *  234  Week 1 chip     252  Week 2 chip     270  Week 3 chip
 *  270  KICK: the digit cells flip in 3D straight from 73 to 119 (a third cell turns in), $119 labels
 *  292  +63% panel slams in from the left
 *  312  the plain sentence; 330-360 hold with drift
 * Digits never show an intermediate value: a cell shows 7, 3 (or blank) on its front and 1, 1, 9
 * on its back, blurred while it turns.
 */
import React from "react";
import { Easing } from "remotion";
import { COLOR } from "../../catalog/tokens";
import { Layer } from "./beat1";
import { HARD, ramp } from "./motion";
import { Chip, Panel, Snap } from "./ui";
import { body, caption, giant } from "./type";

export const T_BLOCKADE = 216;
export const T_WEEK = [234, 252, 270];
export const T_LOCK = 270;
export const T_PCT = 292;
export const T_SENTENCE = 312;

const P0 = 73;
const P1 = 119;
const PCT = Math.round(((P1 - P0) / P0) * 100); // 63

const M = 96;
const BOARD = { x: M, y: 186, cellW: 250, cellH: 400, gap: 14, dollarW: 150 };
const DIGIT = 330;
const FLIP_DUR = 12;

const PLOT = { x: 1180, right: 1824, y0: 1000, top: 160, max: 120 };
const pxPerUsd = (PLOT.y0 - PLOT.top) / PLOT.max;
const yOf = (usd: number) => PLOT.y0 - usd * pxPerUsd;
const BARS = { before: { x: 1270, w: 200 }, peak: { x: 1560, w: 200 } };

/**
 * One digit cell: a slab that turns around its horizontal axis from the old digit to the new one.
 * The hundreds cell is blank before the turn, like an unlit departure-board cell.
 */
const Cell: React.FC<{ frame: number; x: number; oldDigit: string; newDigit: string; flipAt: number }> = ({ frame, x, oldDigit, newDigit, flipAt }) => {
  const ease = Easing.inOut(Easing.cubic);
  const t = ramp(frame, flipAt, flipAt + FLIP_DUR, 0, 1, ease);
  const tPrev = ramp(frame - 1, flipAt, flipAt + FLIP_DUR, 0, 1, ease);
  const a = 180 * t;
  const speed = Math.abs(180 * (t - tPrev)); // deg per frame
  const front = a < 90;
  const rot = front ? -a : 180 - a;
  const blur = speed < 6 ? undefined : speed < 14 ? "url(#e-blur-y1)" : speed < 24 ? "url(#e-blur-y2)" : "url(#e-blur-y3)";
  const digit = front ? oldDigit : newDigit;
  const ink = front ? COLOR.textPrimary : COLOR.highlight;
  return (
    <div style={{ position: "absolute", left: x, top: BOARD.y, width: BOARD.cellW, height: BOARD.cellH, perspective: 1600 }}>
      {/* The housing stays put, so the board never reads empty while a card is edge-on. */}
      <Panel x={0} y={0} w={BOARD.cellW} h={BOARD.cellH} fill={COLOR.surface} skew={16}>
        <div />
      </Panel>
      <div style={{ position: "absolute", inset: 0, transform: `rotateX(${rot.toFixed(2)}deg)`, transformOrigin: "50% 50%", filter: blur }}>
        <Panel x={0} y={0} w={BOARD.cellW} h={BOARD.cellH} fill={COLOR.surface2} skew={16}>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", ...giant(DIGIT, ink), letterSpacing: "0" }}>{digit}</div>
        </Panel>
      </div>
    </div>
  );
};

export const Beat2: React.FC<{ frame: number }> = ({ frame }) => {
  const landed = frame >= T_LOCK + 10; // digits have finished turning
  const rise = ramp(frame, T_BLOCKADE + 4, T_LOCK, P0, P1, Easing.inOut(Easing.cubic));
  const peakIn = ramp(frame, T_BLOCKADE, T_BLOCKADE + 8, 0, 1, HARD);
  const cellX = (slot: number) => BOARD.x + BOARD.dollarW + slot * (BOARD.cellW + BOARD.gap);
  const gridVals = [0, 20, 40, 60, 80, 100, 120];

  return (
    <div style={{ position: "absolute", inset: 0, background: COLOR.bg, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: M, top: 72, ...caption(22, COLOR.textTertiary) }}>Brent crude · US dollars a barrel</div>
      <Chip x={1824} y={58} text={landed ? "Peak · Mar 19" : frame >= T_BLOCKADE ? "Blockade in effect" : "Before the blockade"} tone={landed ? "pink" : "gray"} align="right" />

      {/* the digit board, front layer */}
      <Layer frame={frame} z={70}>
        <div style={{ position: "absolute", left: BOARD.x, top: BOARD.y, height: BOARD.cellH, display: "flex", alignItems: "center", ...giant(220, COLOR.textSecondary) }}>$</div>
        {/* 73 -> 119 in one turn (no stagger, so no readable intermediate number); the hundreds cell is blank before */}
        <Cell frame={frame} x={cellX(0)} oldDigit="" newDigit="1" flipAt={T_LOCK} />
        <Cell frame={frame} x={cellX(1)} oldDigit="7" newDigit="1" flipAt={T_LOCK} />
        <Cell frame={frame} x={cellX(2)} oldDigit="3" newDigit="9" flipAt={T_LOCK} />
      </Layer>

      {/* chip row under the board: the blockade clock */}
      {frame >= T_BLOCKADE && (
        <Snap frame={frame} at={T_BLOCKADE} dur={10} from={{ x: -900 }} c={0.9}>
          <Panel x={M} y={640} w={400} h={58} fill={COLOR.highlight} skew={18}>
            <div style={{ ...caption(24, COLOR.bg), position: "absolute", left: 34, top: 18 }}>Blockade · day 0</div>
          </Panel>
        </Snap>
      )}
      {T_WEEK.map((t, i) =>
        frame >= t ? (
          <Snap key={i} frame={frame} at={t} dur={8} from={{ y: 70 }} c={1.0}>
            <Panel x={M + 420 + i * 196} y={640} w={182} h={58} fill={i === 2 ? COLOR.highlight : COLOR.surface2} skew={16}>
              <div style={{ ...caption(22, i === 2 ? COLOR.bg : COLOR.textPrimary), position: "absolute", left: 30, top: 19 }}>{`Week ${i + 1}`}</div>
            </Panel>
          </Snap>
        ) : null,
      )}

      {/* the measure: zero-based, $0 at the bottom; a depth layer behind the board */}
      <Layer frame={frame} z={-40} flat>
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        {gridVals.map((v) => (
          <g key={v}>
            <line x1={PLOT.x} x2={PLOT.right} y1={yOf(v)} y2={yOf(v)} stroke={v === 0 ? COLOR.textTertiary : COLOR.grid} strokeWidth={v === 0 ? 1.5 : 1} opacity={v === 0 ? 0.9 : 0.7} />
            <text x={PLOT.x - 18} y={yOf(v) + 7} textAnchor="end" fontFamily="Inter" fontWeight={500} fontSize={20} fill={COLOR.textTertiary} style={{ fontVariantNumeric: "tabular-nums" }}>
              {`$${v}`}
            </text>
          </g>
        ))}
        {/* before: $73 */}
        <rect x={BARS.before.x} y={yOf(P0)} width={BARS.before.w} height={PLOT.y0 - yOf(P0)} fill={COLOR.dataNeutral} />
        <text x={BARS.before.x + BARS.before.w / 2} y={yOf(P0) - 18} textAnchor="middle" fontFamily="Inter" fontWeight={700} fontSize={40} letterSpacing={-1.2} fill={COLOR.textPrimary} style={{ fontVariantNumeric: "tabular-nums" }}>
          $73
        </text>
        <text x={BARS.before.x + BARS.before.w / 2} y={PLOT.y0 + 36} textAnchor="middle" fontFamily="Inter" fontWeight={500} fontSize={20} letterSpacing={2.4} fill={COLOR.textSecondary}>
          BEFORE
        </text>
        {/* peak: starts at the $73 level, rises to $119 with the weeks; the label appears only when it locks */}
        {peakIn > 0 && (
          <g opacity={peakIn}>
            <line x1={BARS.before.x + BARS.before.w} x2={BARS.peak.x} y1={yOf(P0)} y2={yOf(P0)} stroke={COLOR.textTertiary} strokeWidth={1} strokeDasharray="2 7" strokeLinecap="round" />
            <rect x={BARS.peak.x} y={yOf(rise)} width={BARS.peak.w} height={PLOT.y0 - yOf(rise)} fill={COLOR.highlight} />
            <text x={BARS.peak.x + BARS.peak.w / 2} y={PLOT.y0 + 36} textAnchor="middle" fontFamily="Inter" fontWeight={500} fontSize={20} letterSpacing={2.4} fill={landed ? COLOR.highlight : COLOR.textSecondary}>
              {landed ? "PEAK · MAR 19" : "AFTER"}
            </text>
          </g>
        )}
        {landed && (
          <text x={BARS.peak.x + BARS.peak.w / 2} y={yOf(P1) - 18} textAnchor="middle" fontFamily="Inter" fontWeight={700} fontSize={40} letterSpacing={-1.2} fill={COLOR.highlight} style={{ fontVariantNumeric: "tabular-nums" }}>
            $119
          </text>
        )}
      </svg>
      </Layer>

      {/* +63% panel and the sentence */}
      <Layer frame={frame} z={110}>
        <Snap frame={frame} at={T_PCT} dur={10} from={{ x: -1100 }} c={0.9}>
          <Panel x={M} y={752} w={900} h={180} fill={COLOR.highlight} skew={40}>
            <div style={{ ...giant(160, COLOR.bg), position: "absolute", left: 64, top: 10 }}>{`+${PCT}%`}</div>
            <div style={{ ...caption(24, COLOR.bg), position: "absolute", left: 600, top: 118 }}>by March 19</div>
          </Panel>
        </Snap>
        <Snap frame={frame} at={T_SENTENCE} dur={9} from={{ y: 60 }} c={0.9}>
          <div style={{ position: "absolute", left: M, top: 968, ...body(28, COLOR.textSecondary) }}>{`$${P0} to $${P1} a barrel: $${P1 - P0} more between March 2 and March 19`}</div>
        </Snap>
      </Layer>
    </div>
  );
};
