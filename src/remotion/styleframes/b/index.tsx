/**
 * Style frame direction B: physical quantities / modern Isotype.
 * Beat 1 (0-180): 209 marks, one per 100,000 barrels a day, head for the Strait of Hormuz.
 *   The gate closes; 90 marks reroute through a bypass pipe cut into the land; 119 queue at the gate.
 * Beat 2 (180-360): the gate line turns into a liquid level: Brent $73 rising to a $119 peak over 21 days.
 * Every value is a pure function of the frame.
 */
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadManrope } from "@remotion/google-fonts/Manrope";
import { COLOR, EASE } from "../../catalog/tokens";
import { Grain } from "../../catalog/Atmosphere";

const { fontFamily: INTER } = loadInter("normal", { weights: ["400", "500", "700"], subsets: ["latin"] });
const { fontFamily: MANROPE } = loadManrope("normal", { weights: ["700", "800"], subsets: ["latin"] });

export const STYLEFRAME_DURATION = 360;

// ---- geometry ---------------------------------------------------------------
const W = 1920;
const H = 1080;
const P = 26; // mark pitch
const R = 8; // mark radius
const UNIT = 100_000; // barrels a day per mark
const N = 209; // 20.9 million
const ROWS = 10;
const PIPE_COLS = 9; // 90 marks = 9.0 million
const GATE_X = 904;
const FRONT_X = GATE_X - 24; // centre of the front column when queued at the gate
const CY = 540;
const ROW0_Y = CY - 4.5 * P;
const GAP_TOP = 380;
const GAP_BOT = 700;
// bypass pipe: a shallow U cut into the southern land
const PIPE_IN_X = 850;
const PIPE_OUT_X = 1500;
const PIPE_TOP = 690;
const PIPE_CTRL_Y = 1180; // quadratic control point: the arc bottoms out around y 935
const PIPE_SAMPLES = 40;
const LANES = 4;
const PIPE_BORE = LANES * P + 16;
const DEST_X0 = 1560; // rear column of the rerouted block
// beat 1 timing
const T_ARRIVE = 50;
const T_GATE = 28;
const T_DEPART = 60;
const STAGGER = 1.0;
const SPEED = 28;
const T_ADVANCE = 128;
// beat 2: a level; baseline is $0
const BASE_Y = 1000;
const PPD = 6.5; // px per dollar
const yOf = (usd: number) => BASE_Y - usd * PPD;
const P_BEFORE = 73;
const P_PEAK = 119;
const T_RISE0 = 228;
const T_RISE1 = 330;
const DAYS = 21;

// ---- helpers ----------------------------------------------------------------
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** 0 before `a`, eased to 1 at `b`; if out window given, back to 0 between c and d. */
const fade = (f: number, a: number, b: number, c?: number, d?: number) => {
  const i = interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE.enter });
  const o = c === undefined || d === undefined ? 1 : interpolate(f, [c, d], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE.exit });
  return i * o;
};
const hash = (i: number) => {
  const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
};
type Pt = [number, number];
/** Point at arc length s along a polyline (clamped to its ends). */
const alongPolyline = (pts: Pt[], s: number): Pt => {
  let rem = Math.max(0, s);
  for (let k = 0; k < pts.length - 1; k++) {
    const [x0, y0] = pts[k];
    const [x1, y1] = pts[k + 1];
    const len = Math.hypot(x1 - x0, y1 - y0);
    if (rem <= len) {
      const t = len === 0 ? 0 : rem / len;
      return [lerp(x0, x1, t), lerp(y0, y1, t)];
    }
    rem -= len;
  }
  return pts[pts.length - 1];
};
/** The bypass arc (a quadratic bezier) sampled once, plus its unit normals. */
const ARC: { p: Pt; n: Pt }[] = (() => {
  const out: { p: Pt; n: Pt }[] = [];
  for (let k = 0; k <= PIPE_SAMPLES; k++) {
    const t = k / PIPE_SAMPLES;
    const x = (1 - t) * (1 - t) * PIPE_IN_X + 2 * (1 - t) * t * ((PIPE_IN_X + PIPE_OUT_X) / 2) + t * t * PIPE_OUT_X;
    const y = (1 - t) * (1 - t) * PIPE_TOP + 2 * (1 - t) * t * PIPE_CTRL_Y + t * t * PIPE_TOP;
    const dx = 2 * (1 - t) * ((PIPE_IN_X + PIPE_OUT_X) / 2 - PIPE_IN_X) + 2 * t * (PIPE_OUT_X - (PIPE_IN_X + PIPE_OUT_X) / 2);
    const dy = 2 * (1 - t) * (PIPE_CTRL_Y - PIPE_TOP) + 2 * t * (PIPE_TOP - PIPE_CTRL_Y);
    const len = Math.hypot(dx, dy);
    out.push({ p: [x, y], n: [-dy / len, dx / len] });
  }
  return out;
})();
/** Lane l runs parallel to the arc; lane 0 is the outer (left, then bottom, then right) lane. */
const lanePath = (lane: number): Pt[] => {
  const d = -(lane - 1.5) * P;
  return ARC.map(({ p, n }) => [p[0] + n[0] * d, p[1] + n[1] * d]);
};
const LANE_PATHS = [0, 1, 2, 3].map(lanePath);

// ---- marks ------------------------------------------------------------------
type Mark = { x: number; y: number; color: string; opacity: number };

/** Mark i: column c (0 = front, nearest the gate), row r. Column 20 holds 9 marks. */
const markAt = (i: number, f: number): Mark => {
  const c = Math.floor(i / ROWS);
  const r = i % ROWS;
  const homeY = ROW0_Y + r * P;
  const approach = interpolate(f, [0, T_ARRIVE], [-170, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE.move });
  let x = FRONT_X - c * P + approach;
  let y = homeY;
  let color: string = COLOR.textSecondary;
  const viaPipe = c < PIPE_COLS;

  if (viaPipe) {
    const k = (ROWS - 1 - r) * PIPE_COLS + c; // bottom row drains first
    const depth = Math.floor(k / LANES);
    const lane = k % LANES;
    const depart = T_DEPART + depth * STAGGER;
    if (f >= depart) {
      const arc = LANE_PATHS[lane];
      const first = arc[0];
      const last = arc[arc.length - 1];
      const destX = DEST_X0 + (PIPE_COLS - 1 - c) * P;
      const path: Pt[] = [[FRONT_X - c * P, homeY], [first[0], homeY], ...arc, [last[0], homeY], [destX, homeY]];
      [x, y] = alongPolyline(path, (f - depart) * SPEED);
      color = COLOR.contrast;
    }
  } else {
    const adv = interpolate(f, [T_ADVANCE, T_ADVANCE + 37], [0, PIPE_COLS * P], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE.move });
    x += adv;
    const pinkT = interpolate(f, [T_ADVANCE - 10, T_ADVANCE + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    color = pinkT >= 0.5 ? COLOR.highlight : COLOR.textSecondary;
  }

  // transition: the marks drop out of the frame
  let opacity = 1;
  if (f >= 180) {
    const t0 = 180 + hash(i) * 14;
    const dt = Math.max(0, f - t0);
    y += 0.55 * dt * dt;
    if (viaPipe) opacity = 1 - clamp01((f - 180) / 16);
  }
  return { x, y, color, opacity };
};

const Marks: React.FC<{ frame: number }> = ({ frame }) => {
  const items: React.ReactNode[] = [];
  for (let i = 0; i < N; i++) {
    const m = markAt(i, frame);
    if (m.opacity <= 0 || m.y > H + R) continue;
    items.push(<circle key={i} cx={m.x} cy={m.y} r={R} fill={m.color} opacity={m.opacity} />);
  }
  return <g>{items}</g>;
};

// ---- beat 1 scenery ---------------------------------------------------------
const NORTH_LAND = `M0,0 H${W} V210 C1500,210 1250,${GAP_TOP} 1060,${GAP_TOP} H840 C650,${GAP_TOP} 400,150 0,150 Z`;
const SOUTH_LAND = `M0,${H} H${W} V870 C1500,870 1250,${GAP_BOT} 1060,${GAP_BOT} H840 C650,${GAP_BOT} 400,930 0,930 Z`;
const PIPE_PATH = `M${PIPE_IN_X},${PIPE_TOP} Q${(PIPE_IN_X + PIPE_OUT_X) / 2},${PIPE_CTRL_Y} ${PIPE_OUT_X},${PIPE_TOP}`;

/** Land slides out of the frame during the transition (north up, south down). */
const landShift = (f: number) =>
  interpolate(f, [180, 216], [0, 560], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE.exit });

const Scenery: React.FC<{ frame: number }> = ({ frame }) => {
  const s = landShift(frame);
  const pipeOpen = interpolate(frame, [T_DEPART - 14, T_DEPART], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE.enter });
  return (
    <g>
      <g transform={`translate(0 ${-s})`}>
        <path d={NORTH_LAND} fill={COLOR.surface2} />
        <path d={NORTH_LAND} fill="none" stroke={COLOR.grid} strokeWidth={1.5} />
      </g>
      <g transform={`translate(0 ${s})`}>
        <path d={SOUTH_LAND} fill={COLOR.surface2} />
        <path d={SOUTH_LAND} fill="none" stroke={COLOR.grid} strokeWidth={1.5} />
        <clipPath id="sf-b-south"><path d={SOUTH_LAND} /></clipPath>
        {pipeOpen > 0 && (
          <g opacity={pipeOpen} clipPath="url(#sf-b-south)">
            <path d={PIPE_PATH} fill="none" stroke={COLOR.grid} strokeWidth={PIPE_BORE + 3} strokeLinejoin="round" />
            <path d={PIPE_PATH} fill="none" stroke={COLOR.bg} strokeWidth={PIPE_BORE} strokeLinejoin="round" />
          </g>
        )}
      </g>
    </g>
  );
};

/** The blockade: a line drawn across the gap, which later swings into the $73 level line. */
const Gate: React.FC<{ frame: number }> = ({ frame }) => {
  const draw = interpolate(frame, [T_GATE, T_GATE + 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE.enter });
  if (draw <= 0) return null;
  const swing = interpolate(frame, [182, 216], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE.move });
  const yl = yOf(priceAt(frame));
  const x1 = lerp(GATE_X, 0, swing);
  const y1 = lerp(GAP_TOP, yl, swing);
  const x2 = lerp(GATE_X, W, swing);
  const y2 = lerp(GAP_TOP + (GAP_BOT - GAP_TOP) * draw, yl, swing);
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={COLOR.highlight} strokeWidth={4} strokeLinecap="round" />;
};

// ---- beat 2 ------------------------------------------------------------------
const priceAt = (f: number) =>
  interpolate(f, [T_RISE0, T_RISE1], [P_BEFORE, P_PEAK], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE.move });
const dayAt = (f: number) => Math.min(DAYS, Math.floor(interpolate(f, [T_RISE0, T_RISE1], [0, DAYS + 0.999], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));

const Level: React.FC<{ frame: number }> = ({ frame }) => {
  const show = fade(frame, 208, 226);
  if (show <= 0) return null;
  const y73 = yOf(P_BEFORE);
  const yl = yOf(priceAt(frame));
  const ticks: React.ReactNode[] = [];
  for (let usd = 0; usd <= 120; usd += 10) {
    const major = usd % 40 === 0;
    ticks.push(<line key={usd} x1={96} x2={96 + (major ? 16 : 9)} y1={yOf(usd)} y2={yOf(usd)} stroke={COLOR.textTertiary} strokeWidth={major ? 1.5 : 1} />);
  }
  return (
    <g opacity={show}>
      <rect x={0} y={y73} width={W} height={BASE_Y - y73} fill={COLOR.surface} />
      <rect x={0} y={yl} width={W} height={Math.max(0, y73 - yl)} fill={COLOR.highlight} opacity={0.2} />
      <line x1={0} x2={W} y1={y73} y2={y73} stroke={COLOR.textTertiary} strokeWidth={1.5} />
      <line x1={0} x2={W} y1={BASE_Y} y2={BASE_Y} stroke={COLOR.textSecondary} strokeWidth={1.5} />
      {ticks}
    </g>
  );
};

// ---- text -------------------------------------------------------------------
const Txt: React.FC<{ x: number; y: number; right?: boolean; opacity: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ x, y, right, opacity, style, children }) => {
  if (opacity <= 0) return null;
  return (
    <div style={{ position: "absolute", top: y, ...(right ? { right: W - x, textAlign: "right" } : { left: x }), opacity, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", ...style }}>
      {children}
    </div>
  );
};
const NUM: React.CSSProperties = { fontFamily: INTER, fontWeight: 700, fontSize: 104, lineHeight: 1, letterSpacing: "-0.03em", color: COLOR.textPrimary };
const LEAD: React.CSSProperties = { fontFamily: MANROPE, fontWeight: 700, fontSize: 34, lineHeight: 1.25, color: COLOR.textSecondary };
const CAP: React.CSSProperties = { fontFamily: INTER, fontWeight: 400, fontSize: 24, lineHeight: 1.35, color: COLOR.textTertiary };
const TAG: React.CSSProperties = { fontFamily: INTER, fontWeight: 500, fontSize: 20, lineHeight: 1, letterSpacing: "0.14em", color: COLOR.textTertiary };

const Beat1Text: React.FC<{ frame: number }> = ({ frame }) => {
  const rearX = FRONT_X - 20 * P - R; // rear edge of the whole block at rest
  const queueX = rearX + PIPE_COLS * P; // rear edge of the queued 119
  const out = fade(frame, 0, 1, 176, 188);
  const a = fade(frame, 6, 22, 84, 96) * out;
  const b = fade(frame, 150, 168) * out;
  const legend = fade(frame, 14, 30) * out;
  const tags = fade(frame, 0, 12) * out;
  const pipeTag = fade(frame, T_DEPART, T_DEPART + 14) * out;
  return (
    <>
      <Txt x={96} y={64} opacity={legend} style={CAP}>
        <span style={{ display: "inline-block", width: 16, height: 16, borderRadius: 8, background: COLOR.textSecondary, verticalAlign: -1, marginRight: 12 }} />
        one mark is {UNIT.toLocaleString("en-US")} barrels of oil a day
      </Txt>
      <Txt x={GATE_X + 36} y={GAP_TOP + 18} opacity={tags} style={TAG}>STRAIT OF HORMUZ</Txt>
      <Txt x={PIPE_IN_X - 80} y={868} right opacity={pipeTag} style={TAG}>BYPASS PIPELINES</Txt>
      <Txt x={1560} y={92} opacity={tags * 0.8} style={TAG}>IRAN</Txt>
      <Txt x={96} y={1000} opacity={tags * 0.8} style={TAG}>ARABIAN PENINSULA</Txt>

      <Txt x={rearX} y={214} opacity={a} style={NUM}>20.9 million</Txt>
      <Txt x={rearX} y={326} opacity={a} style={LEAD}>barrels of oil a day head for the strait</Txt>

      <Txt x={queueX} y={214} opacity={b} style={{ ...NUM, color: COLOR.highlight }}>11.9 million</Txt>
      <Txt x={queueX} y={326} opacity={b} style={LEAD}>barrels a day have no other route</Txt>

      <Txt x={DEST_X0 + (PIPE_COLS - 1) * P + R} y={286} right opacity={b} style={{ ...NUM, fontSize: 72, color: COLOR.contrast }}>9.0 million</Txt>
      <Txt x={DEST_X0 + (PIPE_COLS - 1) * P + R} y={366} right opacity={b} style={{ ...LEAD, fontSize: 28 }}>a day can go around by pipeline</Txt>
    </>
  );
};

const Beat2Text: React.FC<{ frame: number }> = ({ frame }) => {
  const show = fade(frame, 214, 232);
  const price = priceAt(frame);
  const day = dayAt(frame);
  const yl = yOf(price);
  const y73 = yOf(P_BEFORE);
  const delta = fade(frame, 298, 316);
  const ticks: React.ReactNode[] = [];
  for (let d = 0; d < DAYS; d++) {
    ticks.push(<span key={d} style={{ display: "inline-block", width: 6, height: 20, marginRight: 6, background: d < day ? COLOR.highlight : COLOR.grid }} />);
  }
  return (
    <>
      <Txt x={96} y={64} opacity={show} style={CAP}>
        <span style={{ display: "inline-block", verticalAlign: -3, marginRight: 14 }}>{ticks}</span>
        day {day} of {DAYS} after the blockade
      </Txt>
      <Txt x={96} y={yOf(120) - 76} opacity={show} style={CAP}>Brent crude, USD a barrel</Txt>
      {[0, 40, 80, 120].map((usd) => (
        <Txt key={usd} x={96} y={yOf(usd) - 30} opacity={show} style={{ ...CAP, fontSize: 20 }}>{usd}</Txt>
      ))}
      <Txt x={1824} y={y73 - 40} right opacity={fade(frame, 246, 262)} style={{ ...CAP, color: COLOR.textSecondary }}>$73 before the blockade</Txt>
      <Txt x={1824} y={yl - 150} right opacity={show} style={{ ...NUM, fontSize: 112, color: COLOR.highlight }}>${Math.round(price)}</Txt>
      <Txt x={1824} y={yl - 42} right opacity={show} style={{ ...LEAD, fontSize: 28 }}>{day >= DAYS ? "peak, three weeks in" : "Brent crude"}</Txt>
      <Txt x={300} y={(yl + y73) / 2 - 76} opacity={delta} style={{ ...NUM, fontSize: 120, color: COLOR.highlight }}>+63%</Txt>
      <Txt x={304} y={(yl + y73) / 2 + 52} opacity={delta} style={LEAD}>$46 a barrel more than before</Txt>
    </>
  );
};

export const StyleFrame: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: COLOR.bg, fontFamily: INTER }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", top: 0, left: 0 }}>
        <Level frame={frame} />
        <Scenery frame={frame} />
        <Marks frame={frame} />
        <Gate frame={frame} />
      </svg>
      <Beat1Text frame={frame} />
      <Beat2Text frame={frame} />
      <Grain />
    </AbsoluteFill>
  );
};
