import { PreviewFrame, usePreviewStyles } from './shared';

// Dummy trend data — GDP loss over years
const points = [
  { year: 2015, value: 4.8 },
  { year: 2016, value: 5.1 },
  { year: 2017, value: 5.4 },
  { year: 2018, value: 5.9 },
  { year: 2019, value: 6.3 },
  { year: 2020, value: 6.0 },
  { year: 2021, value: 6.5 },
  { year: 2022, value: 6.8 },
  { year: 2023, value: 7.0 },
  { year: 2024, value: 7.2 },
];

export function LineChartPreview() {
  const { theme, glow } = usePreviewStyles();

  const minVal = Math.min(...points.map((p) => p.value)) - 0.5;
  const maxVal = Math.max(...points.map((p) => p.value)) + 0.5;
  const w = 300;
  const h = 120;

  const toX = (i: number) => (i / (points.length - 1)) * w;
  const toY = (v: number) => h - ((v - minVal) / (maxVal - minVal)) * h;

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(p.value)}`).join(' ');

  // Area fill
  const areaD = `${pathD} L ${toX(points.length - 1)} ${h} L 0 ${h} Z`;

  return (
    <PreviewFrame title="Line Chart / Trend">
      <div style={{ width: '100%', padding: '0 8%' }}>
        <div style={{ fontSize: 12, color: theme.colors.textMuted, marginBottom: 8, fontFamily: theme.typography.fontFamily }}>
          Global Sleep Deprivation Cost ($T)
        </div>
        <svg viewBox={`-20 -10 ${w + 40} ${h + 30}`} style={{ width: '100%' }}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
            <line
              key={frac}
              x1={0} y1={frac * h} x2={w} y2={frac * h}
              stroke={theme.colors.border}
              strokeWidth={0.5}
            />
          ))}

          {/* Area fill */}
          <path d={areaD} fill={theme.colors.accent1} opacity={0.1} />

          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke={theme.colors.accent1}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: glow !== 'none' ? `drop-shadow(${glow})` : undefined }}
          />

          {/* Points */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={toX(i)}
              cy={toY(p.value)}
              r={i === points.length - 1 ? 4 : 2}
              fill={i === points.length - 1 ? theme.colors.accent1 : theme.colors.text}
            />
          ))}

          {/* Year labels */}
          {points.filter((_, i) => i % 3 === 0 || i === points.length - 1).map((p, i) => (
            <text
              key={i}
              x={toX(points.indexOf(p))}
              y={h + 14}
              textAnchor="middle"
              fontSize={8}
              fill={theme.colors.textMuted}
              fontFamily={theme.typography.fontFamily}
            >
              {p.year}
            </text>
          ))}

          {/* Last value annotation */}
          <text
            x={toX(points.length - 1) + 8}
            y={toY(points[points.length - 1].value) + 4}
            fontSize={10}
            fontWeight={700}
            fill={theme.colors.accent1}
            fontFamily={theme.typography.fontFamily}
          >
            ${points[points.length - 1].value}T
          </text>
        </svg>
      </div>
    </PreviewFrame>
  );
}
