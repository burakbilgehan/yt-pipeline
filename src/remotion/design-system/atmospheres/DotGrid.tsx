import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import type { AtmosphereComponentProps } from '../types';

// ─── Constants ────────────────────────────────────────────────

const DEFAULT_COLOR = 'rgba(255,255,255,0.3)';
const DEFAULT_SPACING = 40;
const DOT_RADIUS = 1.5;

// ─── Component ────────────────────────────────────────────────

/**
 * DotGrid — L2 Atmosphere
 *
 * Full-screen animated dot grid background. Dots pulse subtly
 * in a wave pattern driven by useCurrentFrame().
 *
 * - `color`: dot fill color (default rgba(255,255,255,0.3))
 * - `scale`: grid spacing in px (default 40)
 * - `speed`: animation speed multiplier
 * - `opacity`: overall layer opacity
 */
export const DotGrid: React.FC<AtmosphereComponentProps> = ({
  width,
  height,
  opacity,
  speed,
  color = DEFAULT_COLOR,
  scale = DEFAULT_SPACING,
}) => {
  const frame = useCurrentFrame();
  const spacing = Math.max(scale, 10); // guard against degenerate values

  // Calculate grid dimensions
  const cols = Math.ceil(width / spacing) + 1;
  const rows = Math.ceil(height / spacing) + 1;

  // Build dots array with pulsing opacity wave
  const dots: React.ReactNode[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cx = col * spacing;
      const cy = row * spacing;

      // Distance from center for wave propagation
      const dx = cx - width / 2;
      const dy = cy - height / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Wave-based pulsing: each dot pulses based on distance + frame
      const wavePhase = (dist * 0.01) - (frame * speed * 0.05);
      const pulse = interpolate(
        Math.sin(wavePhase),
        [-1, 1],
        [0.3, 1],
      );

      dots.push(
        <circle
          key={`${row}-${col}`}
          cx={cx}
          cy={cy}
          r={DOT_RADIUS}
          fill={color}
          opacity={pulse}
        />,
      );
    }
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
        pointerEvents: 'none',
      }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ display: 'block' }}
      >
        {dots}
      </svg>
    </div>
  );
};
