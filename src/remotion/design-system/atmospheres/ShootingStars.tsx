import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import type { AtmosphereComponentProps } from '../types';

// ─── Constants ────────────────────────────────────────────────

const DEFAULT_STAR_COUNT = 10;
const DEFAULT_COLOR = 'rgba(255,255,255,0.9)';

// ─── Deterministic seed helper ────────────────────────────────

/** Simple hash for deterministic per-star values (no Math.random) */
function seedValue(index: number, offset: number): number {
  const x = Math.sin(index * 127.1 + offset * 311.7) * 43758.5453;
  return x - Math.floor(x); // 0–1
}

// ─── Component ────────────────────────────────────────────────

/**
 * ShootingStars — L2 Atmosphere
 *
 * Stars streak diagonally across a dark sky at staggered intervals.
 * Fully frame-deterministic — positions computed from star index.
 *
 * - `color`: star streak color (default white)
 * - `speed`: speed multiplier for streaks
 * - `scale`: star count (default ~10)
 * - `opacity`: overall layer opacity
 */
export const ShootingStars: React.FC<AtmosphereComponentProps> = ({
  width,
  height,
  opacity,
  speed,
  color = DEFAULT_COLOR,
  scale,
}) => {
  const frame = useCurrentFrame();
  const starCount = Math.round(scale ?? DEFAULT_STAR_COUNT);

  const stars: React.ReactNode[] = [];

  for (let i = 0; i < starCount; i++) {
    // Per-star deterministic properties
    const startX = seedValue(i, 0) * width * 1.2 - width * 0.1;
    const startY = seedValue(i, 1) * height * 0.6 - height * 0.1;
    const angle = 25 + seedValue(i, 2) * 20; // 25–45 degrees
    const starSpeed = (0.6 + seedValue(i, 3) * 0.8) * speed;
    const cycleLength = Math.floor(90 + seedValue(i, 4) * 120); // 90–210 frames per cycle
    const delay = Math.floor(seedValue(i, 5) * cycleLength); // stagger start
    const streakLength = 60 + seedValue(i, 6) * 80; // 60–140 px

    // Current position in this star's cycle
    const cycleFrame = ((frame + delay) * starSpeed) % cycleLength;
    const t = cycleFrame / cycleLength; // 0→1 through the cycle

    // Travel distance across screen
    const travelDistance = width * 0.8 + height * 0.4;
    const angleRad = (angle * Math.PI) / 180;
    const dx = Math.cos(angleRad) * travelDistance * t;
    const dy = Math.sin(angleRad) * travelDistance * t;

    const x = startX + dx;
    const y = startY + dy;

    // Fade in quickly, sustain, fade out
    const starOpacity = interpolate(t, [0, 0.05, 0.7, 1], [0, 1, 0.8, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });

    // Skip invisible stars
    if (starOpacity < 0.01) continue;

    stars.push(
      <div
        key={i}
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: streakLength,
          height: 2,
          borderRadius: 1,
          background: `linear-gradient(to right, transparent 0%, ${color} 30%, ${color} 100%)`,
          opacity: starOpacity,
          transform: `rotate(${angle}deg)`,
          transformOrigin: '0% 50%',
        }}
      />,
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width,
        height,
        opacity,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {stars}
    </div>
  );
};
