import { PreviewFrame, usePreviewStyles } from './shared';

const segments = [
  { label: 'Healthcare', value: 43, color: 'accent1' as const },
  { label: 'Productivity', value: 31, color: 'accent2' as const },
  { label: 'Accidents', value: 18, color: 'positive' as const },
  { label: 'Other', value: 8, color: 'textMuted' as const },
];

export function PieChartPreview() {
  const { theme, glow } = usePreviewStyles();
  const total = segments.reduce((s, d) => s + d.value, 0);
  const cx = 80;
  const cy = 65;
  const r = 50;
  const innerR = 30;

  // Generate donut paths
  let cumulativeAngle = -90; // start from top
  const arcs = segments.map((seg) => {
    const angle = (seg.value / total) * 360;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle = endAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const ix1 = cx + innerR * Math.cos(endRad);
    const iy1 = cy + innerR * Math.sin(endRad);
    const ix2 = cx + innerR * Math.cos(startRad);
    const iy2 = cy + innerR * Math.sin(startRad);

    const large = angle > 180 ? 1 : 0;

    const d = [
      `M ${x1} ${y1}`,
      `A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`,
      `L ${ix1} ${iy1}`,
      `A ${innerR} ${innerR} 0 ${large} 0 ${ix2} ${iy2}`,
      'Z',
    ].join(' ');

    return { ...seg, d };
  });

  const getColor = (key: string) => {
    return theme.colors[key as keyof typeof theme.colors] ?? theme.colors.text;
  };

  return (
    <PreviewFrame title="Donut Chart">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', padding: '0 8%' }}>
        <svg viewBox={`0 0 ${cx * 2} ${cy * 2}`} style={{ width: 140, flexShrink: 0 }}>
          {arcs.map((arc, i) => (
            <path
              key={i}
              d={arc.d}
              fill={getColor(arc.color)}
              style={{
                filter: i === 0 && glow !== 'none' ? `drop-shadow(${glow})` : undefined,
              }}
            />
          ))}
          {/* Center text */}
          <text
            x={cx}
            y={cy - 2}
            textAnchor="middle"
            fontSize={14}
            fontWeight={theme.typography.headingWeight}
            fill={theme.colors.text}
            fontFamily={theme.typography.fontFamily}
          >
            $7.2T
          </text>
          <text
            x={cx}
            y={cy + 10}
            textAnchor="middle"
            fontSize={7}
            fill={theme.colors.textMuted}
            fontFamily={theme.typography.fontFamily}
          >
            total cost
          </text>
        </svg>

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {segments.map((seg) => (
            <div key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: getColor(seg.color), flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: theme.colors.text, fontFamily: theme.typography.fontFamily }}>
                {seg.label}
              </span>
              <span style={{ fontSize: 10, color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily }}>
                {seg.value}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </PreviewFrame>
  );
}
