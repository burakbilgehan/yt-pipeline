import React from 'react';
import { ACCENT_PINK, TEXT, TEXT_FAINT, SURFACE_BORDER_STRONG } from '../../palette';

export interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  meta?: string;
  eyebrowColor?: string;
  titleColor?: string;
  titleSize?: number;
  borderBottom?: boolean;
  paddingY?: { top?: number; bottom?: number };
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  eyebrow,
  title,
  meta,
  eyebrowColor = ACCENT_PINK,
  titleColor = TEXT,
  titleSize = 52,
  borderBottom = true,
  paddingY = { top: 28, bottom: 24 },
}) => {
  return (
    <div
      style={{
        borderBottom: borderBottom ? `2px solid ${SURFACE_BORDER_STRONG}` : 'none',
        padding: `${paddingY.top ?? 28}px 0 ${paddingY.bottom ?? 24}px`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        gap: 24,
      }}
    >
      <div>
        <div
          style={{
            color: eyebrowColor,
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            marginBottom: 14,
            fontFamily: "'Montserrat', sans-serif",
          }}
        >
          {eyebrow}
        </div>
        <div
          style={{
            color: titleColor,
            fontSize: titleSize,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            fontFamily: "'Montserrat', sans-serif",
          }}
        >
          {title}
        </div>
      </div>
      {meta && (
        <div
          style={{
            color: TEXT_FAINT,
            fontSize: 13,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            paddingBottom: 4,
            fontFamily: "'Montserrat', sans-serif",
            flexShrink: 0,
          }}
        >
          {meta}
        </div>
      )}
    </div>
  );
};
