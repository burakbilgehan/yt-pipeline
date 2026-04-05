import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import type { AtmosphereComponentProps } from '../types';
import { ACCENT_PINK, ACCENT_BLUE, SAGE } from '../../palette';

// ─── Constants ────────────────────────────────────────────────

const BLOB_COUNT = 3;
const BLUR_AMOUNTS = [100, 90, 110];
const BLOB_SIZES = [400, 350, 320];

// ─── Component ────────────────────────────────────────────────

/**
 * BlurryBlob — L2 Atmosphere
 *
 * Large soft-focus colored blobs slowly drifting around the screen
 * via sine waves (Lissajous-like movement). Driven by frame × speed.
 *
 * - `color`: unused directly; palette colors applied to blobs
 * - `speed`: drift rate multiplier
 * - `opacity`: overall layer opacity
 */
export const BlurryBlob: React.FC<AtmosphereComponentProps> = ({
  width,
  height,
  opacity,
  speed,
}) => {
  const frame = useCurrentFrame();

  const blobColors = [ACCENT_PINK, ACCENT_BLUE, SAGE];

  // Lissajous parameters per blob (different frequencies & phases)
  const freqX = [0.013, 0.009, 0.011];
  const freqY = [0.011, 0.014, 0.008];
  const phaseX = [0, 2.1, 4.2];
  const phaseY = [1.5, 3.8, 0.7];

  const blobs: React.ReactNode[] = [];

  for (let i = 0; i < BLOB_COUNT; i++) {
    const t = frame * speed;

    // Sine-wave driven positions (center-biased, within bounds)
    const cx = width * 0.5 + Math.sin(t * freqX[i] + phaseX[i]) * width * 0.25;
    const cy = height * 0.5 + Math.sin(t * freqY[i] + phaseY[i]) * height * 0.2;

    // Gentle scale breathing
    const breathe = interpolate(
      Math.sin(t * 0.02 + i * 2),
      [-1, 1],
      [0.85, 1.15],
    );

    const size = BLOB_SIZES[i] * breathe;

    blobs.push(
      <div
        key={i}
        style={{
          position: 'absolute',
          left: cx - size / 2,
          top: cy - size / 2,
          width: size,
          height: size,
          borderRadius: '50%',
          background: blobColors[i],
          filter: `blur(${BLUR_AMOUNTS[i]}px)`,
          opacity: 0.35,
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
      {blobs}
    </div>
  );
};
