import React from 'react';
import { ACCENT_PINK, TEXT } from '../../palette';

export interface LogoBlockProps {
  markSize?: number;
  wordmark?: string;
  markColor?: string;
  textColor?: string;
  fontSize?: number;
  letterSpacing?: string;
}

export const LogoBlock: React.FC<LogoBlockProps> = ({
  markSize = 28,
  wordmark = 'The World With Numbers',
  markColor = ACCENT_PINK,
  textColor = TEXT,
  fontSize = 15,
  letterSpacing = '0.1em',
}) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <div
        style={{
          width: markSize,
          height: markSize,
          background: markColor,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          color: textColor,
          fontSize,
          fontWeight: 700,
          letterSpacing,
          textTransform: 'uppercase',
          fontFamily: "'Montserrat', sans-serif",
        }}
      >
        {wordmark}
      </span>
    </div>
  );
};
