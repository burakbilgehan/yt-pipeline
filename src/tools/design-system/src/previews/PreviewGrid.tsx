import { TitleCardPreview } from './TitleCardPreview';
import { CounterPreview } from './CounterPreview';
import { BarChartPreview } from './BarChartPreview';
import { ComparisonPreview } from './ComparisonPreview';
import { LineChartPreview } from './LineChartPreview';
import { PieChartPreview } from './PieChartPreview';
import { SectionHeaderPreview } from './SectionHeaderPreview';
import { CalloutPreview } from './CalloutPreview';
import { VibePreview } from './VibePreview';

export function PreviewGrid() {
  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: 24,
        background: '#111',
      }}
    >
      {/* ─── Vibe Scene Previews ─── */}
      <VibePreview />

      {/* ─── Component Previews ─── */}
      <h2 style={{ color: '#999', fontSize: 13, fontWeight: 500, marginTop: 24, marginBottom: 16, letterSpacing: 1, textTransform: 'uppercase' }}>
        Component Previews
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: 16,
        }}
      >
        <TitleCardPreview />
        <CounterPreview />
        <BarChartPreview />
        <ComparisonPreview />
        <LineChartPreview />
        <PieChartPreview />
        <SectionHeaderPreview />
        <CalloutPreview />
      </div>
    </div>
  );
}
