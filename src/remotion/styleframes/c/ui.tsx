/**
 * Screen-space helpers: typography anchored to a world point (billboarded, scaled by depth so it
 * moves with the camera but is never distorted), a reveal wrapper, and film grain.
 */
import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { ATMOSPHERE, EASE } from "../../catalog/tokens";
import { Cam, V3, project } from "./camera";

export const Billboard: React.FC<{
  cam: Cam;
  anchor: V3;
  /** Depth at which the content renders at scale 1. */
  refDepth: number;
  maxScale?: number;
  align?: "left" | "center" | "right";
  children: React.ReactNode;
}> = ({ cam, anchor, refDepth, maxScale = 1.6, align = "left", children }) => {
  const p = project(cam, anchor);
  if (!p) return null;
  const scale = Math.min(maxScale, refDepth / p.d);
  const tx = align === "left" ? "0%" : align === "center" ? "-50%" : "-100%";
  return (
    <div
      style={{
        position: "absolute",
        left: p.x,
        top: p.y,
        transform: `translate(${tx}, 0) scale(${scale.toFixed(4)})`,
        transformOrigin: align === "left" ? "0 0" : align === "center" ? "50% 0" : "100% 0",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
};

/** Fade and a 14 px rise on entry; optional fade on exit. */
export const Reveal: React.FC<{ frame: number; at: number; out?: number; dur?: number; children: React.ReactNode }> = ({ frame, at, out, dur = 16, children }) => {
  const enter = interpolate(frame, [at, at + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE.enter });
  const leave = out === undefined ? 1 : interpolate(frame, [out, out + 9], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE.exit });
  const opacity = enter * leave;
  if (opacity <= 0) return null;
  return <div style={{ opacity, transform: `translateY(${((1 - enter) * 14).toFixed(2)}px)` }}>{children}</div>;
};

export const Grain: React.FC<{ frame: number }> = ({ frame }) => {
  const g = ATMOSPHERE.grain;
  const seed = g.seedBase + (Math.floor(frame / g.framesPerSeed) % g.seedCycle);
  return (
    <AbsoluteFill style={{ mixBlendMode: "overlay", opacity: g.opacity, pointerEvents: "none" }}>
      <svg width="100%" height="100%">
        <defs>
          <filter id={`c-grain-${seed}`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency={g.baseFrequency} numOctaves={g.octaves} seed={seed} stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <pattern id={`c-grain-tile-${seed}`} width={g.tile} height={g.tile} patternUnits="userSpaceOnUse">
            <rect width={g.tile} height={g.tile} filter={`url(#c-grain-${seed})`} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#c-grain-tile-${seed})`} />
      </svg>
    </AbsoluteFill>
  );
};
