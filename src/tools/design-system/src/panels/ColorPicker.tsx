import { useTheme } from '../theme-context';

interface Props {
  label: string;
  colorKey: string;
  value: string;
}

export function ColorPicker({ label, colorKey, value }: Props) {
  const { updateColors } = useTheme();

  // Handle rgba colors — show hex input for simple colors, text input for rgba
  const isRgba = value.startsWith('rgba');

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <input
        type="color"
        value={isRgba ? '#ffffff' : value}
        onChange={(e) => updateColors(colorKey, e.target.value)}
        style={{ width: 28, height: 28, border: 'none', cursor: 'pointer', background: 'transparent' }}
        disabled={isRgba}
      />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>{label}</div>
        <input
          type="text"
          value={value}
          onChange={(e) => updateColors(colorKey, e.target.value)}
          style={{
            width: '100%',
            background: '#2a2a2a',
            border: '1px solid #444',
            borderRadius: 4,
            color: '#eee',
            padding: '3px 6px',
            fontSize: 12,
            fontFamily: 'monospace',
          }}
        />
      </div>
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: 4,
          background: value,
          border: '1px solid #555',
          flexShrink: 0,
        }}
      />
    </div>
  );
}
