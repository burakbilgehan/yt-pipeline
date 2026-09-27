/**
 * Motion vocabulary of direction E. Every value is a pure function of the frame.
 * Editing grammar from D (hard snaps with overshoot, holds), easing from C (confident, no bounce
 * on camera moves), and a slow drift that keeps the stage alive without any periodic accent.
 */
import { Easing, interpolate } from "remotion";

export const W = 1920;
export const H = 1080;

export const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export function ramp(frame: number, a: number, b: number, from = 0, to = 1, easing?: (t: number) => number): number {
  return interpolate(frame, [a, b], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
}

/** Ease-out with a small overshoot (menu slide-in). c = 1.1 is about 6 % overshoot; 0 = none. */
export function overshoot(t: number, c = 1.1): number {
  const u = clamp01(t) - 1;
  return 1 + (c + 1) * u * u * u + c * u * u;
}

/** Hard ease-out, no overshoot: wipes, fills, scale punches. */
export const HARD = Easing.bezier(0.1, 0.9, 0.15, 1);
/** Camera and turn moves: symmetric, confident. */
export const TURN = Easing.bezier(0.7, 0, 0.2, 1);
export const MOVE = Easing.bezier(0.2, 0, 0, 1);
export const SETTLE = Easing.bezier(0.05, 0.7, 0.1, 1);

/** Progress of a slide starting at `at`, with overshoot. 0 before, settles at 1. */
export function slide(frame: number, at: number, dur = 10, c = 1.1): number {
  if (frame < at) return 0;
  return overshoot((frame - at) / dur, c);
}

/** Scale punch: 1 -> 1 + amount -> 1 over `dur` frames. Used for the two kicks only. */
export function punch(frame: number, at: number, amount = 0.03, dur = 9): number {
  if (frame < at || frame > at + dur) return 1;
  const t = (frame - at) / dur;
  return 1 + amount * Math.sin(Math.PI * t) * (1 - t * 0.6);
}

/** Slow drift: a sum of two incommensurate sines, so nothing repeats inside 12 s. */
export function drift(frame: number, amp: number, phase = 0): number {
  return amp * (0.6 * Math.sin((frame + phase) / 97) + 0.4 * Math.sin((frame + phase * 1.7) / 151 + 1.3));
}
