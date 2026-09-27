/**
 * Beat 1 geometry: the Hormuz flow as 209 lanes on the floor (1 lane = 0.1 million barrels/day),
 * 90 of which bend away into the pipeline bypass, 119 of which pass the gate.
 */
import React from "react";
import { COLOR } from "../../catalog/tokens";
import { Cam, SCENE, V3, polygonPath, polylinePath, smooth } from "./camera";

export const LANES = 209;
export const BYPASS = 90; // 9.0 million barrels/day
const LANE_W = 0.1;
const X0 = -(LANES * LANE_W) / 2 + LANE_W / 2; // leftmost lane center
const Z_FROM = -22;
const Z_TO = 80;

export const laneX = (i: number) => X0 + i * LANE_W;
export const isBypass = (i: number) => i < BYPASS;
export const PINK_RGB = "242,127,163";
export const BLUE_RGB = "90,155,216";
export const GRAY_RGB = "167,171,182";

/** Lateral offset of a bypass lane at depth z, for a given split amount (0..1). */
export function bypassDx(z: number, split: number): number {
  return SCENE.drift * split * smooth((z - SCENE.splitZ) / SCENE.splitLen);
}

function lanePoint(i: number, z: number, split: number): V3 {
  const x = laneX(i) + (isBypass(i) ? bypassDx(z, split) : 0);
  return [x, 0, z];
}

function lanePolyline(i: number, split: number): V3[] {
  if (!isBypass(i)) return [lanePoint(i, Z_FROM, split), lanePoint(i, Z_TO, split)];
  const pts: V3[] = [lanePoint(i, Z_FROM, split), lanePoint(i, SCENE.splitZ, split)];
  const n = 10;
  for (let k = 1; k <= n; k++) pts.push(lanePoint(i, SCENE.splitZ + (SCENE.splitLen * k) / n, split));
  pts.push(lanePoint(i, Z_TO, split));
  return pts;
}

/** Deterministic phase per lane (fractional part of a golden-ratio multiple). */
const phase = (i: number) => (i * 0.6180339887) % 1;

export type FlowProps = { cam: Cam; frame: number; split: number; tint: number; opacity: number };

/**
 * split: 0..1 how far the bypass lanes have bent away. tint: 0..1 how far the bypass lanes have
 * turned blue and the rest pink (before that, one undifferentiated flow).
 */
export const Flow: React.FC<FlowProps> = ({ cam, frame, split, tint, opacity }) => {
  const lanesPink: string[] = [];
  const lanesBlue: string[] = [];
  const dotsPink: string[] = [];
  const dotsBlue: string[] = [];
  const GAP = 6;
  const LEN = 1.1;
  const SPEED = 0.07;
  const range = Z_TO - Z_FROM;
  for (let i = 0; i < LANES; i++) {
    const poly = polylinePath(cam, lanePolyline(i, split));
    (isBypass(i) ? lanesBlue : lanesPink).push(poly);
    const count = Math.ceil(range / GAP);
    for (let k = 0; k < count; k++) {
      const z = Z_FROM + ((k * GAP + phase(i) * GAP + frame * SPEED) % range);
      const seg = polylinePath(cam, [lanePoint(i, z, split), lanePoint(i, z + LEN, split)]);
      if (seg) (isBypass(i) ? dotsBlue : dotsPink).push(seg);
    }
  }
  const mix = (rgb: string, t: number) => (t <= 0 ? GRAY_RGB : rgb);
  const pinkLane = `rgba(${mix(PINK_RGB, tint)},${(0.10 + 0.08 * tint) * opacity})`;
  const blueLane = `rgba(${mix(BLUE_RGB, tint)},${(0.10 + 0.06 * tint) * opacity})`;
  const pinkDot = `rgba(${mix(PINK_RGB, tint)},${(0.45 + 0.3 * tint) * opacity})`;
  const blueDot = `rgba(${mix(BLUE_RGB, tint)},${(0.45 + 0.25 * tint) * opacity})`;
  return (
    <g fill="none" strokeLinecap="round">
      <path d={lanesPink.join("")} stroke={pinkLane} strokeWidth={1} />
      <path d={lanesBlue.join("")} stroke={blueLane} strokeWidth={1} />
      <path d={dotsPink.join("")} stroke={pinkDot} strokeWidth={1.6} />
      <path d={dotsBlue.join("")} stroke={blueDot} strokeWidth={1.6} />
    </g>
  );
};

/**
 * The gate: land on both sides of the strait as two low slabs standing on the floor at gateZ.
 * The 119 pink lanes pass through the gap between them; the 90 bypass lanes run into the land
 * on the left (pipelines cross land) and re-emerge beyond it. Two floor lines at the slab base
 * are the honest widths: 11.9 across the gap, 9.0 where the bypass enters the land.
 */
export const Gate: React.FC<{ cam: Cam; strength: number; threshold: number }> = ({ cam, strength, threshold }) => {
  if (strength <= 0) return null;
  const xl = laneX(BYPASS) - LANE_W / 2;
  const xr = laneX(LANES - 1) + LANE_W / 2;
  const z = SCENE.gateZ;
  const h = SCENE.slabHeight;
  const far = 70;
  const leftSlab = polygonPath(cam, [[xl - far, 0, z], [xl, 0, z], [xl, h, z], [xl - far, h, z]]);
  const rightSlab = polygonPath(cam, [[xr, 0, z], [xr + far, 0, z], [xr + far, h, z], [xr, h, z]]);
  const leftTop = polylinePath(cam, [[xl - far, h, z], [xl, h, z]]);
  const rightTop = polylinePath(cam, [[xr, h, z], [xr + far, h, z]]);
  const leftEdge = polylinePath(cam, [[xl, 0, z], [xl, h, z]]);
  const rightEdge = polylinePath(cam, [[xr, 0, z], [xr, h, z]]);
  const gap = polylinePath(cam, [[xl, 0, z], [xr, 0, z]]);
  const bypassL = laneX(0) - LANE_W / 2 + bypassDx(z, 1);
  const bypassR = laneX(BYPASS - 1) + LANE_W / 2 + bypassDx(z, 1);
  const bypassFloor = polylinePath(cam, [[bypassL, 0, z], [bypassR, 0, z]]);
  const depth = 1.6;
  const leftTopFace = polygonPath(cam, [[xl - far, h, z], [xl, h, z], [xl, h, z + depth], [xl - far, h, z + depth]]);
  const rightTopFace = polygonPath(cam, [[xr, h, z], [xr + far, h, z], [xr + far, h, z + depth], [xr, h, z + depth]]);
  if (!leftSlab || !rightSlab) return null;
  return (
    <g opacity={strength}>
      <defs>
        <linearGradient id="c-slab-l" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={COLOR.surface2} stopOpacity={0.96} />
          <stop offset="1" stopColor={COLOR.surface} stopOpacity={0.92} />
        </linearGradient>
        <linearGradient id="c-slab-r" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={COLOR.surface2} stopOpacity={0.96} />
          <stop offset="1" stopColor={COLOR.surface} stopOpacity={0.92} />
        </linearGradient>
      </defs>
      <path d={leftTopFace + rightTopFace} fill={COLOR.grid} opacity={0.75} />
      <path d={leftSlab} fill="url(#c-slab-l)" />
      <path d={rightSlab} fill="url(#c-slab-r)" />
      <g fill="none" strokeLinecap="round">
        <path d={leftTop + rightTop} stroke={COLOR.textTertiary} strokeWidth={1} opacity={0.55} />
        <path d={leftEdge + rightEdge} stroke={COLOR.textSecondary} strokeWidth={1.2} opacity={0.8} />
        <path d={gap} stroke={`rgba(${PINK_RGB},${0.95 * threshold})`} strokeWidth={2.5} />
        <path d={bypassFloor} stroke={`rgba(${BLUE_RGB},${0.85 * threshold})`} strokeWidth={2} />
      </g>
    </g>
  );
};

/** Sparse floor grid for depth. Faint; fades with the fog overlay. */
export const FloorGrid: React.FC<{ cam: Cam; opacity: number }> = ({ cam, opacity }) => {
  if (opacity <= 0) return null;
  const parts: string[] = [];
  for (let x = -60; x <= 60; x += 4) parts.push(polylinePath(cam, [[x, 0, -30], [x, 0, 140]]));
  for (let z = -30; z <= 140; z += 6) parts.push(polylinePath(cam, [[-60, 0, z], [60, 0, z]]));
  return <path d={parts.join("")} fill="none" stroke={COLOR.grid} strokeWidth={0.8} opacity={0.55 * opacity} />;
};
