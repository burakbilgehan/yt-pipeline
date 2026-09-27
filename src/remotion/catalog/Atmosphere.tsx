/**
 * Film grain (tokens ATMOSPHERE.grain) over every frame: monochrome, 8 fixed seeds cycling at 15 Hz.
 * Deterministic: a pure function of the frame.
 */
import React from "react";
import { AbsoluteFill } from "remotion";
import { ATMOSPHERE } from "./tokens";
import { useFrame } from "./motion";

export const Grain: React.FC = () => {
  const frame = useFrame();
  const g = ATMOSPHERE.grain;
  const seed = g.seedBase + (Math.floor(frame / g.framesPerSeed) % g.seedCycle);
  return (
    <AbsoluteFill style={{ mixBlendMode: "overlay", opacity: g.opacity, pointerEvents: "none" }}>
      <svg width="100%" height="100%">
        <defs>
          <filter id={`grain-${seed}`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency={g.baseFrequency} numOctaves={g.octaves} seed={seed} stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <pattern id={`grain-tile-${seed}`} width={g.tile} height={g.tile} patternUnits="userSpaceOnUse">
            <rect width={g.tile} height={g.tile} filter={`url(#grain-${seed})`} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#grain-tile-${seed})`} />
      </svg>
    </AbsoluteFill>
  );
};
