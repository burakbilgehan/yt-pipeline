import React from "react";
import { GIANT_BEARING, GIANT_EM, LAYOUT } from "../tokens";

export { progress } from "../motion";

/** Format a number with fixed decimals and thousands separators. */
export function formatNumber(v: number, decimals = 0): string {
  return v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** Absolutely positioned box inside the content area (coordinates are frame pixels). */
export const Box: React.FC<{ x: number; y: number; w?: number; h?: number; style?: React.CSSProperties; children?: React.ReactNode }> = ({ x, y, w, h, style, children }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, ...style }}>{children}</div>
);

/**
 * Round axis ticks from 0 up to the first step at or above `max`, with steps of
 * 1, 2 or 5 x 10^k chosen so there are about `count` intervals (23.2 -> 0..25 by 5,
 * 119 -> 0..120 by 20). Each tick is an integer multiple of the step, so no float drift.
 */
export function niceTicks(max: number, count = 5): { ticks: number[]; step: number; decimals: number } {
  if (!(max > 0)) return { ticks: [0, 1], step: 1, decimals: 0 };
  const raw = max / count;
  const power = Math.floor(Math.log10(raw));
  const err = raw / Math.pow(10, power);
  const factor = err >= Math.sqrt(50) ? 10 : err >= Math.sqrt(10) ? 5 : err >= Math.sqrt(2) ? 2 : 1;
  const scale = (k: number) => (power >= 0 ? k * factor * Math.pow(10, power) : (k * factor) / Math.pow(10, -power));
  const n = Math.ceil(max / scale(1) - 1e-9);
  return { ticks: Array.from({ length: n + 1 }, (_, k) => scale(k)), step: scale(1), decimals: Math.max(0, -Math.floor(Math.log10(scale(1)))) };
}

/** Width in px of a string set in giant type at `px` (see GIANT_EM). */
export function giantWidth(text: string, px: number): number {
  let em = 0;
  for (const ch of text) {
    if (/[0-9]/.test(ch)) em += GIANT_EM.digit;
    else if (/[.,:\u2009 ]/.test(ch)) em += GIANT_EM.punct;
    else if (ch === "%") em += GIANT_EM.percent;
    else if (/[$+\u2212-]/.test(ch)) em += GIANT_EM.sign;
    else em += GIANT_EM.letter;
  }
  return em * px;
}

/** The largest size up to `max` at which `text` in giant type fits `width`. */
export function fitGiant(text: string, max: number, width: number = LAYOUT.content.right - LAYOUT.content.left): number {
  const w = giantWidth(text, 1);
  return w > 0 ? Math.min(max, Math.floor(width / w)) : max;
}

export const MINUS = "\u2212";

/** Left offset (px, negative) that puts the first ink of a left-aligned giant string on its x. */
export function giantInkOffset(text: string, px: number): number {
  const first = text.trim()[0] ?? "";
  return -Math.round((GIANT_BEARING[first] ?? GIANT_BEARING.default) * px);
}
