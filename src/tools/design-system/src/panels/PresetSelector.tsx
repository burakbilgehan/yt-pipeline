import { useTheme } from '../theme-context';
import { colorPresets, vibePresets } from '../presets';

export function PresetSelector() {
  const { applyColorPreset, applyVibePreset, activeColorId, activeVibeId } = useTheme();

  const sectionLabel = (title: string) => (
    <div
      style={{
        fontSize: 10,
        color: '#666',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 4,
        marginTop: 2,
      }}
    >
      {title}
    </div>
  );

  const darkPalettes = colorPresets.filter((p) => p.mode === 'dark');
  const lightPalettes = colorPresets.filter((p) => p.mode === 'light');

  return (
    <div style={{ marginBottom: 16 }}>
      {/* ─── Color Palettes ─── */}
      <div
        style={{
          fontSize: 11,
          color: '#999',
          marginBottom: 6,
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
        Color Palette
      </div>

      {sectionLabel('Dark')}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 6 }}>
        {darkPalettes.map((preset) => {
          const isActive = activeColorId === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => applyColorPreset(preset.id, preset.colors)}
              style={{
                padding: '6px 8px',
                background: isActive ? '#3a3a5a' : '#222',
                border: isActive ? '1px solid #7a7aaa' : '1px solid #333',
                borderRadius: 5,
                color: '#ddd',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: 11,
                transition: 'all 0.15s',
              }}
              title={preset.description}
            >
              <div style={{ display: 'flex', gap: 3, marginBottom: 3 }}>
                <span style={{ width: 8, height: 8, borderRadius: 1, background: preset.colors.bgTop, border: '1px solid #555' }} />
                <span style={{ width: 8, height: 8, borderRadius: 1, background: preset.colors.accent1 }} />
                <span style={{ width: 8, height: 8, borderRadius: 1, background: preset.colors.accent2 }} />
                <span style={{ width: 8, height: 8, borderRadius: 1, background: preset.colors.positive }} />
              </div>
              <div style={{ fontWeight: isActive ? 600 : 400, lineHeight: 1.2 }}>{preset.name}</div>
            </button>
          );
        })}
      </div>

      {sectionLabel('Light')}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 14 }}>
        {lightPalettes.map((preset) => {
          const isActive = activeColorId === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => applyColorPreset(preset.id, preset.colors)}
              style={{
                padding: '6px 8px',
                background: isActive ? '#4a4a6a' : '#333',
                border: isActive ? '1px solid #7a7aaa' : '1px solid #444',
                borderRadius: 5,
                color: '#ddd',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: 11,
                transition: 'all 0.15s',
              }}
              title={preset.description}
            >
              <div style={{ display: 'flex', gap: 3, marginBottom: 3 }}>
                <span style={{ width: 8, height: 8, borderRadius: 1, background: preset.colors.bgTop, border: '1px solid #555' }} />
                <span style={{ width: 8, height: 8, borderRadius: 1, background: preset.colors.accent1 }} />
                <span style={{ width: 8, height: 8, borderRadius: 1, background: preset.colors.accent2 }} />
                <span style={{ width: 8, height: 8, borderRadius: 1, background: preset.colors.positive }} />
              </div>
              <div style={{ fontWeight: isActive ? 600 : 400, lineHeight: 1.2 }}>{preset.name}</div>
            </button>
          );
        })}
      </div>

      {/* ─── Vibe Presets ─── */}
      <div
        style={{
          fontSize: 11,
          color: '#999',
          marginBottom: 6,
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
        Vibe / Approach
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
        {vibePresets.map((vibe) => {
          const isActive = activeVibeId === vibe.id;
          return (
            <button
              key={vibe.id}
              onClick={() => applyVibePreset(vibe.id, vibe)}
              style={{
                padding: '7px 9px',
                background: isActive ? '#3a3a5a' : '#222',
                border: isActive ? '1px solid #7a7aaa' : '1px solid #333',
                borderRadius: 5,
                color: '#ddd',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: 11,
                transition: 'all 0.15s',
              }}
              title={vibe.description}
            >
              <div style={{ fontWeight: isActive ? 600 : 400, lineHeight: 1.2 }}>{vibe.name}</div>
              <div style={{ fontSize: 9, color: '#888', marginTop: 2, lineHeight: 1.3 }}>{vibe.description}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
