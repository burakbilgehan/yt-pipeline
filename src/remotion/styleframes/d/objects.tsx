/**
 * Vector objects and panel primitives of direction D. All SVG, drawn precisely, not cartoonish.
 * Snap: a slide with an overshoot and a ghost trail while it moves (motion blur instead of a fade).
 * Panel: a skewed parallelogram slab (Persona menu). Band: a giant repeated word behind the stage.
 */
import React from "react";
import { COLOR } from "../../catalog/tokens";
import { overshoot } from "./motion";

/* ---------- Tanker silhouette, side view, 200 x 56 units, origin at the bow-side bottom ---------- */
export const Tanker: React.FC<{ x: number; y: number; scale?: number; fill?: string; rotate?: number; flip?: boolean; detail?: boolean }> = ({
  x,
  y,
  scale = 1,
  fill = COLOR.textPrimary,
  rotate = 0,
  flip = false,
  detail = true,
}) => (
  <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${rotate.toFixed(2)}) scale(${(flip ? -scale : scale).toFixed(3)} ${scale.toFixed(3)})`}>
    {/* hull: bow right, stern left */}
    <path d="M0 0 H176 L200 -18 V-24 H8 Q0 -24 0 -16 Z" fill={fill} />
    {/* deck pipes and tank domes */}
    {detail && (
      <>
        <rect x="24" y="-31" width="118" height="5" fill={fill} />
        <circle cx="46" cy="-31" r="6" fill={fill} />
        <circle cx="76" cy="-31" r="6" fill={fill} />
        <circle cx="106" cy="-31" r="6" fill={fill} />
        <circle cx="136" cy="-31" r="6" fill={fill} />
      </>
    )}
    {/* superstructure at the stern */}
    <path d="M6 -24 V-54 H36 V-40 H44 V-24 Z" fill={fill} />
    <rect x="18" y="-64" width="4" height="10" fill={fill} />
  </g>
);

/* ---------- Oil barrel, 44 x 60, origin top-left ---------- */
export const Barrel: React.FC<{ x: number; y: number; scale?: number; fill?: string; stroke?: string }> = ({ x, y, scale = 1, fill = COLOR.surface2, stroke = COLOR.textSecondary }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <rect x="0" y="0" width="44" height="60" rx="5" fill={fill} stroke={stroke} strokeWidth="2" />
    <line x1="0" y1="18" x2="44" y2="18" stroke={stroke} strokeWidth="2" />
    <line x1="0" y1="42" x2="44" y2="42" stroke={stroke} strokeWidth="2" />
    <ellipse cx="22" cy="0" rx="22" ry="5" fill={fill} stroke={stroke} strokeWidth="2" />
  </g>
);

/* ---------- Pipeline: a tube with flanges along a straight run, length L, thickness 18 ---------- */
export const Pipe: React.FC<{ x: number; y: number; length: number; color?: string; flowPhase?: number; flanges?: number }> = ({ x, y, length, color = COLOR.contrast, flowPhase = 0, flanges = 3 }) => {
  const t = 18;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="0" y={-t / 2} width={length} height={t} rx={t / 2} fill="none" stroke={color} strokeWidth="2.5" />
      {/* moving dashes: the flow inside the pipe */}
      <line x1={t / 2} y1="0" x2={length - t / 2} y2="0" stroke={color} strokeWidth="5" strokeDasharray="14 12" strokeDashoffset={-flowPhase} strokeLinecap="round" opacity="0.9" />
      {Array.from({ length: flanges }, (_, i) => {
        const fx = ((i + 1) * length) / (flanges + 1);
        return <rect key={i} x={fx - 4} y={-t / 2 - 5} width="8" height={t + 10} rx="2" fill={color} />;
      })}
    </g>
  );
};

/* ---------- Status lamp: a traffic-light style dot with a halo ---------- */
export const Lamp: React.FC<{ color: string; on: number; size?: number }> = ({ color, on, size = 22 }) => (
  <div style={{ position: "relative", width: size, height: size, flex: "none" }}>
    <div style={{ position: "absolute", inset: -size * 0.6, borderRadius: "50%", background: color, opacity: 0.25 * on, filter: `blur(${size * 0.3}px)` }} />
    <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: color, opacity: 0.35 + 0.65 * on }} />
  </div>
);

/* ---------- Skewed slab (Persona). Skew is a parallelogram cut on a plain rectangle, text stays upright. ---------- */
export const Panel: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  skew?: number;
  opacity?: number;
  stripes?: { color: string; phase: number } | null;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ x, y, w, h, fill, skew = 26, opacity = 1, stripes = null, children, style }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: h,
      background: fill,
      clipPath: `polygon(${skew}px 0, 100% 0, ${w - skew}px 100%, 0 100%)`,
      opacity,
      overflow: "hidden",
      ...style,
    }}
  >
    {stripes && (
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `repeating-linear-gradient(115deg, ${stripes.color} 0 3px, transparent 3px 22px)`,
          backgroundPosition: `${stripes.phase.toFixed(1)}px 0`,
          opacity: 0.5,
        }}
      />
    )}
    {children}
  </div>
);

/* ---------- Snap: slide from an offset with overshoot; ghost copies trail while moving fast ---------- */
export const Snap: React.FC<{
  frame: number;
  at: number;
  dur?: number;
  from: { x?: number; y?: number };
  out?: { at: number; x?: number; y?: number; dur?: number };
  /** overshoot strength; 0 = none */
  c?: number;
  ghosts?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ frame, at, dur = 10, from, out, c = 1.1, ghosts = 0, style, children }) => {
  if (frame < at) return null;
  const pos = (f: number) => {
    const tIn = overshoot((f - at) / dur, c);
    let x = (from.x ?? 0) * (1 - tIn);
    let y = (from.y ?? 0) * (1 - tIn);
    let o = 1;
    if (out && f >= out.at) {
      const d = out.dur ?? 8;
      const u = Math.min(1, (f - out.at) / d);
      const e = u * u * (3 - 2 * u);
      x += (out.x ?? 0) * e;
      y += (out.y ?? 0) * e;
      o = 1 - Math.max(0, (u - 0.6) / 0.4);
    }
    return { x, y, o };
  };
  const p = pos(frame);
  if (out && frame >= out.at + (out.dur ?? 8)) return null;
  const prev = pos(frame - 1);
  const vx = p.x - prev.x;
  const vy = p.y - prev.y;
  const speed = Math.hypot(vx, vy);
  const filter = blurFilter(vx, vy);
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", ...style }}>
      {speed > 12 &&
        Array.from({ length: ghosts }, (_, i) => {
          const g = pos(frame - (i + 1) * 0.5);
          return (
            <div key={i} style={{ position: "absolute", inset: 0, transform: `translate(${g.x.toFixed(1)}px, ${g.y.toFixed(1)}px)`, opacity: (0.22 - i * 0.06) * p.o, filter }}>
              {children}
            </div>
          );
        })}
      <div style={{ position: "absolute", inset: 0, transform: `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`, opacity: p.o, filter }}>{children}</div>
    </div>
  );
};

/** Directional blur for a velocity (px/frame): one of the SVG filters defined by BlurDefs, or none. */
export function blurFilter(vx: number, vy: number): string | undefined {
  const speed = Math.hypot(vx, vy);
  if (speed < 14) return undefined;
  const axis = Math.abs(vx) >= Math.abs(vy) ? "x" : "y";
  const level = speed < 40 ? 1 : speed < 90 ? 2 : 3;
  return `url(#d-blur-${axis}${level})`;
}

/** Hidden SVG with the directional blur filters (three strengths on each axis). */
export const BlurDefs: React.FC = () => (
  <svg width="0" height="0" style={{ position: "absolute" }}>
    <defs>
      {[
        ["x1", "5 0"],
        ["x2", "11 0"],
        ["x3", "18 0"],
        ["y1", "0 5"],
        ["y2", "0 11"],
        ["y3", "0 18"],
      ].map(([id, sd]) => (
        <filter key={id} id={`d-blur-${id}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={sd} />
        </filter>
      ))}
    </defs>
  </svg>
);

/* ---------- Giant word band: one word repeated, cropped by the frame, slowly drifting ---------- */
export const Band: React.FC<{
  text: string;
  font: string;
  size: number;
  color: string;
  y: number;
  offset: number;
  gap?: number;
  opacity?: number;
  letterSpacing?: string;
}> = ({ text, font, size, color, y, offset, gap = 120, opacity = 1, letterSpacing = "-0.01em" }) => {
  const reps = 4;
  const items = Array.from({ length: reps }, (_, i) => text);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: y,
        whiteSpace: "nowrap",
        display: "flex",
        gap,
        transform: `translateX(${offset.toFixed(1)}px)`,
        fontFamily: font,
        fontSize: size,
        lineHeight: 1,
        color,
        opacity,
        letterSpacing,
        textTransform: "uppercase",
        userSelect: "none",
      }}
    >
      {items.map((t, i) => (
        <span key={i}>{t}</span>
      ))}
    </div>
  );
};
