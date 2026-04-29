import React from 'react';
import { ACCENT_PINK } from '../../palette';

export interface AccentRuleProps {
  width?: number;
  thickness?: number;
  color?: string;
  marginTop?: number;
}

export const AccentRule: React.FC<AccentRuleProps> = ({
  width = 120,
  thickness = 3,
  color = ACCENT_PINK,
  marginTop = 0,
}) => {
  return (
    <div
      style={{
        width,
        height: thickness,
        background: color,
        marginTop,
      }}
    />
  );
};
