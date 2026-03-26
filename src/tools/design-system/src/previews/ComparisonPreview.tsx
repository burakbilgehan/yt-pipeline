import { PreviewFrame, usePreviewStyles, surfaceStyle, shadowStyle } from './shared';

export function ComparisonPreview() {
  const { theme } = usePreviewStyles();

  const cardStyle: React.CSSProperties = {
    flex: 1,
    padding: 12,
    ...surfaceStyle(theme),
    boxShadow: shadowStyle(theme),
    textAlign: 'center',
  };

  const metrics = [
    { label: 'GDP Loss', left: '$680B', right: '$410B' },
    { label: 'Avg Sleep (hrs)', left: '6.3', right: '6.9' },
    { label: 'Working Hours/yr', left: '1,791', right: '1,332' },
  ];

  return (
    <PreviewFrame title="Duel Comparison">
      <div style={{ width: '100%', padding: '0 6%' }}>
        {/* Headers */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
          <div style={cardStyle}>
            <div style={{ fontSize: 16, fontWeight: theme.typography.headingWeight, color: theme.colors.accent1, fontFamily: theme.typography.fontFamily }}>
              United States
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 12, color: theme.colors.textMuted, fontWeight: 700 }}>
            VS
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: 16, fontWeight: theme.typography.headingWeight, color: theme.colors.accent2, fontFamily: theme.typography.fontFamily }}>
              Germany
            </div>
          </div>
        </div>

        {/* Metrics */}
        {metrics.map((m) => (
          <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{ flex: 1, textAlign: 'right', fontSize: 14, fontWeight: 700, color: theme.colors.accent1, fontFamily: theme.typography.fontFamily }}>
              {m.left}
            </div>
            <div style={{ width: 80, textAlign: 'center', fontSize: 9, color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily }}>
              {m.label}
            </div>
            <div style={{ flex: 1, textAlign: 'left', fontSize: 14, fontWeight: 700, color: theme.colors.accent2, fontFamily: theme.typography.fontFamily }}>
              {m.right}
            </div>
          </div>
        ))}
      </div>
    </PreviewFrame>
  );
}
