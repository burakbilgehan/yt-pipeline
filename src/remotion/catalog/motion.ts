/**
 * Motion vocabulary of the catalog (style frame E). Every value is a pure function of the frame.
 * Frames here are design frames (DESIGN_FPS); read them with useFrame, never useCurrentFrame.
 */
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { toDesign } from "../timing";
import { DUR, EASE, MOTION } from "./tokens";

/** Current frame in design frames (fractional above DESIGN_FPS). */
export function useFrame(): number {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return toDesign(frame, fps);
}

/** Length of the current sequence in design frames. */
export function useDuration(): number {
  const { durationInFrames, fps } = useVideoConfig();
  return toDesign(durationInFrames, fps);
}

export const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Value from `from` to `to` between frames a and b, clamped. */
export function ramp(frame: number, a: number, b: number, from = 0, to = 1, easing?: (t: number) => number): number {
  if (b <= a) return frame >= a ? to : from;
  return interpolate(frame, [a, b], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
}

/** 0..1 progress of an animation starting at `start` lasting `dur` frames. */
export function progress(frame: number, start: number, dur: number, easing: (t: number) => number = EASE.settle): number {
  return ramp(frame, start, start + dur, 0, 1, easing);
}

/** Ease-out with a small overshoot (a menu sliding in). c = 0 is none. */
export function overshoot(t: number, c: number = MOTION.overshoot): number {
  const u = clamp01(t) - 1;
  return 1 + (c + 1) * u * u * u + c * u * u;
}

/** Scale punch: 1 -> 1 + amount -> 1 over DUR.kick frames. */
export function punch(frame: number, at: number | undefined): number {
  if (at === undefined || frame < at || frame > at + DUR.kick) return 1;
  const t = (frame - at) / DUR.kick;
  return 1 + MOTION.kick * Math.sin(Math.PI * t) * (1 - t * 0.6);
}

/** Slow drift: a sum of two incommensurate sines, so nothing repeats inside 12 s. */
export function drift(frame: number, amp: number, phase = 0): number {
  const { periodA, periodB } = MOTION.drift;
  return amp * (0.6 * Math.sin((frame + phase) / periodA) + 0.4 * Math.sin((frame + phase * 1.7) / periodB + 1.3));
}

/** Directional blur filter id for a velocity (px/frame); undefined below the threshold. */
export function blurFor(vx: number, vy: number): string | undefined {
  const speed = Math.hypot(vx, vy);
  const { min, l2, l3 } = MOTION.blur;
  if (speed < min) return undefined;
  const axis = Math.abs(vx) >= Math.abs(vy) ? "x" : "y";
  const level = speed < l2 ? 1 : speed < l3 ? 2 : 3;
  return `url(#cat-blur-${axis}${level})`;
}

/** Same, for a rotation speed in degrees per frame (stage turns: horizontal blur). */
export function turnBlurFor(degPerFrame: number, axis: "x" | "y" = "x"): string | undefined {
  const { min, l2, l3 } = MOTION.turnBlur;
  const w = Math.abs(degPerFrame);
  if (w < min) return undefined;
  return `url(#cat-blur-${axis}${w < l2 ? 1 : w < l3 ? 2 : 3})`;
}

/** Linear blend of two #RRGGBB colors. */
export function mixColor(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * clamp01(t))).join(",")})`;
}
