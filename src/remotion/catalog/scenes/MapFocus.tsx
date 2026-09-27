/**
 * map-focus: where something is. The map is a card (surface, rounded) filling the content area;
 * it turns in from edge-on as an object, then the camera inside it moves from a world view
 * (sphere outline, graticule) to the target (the focus countries, or the marker and route
 * neighbourhood) over DUR.mapZoom and drifts in by MAP.drift until the scene ends.
 * Equal Earth projection. Layers, bottom to top: sphere, graticule, land (one merged path),
 * borders and coastlines (topojson meshes), focus/contrast countries (low fill + outline, drawn
 * before the camera moves), route, marker, halo labels.
 * Every focus and contrast country gets a label (its world-atlas name at the geoCentroid)
 * unless an explicit label point falls inside it. Label positions are solved once, in the
 * settled view, and ride with their anchors during the drift.
 * Country ids are ISO 3166-1 numeric (world-atlas). Pure function of the frame.
 */
import React, { useId, useMemo } from "react";
import { geoCentroid, geoContains, geoEqualEarth, geoGraticule10, geoPath, type GeoProjection } from "d3-geo";
import { feature, mesh } from "topojson-client";
import { cutPath, getLength, getPointAtLength } from "@remotion/paths";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import world from "world-atlas/countries-50m.json";
import { COLOR, DUR, EASE, LAYOUT, MAP, MOTION, TYPE } from "../tokens";
import { Card, Layer } from "../ui";
import { progress } from "./common";
import { useFrame, useDuration } from "../motion";

type Anchor = "tr" | "br" | "tl" | "bl";
type LonLat = [number, number];

export interface MapFocusProps {
  focus: string[];
  contrast?: string[];
  labels?: Array<{ lon: number; lat: number; text: string; anchor?: Anchor }>;
  route?: Array<[number, number]>;
  routeLabel?: string;
  /** The point of interest (a strait, a port): the only saturated mark on the map. */
  marker?: { lon: number; lat: number; label?: string };
  /** Camera target: the focus countries (default), or the marker and route neighbourhood. */
  frame?: "countries" | "marker";
  /** Frame at which the camera starts moving from world view to the focus. */
  zoomAt?: number;
}

/** Minimum half-span in degrees around the marker when framing on it. */
const MARKER_SPAN: LonLat = [5, 3.5];

// Local layout constants (no token exists for these).
/** Inset of the world view inside the card, so the sphere reads as a whole shape. */
const WORLD_PAD = 40;
/** Inset of the fitted focus view inside the card. */
const FOCUS_PAD = MAP.pad;
/** Labels keep this clearance from the card edge. */
const EDGE = 32;
/** Draw-in of the focus outlines. */
const OUTLINE_DUR = 18;
/** Point-label offset from its anchor point (spec: +14, -14). */
const LABEL_OFFSET = 14;
/** A label placed further than this from its anchor gets a leader line. */
const LEADER_MIN = 40;
/** Country names longer than this break onto two lines at the middle space. */
const NAME_WRAP = 14;
/** Clearance kept around every label box (halo plus air). */
const LABEL_PAD = MAP.labelHalo / 2 + 4;

const topo = world as any;
const countries = feature(topo, topo.objects.countries) as unknown as FeatureCollection<Geometry, { name: string }>;
const land = feature(topo, topo.objects.land) as unknown as FeatureCollection;
const borders = mesh(topo, topo.objects.countries, (a: unknown, b: unknown) => a !== b);
const coast = mesh(topo, topo.objects.countries, (a: unknown, b: unknown) => a === b);
const graticule = geoGraticule10();
const SPHERE = { type: "Sphere" } as const;
/** Equal Earth at scale 1, translate 0: screen = translate + scale * raw. */
const raw = geoEqualEarth().scale(1).translate([0, 0]);

const content = LAYOUT.content;
const contentCenter: [number, number] = [(content.left + content.right) / 2, (content.top + content.bottom) / 2];
/** Labels stay inside the card, clear of its edge. */
const labelBounds = {
  x0: content.left + EDGE,
  x1: content.right - EDGE,
  y0: content.top + EDGE,
  y1: content.bottom - EDGE,
};

function fit(target: unknown, pad: number): GeoProjection {
  return geoEqualEarth().fitExtent(
    [
      [content.left + pad, content.top + pad],
      [content.right - pad, content.bottom - pad],
    ],
    target as any,
  );
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

interface Camera {
  kw: number;
  kf: number;
  pw: [number, number];
  pf: [number, number];
  r: [number, number];
}

/**
 * Projection at camera progress t (0 world, 1 fit) and drift factor s. The geographic
 * centre of the fitted view moves on a straight screen line while the scale grows
 * geometrically; the drift scales about that same point.
 */
function cameraProjection(c: Camera, t: number, s: number): GeoProjection {
  const k = c.kw * Math.pow(c.kf / c.kw, t) * s;
  const px = lerp(c.pw[0], c.pf[0], t);
  const py = lerp(c.pw[1], c.pf[1], t);
  return geoEqualEarth()
    .scale(k)
    .translate([px - k * c.r[0], py - k * c.r[1]])
    .clipExtent([
      [content.left - 2, content.top - 2],
      [content.right + 2, content.bottom + 2],
    ]);
}

/** Caption-size country names: uppercase, tracked, split onto two lines when long. */
function nameLines(name: string): string[] {
  const upper = name.toUpperCase();
  if (upper.length <= NAME_WRAP || !upper.includes(" ")) return [upper];
  const mid = upper.length / 2;
  let best = -1;
  for (let i = 0; i < upper.length; i++) if (upper[i] === " " && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  return [upper.slice(0, best), upper.slice(best + 1)];
}

/** Conservative advance width (slightly over the real Inter metrics), used only for layout. */
function textWidth(text: string, size: number, tracking: number, upper: boolean): number {
  return text.length * size * ((upper ? 0.68 : 0.55) + tracking);
}

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
const inside = (a: Box, b: typeof labelBounds) => a.x0 >= b.x0 && a.x1 <= b.x1 && a.y0 >= b.y0 && a.y1 <= b.y1;

type TextAnchor = "start" | "middle" | "end";

interface TextMetrics {
  lines: string[];
  size: number;
  lineH: number;
  w: number;
}

/** Box of a text block whose first baseline is at (x, y). */
function textBox(x: number, y: number, anchor: TextAnchor, m: TextMetrics): Box {
  const x0 = anchor === "start" ? x : anchor === "middle" ? x - m.w / 2 : x - m.w;
  return {
    x0: x0 - LABEL_PAD,
    x1: x0 + m.w + LABEL_PAD,
    y0: y - m.size * 0.78 - LABEL_PAD,
    y1: y + (m.lines.length - 1) * m.lineH + m.size * 0.22 + LABEL_PAD,
  };
}

interface LabelLayout {
  key: string;
  at: LonLat;
  kind: "country" | "point";
  lines: string[];
  textAnchor: TextAnchor;
  /** First baseline relative to the projected anchor, solved in the settled view. */
  dx: number;
  dy: number;
  /** Leader end relative to the anchor (nearest point of the text box), or null. */
  leader: [number, number] | null;
  dot: boolean;
  delay: number;
}

const HALO: React.SVGProps<SVGTextElement> = {
  stroke: COLOR.surface,
  strokeWidth: MAP.labelHalo,
  strokeLinejoin: "round",
  strokeLinecap: "round",
  paintOrder: "stroke",
};

/** Country names: caption xs (uppercase, tracked). Point labels: body m at weight 500. */
const CAPTION: TextMetrics = { lines: [], size: TYPE.caption.sizes.xs, lineH: TYPE.caption.sizes.xs * 1.3, w: 0 };
const BODY: TextMetrics = { lines: [], size: TYPE.body.sizes.m, lineH: TYPE.body.sizes.m * TYPE.body.lineHeight, w: 0 };

export const MapFocus: React.FC<MapFocusProps> = ({ focus, contrast = [], labels = [], route, routeLabel, marker, frame: frameOn = "countries", zoomAt: zoomAtCue }) => {
  const zoomAt = Math.max(zoomAtCue ?? 30, DUR.cardTurnIn - 6);
  const frame = useFrame();
  const durationInFrames = useDuration();
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");

  const focusFeatures = useMemo(() => countries.features.filter((f) => focus.includes(String(f.id))), [focus]);
  const contrastFeatures = useMemo(() => countries.features.filter((f) => contrast.includes(String(f.id))), [contrast]);

  const camera = useMemo<Camera>(() => {
    const worldProj = fit(SPHERE, WORLD_PAD);
    const target: any =
      frameOn === "marker" && marker
        ? (() => {
            const pts: LonLat[] = [[marker.lon, marker.lat], ...(route ?? [])];
            const lons = pts.map((q) => q[0]);
            const lats = pts.map((q) => q[1]);
            const cx = (Math.min(...lons) + Math.max(...lons)) / 2;
            const cy = (Math.min(...lats) + Math.max(...lats)) / 2;
            const hx = Math.max(MARKER_SPAN[0], (Math.max(...lons) - Math.min(...lons)) / 2 + 1);
            const hy = Math.max(MARKER_SPAN[1], (Math.max(...lats) - Math.min(...lats)) / 2 + 1);
            return { type: "MultiPoint", coordinates: [[cx - hx, cy - hy], [cx + hx, cy - hy], [cx + hx, cy + hy], [cx - hx, cy + hy]] };
          })()
        : { type: "FeatureCollection", features: focusFeatures };
    const focusProj = fit(target, FOCUS_PAD);
    const g = focusProj.invert!(contentCenter) as LonLat;
    return { kw: worldProj.scale(), kf: focusProj.scale(), pw: worldProj(g)!, pf: focusProj(g)!, r: raw(g)! };
  }, [focusFeatures, frameOn, marker, route]);

  // Timing (frames from scene start). The outline draws after the scene has faded in and before the camera moves.
  const outlineStart = Math.min(DUR.snap, Math.max(0, zoomAt - DUR.snap));
  const outlineDur = Math.max(1, Math.min(OUTLINE_DUR, zoomAt - 4 - outlineStart));
  const outlineT = progress(frame, outlineStart, outlineDur, EASE.move);
  const t = progress(frame, zoomAt, DUR.mapZoom, EASE.move);
  const zoomEnd = zoomAt + DUR.mapZoom;
  const drift = progress(frame, zoomEnd, Math.max(1, durationInFrames - zoomEnd), EASE.linear);
  const markerT = progress(frame, zoomEnd - 6, DUR.snap, EASE.settle);
  const labelStart = zoomEnd;
  const routeStart = zoomEnd + 12;
  const routeT = progress(frame, routeStart, DUR.route, EASE.move);

  const proj = cameraProjection(camera, t, 1 + MAP.drift * drift);
  const path = geoPath(proj);
  const d = (g: unknown) => path(g as any) ?? undefined;

  // Label layout, solved once in the settled view (t = 1, no drift). Priority: marker label,
  // explicit labels, then one auto label per focus/contrast country not covered by an explicit label.
  const layout = useMemo<LabelLayout[]>(() => {
    const settled = cameraProjection(camera, 1, 1);
    const obstacles: Box[] = [];
    const out: LabelLayout[] = [];
    const fits = (b: Box) => inside(b, labelBounds) && !obstacles.some((o) => overlaps(o, b));

    if (marker) {
      const p = settled([marker.lon, marker.lat]);
      const r = MAP.marker.r + MAP.marker.stroke;
      if (p) obstacles.push({ x0: p[0] - r, y0: p[1] - r, x1: p[0] + r, y1: p[1] + r });
    }
    if (route && route.length >= 2) {
      const dRoute = geoPath(settled)({ type: "LineString", coordinates: route } as any);
      if (dRoute) {
        const len = getLength(dRoute);
        const h = MAP.labelHalo / 2 + MAP.route.head;
        for (let s = 0; s <= len; s += 6) {
          const q = getPointAtLength(dRoute, s);
          obstacles.push({ x0: q.x - h, y0: q.y - h, x1: q.x + h, y1: q.y + h });
        }
        const end = getPointAtLength(dRoute, len);
        obstacles.push({ x0: end.x - h, y0: end.y - h, x1: end.x + h, y1: end.y + h });
      }
    }
    for (const l of labels) {
      const p = settled([l.lon, l.lat]);
      if (p) obstacles.push({ x0: p[0] - 6, y0: p[1] - 6, x1: p[0] + 6, y1: p[1] + 6 });
    }

    // Point labels: the requested anchor first, then the other corners.
    const point = (key: string, at: LonLat, text: string, anchor: Anchor, offset: number, delay: number, dot: boolean, ownBox?: Box) => {
      const p = settled(at);
      if (!p) return;
      const m = { ...BODY, lines: [text], w: textWidth(text, BODY.size, 0, false) };
      const order: Anchor[] = [anchor, ...(["tr", "br", "tl", "bl"] as Anchor[]).filter((a) => a !== anchor)];
      const place = (a: Anchor) => {
        const right = a === "tr" || a === "br";
        const below = a === "br" || a === "bl";
        const x = p[0] + (right ? offset : -offset);
        const y = below ? p[1] + offset + m.size * 0.78 : p[1] - offset - m.size * 0.22;
        const ta: TextAnchor = right ? "start" : "end";
        return { x, y, ta, box: textBox(x, y, ta, m) };
      };
      const others = (b: Box) => inside(b, labelBounds) && !obstacles.some((o) => o !== ownBox && overlaps(o, b));
      const chosen = order.map(place).find((c) => others(c.box)) ?? place(anchor);
      obstacles.push(chosen.box);
      out.push({ key, at, kind: "point", lines: [text], textAnchor: chosen.ta, dx: chosen.x - p[0], dy: chosen.y - p[1], leader: null, dot, delay });
    };

    if (marker?.label) {
      const own = obstacles[0];
      // Clear the ring: offset along the diagonal to just outside the ring radius.
      const off = Math.round(MAP.marker.r * Math.SQRT1_2) + LABEL_OFFSET / 2;
      point("marker", [marker.lon, marker.lat], marker.label, "tr", off, zoomEnd + DUR.snap - 6, false, own);
    }
    const autoAt = labelStart + DUR.stagger * (marker?.label ? 1 : 0);
    labels.forEach((l, i) => point(`l-${i}`, [l.lon, l.lat], l.text, l.anchor ?? "tr", LABEL_OFFSET, autoAt + i * DUR.stagger, true));
    if (route && routeLabel) point("route", route[0], routeLabel, "tl", LABEL_OFFSET, routeStart + 6, false);

    // Country labels: centred on the centroid when free, else the nearest free spot (leader past LEADER_MIN).
    const covered = (f: Feature) => labels.some((l) => geoContains(f as any, [l.lon, l.lat]));
    const named = [...focusFeatures, ...contrastFeatures].filter((f) => !covered(f));
    const offsets: Array<[number, number]> = [];
    for (let oy = -160; oy <= 160; oy += 8) for (let ox = -240; ox <= 240; ox += 8) offsets.push([ox, oy]);
    // Nearest first; vertical moves cost a little more than horizontal ones (text is wide, not tall).
    offsets.sort((a, b) => Math.hypot(a[0], a[1] * 1.3) - Math.hypot(b[0], b[1] * 1.3));
    named.forEach((f, i) => {
      const at = geoCentroid(f as any) as LonLat;
      const raw0 = settled(at);
      if (!raw0) return;
      // A centroid outside the visible map (past the card edge) would pull a leader across the
      // header or footer: anchor on the nearest visible point instead and draw no leader.
      const vis = { x0: LAYOUT.content.left + EDGE, x1: LAYOUT.content.right - EDGE, y0: LAYOUT.content.top + EDGE, y1: LAYOUT.content.bottom - EDGE };
      const p: [number, number] = [Math.min(Math.max(raw0[0], vis.x0), vis.x1), Math.min(Math.max(raw0[1], vis.y0), vis.y1)];
      const offscreen = p[0] !== raw0[0] || p[1] !== raw0[1];
      const lines = nameLines(f.properties?.name ?? "");
      const m = { ...CAPTION, lines, w: Math.max(...lines.map((s) => textWidth(s, CAPTION.size, 0.12, true))) };
      // Block centred on the anchor: first baseline sits so the block's visual middle is at p.
      const baseDy = -((lines.length - 1) * m.lineH) / 2 + m.size * 0.35;
      const candidate = (o: [number, number]) => {
        const x = p[0] + o[0];
        const y = p[1] + baseDy + o[1];
        return { o, x, y, box: textBox(x, y, "middle", m) };
      };
      const chosen = offsets.map(candidate).find((c) => fits(c.box)) ?? candidate([0, 0]);
      obstacles.push(chosen.box);
      let leader: [number, number] | null = null;
      if (!offscreen && Math.hypot(chosen.o[0], chosen.o[1]) > LEADER_MIN) {
        const b = chosen.box;
        const lx = Math.min(Math.max(p[0], b.x0 + LABEL_PAD), b.x1 - LABEL_PAD);
        const ly = Math.min(Math.max(p[1], b.y0 + LABEL_PAD), b.y1 - LABEL_PAD);
        // Only when the anchor is outside the text block; a leader hidden under the text is noise.
        if (Math.hypot(lx - p[0], ly - p[1]) > MAP.labelHalo) leader = [lx - p[0], ly - p[1]];
      }
      out.push({ key: `c-${String(f.id)}`, at, kind: "country", lines, textAnchor: "middle", dx: chosen.x - raw0[0], dy: chosen.y - raw0[1], leader, dot: false, delay: autoAt + (labels.length + i) * DUR.stagger });
    });
    return out;
  }, [camera, focusFeatures, contrastFeatures, labels, marker, route, routeLabel, zoomEnd, labelStart, routeStart]);

  // Route: projected every frame (the camera drifts), revealed by length; dashes stay anchored at the start.
  let routeEl: React.ReactNode = null;
  if (route && route.length >= 2 && routeT > 0) {
    const full = d({ type: "LineString", coordinates: route });
    if (full) {
      const len = getLength(full);
      const shown = routeT >= 1 ? full : cutPath(full, Math.max(0.01, len * routeT));
      const head = getPointAtLength(full, len * routeT);
      routeEl = (
        <g>
          <path d={shown} fill="none" stroke={COLOR.surface} strokeWidth={MAP.labelHalo} strokeLinecap="round" strokeLinejoin="round" />
          <path d={shown} fill="none" stroke={COLOR.textPrimary} strokeWidth={MAP.route.width} strokeDasharray={MAP.route.dash} strokeLinejoin="round" />
          <circle cx={head.x} cy={head.y} r={MAP.route.head + MAP.labelHalo / 2} fill={COLOR.surface} />
          <circle cx={head.x} cy={head.y} r={MAP.route.head} fill={COLOR.textPrimary} />
        </g>
      );
    }
  }

  const markerP = marker ? proj([marker.lon, marker.lat]) : null;
  const cw = content.right - content.left;
  const ch = content.bottom - content.top;
  const outlineDash = outlineT >= 1 ? undefined : `${outlineT} 1`;

  const region = (f: Feature, color: string) => (
    <path
      key={String(f.id)}
      d={d(f)}
      fill={color}
      fillOpacity={MAP.focus.fillOpacity * outlineT}
      stroke={color}
      strokeWidth={MAP.focus.strokeWidth}
      strokeOpacity={MAP.focus.strokeOpacity}
      strokeLinejoin="round"
      pathLength={1}
      strokeDasharray={outlineDash}
    />
  );

  return (
    <Layer frame={frame} z={MOTION.z.card} flat>
      <Card frame={frame} x={content.left} y={content.top} w={cw} h={ch}>
    <svg width={cw} height={ch} viewBox={`${content.left} ${content.top} ${cw} ${ch}`} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <clipPath id={`${uid}-clip`}>
          <rect x={content.left} y={content.top} width={cw} height={ch} />
        </clipPath>
      </defs>

      <g clipPath={`url(#${uid}-clip)`}>
        <path d={d(SPHERE)} fill="none" stroke={COLOR.grid} strokeWidth={1} opacity={0.8 * (1 - t)} />
        <path
          d={d(graticule)}
          fill="none"
          stroke={COLOR.grid}
          strokeWidth={MAP.graticule.width}
          opacity={lerp(MAP.graticule.opacityWorld, MAP.graticule.opacityFit, t)}
        />
        <path d={d(land)} fill={COLOR.surface2} />
        <path d={d(borders)} fill="none" stroke={COLOR.grid} strokeWidth={MAP.borders.width} opacity={MAP.borders.opacity} strokeLinejoin="round" />
        <path d={d(coast)} fill="none" stroke={COLOR.grid} strokeWidth={MAP.borders.width} opacity={MAP.borders.opacity} strokeLinejoin="round" />
        {contrastFeatures.map((f) => region(f, COLOR.contrast))}
        {focusFeatures.map((f) => region(f, COLOR.highlight))}
        {routeEl}
        {markerP && markerT > 0 && (
          <g opacity={markerT} transform={`translate(${markerP[0]} ${markerP[1]}) scale(${lerp(1.4, 1, markerT)})`}>
            <circle r={MAP.marker.r} fill="none" stroke={COLOR.surface} strokeWidth={MAP.marker.stroke + 3} opacity={0.6} />
            <circle r={MAP.marker.r} fill="none" stroke={COLOR.highlight} strokeWidth={MAP.marker.stroke} />
            <circle r={MAP.marker.dot} fill={COLOR.highlight} />
          </g>
        )}
      </g>


      {layout.map((l) => {
        const a = progress(frame, l.delay, DUR.snap, EASE.settle);
        const p = a > 0 ? proj(l.at) : null;
        if (!p) return null;
        const country = l.kind === "country";
        const m = country ? CAPTION : BODY;
        const x = p[0] + l.dx;
        const y = p[1] + l.dy;
        return (
          <g key={l.key} opacity={a} transform={`translate(0 ${(1 - a) * 6})`}>
            {l.leader && <line x1={p[0]} y1={p[1]} x2={p[0] + l.leader[0]} y2={p[1] + l.leader[1]} stroke={COLOR.textTertiary} strokeWidth={1} />}
            {l.dot && <circle cx={p[0]} cy={p[1]} r={MAP.marker.dot} fill={COLOR.textPrimary} />}
            <text
              x={x}
              y={y}
              textAnchor={l.textAnchor}
              fontFamily={country ? TYPE.caption.family : TYPE.body.family}
              fontSize={m.size}
              fontWeight={country ? TYPE.caption.weight : 500}
              letterSpacing={country ? "0.12em" : TYPE.body.letterSpacing}
              fill={country ? COLOR.textSecondary : COLOR.textPrimary}
              {...HALO}
            >
              {l.lines.map((s, i) => (
                <tspan key={i} x={x} dy={i === 0 ? 0 : m.lineH}>
                  {s}
                </tspan>
              ))}
            </text>
          </g>
        );
      })}
    </svg>
      </Card>
    </Layer>
  );
};
