import { useTheme } from '../theme-context';
import type { DesignSystem } from '../types';

// ─── Shared helpers for all previews ─────────────────────────────────────────

export function usePreviewStyles() {
  const { theme } = useTheme();
  return {
    theme,
    bg: `linear-gradient(${theme.effects.gradientAngle}deg, ${theme.colors.bgTop} 0%, ${theme.colors.bgBottom} 100%)`,
    surface: surfaceStyle(theme),
    shadow: shadowStyle(theme),
    glow: glowStyle(theme),
  };
}

export function surfaceStyle(t: DesignSystem): React.CSSProperties {
  return {
    background: t.colors.surface,
    backdropFilter: t.effects.glassOpacity > 0.02 ? `blur(${Math.round(t.effects.glassOpacity * 100)}px)` : undefined,
    border: `${t.geometry.borderWidth}px solid ${t.colors.border}`,
    borderRadius: t.geometry.cornerRadius,
  };
}

export function shadowStyle(t: DesignSystem): string {
  switch (t.effects.shadowDepth) {
    case 'whisper': return '0 1px 4px rgba(0,0,0,0.15)';
    case 'soft': return '0 4px 16px rgba(0,0,0,0.2)';
    case 'floating': return '0 8px 32px rgba(0,0,0,0.3)';
    default: return 'none';
  }
}

export function glowStyle(t: DesignSystem): string {
  if (t.effects.glowIntensity < 0.05) return 'none';
  const alpha = Math.round(t.effects.glowIntensity * 0.4 * 255).toString(16).padStart(2, '0');
  return `0 0 ${Math.round(t.effects.glowIntensity * 30)}px ${t.colors.accent1}${alpha}`;
}

// Preview wrapper — simulates a 16:9 video frame
export function PreviewFrame({ title, children }: { title: string; children: React.ReactNode }) {
  const { theme, bg, shadow } = usePreviewStyles();

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, color: '#888', marginBottom: 4, fontWeight: 500 }}>{title}</div>
      <div
        style={{
          aspectRatio: '16 / 9',
          background: bg,
          borderRadius: 8,
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: shadow,
          fontFamily: theme.typography.fontFamily,
          padding: `${Math.round((1 - theme.geometry.screenUtilization) * 50)}%`,
        }}
      >
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
