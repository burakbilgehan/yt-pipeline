/**
 * Interface primitives of the catalog (style frame E).
 *   Layer:    a depth layer with the shared slow drift. Its resting footprint sits exactly on the
 *             layout grid (the perspective scale of its z is compensated), so depth shows only as
 *             parallax while the camera drifts. flat: no rotation, for layers carrying data marks.
 *   Snap:     slide in from an offset with overshoot, motion blur while fast; optional slide out.
 *   Panel:    a skewed parallelogram slab.
 *   Chip:     a small status pill.
 *   Card:     a rounded surface that turns in from edge-on as a real object.
 *   BlurDefs: the SVG blur filters (ids "cat-blur-<axis><level>"), rendered once per video.
 */
import React from "react";
import { COLOR, DUR, EASE, LAYOUT, MOTION, SHAPE, TINT, caption } from "./tokens";
import { blurFor, drift, overshoot, progress } from "./motion";

export const Layer: React.FC<{ frame: number; z: number; flat?: boolean; children: React.ReactNode }> = ({ frame, z, flat = false, children }) => {
  const P = MOTION.perspective;
  const ry = flat ? 0 : drift(frame, MOTION.drift.ry, 0);
  const rx = flat ? 0 : drift(frame, MOTION.drift.rx, MOTION.drift.phaseX);
  const s = (P - z) / P;
  return (
    <div style={{ position: "absolute", inset: 0, perspective: P, perspectiveOrigin: "50% 50%", pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transformStyle: "preserve-3d",
          transform: `rotateY(${ry.toFixed(3)}deg) rotateX(${rx.toFixed(3)}deg) translateZ(${z}px) scale(${s.toFixed(5)})`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export const Snap: React.FC<{
  frame: number;
  at: number;
  dur?: number;
  from: { x?: number; y?: number };
  out?: { at: number; x?: number; y?: number; dur?: number };
  c?: number;
  children: React.ReactNode;
}> = ({ frame, at, dur = DUR.snap, from, out, c = MOTION.overshoot, children }) => {
  if (frame < at) return null;
  if (out && frame >= out.at + (out.dur ?? DUR.snapOut)) return null;
  const pos = (f: number) => {
    const tIn = overshoot((f - at) / dur, c);
    let x = (from.x ?? 0) * (1 - tIn);
    let y = (from.y ?? 0) * (1 - tIn);
    let o = 1;
    if (out && f >= out.at) {
      const u = Math.min(1, (f - out.at) / (out.dur ?? DUR.snapOut));
      const e = u * u * (3 - 2 * u);
      x += (out.x ?? 0) * e;
      y += (out.y ?? 0) * e;
      o = 1 - Math.max(0, (u - 0.35) / 0.65);
    }
    return { x, y, o };
  };
  const p = pos(frame);
  const q = pos(frame - 1);
  const filter = frame > at ? blurFor(p.x - q.x, p.y - q.y) : blurFor(p.x - (from.x ?? 0), p.y - (from.y ?? 0));
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <div style={{ position: "absolute", inset: 0, transform: `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`, opacity: p.o, filter }}>{children}</div>
    </div>
  );
};

/**
 * CSS clip path of a polygon whose corners are rounded by r (quadratic curves), so skewed
 * panels get the same corner as every other mark.
 */
export function roundedPolygon(points: Array<[number, number]>, r: number = SHAPE.radius): string {
  const n = points.length;
  const at = (i: number) => points[(i + n) % n];
  const toward = (a: [number, number], b: [number, number], d: number): [number, number] => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const k = Math.min(d, len / 2) / len;
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  };
  let d = "";
  for (let i = 0; i < n; i++) {
    const p = at(i);
    const a = toward(p, at(i - 1), r);
    const b = toward(p, at(i + 1), r);
    d += `${i === 0 ? "M" : "L"}${a[0].toFixed(2)},${a[1].toFixed(2)} Q${p[0]},${p[1]} ${b[0].toFixed(2)},${b[1].toFixed(2)} `;
  }
  return `path('${d}Z')`;
}

export const Panel: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  skew?: number;
  children?: React.ReactNode;
}> = ({ x, y, w, h, fill, skew = SHAPE.panelSkew, children }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: h,
      background: fill,
      clipPath: roundedPolygon([
        [skew, 0],
        [w, 0],
        [w - skew, h],
        [0, h],
      ]),
      overflow: "hidden",
    }}
  >
    {children}
  </div>
);

export type ChipTone = "pink" | "blue" | "gray";

export const Chip: React.FC<{ right: number; top: number; text: string; tone: ChipTone }> = ({ right, top, text, tone }) => {
  const bg = tone === "pink" ? COLOR.highlight : tone === "blue" ? TINT.contrast : COLOR.surface2;
  const ink = tone === "pink" ? COLOR.bg : tone === "blue" ? COLOR.contrast : COLOR.textSecondary;
  return (
    <div
      style={{
        position: "absolute",
        top,
        right: LAYOUT.width - right,
        height: LAYOUT.chip.height,
        padding: `0 ${SHAPE.chipPadX}px`,
        borderRadius: LAYOUT.chip.height / 2,
        background: bg,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div style={{ width: SHAPE.chipDot, height: SHAPE.chipDot, borderRadius: SHAPE.chipDot / 2, background: ink, flex: "none" }} />
      <span style={caption("xs", ink)}>{text}</span>
    </div>
  );
};

/**
 * A rounded surface that turns in from edge-on around its left edge, then rests face-on on the grid.
 * Visible (faintly) from its first frame, so a scene built on it never starts empty.
 */
export const Card: React.FC<{ frame: number; at?: number; x: number; y: number; w: number; h: number; children: React.ReactNode }> = ({ frame, at = 0, x, y, w, h, children }) => {
  const t = progress(frame, at, DUR.cardTurnIn, EASE.settle);
  const ry = SHAPE.cardTurnFrom * (1 - t);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: SHAPE.cardRadius,
        overflow: "hidden",
        background: COLOR.surface,
        transformOrigin: "0% 50%",
        transform: `translateX(${(-240 * (1 - t)).toFixed(1)}px) rotateY(${ry.toFixed(2)}deg)`,
        opacity: Math.min(1, 0.25 + t * 3),
      }}
    >
      {children}
    </div>
  );
};

export const BlurDefs: React.FC = () => (
  <svg width="0" height="0" style={{ position: "absolute" }}>
    <defs>
      {(["x", "y"] as const).flatMap((axis) =>
        MOTION.blur.radius.map((r, i) => (
          <filter key={`${axis}${i + 1}`} id={`cat-blur-${axis}${i + 1}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation={axis === "x" ? `${r} 0` : `0 ${r}`} />
          </filter>
        )),
      )}
    </defs>
  </svg>
);
