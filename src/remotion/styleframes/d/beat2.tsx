/**
 * Beat 2 (frames 180-360): the PRICE BOARD.
 * The stage is a stock-app card (Brent crude, USD a barrel) with a zero-based bar chart, and to
 * its right a departure-board price in giant digit cells. One beat = one week of the blockade:
 *  180  wipe in; $73 sits on the board
 *  198  BEFORE THE BLOCKADE tag
 *  216  BLOCKADE stamp slams across; digits start rolling, the peak bar grows
 *  234  week 1 chip     252  week 2 chip     270  week 3 chip; $119 locks, PEAK tag
 *  288  +63% slab slams in from the right, cut by the frame
 *  306  the plain sentence under it; 324-360 hold with idle motion
 */
import React from "react";
import { Easing } from "remotion";
import { COLOR } from "../../catalog/tokens";
import { Ticker } from "./beat1";
import { Band, Panel, Snap, Barrel } from "./objects";
import { BEAT, beat, idle, punch, ramp, slide } from "./motion";
import { GIANT, NAVY, body, giant, label } from "./type";

const T_IN = beat(10);
const T_BEFORE = beat(11);
const T_BLOCKADE = beat(12);
const T_LOCK = beat(15);
const T_PCT = beat(16);
const T_SENTENCE = beat(17);
const T_FLASH = beat(18);

const P0 = 73;
const P1 = 119;
const AXIS_MAX = 120;

const CARD = { x: 96, y: 96, w: 640, h: 888 };
const PLOT = { x: 120, y: 250, w: 440, h: 470 };
const CELL = { w: 236, h: 380, gap: 16, x: 1020, y: 150 };
const DIGIT = 330;

/** Price as a function of the frame: flat at 73, rises to 119 across the three week beats. */
export function priceAt(frame: number): number {
  return ramp(frame, T_BLOCKADE, T_LOCK, P0, P1, Easing.inOut(Easing.cubic));
}

/** Board value: the price quantized to flap steps, so the digits step like a departure board. */
const STEP = 3;
function boardValue(frame: number): number {
  const stepped = Math.floor(frame / STEP) * STEP;
  return Math.round(priceAt(stepped));
}

/** Split-flap cell: shows one digit of the board value; on a change the new digit flaps in over STEP frames. */
const Cell: React.FC<{ frame: number; place: number; blankAbove?: boolean; x: number; ink: string }> = ({ frame, place, blankAbove, x, ink }) => {
  const value = boardValue(frame);
  const prev = boardValue(frame - STEP);
  const digitOf = (v: number) => {
    const whole = Math.floor(v / place);
    return blankAbove && whole === 0 ? "" : String(whole % 10);
  };
  const cur = digitOf(value);
  const old = digitOf(prev);
  const changedAt = Math.floor(frame / STEP) * STEP;
  const flapping = cur !== old && frame - changedAt < STEP;
  const t = flapping ? (frame - changedAt + 1) / STEP : 1;
  const lineH = CELL.h;
  const glyph = (ch: string, top: number, opacity = 1) => (
    <div style={{ position: "absolute", left: 0, top, width: CELL.w, height: lineH, display: "flex", alignItems: "center", justifyContent: "center", ...giant(DIGIT, ink), opacity }}>
      {ch}
    </div>
  );
  return (
    <Panel x={x} y={CELL.y} w={CELL.w} h={CELL.h} fill={NAVY.slab2} skew={18} stripes={{ color: "rgba(236,234,230,0.05)", phase: -frame * 0.6 }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: CELL.h / 2, height: 2, background: COLOR.bg, opacity: 0.8, zIndex: 2 }} />
      {/* top half: new digit already in place; bottom half: the old digit until the flap passes */}
      <div style={{ position: "absolute", left: 0, top: 0, width: CELL.w, height: lineH / 2, overflow: "hidden" }}>{glyph(cur, 0)}</div>
      <div style={{ position: "absolute", left: 0, top: lineH / 2, width: CELL.w, height: lineH / 2, overflow: "hidden" }}>
        {glyph(flapping && t < 0.5 ? old : cur, -lineH / 2)}
      </div>
      {/* the flap itself: a half-card falling from the split line, blurred while it moves */}
      {flapping && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: lineH / 2,
            width: CELL.w,
            height: lineH / 2,
            overflow: "hidden",
            transformOrigin: "50% 0",
            transform: `scaleY(${Math.abs(1 - 2 * t).toFixed(3)})`,
            background: NAVY.slab2,
            filter: "url(#d-blur-y1)",
          }}
        >
          {glyph(t < 0.5 ? old : cur, -lineH / 2)}
        </div>
      )}
    </Panel>
  );
};

export const Beat2: React.FC<{ frame: number }> = ({ frame }) => {
  const g = NAVY;
  const price = priceAt(frame);
  const locked = frame >= T_LOCK;
  const bandX = -300 - frame * 1.1 + idle(frame, 400, 20);
  const week = frame < T_BLOCKADE ? 0 : Math.min(3, Math.floor((frame - T_BLOCKADE) / BEAT) + (frame >= T_LOCK ? 0 : 0));
  const weekChips = [beat(13), beat(14), beat(15)];
  const peakH = ramp(price, 0, AXIS_MAX, 0, PLOT.h);
  const beforeH = ramp(P0, 0, AXIS_MAX, 0, PLOT.h);
  const dayProg = ramp(frame, T_BLOCKADE, T_LOCK, 0, 1);
  const lockPunch = punch(frame, T_LOCK, 0.06, 12) * punch(frame, T_FLASH, 0.04, 10);
  const digitInk = frame >= T_FLASH ? COLOR.highlight : COLOR.textPrimary;
  const pct = Math.round(((P1 - P0) / P0) * 100);

  return (
    <div style={{ position: "absolute", inset: 0, background: g.bg, overflow: "hidden" }}>
      <Band text="BRENT" font={GIANT} size={640} color={g.band} y={-90} offset={bandX} gap={160} />
      <Band text={locked ? "PEAK" : "CRUDE"} font={GIANT} size={640} color={g.band} y={560} offset={-bandX * 0.7 - 1400} gap={160} />

      {/* stock app card */}
      <Snap frame={frame} at={T_IN} dur={12} from={{ x: -300 }} c={0.6}>
        <div style={{ position: "absolute", left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h, borderRadius: 32, background: g.slab, overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,0.45)" }}>
          <div style={{ position: "absolute", left: 36, top: 34 }}>
            <div style={label(22, COLOR.textTertiary)}>Brent crude · USD a barrel</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginTop: 10 }}>
              <span style={{ ...body(60, COLOR.textPrimary, 500), fontVariantNumeric: "tabular-nums" }}>{`$${price.toFixed(2)}`}</span>
              {locked && (
                <span style={{ ...label(26, COLOR.highlight), padding: "6px 10px", background: "rgba(242,127,163,0.14)", borderRadius: 8 }}>{`+${pct}%`}</span>
              )}
            </div>
          </div>
          {/* zero-based bar chart */}
          <svg width={CARD.w} height={CARD.h} style={{ position: "absolute", left: 0, top: 0 }}>
            {[0, 20, 40, 60, 80, 100, 120].map((v) => {
              const y = PLOT.y + PLOT.h - (v / AXIS_MAX) * PLOT.h;
              return (
                <g key={v}>
                  <line x1={PLOT.x} x2={PLOT.x + PLOT.w} y1={y} y2={y} stroke={COLOR.grid} strokeWidth={v === 0 ? 1.5 : 1} opacity={v === 0 ? 1 : 0.6} />
                  <text x={PLOT.x - 14} y={y + 7} textAnchor="end" fontFamily="Barlow Condensed" fontWeight={500} fontSize={20} fill={COLOR.textTertiary}>
                    {v}
                  </text>
                </g>
              );
            })}
            {/* before bar */}
            <rect x={PLOT.x + 40} y={PLOT.y + PLOT.h - beforeH} width={150} height={beforeH} fill={COLOR.dataNeutral} />
            <text x={PLOT.x + 115} y={PLOT.y + PLOT.h - beforeH - 14} textAnchor="middle" fontFamily="Barlow Condensed" fontWeight={700} fontSize={30} fill={COLOR.textPrimary}>
              $73
            </text>
            <text x={PLOT.x + 115} y={PLOT.y + PLOT.h + 30} textAnchor="middle" fontFamily="Barlow Condensed" fontWeight={500} fontSize={20} fill={COLOR.textTertiary} letterSpacing="1.5">
              BEFORE
            </text>
            {/* peak bar grows with the roll */}
            {frame >= T_BLOCKADE && (
              <>
                <rect x={PLOT.x + 250} y={PLOT.y + PLOT.h - peakH} width={150} height={peakH} fill={COLOR.highlight} />
                {locked && (
                  <text x={PLOT.x + 325} y={PLOT.y + PLOT.h - peakH - 14} textAnchor="middle" fontFamily="Barlow Condensed" fontWeight={700} fontSize={30} fill={COLOR.highlight}>
                    $119
                  </text>
                )}
                <text x={PLOT.x + 325} y={PLOT.y + PLOT.h + 30} textAnchor="middle" fontFamily="Barlow Condensed" fontWeight={500} fontSize={20} fill={COLOR.textTertiary} letterSpacing="1.5">
                  {locked ? "PEAK · DAY 21" : "AFTER"}
                </text>
              </>
            )}
            {/* day timeline */}
            <g transform={`translate(${PLOT.x} ${PLOT.y + PLOT.h + 90})`}>
              <rect x={0} y={0} width={PLOT.w} height={8} rx={4} fill={COLOR.surface2} />
              <rect x={0} y={0} width={PLOT.w * dayProg} height={8} rx={4} fill={COLOR.highlight} />
              {[0, 7, 14, 21].map((d) => (
                <g key={d} transform={`translate(${(d / 21) * PLOT.w} 0)`}>
                  <rect x={-1} y={-6} width={2} height={20} fill={d <= dayProg * 21 + 0.01 && frame >= T_BLOCKADE ? COLOR.highlight : COLOR.textTertiary} />
                  <text x={0} y={42} textAnchor="middle" fontFamily="Barlow Condensed" fontWeight={500} fontSize={20} fill={COLOR.textTertiary} letterSpacing="1">
                    {d === 0 ? "DAY 0" : `${d}`}
                  </text>
                </g>
              ))}
            </g>
            {/* barrel stickers in the corner */}
            <Barrel x={CARD.w - 132} y={44 + idle(frame, 60, 2)} scale={0.9} />
            <Barrel x={CARD.w - 86} y={52 + idle(frame, 66, 2, 20)} scale={0.9} />
          </svg>
        </div>
      </Snap>

      {/* departure board: $ + three cells */}
      <Snap frame={frame} at={T_IN} dur={12} from={{ x: 500 }} c={0.6}>
        <div style={{ position: "absolute", left: 0, top: 0, transform: `scale(${lockPunch.toFixed(3)})`, transformOrigin: "1400px 340px" }}>
          <div style={{ position: "absolute", left: CELL.x - 200, top: CELL.y + 22, ...giant(DIGIT, frame >= T_FLASH ? COLOR.highlight : COLOR.textSecondary) }}>$</div>
          <Cell frame={frame} place={100} blankAbove x={CELL.x} ink={digitInk} />
          <Cell frame={frame} place={10} x={CELL.x + CELL.w + CELL.gap} ink={digitInk} />
          <Cell frame={frame} place={1} x={CELL.x + 2 * (CELL.w + CELL.gap)} ink={digitInk} />
        </div>
      </Snap>

      {/* tags under the board */}
      {frame >= T_BEFORE && !locked && (
        <Snap frame={frame} at={T_BEFORE} dur={9} from={{ y: 140 }} out={{ at: T_BLOCKADE, y: 60, dur: 6 }}>
          <Panel x={CELL.x} y={CELL.y + CELL.h + 34} w={560} h={62} fill={g.slab2} skew={16}>
            <div style={{ ...label(32, COLOR.textPrimary), position: "absolute", left: 30, top: 15 }}>Before the blockade</div>
          </Panel>
        </Snap>
      )}
      {weekChips.map((t, i) =>
        frame >= t ? (
          <Snap key={i} frame={frame} at={t} dur={8} from={{ y: 90 }}>
            <Panel x={CELL.x + i * 200} y={CELL.y + CELL.h + 34} w={184} h={62} fill={i === 2 && locked ? COLOR.highlight : g.slab2} skew={14}>
              <div style={{ ...label(30, i === 2 && locked ? COLOR.bg : COLOR.textPrimary), position: "absolute", left: 28, top: 16 }}>{`Week ${i + 1}`}</div>
            </Panel>
          </Snap>
        ) : null,
      )}
      {locked && (
        <Snap frame={frame} at={T_LOCK + 4} dur={9} from={{ x: 500 }}>
          <Panel x={CELL.x + 600} y={CELL.y + CELL.h + 34} w={300} h={62} fill={COLOR.highlight} skew={16}>
            <div style={{ ...label(32, COLOR.bg), position: "absolute", left: 30, top: 15 }}>Peak · $119</div>
          </Panel>
        </Snap>
      )}

      {/* BLOCKADE stamp across the top */}
      {frame >= T_BLOCKADE && (
        <Snap frame={frame} at={T_BLOCKADE} dur={9} from={{ x: -1200 }} c={0.9}>
          <Panel x={-40} y={18} w={980} h={84} fill={COLOR.highlight} skew={22} stripes={{ color: "rgba(22,24,32,0.12)", phase: -frame * 1.2 }}>
            <div style={{ ...giant(66, COLOR.bg), position: "absolute", left: 84, top: 8 }}>Blockade · day 0</div>
          </Panel>
        </Snap>
      )}

      {/* +63% slab, cut by the right edge of the frame */}
      {frame >= T_PCT && (
        <Snap frame={frame} at={T_PCT} dur={10} from={{ x: 1100 }} c={0.9}>
          <Panel x={860} y={650} w={1200} h={300} fill={COLOR.highlight} skew={40} stripes={{ color: "rgba(22,24,32,0.10)", phase: -frame * 1.4 }}>
            <div style={{ ...giant(290, COLOR.bg), position: "absolute", left: 96, top: 2, letterSpacing: "-0.01em" }}>{`+${pct}%`}</div>
            <div style={{ ...label(34, COLOR.bg), position: "absolute", left: 800, top: 200 }}>In three weeks</div>
          </Panel>
        </Snap>
      )}
      {frame >= T_SENTENCE && (
        <Snap frame={frame} at={T_SENTENCE} dur={9} from={{ y: 120 }}>
          <div style={{ position: "absolute", left: 900, top: 968, ...body(30, COLOR.textSecondary) }}>{`$73 to $119 a barrel, $46 more, within three weeks of the blockade`}</div>
        </Snap>
      )}

      <Ticker frame={frame} text="BRENT CRUDE ▸ $73 BEFORE THE BLOCKADE ▸ $119 PEAK ▸ +63% IN THREE WEEKS ▸ " bg={COLOR.surface} ink={COLOR.textTertiary} speed={2.6} />

      {/* beat marks: beats 10-19 */}
      <div style={{ position: "absolute", left: 88, top: 44, display: "flex", gap: 8 }}>
        {Array.from({ length: 10 }, (_, i) => {
          const on = Math.floor(frame / BEAT) - 10 === i;
          return <div key={i} style={{ width: 22, height: 4, background: on ? COLOR.highlight : COLOR.textTertiary, opacity: on ? 1 : 0.5 }} />;
        })}
      </div>
    </div>
  );
};
