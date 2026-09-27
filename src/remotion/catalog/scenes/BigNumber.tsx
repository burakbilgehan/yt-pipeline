/**
 * big-number: one figure the narration stops on, set as a giant numeral at the left margin.
 * The unit and context sit in the column right of the numeral, on its baseline (under it when
 * the numeral is too wide). Without a reference the numeral block sits on the optical middle.
 *
 * reference kind "part" (a share of the value, e.g. bypass capacity of a flow): one stacked bar
 * across the full width, zero at the left margin and the value at the right margin, both ends
 * marked. It draws in neutral, the reference segment fills with contrast on cue "reference",
 * then on cue "remainder" the rest fills with highlight and the headline turns: the numeral
 * leaves upward, the remainder slams in in highlight with a panel carrying remainderLabel.
 * The remainder is computed here (value - reference) at the scene's decimals.
 *
 * reference kind "benchmark" (an independent figure): two labeled bars on one zero-based scale,
 * value in highlight, reference in neutral, the reference row landing on cue "reference".
 */
import React from "react";

import { COLOR, DUR, EASE, LAYOUT, MOTION, SHAPE, TYPE, body, caption, giant, value as valueStyle } from "../tokens";
import { progress, useFrame } from "../motion";
import { Layer, Panel, Snap } from "../ui";
import { SegLabel, fitGiant, formatNumber, giantInkOffset, giantWidth, segLabelWidth, segLabels } from "./common";

export interface BigNumberProps {
  value: number;
  decimals?: number;
  prefix?: string;
  unit?: string;
  context: string;
  /** Row label for the main figure when a benchmark is shown. */
  label?: string;
  reference?: { label: string; value: number; kind: "part" | "benchmark"; remainderLabel?: string };
  referenceAt?: number;
  remainderAt?: number;
}

const { content } = LAYOUT;
const WIDTH = content.right - content.left;
const BAR = { top: 800, h: 40 };
/** Scene frame at which the numeral snaps in. */
const NUM_AT = 0;
/** Minimum width of the column right of the numeral; narrower and the text goes under it. */
const SIDE_MIN = 520;
const SIDE_GAP = 72;

export const BigNumber: React.FC<BigNumberProps> = ({ value, decimals = 0, prefix = "", unit, context, label, reference, referenceAt, remainderAt }) => {
  const frame = useFrame();
  const fmt = (v: number) => `${prefix}${formatNumber(v, decimals)}`;
  const main = fmt(value);
  const part = reference?.kind === "part" ? reference : undefined;
  const bench = reference?.kind === "benchmark" ? reference : undefined;
  const rest = part ? +(value - part.value).toFixed(decimals) : 0;

  // With a reference the text column always fits beside the numeral, so nothing stacks into the bars.
  const widest = part && fmt(rest).length > main.length ? fmt(rest) : main;
  const size = fitGiant(widest, TYPE.giant.sizes.xl, reference ? WIDTH - SIDE_MIN - SIDE_GAP : WIDTH);
  const numW = giantWidth(main, size);
  const side = WIDTH - numW - SIDE_GAP >= SIDE_MIN;
  const top = reference ? content.top : content.top + (content.bottom - content.top) / 2 - size / 2 - (side ? 0 : 80);

  const barAt = NUM_AT + 14;
  const refAt = Math.max(referenceAt ?? barAt + 36, barAt + 12);
  const restAt = Math.max(remainderAt ?? refAt + 40, refAt + 12);

  const textBlock = (lines: React.ReactNode) =>
    side ? (
      <div style={{ position: "absolute", left: content.left + numW + SIDE_GAP, right: LAYOUT.width - content.right, top, height: size * 0.9, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
        {lines}
      </div>
    ) : (
      <div style={{ position: "absolute", left: content.left, right: LAYOUT.width - content.right, top: top + size + 24 }}>{lines}</div>
    );

  return (
    <>
      <Layer frame={frame} z={MOTION.z.figure}>
        <Snap frame={frame} at={NUM_AT} from={{ x: 600 }} out={part ? { at: restAt - DUR.snapOut + 1, y: -240 } : undefined}>
          <div style={{ position: "absolute", left: content.left + giantInkOffset(main, size), top, ...giant(size, COLOR.textPrimary) }}>{main}</div>
          {textBlock(
            <>
              {unit && <div style={{ ...body("l", COLOR.textPrimary, 500), whiteSpace: "normal", opacity: progress(frame, NUM_AT + 8, DUR.snap) }}>{unit}</div>}
              <div style={{ ...body("m", COLOR.textSecondary), whiteSpace: "normal", marginTop: 6, opacity: progress(frame, NUM_AT + 14, DUR.snap) }}>{context}</div>
            </>,
          )}
        </Snap>
        {part && (
          <Snap frame={frame} at={restAt} from={{ x: 700 }}>
            <div style={{ position: "absolute", left: content.left + giantInkOffset(fmt(rest), size), top, ...giant(size, COLOR.highlight) }}>{fmt(rest)}</div>
            {textBlock(
              <>
                {unit && <div style={{ ...body("l", COLOR.textPrimary, 500), whiteSpace: "normal" }}>{unit}</div>}
              </>,
            )}
          </Snap>
        )}
        {part && (
          <Snap frame={frame} at={restAt + 5} from={{ x: -700 }}>
            <RemainderPanel text={part.remainderLabel!} top={top + size + 24} />
          </Snap>
        )}
      </Layer>

      {part && <PartBar frame={frame} value={value} part={part.value} rest={rest} fmt={fmt} refLabel={part.label} restLabel={part.remainderLabel!} barAt={barAt} refAt={refAt} restAt={restAt} />}
      {bench && <BenchRows frame={frame} value={value} bench={bench} label={label} fmt={fmt} barAt={barAt} refAt={refAt} />}
    </>
  );
};

const RemainderPanel: React.FC<{ text: string; top: number }> = ({ text, top }) => {
  const size = TYPE.caption.sizes.l;
  // Uppercase Inter 500 with 0.12em tracking: about 0.78 em per character.
  const w = Math.round(text.length * size * 0.78) + 2 * 36 + SHAPE.panelSkew;
  return (
    <Panel x={content.left} y={top} w={w} h={62} fill={COLOR.highlight}>
      <div style={{ ...caption("l", COLOR.bg), position: "absolute", left: 36 + SHAPE.panelSkew / 2, top: 18 }}>{text}</div>
    </Panel>
  );
};

/** One stacked bar: zero at the left margin, the value at the right margin. */
const PartBar: React.FC<{
  frame: number;
  value: number;
  part: number;
  rest: number;
  fmt: (v: number) => string;
  refLabel: string;
  restLabel: string;
  barAt: number;
  refAt: number;
  restAt: number;
}> = ({ frame, value, part, rest, fmt, refLabel, restLabel, barAt, refAt, restAt }) => {
  const px = (v: number) => (v / value) * WIDTH;
  const draw = progress(frame, barAt, 30, EASE.move);
  const blue = progress(frame, refAt, 10, EASE.hard);
  const pink = progress(frame, restAt, 10, EASE.hard);
  const labels = segLabels([
    { cx: content.left + px(part) / 2, w: segLabelWidth(fmt(part), refLabel) },
    { cx: content.left + px(part) + px(rest) / 2, w: segLabelWidth(fmt(rest), restLabel) },
  ]);
  if (frame < barAt) return null;
  const axisTop = BAR.top + BAR.h + 6;
  return (
    <Layer frame={frame} z={MOTION.z.measure} flat>
      {/* One bar: the segments are clipped by the drawn extent, so only its two ends are rounded. */}
      <div style={{ position: "absolute", left: content.left, top: BAR.top, width: WIDTH * draw, height: BAR.h, overflow: "hidden", borderRadius: SHAPE.radius, background: COLOR.dataNeutral }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: px(part) * blue, height: BAR.h, background: COLOR.contrast }} />
        <div style={{ position: "absolute", left: px(part), top: 0, width: px(rest) * pink, height: BAR.h, background: COLOR.highlight }} />
      </div>
      <div style={{ position: "absolute", left: content.left, top: axisTop, width: WIDTH * draw, height: 1, background: COLOR.textTertiary, opacity: 0.6 }} />
      <div style={{ position: "absolute", left: content.left, top: axisTop, width: 1, height: 10, background: COLOR.textTertiary }} />
      <div style={{ position: "absolute", left: content.left, top: axisTop + 18, ...caption("xs", COLOR.textTertiary) }}>0</div>
      {draw >= 1 && (
        <>
          <div style={{ position: "absolute", left: content.right - 1, top: axisTop, width: 1, height: 10, background: COLOR.textTertiary }} />
          <div style={{ position: "absolute", right: LAYOUT.width - content.right, top: axisTop + 18, ...caption("xs", COLOR.textTertiary) }}>{fmt(value)}</div>
        </>
      )}
      <Snap frame={frame} at={refAt + 4} dur={9} from={{ y: 40 }}>
        <SegLabel x={labels[0]} top={BAR.top + BAR.h + 44} v={fmt(part)} text={refLabel} color={COLOR.contrast} />
      </Snap>
      <Snap frame={frame} at={restAt + 4} dur={9} from={{ y: 40 }}>
        <SegLabel x={labels[1]} top={BAR.top + BAR.h + 44} v={fmt(rest)} text={restLabel} color={COLOR.highlight} />
      </Snap>
    </Layer>
  );
};

/** Two labeled bars on one zero-based scale: label and value above each bar. */
const BenchRows: React.FC<{
  frame: number;
  value: number;
  bench: { label: string; value: number };
  label?: string;
  fmt: (v: number) => string;
  barAt: number;
  refAt: number;
}> = ({ frame, value, bench, label, fmt, barAt, refAt }) => {
  const max = Math.max(value, bench.value);
  const rows = [
    { top: 640, label: label ?? "", v: value, color: COLOR.highlight, ink: COLOR.textPrimary, at: barAt },
    { top: 800, label: bench.label, v: bench.value, color: COLOR.dataNeutral, ink: COLOR.textSecondary, at: refAt },
  ];
  return (
    <Layer frame={frame} z={MOTION.z.measure} flat>
      {rows.map((r, i) =>
        frame < r.at ? null : (
          <Snap key={i} frame={frame} at={r.at} from={{ x: -120 }}>
            <div style={{ position: "absolute", left: content.left, top: r.top, display: "flex", alignItems: "baseline", gap: 20 }}>
              <span style={caption("xs", COLOR.textSecondary)}>{r.label}</span>
              <span style={valueStyle("m", r.ink)}>{fmt(r.v)}</span>
            </div>
            <div style={{ position: "absolute", left: content.left, top: r.top + 56, width: (r.v / max) * WIDTH * progress(frame, r.at, DUR.barGrow, EASE.hard), height: BAR.h, background: r.color, borderRadius: `0 ${SHAPE.radius}px ${SHAPE.radius}px 0` }} />
          </Snap>
        ),
      )}
    </Layer>
  );
};
