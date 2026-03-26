import { PreviewFrame, usePreviewStyles, surfaceStyle } from './shared';

const data = [
  { label: 'Japan', value: 138, flag: 'JP' },
  { label: 'United States', value: 120, flag: 'US' },
  { label: 'Germany', value: 98, flag: 'DE' },
  { label: 'United Kingdom', value: 87, flag: 'UK' },
  { label: 'Australia', value: 72, flag: 'AU' },
];

export function BarChartPreview() {
  const { theme } = usePreviewStyles();
  const maxVal = Math.max(...data.map((d) => d.value));

  return (
    <PreviewFrame title="Horizontal Bar Chart">
      <div style={{ width: '100%', padding: '0 8%' }}>
        <div style={{ fontSize: 12, color: theme.colors.textMuted, marginBottom: 10, fontFamily: theme.typography.fontFamily }}>
          Sleep Deprivation Cost per Capita ($)
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {data.map((d, i) => (
            <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 60, fontSize: 10, color: theme.colors.textMuted, textAlign: 'right', fontFamily: theme.typography.fontFamily }}>
                {d.label}
              </div>
              <div style={{ flex: 1, height: 16, ...surfaceStyle(theme), borderRadius: theme.geometry.cornerRadius, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${(d.value / maxVal) * 100}%`,
                    height: '100%',
                    background: i === 0 ? theme.colors.accent1 : theme.colors.accent2,
                    borderRadius: theme.geometry.cornerRadius,
                    transition: 'width 0.3s',
                  }}
                />
              </div>
              <div style={{ width: 30, fontSize: 10, color: theme.colors.text, fontFamily: theme.typography.fontFamily, fontWeight: 600 }}>
                ${d.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PreviewFrame>
  );
}
