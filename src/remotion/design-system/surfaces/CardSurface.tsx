import React from 'react';
import type { SurfaceComponentProps } from '../types';

/**
 * CardSurface — L4 glassmorphic stat card with corner glow.
 *
 * Inspired by "glassmorphism trust hero" stat cards — lighter glass treatment
 * than FrostedPanel, with a distinctive top-right corner glow effect.
 * The corner glow gives a subtle directional lighting feel.
 *
 * Key visual: very subtle white glass (bg-white/5) with a large blurred
 * circle at top-right corner creating a soft lighting accent.
 *
 * External Component Intake:
 *   Source: "Glassmorphism trust hero" right-column stat cards
 *   Decomposed: bg-white/5, backdrop-blur-xl, border-white/10, rounded-3xl, shadow-2xl, top-right glow circle
 *   Adapted: All props via SurfaceComponentProps, glowColor/glowIntensity control corner glow, inline styles only
 *   Registered: 'card' in surfaces/index.ts
 */
export const CardSurface: React.FC<SurfaceComponentProps> = ({
  blur = 20,
  opacity = 0.05,
  borderRadius = 24,
  borderColor = 'rgba(255,255,255,0.10)',
  borderWidth = 1,
  glowColor = 'rgba(255,255,255,0.05)',
  glowIntensity = 1.0,
  gradient,
  children,
  className,
}) => {
  // Light glass background: white at very low opacity
  const background = gradient
    ? `linear-gradient(${gradient.angle}deg, ${gradient.stops.join(', ')})`
    : `rgba(255, 255, 255, ${opacity})`;

  // Corner glow opacity scaled by glowIntensity
  const cornerGlowOpacity = glowIntensity * 0.8;

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        borderRadius,
        border: `${borderWidth}px solid ${borderColor}`,
        backdropFilter: `blur(${blur}px)`,
        WebkitBackdropFilter: `blur(${blur}px)`,
        background,
        padding: 24,
        overflow: 'hidden',
        boxShadow:
          '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 10px 20px -5px rgba(0, 0, 0, 0.15)',
      }}
    >
      {/* Top-right corner glow — large blurred circle for subtle directional lighting */}
      <div
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 160,
          height: 160,
          borderRadius: '50%',
          background: glowColor,
          opacity: cornerGlowOpacity,
          filter: 'blur(48px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Children rendered above glow */}
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
};
