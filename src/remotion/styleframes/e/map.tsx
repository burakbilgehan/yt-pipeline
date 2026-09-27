/**
 * The Gulf map card of beat 1. Coastlines from world-atlas (land, 50 m) through a Mercator fit.
 * The only drawn routes are the two bypass pipelines, as straight schematic connections between
 * their sourced endpoints, labeled "schematic" on screen:
 *   ADCOP            Habshan 53.7E 23.8N -> Fujairah 56.3E 25.1N  (about 1.5 M b/d)
 *   Saudi East-West  Abqaiq  49.7E 25.9N -> Yanbu   38.1E 24.1N  (Yanbu is off the card, west)
 * No shipping lane is drawn. The strait itself is a marker at about 56.5E 26.5N.
 */
import React from "react";
import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { FeatureCollection } from "geojson";
import world from "world-atlas/land-50m.json";
import { COLOR } from "../../catalog/tokens";
import { ramp, HARD } from "./motion";
import { caption } from "./type";

const topo = world as any;
const land = feature(topo, topo.objects.land) as unknown as FeatureCollection;

export type Box = { w: number; h: number };
type LonLat = [number, number];

const VIEW: [number, number, number, number] = [47.6, 22.0, 60.4, 30.2];
const STRAIT: LonLat = [56.5, 26.55];
const PIPES: Array<{ id: string; from: LonLat; to: LonLat; fromLabel: string; toLabel: string }> = [
  { id: "adcop", from: [53.7, 23.8], to: [56.3, 25.1], fromLabel: "Habshan", toLabel: "Fujairah" },
  { id: "eastwest", from: [49.7, 25.9], to: [38.1, 24.1], fromLabel: "Abqaiq", toLabel: "to Yanbu" },
];

export function buildMap(box: Box) {
  const proj = geoMercator().fitExtent(
    [
      [0, 0],
      [box.w, box.h],
    ],
    {
      type: "Polygon",
      coordinates: [
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
  const pt = (p: LonLat) => proj(p) as [number, number];
  return { landD, pt, strait: pt(STRAIT), pipes: PIPES.map((p) => ({ ...p, a: pt(p.from), b: pt(p.to) })) };
}
export type MapModel = ReturnType<typeof buildMap>;

const TEXT_FONT = "Inter";

/** A small map label with a halo, anchored at a point with an offset. */
const MapLabel: React.FC<{ x: number; y: number; text: string; anchor?: "start" | "middle" | "end"; color?: string; size?: number; opacity?: number }> = ({
  x,
  y,
  text,
  anchor = "start",
  color = COLOR.textSecondary,
  size = 19,
  opacity = 1,
}) => (
  <g opacity={opacity}>
    <text x={x} y={y} textAnchor={anchor} fontFamily={TEXT_FONT} fontWeight={500} fontSize={size} fill={COLOR.surface} stroke={COLOR.surface} strokeWidth={6} strokeLinejoin="round">
      {text}
    </text>
    <text x={x} y={y} textAnchor={anchor} fontFamily={TEXT_FONT} fontWeight={500} fontSize={size} fill={color}>
      {text}
    </text>
  </g>
);

export const GulfMap: React.FC<{ frame: number; model: MapModel; box: Box; pipesAt: number; blockedAt: number }> = ({ frame, model: m, box, pipesAt, blockedAt }) => {
  const pipe = ramp(frame, pipesAt, pipesAt + 22, 0, 1, HARD);
  const blocked = frame >= blockedAt;
  const bar = ramp(frame, blockedAt, blockedAt + 8, 0, 1, HARD);
  const [sx, sy] = m.strait;
  return (
    <svg width={box.w} height={box.h} viewBox={`0 0 ${box.w} ${box.h}`} style={{ display: "block" }}>
      <defs>
        <clipPath id="e-map-clip">
          <rect width={box.w} height={box.h} />
        </clipPath>
      </defs>
      <g clipPath="url(#e-map-clip)">
        <rect width={box.w} height={box.h} fill={COLOR.surface} />
        <path d={m.landD} fill={COLOR.surface2} stroke={COLOR.grid} strokeWidth={1} />
        {/* bypass pipelines: straight schematic connections between sourced endpoints */}
        {pipe > 0 &&
          m.pipes.map((p) => {
            const len = Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1]);
            // the "schematic" tag sits at the middle of the visible run of the line
            const fr = p.id === "adcop" ? 0.5 : Math.min(0.5, Math.max(0.1, (130 - p.a[0]) / (p.b[0] - p.a[0])));
            const mx = p.a[0] + fr * (p.b[0] - p.a[0]);
            const my = p.a[1] + fr * (p.b[1] - p.a[1]);
            const ang = (Math.atan2(p.b[1] - p.a[1], p.b[0] - p.a[0]) * 180) / Math.PI;
            const flip = ang > 90 || ang < -90;
            return (
              <g key={p.id}>
                <line x1={p.a[0]} y1={p.a[1]} x2={p.b[0]} y2={p.b[1]} stroke={COLOR.contrast} strokeWidth={3} strokeLinecap="round" strokeDasharray={`${len} ${len}`} strokeDashoffset={len * (1 - pipe)} />
                <circle cx={p.a[0]} cy={p.a[1]} r={5} fill={COLOR.contrast} />
                <MapLabel x={p.a[0] + (p.id === "adcop" ? -10 : 0)} y={p.a[1] + (p.id === "adcop" ? 26 : -14)} text={p.fromLabel} anchor={p.id === "adcop" ? "end" : "start"} />
                {pipe >= 1 && (
                  <>
                    {p.id === "adcop" ? (
                      <>
                        <circle cx={p.b[0]} cy={p.b[1]} r={5} fill={COLOR.contrast} />
                        <MapLabel x={p.b[0] + 12} y={p.b[1] + 6} text={p.toLabel} />
                      </>
                    ) : (
                      <MapLabel x={16} y={p.a[1] + 44} text="to Yanbu, 38.1E" color={COLOR.textTertiary} />
                    )}
                    <g transform={`translate(${mx} ${my}) rotate(${flip ? ang + 180 : ang})`}>
                      <MapLabel x={0} y={p.id === "adcop" ? -12 : -12} text="schematic" anchor="middle" color={COLOR.contrast} size={15} />
                    </g>
                  </>
                )}
              </g>
            );
          })}
        {/* strait marker: a ring; on the blockade a bar drops across it */}
        <circle cx={sx} cy={sy} r={12} fill="none" stroke={blocked ? COLOR.highlight : COLOR.textSecondary} strokeWidth={2} />
        <circle cx={sx} cy={sy} r={3} fill={blocked ? COLOR.highlight : COLOR.textSecondary} />
        <MapLabel x={sx + 20} y={sy - 12} text="Strait of Hormuz" color={blocked ? COLOR.highlight : COLOR.textPrimary} size={20} />
        {bar > 0 && (
          <g transform={`translate(${sx} ${sy}) rotate(-35)`}>
            <rect x={-5} y={-36 * bar} width={10} height={72 * bar} fill={COLOR.highlight} />
          </g>
        )}
      </g>
    </svg>
  );
};
