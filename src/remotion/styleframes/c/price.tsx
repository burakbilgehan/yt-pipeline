/**
 * Beat 2 geometry: Brent crude as an upright wall standing on the floor at z = wallZ.
 * Vertical scale is honest from $0 (the floor) upward, 1 unit = $10. Horizontal: 0.55 units per day.
 * The path between $73 and the $119 peak is schematic (a smooth rise); only the endpoints are data.
 */
import React from "react";
import { COLOR } from "../../catalog/tokens";
import { Cam, P2, SCENE, V3, clamp01, polylinePath, project, smooth } from "./camera";
import { PINK_RGB } from "./flow";

export const PRICE_BEFORE = 73;
export const PRICE_PEAK = 119;
export const PEAK_DAY = 21;
const DAY_FROM = -34;
const DAY_UNIT = 0.55;
const DAY0_X = -6.05; // world x of the blockade day (camera x is 0)

export const dayX = (d: number) => DAY0_X + d * DAY_UNIT;
export const priceY = (p: number) => p / 10;

/** Schematic Brent path: flat before the blockade, then a smooth rise to the peak. */
export function priceAt(day: number): number {
  if (day <= 0) return PRICE_BEFORE + 0.35 * Math.sin(day * 0.9) + 0.2 * Math.sin(day * 2.3);
  const t = clamp01(day / PEAK_DAY);
  const rise = 0.62 * smooth(t / 0.55) + 0.38 * smooth((t - 0.45) / 0.55);
  return PRICE_BEFORE + (PRICE_PEAK - PRICE_BEFORE) * rise;
}

function wallPoint(day: number): V3 {
  return [dayX(day), priceY(priceAt(day)), SCENE.wallZ];
}

export type WallProps = {
  cam: Cam;
  /** 0..1 how much of the line (from DAY_FROM to PEAK_DAY) has been drawn. */
  progress: number;
  opacity: number;
  /** 0..1 reference lines and the blockade marker. */
  refs: number;
  peakRef: number;
};

export function wallAnchors(cam: Cam): { start: P2 | null; peak: P2 | null; day0: P2 | null } {
  return {
    start: project(cam, wallPoint(0)),
    peak: project(cam, wallPoint(PEAK_DAY)),
    day0: project(cam, [dayX(0), 0, SCENE.wallZ]),
  };
}

export const PriceWall: React.FC<WallProps> = ({ cam, progress, opacity, refs, peakRef }) => {
  if (opacity <= 0) return null;
  const endDay = DAY_FROM + (PEAK_DAY - DAY_FROM) * clamp01(progress);
  const pts: V3[] = [];
  for (let d = DAY_FROM; d < endDay; d += 0.25) pts.push(wallPoint(d));
  pts.push(wallPoint(endDay));
  const line = polylinePath(cam, pts);
  // Area under the line, down to the floor ($0). Screen-space polygon.
  const area = polylinePath(cam, [[dayX(DAY_FROM), 0, SCENE.wallZ], ...pts, [dayX(endDay), 0, SCENE.wallZ], [dayX(DAY_FROM), 0, SCENE.wallZ]]);
  const xl = dayX(DAY_FROM) - 20;
  const xr = dayX(PEAK_DAY) + 30;
  const refBefore = polylinePath(cam, [[xl, priceY(PRICE_BEFORE), SCENE.wallZ], [xr, priceY(PRICE_BEFORE), SCENE.wallZ]]);
  const refPeak = polylinePath(cam, [[dayX(-6), priceY(PRICE_PEAK), SCENE.wallZ], [xr, priceY(PRICE_PEAK), SCENE.wallZ]]);
  const day0 = polylinePath(cam, [[dayX(0), 0, SCENE.wallZ], [dayX(0), priceY(PRICE_PEAK) + 1.6, SCENE.wallZ]]);
  const floorLine = polylinePath(cam, [[xl, 0, SCENE.wallZ], [xr, 0, SCENE.wallZ]]);
  const head = project(cam, wallPoint(endDay));
  return (
    <g fill="none" opacity={opacity}>
      <defs>
        <linearGradient id="c-wall-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={`rgb(${PINK_RGB})`} stopOpacity={0.2} />
          <stop offset="0.6" stopColor={`rgb(${PINK_RGB})`} stopOpacity={0.03} />
          <stop offset="1" stopColor={`rgb(${PINK_RGB})`} stopOpacity={0} />
        </linearGradient>
        <linearGradient id="c-wall-day0" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={COLOR.textSecondary} stopOpacity={0.5} />
          <stop offset="1" stopColor={COLOR.textSecondary} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#c-wall-area)" />
      <path d={floorLine} stroke={COLOR.textTertiary} strokeWidth={1} opacity={0.6 * refs} />
      <path d={refBefore} stroke={COLOR.textTertiary} strokeWidth={1} strokeDasharray="1 7" strokeLinecap="round" opacity={refs} />
      <path d={day0} stroke="url(#c-wall-day0)" strokeWidth={1.2} opacity={refs} />
      <path d={refPeak} stroke={`rgba(${PINK_RGB},0.55)`} strokeWidth={1} strokeDasharray="1 7" strokeLinecap="round" opacity={peakRef} />
      <path d={line} stroke={`rgb(${PINK_RGB})`} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
      {head ? <circle cx={head.x} cy={head.y} r={5} fill={`rgb(${PINK_RGB})`} /> : null}
    </g>
  );
};
