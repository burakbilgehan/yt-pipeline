/**
 * The vessel-traffic map of the Strait of Hormuz: the stage of beat 1.
 * Land from world-atlas (50m) through a Mercator fit on the Gulf. A shipping lane runs from the
 * northern Gulf through the strait into the Gulf of Oman; tankers move along it as stickers.
 * On the blockade beat a barrier drops across the strait; tankers west of it queue up in place,
 * the ones already through keep sailing. Bypass pipelines draw across the peninsula as dashed blue.
 */
import React from "react";
import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import { getLength, getPointAtLength, getTangentAtLength } from "@remotion/paths";
import type { FeatureCollection } from "geojson";
import world from "world-atlas/land-50m.json";
import { COLOR } from "../../catalog/tokens";
import { Tanker } from "./objects";
import { hash, idle, ramp } from "./motion";

const topo = world as any;
const land = feature(topo, topo.objects.land) as unknown as FeatureCollection;

export type MapBox = { w: number; h: number };

const VIEW: [number, number, number, number] = [49.2, 22.2, 60.6, 30.2]; // lon0 lat0 lon1 lat1
const LANE: [number, number][] = [
  [48.6, 28.9],
  [49.9, 27.9],
  [51.6, 27.0],
  [53.6, 26.2],
  [55.4, 26.25],
  [56.2, 26.62],
  [56.75, 26.5],
  [57.1, 25.9],
  [57.8, 25.2],
  [59.2, 24.3],
  [61.0, 23.6],
];
const STRAIT: [number, number] = [56.45, 26.6];
/** Habshan to Fujairah (ADCOP) and the Saudi East-West line leaving the frame toward Yanbu. */
const PIPES: [number, number][][] = [
  [
    [53.7, 23.7],
    [55.2, 24.6],
    [56.33, 25.15],
  ],
  [
    [49.9, 26.0],
    [47.5, 25.2],
    [45.0, 24.6],
  ],
];

export function buildMap(box: MapBox) {
  const proj = geoMercator().fitExtent(
    [
      [0, 0],
      [box.w, box.h],
    ],
    {
      type: "Polygon",
      coordinates: [
        // clockwise in lon/lat: d3 treats the small side of the ring as the interior
        [
          [VIEW[0], VIEW[1]],
          [VIEW[0], VIEW[3]],
          [VIEW[2], VIEW[3]],
          [VIEW[2], VIEW[1]],
          [VIEW[0], VIEW[1]],
        ],
      ],
    } as any,
  );
  const path = geoPath(proj);
  const landD = path(land as any) ?? "";
  const laneD = path({ type: "LineString", coordinates: LANE } as any) ?? "";
  const pipeDs = PIPES.map((p) => path({ type: "LineString", coordinates: p } as any) ?? "");
  const straitPt = proj(STRAIT) as [number, number];
  // Lane length up to the strait: sample the lane and find the closest point.
  const laneLen = getLength(laneD);
  let sStrait = 0;
  let best = Infinity;
  for (let s = 0; s <= laneLen; s += 4) {
    const p = getPointAtLength(laneD, s);
    const d = Math.hypot(p.x - straitPt[0], p.y - straitPt[1]);
    if (d < best) {
      best = d;
      sStrait = s;
    }
  }
  const pt = (lonlat: [number, number]) => proj(lonlat) as [number, number];
  return { landD, laneD, pipeDs, laneLen, sStrait, straitPt, pt };
}

export type MapModel = ReturnType<typeof buildMap>;

const N_TANKERS = 9;
const SPEED = 2.6; // px per frame along the lane
const GAP = 46; // queue spacing in lane px

/** Lane position of tanker i at frame f. Before the blockade: a wrapping stream. After: a queue. */
function tankerPos(m: MapModel, i: number, f: number, blockedAt: number): number | null {
  const s0 = (i / N_TANKERS) * m.laneLen + hash(i, 3) * 30;
  const free = (s: number) => ((s0 + SPEED * s) % m.laneLen + m.laneLen) % m.laneLen;
  if (f < blockedAt) return free(f);
  const sb = free(blockedAt);
  const stopLine = m.sStrait - 40;
  if (sb >= stopLine) {
    const s = sb + SPEED * (f - blockedAt);
    return s > m.laneLen ? null : s;
  }
  // rank among the west tankers by how close they were to the strait when it closed
  let rank = 0;
  for (let j = 0; j < N_TANKERS; j++) {
    if (j === i) continue;
    const sj = (((j / N_TANKERS) * m.laneLen + hash(j, 3) * 30 + SPEED * blockedAt) % m.laneLen + m.laneLen) % m.laneLen;
    if (sj < stopLine && sj > sb) rank++;
  }
  const target = stopLine - rank * GAP;
  const s = sb + SPEED * (f - blockedAt);
  return Math.min(s, target);
}

export const HormuzMap: React.FC<{
  frame: number;
  model: MapModel;
  box: MapBox;
  blockedAt: number;
  pipelineAt: number;
  light: boolean;
}> = ({ frame, model: m, box, blockedAt, pipelineAt, light }) => {
  const sea = light ? "#D9DCE3" : "#13151C";
  const landFill = light ? "#C4C8D1" : COLOR.surface2;
  const laneCol = light ? "#8C92A0" : COLOR.textTertiary;
  const shipFill = light ? COLOR.bg : COLOR.textPrimary;
  const blocked = frame >= blockedAt;
  const barrier = ramp(frame, blockedAt, blockedAt + 6);
  const pipe = ramp(frame, pipelineAt, pipelineAt + 14);
  const drift = idle(frame, 240, 4);
  const [sx, sy] = m.straitPt;
  return (
    <svg width={box.w} height={box.h} viewBox={`0 0 ${box.w} ${box.h}`} style={{ display: "block", background: sea }}>
      <defs>
        <clipPath id="d-map-clip">
          <rect width={box.w} height={box.h} />
        </clipPath>
      </defs>
      <g clipPath="url(#d-map-clip)" transform={`translate(${drift.toFixed(2)} 0)`}>
        <path d={m.landD} fill={landFill} />
        {/* shipping lane */}
        <path d={m.laneD} fill="none" stroke={laneCol} strokeWidth="2" strokeDasharray="8 10" strokeDashoffset={(-frame * 1.2).toFixed(1)} opacity={0.9} />
        {/* bypass pipelines */}
        {pipe > 0 &&
          m.pipeDs.map((d, i) => {
            const len = getLength(d);
            return (
              <g key={i}>
                <path d={d} fill="none" stroke={COLOR.contrast} strokeWidth="9" strokeLinecap="round" opacity={0.18} strokeDasharray={`${len} ${len}`} strokeDashoffset={(len * (1 - pipe)).toFixed(1)} />
                <path d={d} fill="none" stroke={COLOR.contrast} strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${len} ${len}`} strokeDashoffset={(len * (1 - pipe)).toFixed(1)} />
                <path d={d} fill="none" stroke={light ? "#ECEAE6" : COLOR.bg} strokeWidth="1.5" strokeDasharray="6 10" strokeDashoffset={(-frame * 1.6).toFixed(1)} opacity={pipe} />
              </g>
            );
          })}
        {/* tankers */}
        {Array.from({ length: N_TANKERS }, (_, i) => {
          const s = tankerPos(m, i, frame, blockedAt);
          if (s === null) return null;
          const p = getPointAtLength(m.laneD, s);
          const t = getTangentAtLength(m.laneD, s);
          const ang = (Math.atan2(t.y, t.x) * 180) / Math.PI;
          const bob = blocked ? idle(frame, 40 + i * 3, 0.8, i * 7) : 0;
          return <Tanker key={i} x={p.x} y={p.y + 5 + bob} rotate={ang} scale={0.17} fill={shipFill} detail={false} />;
        })}
        {/* strait marker and the barrier */}
        <circle cx={sx} cy={sy} r={blocked ? 0 : 10 + idle(frame, 36, 2)} fill="none" stroke={COLOR.contrast} strokeWidth="2" />
        <circle cx={sx} cy={sy} r={3} fill={blocked ? COLOR.highlight : COLOR.contrast} />
        {barrier > 0 && (
          <g transform={`translate(${sx} ${sy}) rotate(-38)`}>
            <rect x={-6} y={-44 * barrier} width={12} height={88 * barrier} fill={COLOR.highlight} />
            <rect x={-6} y={-44 * barrier} width={12} height={88 * barrier} fill="none" stroke={light ? "#ECEAE6" : COLOR.bg} strokeWidth="2" />
            <line x1={-6} y1={-30} x2={6} y2={-18} stroke={COLOR.bg} strokeWidth="3" opacity={0.6} />
            <line x1={-6} y1={-6} x2={6} y2={6} stroke={COLOR.bg} strokeWidth="3" opacity={0.6} />
            <line x1={-6} y1={18} x2={6} y2={30} stroke={COLOR.bg} strokeWidth="3" opacity={0.6} />
          </g>
        )}
      </g>
    </svg>
  );
};
