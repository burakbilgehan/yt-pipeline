import { PreviewFrame, usePreviewStyles } from './shared';

export function CounterPreview() {
  const { theme, glow } = usePreviewStyles();

  const breakdownData = [
    { label: 'Healthcare', value: 3.1, color: theme.colors.accent1 },
    { label: 'Lost Productivity', value: 2.8, color: theme.colors.accent2 },
    { label: 'Accidents', value: 1.3, color: theme.colors.positive },
  ];

  const total = breakdownData.reduce((s, d) => s + d.value, 0);

  return (
    <PreviewFrame title="Counter / Big Number">
      <div style={{ textAlign: 'center', width: '100%' }}>
        <div style={{ fontSize: 11, color: theme.colors.textMuted, marginBottom: 4, fontFamily: theme.typography.fontFamily }}>
          Global Annual Cost
        </div>
        <div
          style={{
            fontSize: 42,
            fontWeight: theme.typography.headingWeight,
            color: theme.colors.accent1,
            fontFamily: theme.typography.fontFamily,
            textShadow: glow !== 'none' ? glow : undefined,
            lineHeight: 1.1,
          }}
        >
          $7.2T
        </div>
        <div style={{ fontSize: 11, color: theme.colors.textMuted, marginTop: 2, fontFamily: theme.typography.fontFamily }}>
          trillion USD per year
        </div>

        {/* Breakdown bar */}
        <div style={{ display: 'flex', gap: 2, marginTop: 16, borderRadius: theme.geometry.cornerRadius, overflow: 'hidden', height: 6, margin: '16px 15% 0' }}>
          {breakdownData.map((d) => (
            <div key={d.label} style={{ flex: d.value / total, background: d.color, borderRadius: 1 }} />
          ))}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8 }}>
          {breakdownData.map((d) => (
            <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: 2, background: d.color }} />
              <span style={{ fontSize: 9, color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily }}>
                {d.label} ${d.value}T
              </span>
            </div>
          ))}
        </div>
      </div>
    </PreviewFrame>
  );
}
