import { PreviewFrame, usePreviewStyles } from './shared';

export function SectionHeaderPreview() {
  const { theme, glow } = usePreviewStyles();

  return (
    <PreviewFrame title="Section Header">
      <div style={{ textAlign: theme.geometry.alignment, width: '100%', padding: '0 15%' }}>
        {/* Chapter number */}
        <div
          style={{
            fontSize: 11,
            color: theme.colors.accent1,
            fontWeight: 600,
            letterSpacing: 2,
            textTransform: 'uppercase',
            fontFamily: theme.typography.fontFamily,
            marginBottom: 4,
          }}
        >
          Part 02
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 22,
            fontWeight: theme.typography.headingWeight,
            color: theme.colors.text,
            fontFamily: theme.typography.fontFamily,
            lineHeight: 1.2,
          }}
        >
          The Consequences
        </div>

        {/* Accent line */}
        <div
          style={{
            width: 50,
            height: 2,
            background: theme.colors.accent1,
            borderRadius: theme.geometry.cornerRadius,
            marginTop: 10,
            marginLeft: theme.geometry.alignment === 'center' ? 'auto' : theme.geometry.alignment === 'right' ? 'auto' : 0,
            marginRight: theme.geometry.alignment === 'center' ? 'auto' : theme.geometry.alignment === 'right' ? 0 : 'auto',
            boxShadow: glow !== 'none' ? glow : undefined,
          }}
        />

        {/* Subtitle */}
        <div
          style={{
            fontSize: 11,
            color: theme.colors.textMuted,
            fontFamily: theme.typography.fontFamily,
            marginTop: 8,
          }}
        >
          How sleep deprivation quietly drains the global economy
        </div>
      </div>
    </PreviewFrame>
  );
}
