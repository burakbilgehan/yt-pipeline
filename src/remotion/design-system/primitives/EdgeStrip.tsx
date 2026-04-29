import React from 'react';
import { ACCENT_PINK } from '../../palette';

export type EdgePosition = 'top' | 'right' | 'bottom' | 'left';

export interface EdgeStripProps {
  position: EdgePosition;
  thickness?: number;
  color?: string;
}

export const EdgeStrip: React.FC<EdgeStripProps> = ({
  position,
  thickness = 8,
  color = ACCENT_PINK,
}) => {
  const base: React.CSSProperties = {
    position: 'absolute',
    background: color,
    pointerEvents: 'none',
  };

  const dim: React.CSSProperties = (() => {
    switch (position) {
      case 'top':
        return { top: 0, left: 0, width: '100%', height: thickness };
      case 'bottom':
        return { bottom: 0, left: 0, width: '100%', height: thickness };
      case 'left':
        return { top: 0, left: 0, width: thickness, height: '100%' };
      case 'right':
        return { top: 0, right: 0, width: thickness, height: '100%' };
    }
  })();

  return <div style={{ ...base, ...dim }} />;
};
