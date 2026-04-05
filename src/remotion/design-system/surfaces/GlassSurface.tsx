import React from 'react';
import type { SurfaceComponentProps } from '../types';

/**
 * GlassSurface — L4 glassmorphism card container.
 *
 * Renders a semi-transparent container with backdrop blur, subtle border,
 * and optional gradient background. Wraps children.
 */
export const GlassSurface: React.FC<SurfaceComponentProps> = ({
  blur,
  opacity,
  borderRadius,
  borderColor = 'rgba(255,255,255,0.15)',
  borderWidth = 1,
  gradient,
  children,
  className,
}) => {
  // Build background — gradient if provided, otherwise semi-transparent white
  const background = gradient
    ? `linear-gradient(${gradient.angle}deg, ${gradient.stops.join(', ')})`
    : `rgba(255, 255, 255, ${opacity * 0.08})`;

  return (
    <div
      className={className}
      style={{
        borderRadius,
        border: `${borderWidth}px solid ${borderColor}`,
        backdropFilter: `blur(${blur}px)`,
        WebkitBackdropFilter: `blur(${blur}px)`,
        background,
        padding: 24,
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
};
