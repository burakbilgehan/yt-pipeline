import React from 'react';
import type { SurfaceComponentProps } from '../types';

/**
 * FlatSurface — L4 clean, opaque card container.
 *
 * Solid background optimized for content readability.
 * Uses gradient stops if provided, otherwise a solid dark surface.
 */
export const FlatSurface: React.FC<SurfaceComponentProps> = ({
  opacity,
  borderRadius,
  borderColor = 'rgba(255,255,255,0.1)',
  borderWidth = 1,
  gradient,
  children,
  className,
}) => {
  // Solid dark background, or gradient if provided
  const background = gradient
    ? `linear-gradient(${gradient.angle}deg, ${gradient.stops.join(', ')})`
    : `rgba(30, 30, 40, ${opacity})`;

  return (
    <div
      className={className}
      style={{
        borderRadius,
        border: `${borderWidth}px solid ${borderColor}`,
        background,
        padding: 24,
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
};
