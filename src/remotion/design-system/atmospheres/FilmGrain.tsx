import React from 'react';
import { useCurrentFrame } from 'remotion';
import type { AtmosphereComponentProps } from '../types';

// ─── Component ────────────────────────────────────────────────

/**
 * FilmGrain — L2 Atmosphere
 *
 * Full-screen animated film grain overlay using SVG feTurbulence.
 * The `seed` attribute changes per frame for deterministic noise.
 *
 * - `opacity`: grain intensity (0–1)
 * - `speed`: how fast the grain pattern refreshes (1 = every frame)
 * - Frame-deterministic: same frame always produces same output
 */
export const FilmGrain: React.FC<AtmosphereComponentProps> = ({
  width,
  height,
  opacity,
  speed,
}) => {
  const frame = useCurrentFrame();

  // Deterministic seed: same frame + speed → same grain pattern
  const seed = Math.floor(frame * Math.max(speed, 0.1));

  // Unique filter ID to avoid SVG ID collisions when multiple instances exist
  const filterId = `film-grain-${seed}`;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width,
        height,
        opacity,
        pointerEvents: 'none',
        mixBlendMode: 'overlay',
      }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ display: 'block' }}
      >
        <defs>
          <filter id={filterId} x="0%" y="0%" width="100%" height="100%">
            {/* Base grain noise — feTurbulence with frame-seeded randomness */}
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.65"
              numOctaves={3}
              seed={seed}
              stitchTiles="stitch"
              result="noise"
            />
            {/* Map noise to displacement for more organic look */}
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={2}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
        {/* Full-screen rect with the grain filter applied */}
        <rect
          width={width}
          height={height}
          fill="rgba(128,128,128,0.5)"
          filter={`url(#${filterId})`}
        />
      </svg>
    </div>
  );
};
