import { PreviewFrame, usePreviewStyles, surfaceStyle, shadowStyle } from './shared';

export function CalloutPreview() {
  const { theme, glow } = usePreviewStyles();

  return (
    <PreviewFrame title="Key Takeaway / Callout">
      <div style={{ width: '100%', padding: '0 10%' }}>
        <div
          style={{
            ...surfaceStyle(theme),
            boxShadow: shadowStyle(theme),
            padding: 16,
            borderLeft: `3px solid ${theme.colors.accent1}`,
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: theme.geometry.cornerRadius,
              background: theme.colors.accent1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              flexShrink: 0,
              boxShadow: glow !== 'none' ? glow : undefined,
            }}
          >
            !
          </div>

          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: theme.typography.headingWeight,
                color: theme.colors.text,
                fontFamily: theme.typography.fontFamily,
                marginBottom: 4,
              }}
            >
              Key Insight
            </div>
            <div
              style={{
                fontSize: 11,
                color: theme.colors.textMuted,
                fontFamily: theme.typography.fontFamily,
                lineHeight: 1.5,
              }}
            >
              Countries that lose the most sleep also tend to have the longest working hours — but not the highest productivity. The correlation between overwork and economic loss is striking.
            </div>

            {/* Source tag */}
            <div
              style={{
                marginTop: 8,
                fontSize: 9,
                color: theme.colors.accent2,
                fontFamily: theme.typography.fontFamily,
              }}
            >
              Source: RAND Corporation, 2024
            </div>
          </div>
        </div>
      </div>
    </PreviewFrame>
  );
}
