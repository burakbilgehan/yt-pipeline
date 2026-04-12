import React from 'react';
import type { SurfaceComponentProps } from '../types';

/**
 * FrostedPanelSurface — L4 matte frosted glass panel.
 *
 * Inspired by "glass calendar" designs — NOT shiny/transparent glass,
 * but a soft MATTE frosted effect like looking through frosted bathroom glass.
 * Black-tinted background with strong backdrop blur creates the matte feel.
 * Subtle top-edge highlight gives dimensionality.
 *
 * Key visual: almost opaque-feeling panel that still lets background color
 * through softly. Heavy blur + dark tint = matte frosted.
 *
 * External Component Intake:
 *   Source: "Glass calendar" matte frosted panel treatment
 *   Decomposed: bg black/20, backdrop-blur-xl, 1px white/10 border, rounded-3xl, shadow-2xl
 *   Adapted: All props via SurfaceComponentProps, inline styles only, no external deps
 *   Registered: 'frosted-panel' in surfaces/index.ts
 */
export const FrostedPanelSurface: React.FC<SurfaceComponentProps> = ({
  blur = 24,
  opacity = 0.2,
  borderRadius = 24,
  borderColor = 'rgba(255,255,255,0.10)',
  borderWidth = 1,
  gradient,
  children,
  className,
}) => {
  // Matte frosted background: dark tint (black at given opacity) over blurred backdrop
  const background = gradient
    ? `linear-gradient(${gradient.angle}deg, ${gradient.stops.join(', ')})`
    : `rgba(0, 0, 0, ${opacity})`;

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius,
        border: `${borderWidth}px solid ${borderColor}`,
        backdropFilter: `blur(${blur}px)`,
        WebkitBackdropFilter: `blur(${blur}px)`,
        background,
        overflow: 'hidden',
        boxShadow:
          '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 10px 20px -5px rgba(0, 0, 0, 0.15)',
      }}
    >
      {/* Top-edge highlight — subtle 1px gradient for matte panel dimensionality */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 30%, rgba(255,255,255,0.05) 70%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Children rendered above the highlight */}
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
};
