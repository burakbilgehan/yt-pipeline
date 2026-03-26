import { useTheme } from '../theme-context';
import { ColorPicker } from './ColorPicker';
import { PresetSelector } from './PresetSelector';
import { VibeSelector } from './VibeSelector';
import { exportDesignSystem } from '../export/export-utils';
import { getFontOptionsGrouped, getMonoFontOptions } from '@fonts/font-registry';

const fontGroups = getFontOptionsGrouped();
const monoFonts = getMonoFontOptions();

export function ControlPanel() {
  const { theme, updateGeometry, updateEffects, updateTypography, updateAnimation, setTheme } = useTheme();

  const sliderRow = (
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    onChange: (v: number) => void,
    displayValue?: string,
  ) => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#999', marginBottom: 3 }}>
        <span>{label}</span>
        <span style={{ fontFamily: 'monospace' }}>{displayValue ?? value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: theme.colors.accent1 }}
      />
    </div>
  );

  const selectRow = (
    label: string,
    value: string,
    options: { value: string; label: string }[],
    onChange: (v: string) => void,
  ) => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: '#999', marginBottom: 3 }}>{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          background: '#2a2a2a',
          border: '1px solid #444',
          borderRadius: 4,
          color: '#eee',
          padding: '5px 8px',
          fontSize: 12,
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );

  const sectionHeader = (title: string) => (
    <div
      style={{
        fontSize: 11,
        color: '#777',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 16,
        marginBottom: 8,
        borderBottom: '1px solid #333',
        paddingBottom: 4,
      }}
    >
      {title}
    </div>
  );

  return (
    <div
      style={{
        width: 300,
        minWidth: 300,
        height: '100vh',
        overflowY: 'auto',
        background: '#1a1a1a',
        borderRight: '1px solid #333',
        padding: 16,
        color: '#ddd',
        fontSize: 13,
      }}
    >
      <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>Design System</h2>

      {/* ─── Rendering Vibe ─── */}
      <VibeSelector />

      {/* ─── Presets ─── */}
      <PresetSelector />

      {/* ─── Colors ─── */}
      {sectionHeader('Colors')}
      <ColorPicker label="Background Top" colorKey="bgTop" value={theme.colors.bgTop} />
      <ColorPicker label="Background Bottom" colorKey="bgBottom" value={theme.colors.bgBottom} />
      <ColorPicker label="Accent 1 (Primary)" colorKey="accent1" value={theme.colors.accent1} />
      <ColorPicker label="Accent 2 (Secondary)" colorKey="accent2" value={theme.colors.accent2} />
      <ColorPicker label="Text" colorKey="text" value={theme.colors.text} />
      <ColorPicker label="Text Muted" colorKey="textMuted" value={theme.colors.textMuted} />
      <ColorPicker label="Positive" colorKey="positive" value={theme.colors.positive} />
      <ColorPicker label="Negative" colorKey="negative" value={theme.colors.negative} />
      <ColorPicker label="Surface" colorKey="surface" value={theme.colors.surface} />
      <ColorPicker label="Border" colorKey="border" value={theme.colors.border} />

      {/* ─── Typography ─── */}
      {sectionHeader('Typography')}

      {/* Font Family — grouped by category */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: '#999', marginBottom: 3 }}>Font Family</div>
        <select
          value={theme.typography.fontFamily}
          onChange={(e) => updateTypography('fontFamily', e.target.value)}
          style={{
            width: '100%',
            background: '#2a2a2a',
            border: '1px solid #444',
            borderRadius: 4,
            color: '#eee',
            padding: '5px 8px',
            fontSize: 12,
          }}
        >
          {fontGroups.map((group) => (
            <optgroup key={group.category} label={group.label}>
              {group.fonts.map((font) => (
                <option key={font.cssFamily} value={font.cssFamily} title={font.useCase}>
                  {font.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <div style={{ fontSize: 10, color: '#555', marginTop: 2, fontStyle: 'italic' }}>
          {fontGroups.flatMap((g) => g.fonts).find((f) => f.cssFamily === theme.typography.fontFamily)?.useCase ?? ''}
        </div>
      </div>

      {sliderRow('Heading Weight', theme.typography.headingWeight, 400, 900, 100, (v) => updateTypography('headingWeight', v))}

      {/* Monospace Font */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: '#999', marginBottom: 3 }}>Monospace Font</div>
        <select
          value={theme.typography.monoFont}
          onChange={(e) => updateTypography('monoFont', e.target.value)}
          style={{
            width: '100%',
            background: '#2a2a2a',
            border: '1px solid #444',
            borderRadius: 4,
            color: '#eee',
            padding: '5px 8px',
            fontSize: 12,
          }}
        >
          {monoFonts.map((font) => (
            <option key={font.cssFamily} value={font.cssFamily}>
              {font.name}
            </option>
          ))}
        </select>
      </div>

      {/* ─── Geometry ─── */}
      {sectionHeader('Geometry & Layout')}
      {sliderRow('Corner Radius', theme.geometry.cornerRadius, 0, 24, 1, (v) => updateGeometry('cornerRadius', v), `${theme.geometry.cornerRadius}px`)}
      {sliderRow('Screen Utilization', theme.geometry.screenUtilization, 0.5, 1, 0.05, (v) => updateGeometry('screenUtilization', v), `${Math.round(theme.geometry.screenUtilization * 100)}%`)}
      {sliderRow('Asymmetry', theme.geometry.asymmetry, 0, 1, 0.05, (v) => updateGeometry('asymmetry', v), `${Math.round(theme.geometry.asymmetry * 100)}%`)}
      {selectRow('Alignment', theme.geometry.alignment, [
        { value: 'center', label: 'Center' },
        { value: 'left', label: 'Left' },
        { value: 'right', label: 'Right' },
      ], (v) => updateGeometry('alignment', v))}

      {/* ─── Effects ─── */}
      {sectionHeader('Effects')}
      {sliderRow('Glass Opacity', theme.effects.glassOpacity, 0, 0.3, 0.01, (v) => updateEffects('glassOpacity', v), `${Math.round(theme.effects.glassOpacity * 100)}%`)}
      {sliderRow('Glow Intensity', theme.effects.glowIntensity, 0, 1, 0.05, (v) => updateEffects('glowIntensity', v), `${Math.round(theme.effects.glowIntensity * 100)}%`)}
      {selectRow('Shadow Depth', theme.effects.shadowDepth as string, [
        { value: 'none', label: 'None (Flat)' },
        { value: 'whisper', label: 'Whisper' },
        { value: 'soft', label: 'Soft' },
        { value: 'floating', label: 'Floating' },
      ], (v) => updateEffects('shadowDepth', v))}
      {sliderRow('Gradient Angle', theme.effects.gradientAngle, 0, 360, 5, (v) => updateEffects('gradientAngle', v), `${theme.effects.gradientAngle}°`)}

      {/* ─── Animation ─── */}
      {sectionHeader('Animation')}
      {selectRow('Speed', theme.animation.speed, [
        { value: 'slow', label: 'Slow' },
        { value: 'normal', label: 'Normal' },
        { value: 'fast', label: 'Fast' },
      ], (v) => updateAnimation('speed', v))}

      {/* ─── Prompt ─── */}
      {sectionHeader('Style Prompt')}
      <textarea
        placeholder="Describe the vibe... e.g. 'cozy dark theme with warm rose highlights, soft glow, atmospheric'"
        value={theme.promptInput ?? ''}
        onChange={(e) => setTheme({ ...theme, promptInput: e.target.value })}
        style={{
          width: '100%',
          minHeight: 60,
          background: '#2a2a2a',
          border: '1px solid #444',
          borderRadius: 6,
          color: '#eee',
          padding: 8,
          fontSize: 12,
          resize: 'vertical',
          fontFamily: 'inherit',
        }}
      />
      <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>
        This prompt will be included in the exported DESIGN.md for AI agents.
      </div>

      {/* ─── Export ─── */}
      {sectionHeader('Export')}
      <button
        onClick={() => exportDesignSystem(theme)}
        style={{
          width: '100%',
          padding: '10px 16px',
          background: theme.colors.accent1,
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: 8,
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
      >
        Export design-system.json + DESIGN.md
      </button>
      <div style={{ fontSize: 10, color: '#666', marginBottom: 24 }}>
        Downloads both files. Place them in your channel folder.
      </div>
    </div>
  );
}
