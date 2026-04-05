import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import type { AtmosphereComponentProps } from '../types';

// ─── Constants ────────────────────────────────────────────────

const DEFAULT_COLOR = 'rgba(255,255,255,0.15)';
const DEFAULT_LINE_SPACING = 60;

// ─── Component ────────────────────────────────────────────────

/**
 * RetroGrid — L2 Atmosphere
 *
 * Perspective-projected grid floor fading into distance (synthwave aesthetic).
 * Horizontal + vertical lines converge to a vanishing point at center-top.
 *
 * - `color`: grid line color (default rgba(255,255,255,0.15))
 * - `scale`: line spacing in px (default 60)
 * - `speed`: scroll speed multiplier
 * - `opacity`: overall layer opacity
 */
export const RetroGrid: React.FC<AtmosphereComponentProps> = ({
  width,
  height,
  opacity,
  speed,
  color = DEFAULT_COLOR,
  scale = DEFAULT_LINE_SPACING,
}) => {
  const frame = useCurrentFrame();
  const spacing = Math.max(scale, 20);

  // Vanishing point at center-top
  const vpX = width / 2;
  const vpY = height * 0.3;

  // Grid occupies the bottom portion (perspective floor)
  const floorTop = vpY;
  const floorHeight = height - floorTop;

  // Horizontal lines — scroll toward viewer
  const hLineCount = 20;
  const scrollOffset = (frame * speed * 0.8) % spacing;
  const hLines: React.ReactNode[] = [];

  for (let i = 0; i < hLineCount; i++) {
    // t goes from 0 (horizon) to 1 (bottom of screen)
    const rawY = i * spacing + scrollOffset;
    const t = rawY / (hLineCount * spacing);
    const clampedT = Math.min(Math.max(t, 0), 1);

    // Perspective mapping: y position on screen
    const screenY = floorTop + clampedT * clampedT * floorHeight;
    // Fade lines near the horizon
    const lineOpacity = interpolate(clampedT, [0, 0.15, 1], [0, 0.4, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    // Lines get wider near the bottom
    const strokeW = interpolate(clampedT, [0, 1], [0.5, 1.5], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    // Perspective spread: wider at bottom
    const spread = interpolate(clampedT, [0, 1], [0.1, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const x1 = vpX - (width * 0.6) * spread;
    const x2 = vpX + (width * 0.6) * spread;

    hLines.push(
      <line
        key={`h-${i}`}
        x1={x1}
        y1={screenY}
        x2={x2}
        y2={screenY}
        stroke={color}
        strokeWidth={strokeW}
        opacity={lineOpacity}
      />,
    );
  }

  // Vertical lines — converge to vanishing point
  const vLineCount = 16;
  const vLines: React.ReactNode[] = [];
  for (let i = 0; i <= vLineCount; i++) {
    const t = i / vLineCount; // 0 to 1 across width
    const bottomX = width * (t - 0.5) * 1.2 + vpX;
    // Fade lines near the edges
    const edgeDist = Math.abs(t - 0.5) * 2; // 0 at center, 1 at edges
    const lineOpacity = interpolate(edgeDist, [0, 0.8, 1], [0.8, 0.3, 0.1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });

    vLines.push(
      <line
        key={`v-${i}`}
        x1={vpX}
        y1={vpY}
        x2={bottomX}
        y2={height}
        stroke={color}
        strokeWidth={0.8}
        opacity={lineOpacity}
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
        pointerEvents: 'none',
      }}
    >
      {/* Gradient fade at horizon */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width,
          height: floorTop + 60,
          background: `linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)`,
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ display: 'block' }}
      >
        {vLines}
        {hLines}
      </svg>
    </div>
  );
};
