/**
 * Minimal pinhole camera for direction C. World units: 1 unit = 1 million barrels/day
 * on the floor (x), 1 unit = $10 on the price wall (y). x right, y up, z forward.
 * Everything is a pure function of the camera state, which is a pure function of the frame.
 */
import { Easing, interpolate } from "remotion";
import { EASE } from "../../catalog/tokens";

export const W = 1920;
export const H = 1080;
export const NEAR = 0.2;

export type V3 = readonly [number, number, number];
export type Cam = { x: number; y: number; z: number; pitch: number; f: number };
export type P2 = { x: number; y: number; d: number };

/** Camera-space transform: translate, then pitch (positive = looking down). */
export function toCamera(cam: Cam, p: V3): V3 {
  const dx = p[0] - cam.x;
  const dy = p[1] - cam.y;
  const dz = p[2] - cam.z;
  const c = Math.cos(cam.pitch);
  const s = Math.sin(cam.pitch);
  return [dx, dy * c + dz * s, -dy * s + dz * c];
}

export function project(cam: Cam, p: V3): P2 | null {
  const [x, y, z] = toCamera(cam, p);
  if (z < NEAR) return null;
  return { x: W / 2 + (cam.f * x) / z, y: H / 2 - (cam.f * y) / z, d: z };
}

/** Screen y of the world horizon (floor at infinity). */
export function horizonY(cam: Cam): number {
  return H / 2 - cam.f * Math.tan(cam.pitch);
}

/** Polyline to an SVG path string, clipped against the near plane segment by segment. */
export function polylinePath(cam: Cam, pts: readonly V3[]): string {
  let d = "";
  let open = false;
  for (let i = 0; i < pts.length - 1; i++) {
    let a = toCamera(cam, pts[i]);
    let b = toCamera(cam, pts[i + 1]);
    if (a[2] < NEAR && b[2] < NEAR) {
      open = false;
      continue;
    }
    if (a[2] < NEAR || b[2] < NEAR) {
      const t = (NEAR - a[2]) / (b[2] - a[2]);
      const m: V3 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, NEAR];
      if (a[2] < NEAR) a = m;
      else b = m;
      open = false;
    }
    const ax = W / 2 + (cam.f * a[0]) / a[2];
    const ay = H / 2 - (cam.f * a[1]) / a[2];
    const bx = W / 2 + (cam.f * b[0]) / b[2];
    const by = H / 2 - (cam.f * b[1]) / b[2];
    if (!open) d += `M${ax.toFixed(1)} ${ay.toFixed(1)}`;
    d += `L${bx.toFixed(1)} ${by.toFixed(1)}`;
    open = true;
  }
  return d;
}

/** Closed polygon (all points assumed in front of the camera) as an SVG path. */
export function polygonPath(cam: Cam, pts: readonly V3[]): string {
  for (const p of pts) if (toCamera(cam, p)[2] < NEAR) return "";
  const d = polylinePath(cam, [...pts, pts[0]]);
  return d ? d + "Z" : "";
}

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const smooth = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};

/** Eased interpolation over a frame window. */
export function ramp(frame: number, from: number, to: number, a: number, b: number, easing = EASE.move): number {
  return interpolate(frame, [from, to], [a, b], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
}

/** Scene constants shared by the beats. */
export const SCENE = {
  gateZ: 13,
  splitZ: 2,
  splitLen: 7,
  drift: -2.2,
  slabHeight: 1.4,
  wallZ: 34,
  camY2: 7.27,
} as const;

/** Camera moves: a long, near-linear dolly for beat 1, a symmetric push for the transition. */
const DOLLY = Easing.bezier(0.4, 0, 0.6, 1);
const PUSH = Easing.inOut(Easing.cubic);

/** Camera path for the 360 frames. Beat 1: dolly down the corridor. 165-215: rise through the gate. Beat 2: push in on the wall. */
export function cameraAt(frame: number): Cam {
  const f = 1400;
  if (frame <= 165) {
    return {
      x: 0,
      y: ramp(frame, 0, 165, 5.8, 5.0, DOLLY),
      z: ramp(frame, 0, 165, -17, -7, DOLLY),
      pitch: ramp(frame, 0, 165, 0.13, 0.09, DOLLY),
      f,
    };
  }
  if (frame <= 215) {
    return {
      x: 0,
      y: ramp(frame, 165, 215, 5.0, SCENE.camY2, PUSH),
      z: ramp(frame, 165, 215, -7, 14, PUSH),
      pitch: ramp(frame, 165, 215, 0.09, 0, PUSH),
      f,
    };
  }
  return {
    x: 0,
    y: SCENE.camY2,
    z: ramp(frame, 215, 360, 14, 15.5, EASE.linear),
    pitch: 0,
    f,
  };
}
