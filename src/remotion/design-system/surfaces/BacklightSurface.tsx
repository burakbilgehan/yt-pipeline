import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import type { SurfaceComponentProps } from '../types';
import { ACCENT_BLUE } from '../../palette';

/**
 * BacklightSurface — L4 card with a pulsing colored backlight glow.
 *
 * A large blurred colored shape sits behind the card, extending beyond
 * its edges, creating a spotlight-from-behind effect.
 * Uses useCurrentFrame() + interpolate() for frame-deterministic animation.
 */
export const BacklightSurface: React.FC<SurfaceComponentProps> = ({
  blur,
  opacity,
  borderRadius,
  borderColor = 'rgba(255,255,255,0.12)',
  borderWidth = 1,
  glowColor = ACCENT_BLUE,
  glowIntensity = 0.8,
  gradient,
  children,
  className,
}) => {
  const frame = useCurrentFrame();

  // Pulsing backlight opacity: sin wave at ~45-frame period
  const pulseRaw = Math.sin((frame / 45) * Math.PI * 2);
  const backlightOpacity = interpolate(pulseRaw, [-1, 1], [0.3, 0.7]) * glowIntensity;

  // Organic position drift: small translateX/Y oscillation
  const driftX = Math.sin((frame / 70) * Math.PI * 2) * 8;
  const driftY = Math.cos((frame / 55) * Math.PI * 2) * 6;

  // Card body background
  const cardBackground = gradient
    ? `linear-gradient(${gradient.angle}deg, ${gradient.stops.join(', ')})`
    : `rgba(255, 255, 255, ${opacity * 0.07})`;

  return (
    <div
      className={className}
      style={{
        position: 'relative',
      }}
    >
      {/* Backlight glow — larger than card, blurred, behind */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '120%',
          height: '120%',
          borderRadius: '50%',
          background: glowColor,
          opacity: backlightOpacity,
          filter: 'blur(60px)',
          transform: `translate(calc(-50% + ${driftX}px), calc(-50% + ${driftY}px))`,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Card itself — glass-like treatment */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          borderRadius,
          border: `${borderWidth}px solid ${borderColor}`,
          backdropFilter: `blur(${blur}px)`,
          WebkitBackdropFilter: `blur(${blur}px)`,
          background: cardBackground,
          padding: 24,
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  );
};
