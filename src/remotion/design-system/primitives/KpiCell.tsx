import React from 'react';
import { ACCENT_PINK, TEXT, TEXT_MUTED, TEXT_FAINT } from '../../palette';

export interface KpiCellProps {
  eyebrow: string;
  value: string;
  valueColor?: string;
  descriptor: string;
  borderBottom?: boolean;
  borderColor?: string;
}

export const KpiCell: React.FC<KpiCellProps> = ({
  eyebrow,
  value,
  valueColor = ACCENT_PINK,
  descriptor,
  borderBottom = false,
  borderColor,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        borderBottom: borderBottom && borderColor ? `1px solid ${borderColor}` : 'none',
        paddingBottom: borderBottom ? 24 : 0,
      }}
    >
      <div
        style={{
          color: TEXT_FAINT,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          marginBottom: 14,
          fontFamily: "'Montserrat', sans-serif",
        }}
      >
        {eyebrow}
      </div>
      <div
        style={{
          color: valueColor,
          fontSize: 76,
          fontWeight: 900,
          lineHeight: 1,
          letterSpacing: '-0.03em',
          fontVariantNumeric: 'tabular-nums lining-nums',
          fontFamily: "'Montserrat', sans-serif",
        }}
      >
        {value}
      </div>
      <div
        style={{
          color: TEXT_MUTED,
          fontSize: 18,
          marginTop: 10,
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {descriptor}
      </div>
    </div>
  );
};
