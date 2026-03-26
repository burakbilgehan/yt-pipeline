/**
 * VibeSelector — Rendering vibe picker for the design system tool.
 *
 * Shows 3 rendering vibes (cinematic, dashboard, editorial) with
 * descriptions and reference channels. Selected vibe determines
 * which component set will be used in video production.
 */

import { useTheme } from '../theme-context';

type RenderVibeId = 'cinematic' | 'dashboard' | 'editorial';

interface VibeOption {
  id: RenderVibeId;
  name: string;
  icon: string;
  description: string;
  reference: string;
  tone: string;
}

const VIBES: VibeOption[] = [
  {
    id: 'cinematic',
    name: 'Cinematic',
    icon: '🎬',
    description: 'Documentary-style with letterbox, Ken Burns, fade transitions, dramatic reveals',
    reference: 'Kurzgesagt, ColdFusion',
    tone: 'Serious, authoritative, slow-burn',
  },
  {
    id: 'dashboard',
    name: 'Dashboard',
    icon: '📊',
    description: 'Grid layouts, snap transitions, terminal aesthetic, data-dense panels',
    reference: 'Fireship, Bloomberg',
    tone: 'Fast, technical, data-forward',
  },
  {
    id: 'editorial',
    name: 'Editorial',
    icon: '📰',
    description: 'Infographic storytelling, clean whitespace, smooth scroll-like flow',
    reference: 'Vox, Visual Capitalist',
    tone: 'Explanatory, clean, accessible',
  },
];

export function VibeSelector() {
  const { renderVibe, setRenderVibe } = useTheme();

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: 11,
          color: '#999',
          marginBottom: 8,
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
        Rendering Vibe
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {VIBES.map((vibe) => {
          const isActive = renderVibe === vibe.id;
          return (
            <button
              key={vibe.id}
              onClick={() => setRenderVibe(vibe.id)}
              style={{
                padding: '10px 12px',
                background: isActive ? '#2a2a4a' : '#1e1e1e',
                border: isActive ? '1px solid #6666aa' : '1px solid #333',
                borderRadius: 6,
                color: '#ddd',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 3,
                    background: '#7a7aee',
                    borderRadius: '3px 0 0 3px',
                  }}
                />
              )}

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 14 }}>{vibe.icon}</span>
                <span style={{ fontSize: 12, fontWeight: isActive ? 700 : 500 }}>{vibe.name}</span>
              </div>

              {/* Description */}
              <div style={{ fontSize: 10, color: '#888', lineHeight: 1.4, marginBottom: 4 }}>
                {vibe.description}
              </div>

              {/* Reference + Tone */}
              <div style={{ display: 'flex', gap: 8, fontSize: 9, color: '#666' }}>
                <span>ref: {vibe.reference}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ fontSize: 10, color: '#555', marginTop: 6, lineHeight: 1.4 }}>
        Determines which component set renders each scene category (hero, data-viz, comparison, list, narrative, cta).
      </div>
    </div>
  );
}
