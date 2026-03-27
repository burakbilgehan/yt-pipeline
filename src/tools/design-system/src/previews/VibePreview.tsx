/**
 * VibePreview — Shows mini scene previews for the selected rendering vibe.
 *
 * Each of the 6 scene categories gets a mini 16:9 card that simulates
 * how that vibe renders the scene type. Uses design-system tool colors
 * + vibe-specific layout/animation characteristics.
 */

import { useTheme } from '../theme-context';

type RenderVibeId = 'cinematic' | 'dashboard' | 'editorial';

interface SceneCategoryInfo {
  id: string;
  name: string;
  icon: string;
}

const CATEGORIES: SceneCategoryInfo[] = [
  { id: 'hero', name: 'Hero', icon: '🎯' },
  { id: 'data-viz', name: 'Data Viz', icon: '📈' },
  { id: 'comparison', name: 'Comparison', icon: '⚖️' },
  { id: 'list', name: 'List', icon: '📋' },
  { id: 'narrative', name: 'Narrative', icon: '🎙️' },
  { id: 'cta', name: 'CTA', icon: '🔔' },
];

// Vibe-specific visual config for previews
interface VibeVisualConfig {
  cornerRadius: number;
  borderWidth: number;
  padding: number;
  alignment: 'center' | 'left';
  letterbox: boolean;
  fontWeight: number;
  heroSize: number;
  bodySize: number;
}

const VIBE_CONFIGS: Record<RenderVibeId, VibeVisualConfig> = {
  cinematic: {
    cornerRadius: 8,
    borderWidth: 0,
    padding: 16,
    alignment: 'center',
    letterbox: true,
    fontWeight: 700,
    heroSize: 28,
    bodySize: 10,
  },
  dashboard: {
    cornerRadius: 4,
    borderWidth: 1,
    padding: 8,
    alignment: 'left',
    letterbox: false,
    fontWeight: 800,
    heroSize: 22,
    bodySize: 9,
  },
  editorial: {
    cornerRadius: 10,
    borderWidth: 0,
    padding: 14,
    alignment: 'left',
    letterbox: false,
    fontWeight: 600,
    heroSize: 24,
    bodySize: 10,
  },
};

// Mini scene frame wrapper
function MiniFrame({
  label,
  icon,
  children,
  bg,
}: {
  label: string;
  icon: string;
  children: React.ReactNode;
  bg: string;
}) {
  return (
    <div>
      <div style={{ fontSize: 9, color: '#777', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <div
        style={{
          aspectRatio: '16 / 9',
          background: bg,
          borderRadius: 6,
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Scene-specific mini previews per vibe ──────────────────────

function HeroPreview({ config, colors }: { config: VibeVisualConfig; colors: any; vibeId: RenderVibeId }) {
  return (
    <div style={{ textAlign: config.alignment, padding: config.padding, width: '100%' }}>
      {config.letterbox && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '12%', background: '#000' }} />
      )}
      <div style={{ fontSize: 8, color: colors.textMuted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>
        The Dow Jones · Since 1925
      </div>
      <div style={{ fontSize: config.heroSize, fontWeight: config.fontWeight, color: colors.accent1, lineHeight: 0.95 }}>
        26,000%
      </div>
      <div style={{ width: 24, height: 2, background: colors.accent1, borderRadius: 1, marginTop: 4, marginLeft: config.alignment === 'center' ? 'auto' : 0, marginRight: config.alignment === 'center' ? 'auto' : undefined }} />
      {config.letterbox && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '12%', background: '#000' }} />
      )}
    </div>
  );
}

function DataVizPreview({ config, colors }: { config: VibeVisualConfig; colors: any; vibeId: RenderVibeId }) {
  const bars = [0.9, 0.7, 0.55, 0.4, 0.3];
  return (
    <div style={{ padding: config.padding, width: '100%' }}>
      <div style={{ fontSize: 8, color: colors.textMuted, marginBottom: 6, textAlign: config.alignment }}>
        GDP Growth Comparison
      </div>
      <div style={{
        background: config.borderWidth > 0 ? colors.surface : 'transparent',
        border: config.borderWidth > 0 ? `${config.borderWidth}px solid ${colors.border}` : 'none',
        borderRadius: config.cornerRadius,
        padding: config.borderWidth > 0 ? 8 : 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 40 }}>
          {bars.map((h, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${h * 100}%`,
                background: i === 0 ? colors.accent1 : colors.accent2,
                borderRadius: `${config.cornerRadius / 2}px ${config.cornerRadius / 2}px 0 0`,
                opacity: 0.8 + i * 0.04,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ComparisonPreview({ config, colors, vibeId }: { config: VibeVisualConfig; colors: any; vibeId: RenderVibeId }) {
  const isDashboard = vibeId === 'dashboard';
  return (
    <div style={{ padding: config.padding, width: '100%', textAlign: config.alignment }}>
      {isDashboard ? (
        // Terminal style
        <div style={{
          background: 'rgba(0,0,0,0.3)',
          border: `1px solid ${colors.border}`,
          borderRadius: config.cornerRadius,
          padding: 8,
          fontFamily: 'monospace',
        }}>
          <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: '#ff5f56' }} />
            <span style={{ width: 6, height: 6, borderRadius: 3, background: '#ffbd2e' }} />
            <span style={{ width: 6, height: 6, borderRadius: 3, background: '#27c93f' }} />
          </div>
          <div style={{ fontSize: 8, color: colors.textMuted }}>// formula.ts</div>
          <div style={{ fontSize: 9, color: colors.text }}>
            <span style={{ color: colors.accent1 }}>Asset</span> ÷ <span style={{ color: colors.accent2 }}>Gold</span> = Ratio
          </div>
        </div>
      ) : (
        // Clean formula display
        <div>
          <div style={{ fontSize: 12, fontWeight: config.fontWeight, color: colors.text, marginBottom: 4 }}>
            <span style={{ color: colors.accent1 }}>Asset Price</span>
            <span style={{ color: colors.textMuted, margin: '0 4px' }}>÷</span>
            <span style={{ color: colors.accent2 }}>Gold Price</span>
          </div>
          <div style={{ fontSize: 8, color: colors.textMuted, fontStyle: vibeId === 'editorial' ? 'italic' : 'normal' }}>
            $500 ÷ $2,990 = 0.167
          </div>
        </div>
      )}
    </div>
  );
}

function ListPreview({ config, colors, vibeId }: { config: VibeVisualConfig; colors: any; vibeId: RenderVibeId }) {
  const items = [
    { name: 'S&P 500', value: '4.38×' },
    { name: 'Bitcoin', value: '2.71×' },
    { name: 'NASDAQ', value: '1.92×' },
  ];
  const isDashboard = vibeId === 'dashboard';

  return (
    <div style={{ padding: config.padding, width: '100%' }}>
      <div style={{ fontSize: 8, color: colors.textMuted, marginBottom: 6, textAlign: config.alignment }}>
        Top Assets by Gold Ratio
      </div>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 4,
            paddingBottom: 4,
            borderBottom: i < items.length - 1 ? `1px solid ${colors.border}` : 'none',
          }}
        >
          {isDashboard ? (
            <div style={{
              width: 14,
              height: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 8,
              fontFamily: 'monospace',
              color: colors.textMuted,
              borderLeft: `2px solid ${colors.accent1}`,
              paddingLeft: 3,
            }}>
              {i + 1}
            </div>
          ) : (
            <div style={{
              fontSize: vibeId === 'editorial' ? 14 : 10,
              fontWeight: 300,
              color: colors.accent1,
              minWidth: 14,
              textAlign: 'right',
            }}>
              {i + 1}
            </div>
          )}
          <div style={{ flex: 1, fontSize: 9, color: colors.text, fontWeight: 500 }}>
            {item.name}
          </div>
          <div style={{ fontSize: 9, color: colors.accent1, fontWeight: 600, fontFamily: isDashboard ? 'monospace' : 'inherit' }}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function NarrativePreview({ config, colors, vibeId }: { config: VibeVisualConfig; colors: any; vibeId: RenderVibeId }) {
  const isDashboard = vibeId === 'dashboard';
  return (
    <div style={{ padding: config.padding, width: '100%' }}>
      {isDashboard ? (
        // Split panel simulation
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{
            flex: '0 0 50%',
            height: 50,
            background: 'rgba(255,255,255,0.05)',
            borderRadius: config.cornerRadius,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            color: colors.textMuted,
          }}>
            ⬜
          </div>
          <div style={{ flex: 1, borderLeft: `2px solid ${colors.accent1}`, paddingLeft: 6 }}>
            <div style={{ fontSize: 9, color: colors.text, fontWeight: config.fontWeight, lineHeight: 1.3 }}>
              Key insight about the data
            </div>
            <div style={{ fontSize: 8, color: colors.textMuted, marginTop: 2 }}>
              Supporting context
            </div>
          </div>
        </div>
      ) : (
        // Image + overlay text
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(135deg, rgba(100,100,100,0.2), rgba(50,50,50,0.3))`,
            borderRadius: config.cornerRadius,
          }} />
          <div style={{
            position: 'absolute',
            bottom: config.padding,
            left: config.padding,
            right: config.padding,
          }}>
            <div style={{
              fontSize: 10,
              color: '#fff',
              fontWeight: config.fontWeight,
              lineHeight: 1.3,
              borderLeft: vibeId === 'editorial' ? `2px solid ${colors.accent1}` : 'none',
              paddingLeft: vibeId === 'editorial' ? 6 : 0,
            }}>
              Visual storytelling scene
            </div>
            {vibeId === 'editorial' && (
              <div style={{ width: 16, height: 2, background: colors.accent1, borderRadius: 1, marginTop: 4 }} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CTAPreview({ config, colors, vibeId }: { config: VibeVisualConfig; colors: any; vibeId: RenderVibeId }) {
  const isDashboard = vibeId === 'dashboard';
  return (
    <div style={{ padding: config.padding, width: '100%', textAlign: 'center' }}>
      <div style={{ fontSize: 10, fontWeight: config.fontWeight, color: colors.text, marginBottom: 4 }}>
        Thanks for watching
      </div>
      {vibeId === 'editorial' && (
        <div style={{ width: 20, height: 2, background: colors.accent1, borderRadius: 1, margin: '0 auto 4px' }} />
      )}
      <div style={{ fontSize: 7, color: colors.textMuted, letterSpacing: isDashboard ? 0 : 1, fontFamily: isDashboard ? 'monospace' : 'inherit', marginBottom: 6 }}>
        {isDashboard ? '@channel_name' : 'CHANNEL NAME'}
      </div>
      <div style={{
        display: 'inline-block',
        fontSize: 8,
        fontWeight: 600,
        color: isDashboard ? '#000' : colors.text === '#F0EDE8' ? '#000' : '#fff',
        background: colors.accent1,
        padding: '3px 12px',
        borderRadius: vibeId === 'editorial' ? 20 : config.cornerRadius,
      }}>
        Subscribe
      </div>
    </div>
  );
}

// ─── Main Preview Grid ──────────────────────────────────────────

export function VibePreview() {
  const { renderVibe, theme } = useTheme();
  const config = VIBE_CONFIGS[renderVibe];

  const colors = {
    accent1: theme.colors.accent1,
    accent2: theme.colors.accent2,
    text: theme.colors.text,
    textMuted: theme.colors.textMuted,
    surface: theme.colors.surface,
    border: theme.colors.border,
    bgTop: theme.colors.bgTop,
  };

  const bg = `linear-gradient(${theme.effects.gradientAngle}deg, ${theme.colors.bgTop} 0%, ${theme.colors.bgBottom} 100%)`;

  const previewRenderers: Record<string, React.ReactNode> = {
    hero: <HeroPreview config={config} colors={colors} vibeId={renderVibe} />,
    'data-viz': <DataVizPreview config={config} colors={colors} vibeId={renderVibe} />,
    comparison: <ComparisonPreview config={config} colors={colors} vibeId={renderVibe} />,
    list: <ListPreview config={config} colors={colors} vibeId={renderVibe} />,
    narrative: <NarrativePreview config={config} colors={colors} vibeId={renderVibe} />,
    cta: <CTAPreview config={config} colors={colors} vibeId={renderVibe} />,
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ color: '#999', fontSize: 13, fontWeight: 500, marginTop: 24, marginBottom: 12, letterSpacing: 1, textTransform: 'uppercase' }}>
        Vibe Preview — {renderVibe.charAt(0).toUpperCase() + renderVibe.slice(1)}
      </h2>
      <div style={{ fontSize: 10, color: '#666', marginBottom: 12 }}>
        How each scene category renders with the <strong style={{ color: '#aaa' }}>{renderVibe}</strong> vibe + your current color palette
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
        }}
      >
        {CATEGORIES.map((cat) => (
          <MiniFrame key={cat.id} label={cat.name} icon={cat.icon} bg={bg}>
            {previewRenderers[cat.id]}
          </MiniFrame>
        ))}
      </div>
    </div>
  );
}
