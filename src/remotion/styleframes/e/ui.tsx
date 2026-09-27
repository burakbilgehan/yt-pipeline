/**
 * Interface primitives of direction E.
 * Snap: a slide with overshoot and directional motion blur while it moves (no fades on snaps).
 * Panel: a skewed parallelogram slab (Persona menu). Chip: a small status pill.
 * BlurDefs: the SVG blur filters, namespaced "e-".
 */
import React from "react";
import { COLOR } from "../../catalog/tokens";
import { overshoot } from "./motion";
import { caption } from "./type";

export const Panel: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  skew?: number;
  opacity?: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ x, y, w, h, fill, skew = 22, opacity = 1, children, style }) => (
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
    {children}
  </div>
);

export const Chip: React.FC<{ x: number; y: number; text: string; tone: "blue" | "pink" | "gray"; align?: "left" | "right" }> = ({ x, y, text, tone, align = "left" }) => {
  const bg = tone === "pink" ? COLOR.highlight : tone === "blue" ? "rgba(90,155,216,0.16)" : COLOR.surface2;
  const ink = tone === "pink" ? COLOR.bg : tone === "blue" ? COLOR.contrast : COLOR.textSecondary;
  return (
    <div
      style={{
        position: "absolute",
        top: y,
        ...(align === "left" ? { left: x } : { right: 1920 - x }),
        height: 44,
        padding: "0 20px",
        borderRadius: 999,
        background: bg,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div style={{ width: 10, height: 10, borderRadius: 5, background: ink, flex: "none" }} />
      <span style={caption(20, ink)}>{text}</span>
    </div>
  );
};

/** Directional blur filter id for a velocity (px/frame); undefined below the threshold. */
export function blurFor(vx: number, vy: number): string | undefined {
  const speed = Math.hypot(vx, vy);
  if (speed < 14) return undefined;
  const axis = Math.abs(vx) >= Math.abs(vy) ? "x" : "y";
  const level = speed < 40 ? 1 : speed < 90 ? 2 : 3;
  return `url(#e-blur-${axis}${level})`;
}

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
        <filter key={id} id={`e-blur-${id}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={sd} />
        </filter>
      ))}
    </defs>
  </svg>
);

/** Snap: slide in from an offset with overshoot; optional slide out. Blurred along the motion while fast. */
export const Snap: React.FC<{
  frame: number;
  at: number;
  dur?: number;
  from: { x?: number; y?: number };
  out?: { at: number; x?: number; y?: number; dur?: number };
  c?: number;
  children: React.ReactNode;
}> = ({ frame, at, dur = 10, from, out, c = 1.1, children }) => {
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
      o = 1 - Math.max(0, (u - 0.35) / 0.65);
    }
    return { x, y, o };
  };
  if (out && frame >= out.at + (out.dur ?? 8)) return null;
  const p = pos(frame);
  const q = pos(frame - 1);
  const filter = blurFor(p.x - q.x, p.y - q.y);
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <div style={{ position: "absolute", inset: 0, transform: `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`, opacity: p.o, filter }}>{children}</div>
    </div>
  );
};
