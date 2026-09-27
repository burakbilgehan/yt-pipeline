/** Film grain (tier 0 atmosphere) with ids namespaced to direction D. */
import React from "react";
import { AbsoluteFill } from "remotion";
import { ATMOSPHERE } from "../../catalog/tokens";

export const Grain: React.FC<{ frame: number }> = ({ frame }) => {
  const g = ATMOSPHERE.grain;
  const seed = g.seedBase + (Math.floor(frame / g.framesPerSeed) % g.seedCycle);
  return (
    <AbsoluteFill style={{ mixBlendMode: "overlay", opacity: g.opacity, pointerEvents: "none" }}>
      <svg width="100%" height="100%">
        <defs>
          <filter id={`d-grain-${seed}`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency={g.baseFrequency} numOctaves={g.octaves} seed={seed} stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <pattern id={`d-grain-tile-${seed}`} width={g.tile} height={g.tile} patternUnits="userSpaceOnUse">
            <rect width={g.tile} height={g.tile} filter={`url(#d-grain-${seed})`} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#d-grain-tile-${seed})`} />
      </svg>
    </AbsoluteFill>
  );
};
