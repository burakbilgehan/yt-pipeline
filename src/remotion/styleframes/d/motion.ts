/**
 * Motion vocabulary of direction D. Everything is a pure function of the frame.
 * Rhythm: a steady 100 bpm, one beat every 18 frames at 30 fps. State changes land ON a beat,
 * take 8 to 12 frames with a small overshoot, then hold for 1 to 1.5 s.
 */
import { Easing, interpolate } from "remotion";

export const W = 1920;
export const H = 1080;
export const BEAT = 18;
export const beat = (n: number) => n * BEAT;

export const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

export function ramp(frame: number, a: number, b: number, from = 0, to = 1, easing?: (t: number) => number): number {
  return interpolate(frame, [a, b], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
}

/** Ease-out with a small overshoot (Persona menu slide-in). c = 1.1 gives about 6 % overshoot. */
export function overshoot(t: number, c = 1.1): number {
  const u = clamp01(t) - 1;
  return 1 + (c + 1) * u * u * u + c * u * u;
}

/** Hard ease-out, no overshoot: for wipes and scale punches. */
export const HARD = Easing.bezier(0.1, 0.9, 0.15, 1);
export const SNAP_IN = Easing.bezier(0.6, 0, 0.9, 0.3);

/** Progress of a slide starting at `at`, with overshoot. 0 before, settles at 1. */
export function slide(frame: number, at: number, dur = 10, c = 1.1): number {
  if (frame < at) return 0;
  return overshoot((frame - at) / dur, c);
}

/** Scale punch on a beat: 1 -> 1.08 -> 1 over 10 frames. */
export function punch(frame: number, at: number, amount = 0.08, dur = 10): number {
  if (frame < at || frame > at + dur) return 1;
  const t = (frame - at) / dur;
  return 1 + amount * Math.sin(Math.PI * t) * (1 - t * 0.5);
}

/** Continuous idle: a deterministic sine drift. */
export function idle(frame: number, period: number, amp: number, phase = 0): number {
  return Math.sin(((frame + phase) / period) * Math.PI * 2) * amp;
}

/** Beat pulse for lamps and dots: 1 on the beat, decays over the beat. */
export function beatPulse(frame: number, decay = 10): number {
  const p = ((frame % BEAT) + BEAT) % BEAT;
  return Math.max(0, 1 - p / decay);
}

/** Deterministic hash in [0,1) for seeded placement. */
export function hash(i: number, salt = 0): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
