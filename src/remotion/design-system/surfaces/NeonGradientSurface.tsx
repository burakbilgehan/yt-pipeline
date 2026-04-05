import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import type { SurfaceComponentProps } from '../types';
import { ACCENT_PINK, ACCENT_BLUE } from '../../palette';

/**
 * NeonGradientSurface — L4 animated neon gradient border card.
 *
 * Dark semi-transparent card body wrapped by a rotating conic-gradient
 * border that creates a vivid neon edge effect.
 * Uses useCurrentFrame() + interpolate() for frame-deterministic rotation.
 */
export const NeonGradientSurface: React.FC<SurfaceComponentProps> = ({
  blur,
  opacity,
  borderRadius,
  borderWidth = 2,
  glowColor = ACCENT_PINK,
  glowIntensity = 0.8,
  gradient,
  children,
  className,
}) => {
  const frame = useCurrentFrame();

  const secondColor = ACCENT_BLUE;

  // Continuous rotation: 360° per 90 frames (3s @ 30fps), wraps via modulo
  const angle = (frame % 90) / 90 * 360;

  // Rotating conic-gradient for the neon border
  const conicGradient = `conic-gradient(from ${angle}deg, ${glowColor}, transparent 25%, ${secondColor} 50%, transparent 75%, ${glowColor})`;

  // Subtle box-shadow glow matching primary color
  const pulseRaw = Math.sin((frame / 60) * Math.PI * 2);
  const pulseNorm = interpolate(pulseRaw, [-1, 1], [0.4, 1.0]);
  const glowStrength = pulseNorm * glowIntensity;
  const shadowSpread = interpolate(glowStrength, [0, 1], [4, 16]);
  const shadowBlur = interpolate(glowStrength, [0, 1], [8, 32]);
  const shadowAlpha = Math.round(glowStrength * 180).toString(16).padStart(2, '0');
  const boxShadow = `0 0 ${shadowBlur}px ${shadowSpread}px ${glowColor}${shadowAlpha}`;

  // Card body background
  const cardBackground = gradient
    ? `linear-gradient(${gradient.angle}deg, ${gradient.stops.join(', ')})`
    : 'rgba(42, 42, 50, 0.95)';

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        borderRadius,
        background: conicGradient,
        padding: borderWidth,
        boxShadow,
        overflow: 'hidden',
      }}
    >
      {/* Inner card body — sits on top of the gradient border */}
      <div
        style={{
          borderRadius: Math.max(0, borderRadius - borderWidth),
          background: cardBackground,
          backdropFilter: `blur(${blur}px)`,
          WebkitBackdropFilter: `blur(${blur}px)`,
          padding: 24,
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  );
};
