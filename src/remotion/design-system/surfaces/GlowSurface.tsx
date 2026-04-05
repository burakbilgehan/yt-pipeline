import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import type { SurfaceComponentProps } from '../types';

/**
 * GlowSurface — L4 animated glowing card container.
 *
 * Combines a glass-like base with an animated box-shadow glow
 * that gently pulses using useCurrentFrame() + interpolate().
 * Pulse: ~1.5 cycles per 90 frames (gentle, not frantic).
 */
export const GlowSurface: React.FC<SurfaceComponentProps> = ({
  blur,
  opacity,
  borderRadius,
  borderColor = 'rgba(255,255,255,0.15)',
  borderWidth = 1,
  glowColor = '#6366f1',
  glowIntensity = 0.8,
  gradient,
  children,
  className,
}) => {
  const frame = useCurrentFrame();

  // Gentle pulse: sin wave, ~1.5 cycles per 90 frames
  // period = 60 frames → frequency = 2π/60
  const pulseRaw = Math.sin((frame / 60) * Math.PI * 2);
  // Map [-1, 1] → [0.3, 1.0] scaled by glowIntensity
  const pulseNorm = interpolate(pulseRaw, [-1, 1], [0.3, 1.0]);
  const currentIntensity = pulseNorm * glowIntensity;

  // Glow spread scales with intensity
  const spreadPx = interpolate(currentIntensity, [0, 1], [8, 24]);
  const blurPx = interpolate(currentIntensity, [0, 1], [12, 40]);

  const boxShadow = `0 0 ${blurPx}px ${spreadPx}px ${glowColor}${Math.round(currentIntensity * 255).toString(16).padStart(2, '0')}`;

  // Glass-like base background
  const background = gradient
    ? `linear-gradient(${gradient.angle}deg, ${gradient.stops.join(', ')})`
    : `rgba(255, 255, 255, ${opacity * 0.08})`;

  return (
    <div
      className={className}
      style={{
        borderRadius,
        border: `${borderWidth}px solid ${glowColor}44`,
        backdropFilter: `blur(${blur}px)`,
        WebkitBackdropFilter: `blur(${blur}px)`,
        background,
        boxShadow,
        padding: 24,
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
};
