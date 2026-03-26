import { PreviewFrame, usePreviewStyles } from './shared';

export function TitleCardPreview() {
  const { theme } = usePreviewStyles();

  return (
    <PreviewFrame title="Title Card / Hook">
      <div
        style={{
          textAlign: theme.geometry.alignment,
          padding: '0 10%',
          width: '100%',
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: theme.typography.headingWeight,
            color: theme.colors.text,
            lineHeight: 1.2,
            marginBottom: 8,
            fontFamily: theme.typography.fontFamily,
          }}
        >
          7.2 Trillion Dollars
        </div>
        <div
          style={{
            fontSize: 13,
            color: theme.colors.textMuted,
            fontFamily: theme.typography.fontFamily,
          }}
        >
          The hidden cost the world pays every year
        </div>
        <div
          style={{
            width: 40,
            height: 3,
            background: theme.colors.accent1,
            borderRadius: theme.geometry.cornerRadius,
            marginTop: 12,
            marginLeft: theme.geometry.alignment === 'center' ? 'auto' : theme.geometry.alignment === 'right' ? 'auto' : 0,
            marginRight: theme.geometry.alignment === 'center' ? 'auto' : theme.geometry.alignment === 'right' ? 0 : 'auto',
            boxShadow: theme.effects.glowIntensity > 0.1
              ? `0 0 ${theme.effects.glowIntensity * 15}px ${theme.colors.accent1}`
              : 'none',
          }}
        />
      </div>
    </PreviewFrame>
  );
}
