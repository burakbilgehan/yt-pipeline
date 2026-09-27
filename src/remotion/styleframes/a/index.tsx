/**
 * Style frame direction A: editorial poster, typography as image.
 * The number is the picture. One rule runs through both beats: first it is the
 * baseline the numerals stand on (its length is the flow, 20.9 M b/d, margin to
 * margin, zero at the left margin), then it drops to the bottom of the frame and
 * becomes the zero axis the price measures rise from. The colored segments of the
 * bar drain into those measures. Every value is a pure function of the frame.
 */
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { loadFont as loadInterTight } from "@remotion/google-fonts/InterTight";
import { loadFont as loadInstrumentSerif } from "@remotion/google-fonts/InstrumentSerif";
import { COLOR, EASE } from "../../catalog/tokens";
import { Grain } from "../../catalog/Atmosphere";

loadInterTight("normal", { weights: ["500", "600", "700", "800"], subsets: ["latin"] });
loadInstrumentSerif("italic", { weights: ["400"], subsets: ["latin"] });

export const STYLEFRAME_DURATION = 360;

const W = 1920;
const H = 1080;
const M = 96; // margin
const SANS = "'Inter Tight', 'Inter', sans-serif";
const SERIF = "'Instrument Serif', Georgia, serif";
const CAP = 0.727; // Inter Tight cap height in em (lining figures share it)
const OVERSHOOT = 1.06; // round glyphs overshoot the cap line; hide them fully

// Data
const FLOW = 20.9; // M b/d through Hormuz
const BYPASS = 9.0; // M b/d pipeline capacity around it
const STRANDED = FLOW - BYPASS; // 11.9
const PRICE_FROM = 73;
const PRICE_PEAK = 119;

// Beat 1 geometry: the rule is the bar. 1728 px = 20.9 M b/d, zero at the left margin.
const RULE_LEN = W - 2 * M;
const PX_PER_M = RULE_LEN / FLOW;
const SPLIT_X = M + BYPASS * PX_PER_M; // 840
const BASE_Y = 736;
const RULE_H = 18;

// Beat 2 geometry: zero axis at the bottom, 119 reaches y = 128.
const AXIS_Y = 1012;
const AXIS_H = 4;
const PX_PER_USD = (AXIS_Y - 128) / PRICE_PEAK;
const yOf = (usd: number) => AXIS_Y - usd * PX_PER_USD;

type Ease = (t: number) => number;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ramp = (f: number, from: number, to: number, easing: Ease = EASE.enter) =>
  interpolate(f, [from, to], [0, 1], { ...clamp, easing });
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** A display numeral standing on (or hanging from) a rule, revealed through a clip at that rule. */
const Numeral: React.FC<{
  id: string;
  text: string;
  prefix?: string;
  x: number;
  size: number;
  weight: number;
  color: string;
  anchor?: "start" | "end";
  /** y of the rule the numeral relates to */
  rule: number;
  /** "stand": baseline sits on the rule. "hang": cap line touches the rule. */
  mode: "stand" | "hang";
  /** 0 = fully hidden behind the rule, 1 = in place */
  reveal: number;
  opacity?: number;
}> = ({ id, text, prefix, x, size, weight, color, anchor = "start", rule, mode, reveal, opacity = 1 }) => {
  const cap = CAP * size;
  const baseline = mode === "stand" ? rule : rule + cap;
  const offset = (1 - reveal) * cap * OVERSHOOT * (mode === "stand" ? 1 : -1);
  const clip = mode === "stand" ? { y: rule - cap * 1.2, h: cap * 1.2 } : { y: rule, h: cap * 1.2 };
  if (reveal <= 0 || opacity <= 0) return null;
  return (
    <g opacity={opacity}>
      <defs>
        <clipPath id={id}>
          <rect x={-200} y={clip.y} width={W + 400} height={clip.h} />
        </clipPath>
      </defs>
      <text
        clipPath={`url(#${id})`}
        x={x}
        y={baseline + offset}
        fill={color}
        fontFamily={SANS}
        fontSize={size}
        fontWeight={weight}
        textAnchor={anchor}
        letterSpacing={-0.045 * size}
        style={{ fontVariantNumeric: "proportional-nums lining-nums" }}
      >
        {prefix && (
          <tspan fontSize={size * 0.5} fontWeight={600} letterSpacing={-0.01 * size} dy={-cap * 0.5}>
            {prefix}
          </tspan>
        )}
        {prefix ? <tspan dy={cap * 0.5}>{text}</tspan> : text}
      </text>
    </g>
  );
};

const Caption: React.FC<{ x: number; y: number; anchor?: "start" | "middle" | "end"; color?: string; opacity?: number; children: React.ReactNode }> = ({
  x,
  y,
  anchor = "start",
  color = COLOR.textTertiary,
  opacity = 1,
  children,
}) => (
  <text x={x} y={y} fill={color} opacity={opacity} fontFamily={SANS} fontSize={20} fontWeight={500} letterSpacing={2.6} textAnchor={anchor} style={{ textTransform: "uppercase" }}>
    {children}
  </text>
);

const Serif: React.FC<{ x: number; y: number; size: number; anchor?: "start" | "end"; color?: string; opacity?: number; lines: string[] }> = ({
  x,
  y,
  size,
  anchor = "start",
  color = COLOR.textSecondary,
  opacity = 1,
  lines,
}) => {
  if (opacity <= 0) return null;
  return (
    <text x={x} y={y} fill={color} opacity={opacity} fontFamily={SERIF} fontStyle="italic" fontSize={size} textAnchor={anchor}>
      {lines.map((l, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : size * 1.02}>
          {l}
        </tspan>
      ))}
    </text>
  );
};

const Label: React.FC<{ x: number; y: number; value: string; text: string; color: string; anchor?: "start" | "end"; opacity: number }> = ({ x, y, value, text, color, anchor = "start", opacity }) => {
  if (opacity <= 0) return null;
  return (
    <g opacity={opacity}>
      <text x={x} y={y} fill={color} fontFamily={SANS} fontSize={44} fontWeight={700} letterSpacing={-1.5} textAnchor={anchor} style={{ fontVariantNumeric: "tabular-nums" }}>
        {value}
      </text>
      <Caption x={x} y={y + 34} anchor={anchor}>
        {text}
      </Caption>
    </g>
  );
};

export const StyleFrame: React.FC = () => {
  const f = useCurrentFrame();

  // ---------- Beat 1 ----------
  const ruleDraw = ramp(f, 0, 34, EASE.move); // bar draws margin to margin
  const n1 = ramp(f, 8, 40); // 20.9 rises from the rule
  const unit1 = ramp(f, 26, 48); // serif unit
  const cap1 = ramp(f, 14, 34); // margin captions
  const splitBlue = ramp(f, 74, 100, EASE.move); // 9.0 fills from the left
  const splitPink = ramp(f, 90, 116, EASE.move); // 11.9 fills the rest
  const lab9 = ramp(f, 88, 104);
  const lab119 = ramp(f, 106, 122);
  const sink20 = ramp(f, 100, 116, EASE.exit); // 20.9 sinks into the rule
  const unit1Out = ramp(f, 96, 108, EASE.exit);
  const rise119 = ramp(f, 112, 140); // 11.9 rises from the pink segment
  const unit2 = ramp(f, 132, 154);

  // ---------- Transition: numerals sink, the rule drops and thins, its colors drain into the measures ----------
  const sink = ramp(f, 166, 182, EASE.exit);
  const drop = ramp(f, 174, 196, EASE.move);
  const ruleY = lerp(BASE_Y, AXIS_Y, drop);
  const ruleH = lerp(RULE_H, AXIS_H, drop);

  // ---------- Beat 2 ----------
  const m73 = ramp(f, 192, 226, EASE.move);
  const m119 = ramp(f, 202, 246, EASE.move);
  const n73 = ramp(f, 218, 242);
  const n119 = ramp(f, 238, 264);
  const cap2 = ramp(f, 190, 212);
  const weeks = ramp(f, 250, 278, EASE.move); // elapsed time between the two measures
  const hair = ramp(f, 258, 286, EASE.move); // the 73 level, carried across to the peak measure
  const delta = ramp(f, 280, 304);
  const unit3 = ramp(f, 290, 312);

  const beat1 = f < 188;
  const beat2 = f >= 188;

  // The bar's colored segments: fill in beat 1, drain into the measures in beat 2.
  const blueLen = BYPASS * PX_PER_M * splitBlue * (1 - m73);
  const pinkLen = STRANDED * PX_PER_M * splitPink * (1 - m119);

  const y73 = yOf(PRICE_FROM);
  const y119 = yOf(PRICE_PEAK);

  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.bg }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        {/* ---------- Beat 1 ---------- */}
        {beat1 && (
          <g>
            <Caption x={M} y={78} opacity={cap1 * (1 - sink)}>
              Strait of Hormuz · crude oil flow · million barrels a day
            </Caption>
            <Caption x={W - M} y={78} anchor="end" opacity={cap1 * (1 - sink)}>
              Source EIA
            </Caption>

            {/* 20.9 stands on the rule, then sinks into it */}
            <Numeral id="n209" text="20.9" x={M - 14} size={600} weight={800} color={COLOR.textPrimary} rule={BASE_Y} mode="stand" reveal={n1 * (1 - sink20)} opacity={1 - ramp(f, 110, 116)} />
            <Serif x={W - M} y={BASE_Y - 8} size={84} anchor="end" opacity={unit1 * (1 - unit1Out)} lines={["million barrels", "of crude oil", "pass every day"]} />

            {/* 11.9 rises from the pink segment */}
            <Numeral id="n119" text="11.9" x={SPLIT_X - 10} size={600} weight={800} color={COLOR.highlight} rule={BASE_Y} mode="stand" reveal={rise119 * (1 - sink)} opacity={1 - ramp(f, 174, 182)} />
            <Serif x={SPLIT_X} y={BASE_Y - CAP * 600 - 60} size={64} opacity={unit2 * (1 - sink)} lines={["million barrels a day", "have no other route"]} />

            {/* labels under the rule */}
            <Label x={M} y={BASE_Y + RULE_H + 62} value="9.0" text="can be rerouted by pipeline" color={COLOR.contrast} opacity={lab9 * (1 - sink)} />
            <Label x={SPLIT_X} y={BASE_Y + RULE_H + 62} value="11.9" text="no other route" color={COLOR.highlight} opacity={lab119 * (1 - sink)} />
            <Label x={W - M} y={BASE_Y + RULE_H + 62} value="20.9" text="through the strait" color={COLOR.textSecondary} anchor="end" opacity={lab9 * (1 - sink)} />
          </g>
        )}

        {/* ---------- The rule: baseline, then axis ---------- */}
        <rect x={M} y={ruleY} width={RULE_LEN * ruleDraw} height={ruleH} fill={COLOR.textPrimary} />
        <rect x={M} y={ruleY} width={blueLen} height={ruleH} fill={COLOR.contrast} />
        <rect x={W - M - pinkLen} y={ruleY} width={pinkLen} height={ruleH} fill={COLOR.highlight} />

        {/* ---------- Beat 2 ---------- */}
        {beat2 && (
          <g>
            <Caption x={M} y={78} opacity={cap2}>
              Brent crude · US dollars a barrel
            </Caption>
            <Caption x={W - M} y={78} anchor="end" opacity={cap2}>
              Source market data
            </Caption>
            <Caption x={M} y={AXIS_Y + 36} opacity={cap2}>
              $0
            </Caption>

            {/* measures rise from the axis, zero based, in the colors that drained from the bar */}
            <rect x={M} y={lerp(AXIS_Y, y73, m73)} width={AXIS_H} height={(AXIS_Y - y73) * m73} fill={COLOR.contrast} />
            <rect x={W - M - AXIS_H} y={lerp(AXIS_Y, y119, m119)} width={AXIS_H} height={(AXIS_Y - y119) * m119} fill={COLOR.highlight} />
            {/* ticks at the levels */}
            <rect x={M} y={y73} width={44 * n73} height={AXIS_H} fill={COLOR.contrast} />
            <rect x={W - M - 44 * n119} y={y119} width={44 * n119} height={AXIS_H} fill={COLOR.highlight} />

            {/* the 73 level carried across to the peak measure: the pink above it is the rise */}
            <rect x={M} y={y73} width={RULE_LEN * hair} height={2} fill={COLOR.textTertiary} opacity={0.7} />

            <Numeral id="n73" prefix="$" text="73" x={M + 36} size={300} weight={700} color={COLOR.textSecondary} rule={y73 + AXIS_H} mode="hang" reveal={n73} />
            <Numeral id="n119b" prefix="$" text="119" x={W - M - 40} size={430} weight={800} color={COLOR.highlight} anchor="end" rule={y119 + AXIS_H} mode="hang" reveal={n119} />

            <Serif x={W - M - 40} y={y73 + 250} size={220} anchor="end" color={COLOR.textPrimary} opacity={delta} lines={["+63%"]} />
            <Caption x={W - M - 40} y={y73 + 300} anchor="end" opacity={unit3}>
              +$46 a barrel
            </Caption>

            {/* elapsed time between the two measures, bracketed just above the axis */}
            <g opacity={weeks}>
              <rect x={M + 24} y={AXIS_Y - 44} width={(RULE_LEN - 48) * weeks} height={2} fill={COLOR.textTertiary} opacity={0.7} />
              <rect x={M + 24} y={AXIS_Y - 54} width={2} height={22} fill={COLOR.textTertiary} opacity={0.7} />
              <rect x={W - M - 26} y={AXIS_Y - 54} width={2} height={22} fill={COLOR.textTertiary} opacity={0.7 * ramp(f, 274, 280)} />
              <Caption x={W / 2} y={AXIS_Y - 60} anchor="middle" opacity={ramp(f, 268, 284)}>
                three weeks after the blockade
              </Caption>
            </g>
          </g>
        )}
      </svg>
      <Grain />
    </AbsoluteFill>
  );
};
