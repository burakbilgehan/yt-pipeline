import React from 'react';
import { AbsoluteFill } from 'remotion';
import { BentoDataVizScene } from '../../../../templates/data-charts/BentoDataVizScene';
import {
  ACCENT_PINK,
  ACCENT_BLUE,
  TEXT,
  TEXT_MUTED,
  GRID,
  NEGATIVE,
} from '../../../../palette';

const SAMPLE_DATA = [
  { label: 'Item A', value: 8.2 },
  { label: 'Item B', value: 5.4 },
  { label: 'Item C', value: 5.0 },
  { label: 'Item D', value: 2.5 },
  { label: 'Item E', value: 0.9 },
  { label: 'Item F', value: 0.2 },
  { label: 'Item G', value: -0.2 },
  { label: 'Item H', value: -0.4 },
];

const MAX_VAL = 9;

const SampleBars: React.FC = () => {
  return (
    <div>
      {SAMPLE_DATA.map((item) => {
        const pct = Math.abs(item.value) / MAX_VAL;
        const barColor =
          item.value > 4 ? ACCENT_PINK : item.value >= 0 ? ACCENT_BLUE : NEGATIVE;
        return (
          <div
            key={item.label}
            style={{
              display: 'grid',
              gridTemplateColumns: '170px 1fr 88px',
              gap: 18,
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <div
              style={{
                color: TEXT_MUTED,
                fontSize: 21,
                fontWeight: 500,
                textAlign: 'right',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {item.label}
            </div>
            <div
              style={{
                position: 'relative',
                height: 34,
                background: GRID,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: `${pct * 100}%`,
                  height: '100%',
                  background: barColor,
                }}
              />
            </div>
            <div
              style={{
                color: TEXT,
                fontSize: 23,
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums lining-nums',
                textAlign: 'right',
                letterSpacing: '-0.01em',
                fontFamily: "'Montserrat', sans-serif",
              }}
            >
              {item.value > 0 ? '+' : ''}
              {item.value}%
            </div>
          </div>
        );
      })}
    </div>
  );
};

const BentoDataVizSceneShowcase: React.FC = () => {
  return (
    <AbsoluteFill>
      <BentoDataVizScene
        eyebrow="Category · Subcategory · Year"
        title="Generic Comparison Across Items"
        nInfo="n = 8 items"
        kpis={[
          {
            eyebrow: 'Top Value',
            value: '+8.2%',
            valueColor: ACCENT_PINK,
            descriptor: 'Item A · Year',
          },
          {
            eyebrow: 'Median',
            value: '+2.7%',
            valueColor: ACCENT_BLUE,
            descriptor: 'Group average',
          },
          {
            eyebrow: 'Below Zero',
            value: '3 / 8',
            valueColor: NEGATIVE,
            descriptor: 'items contracted',
          },
        ]}
        renderChart={() => <SampleBars />}
        source="Source: Generic Reference (constant 2015 USD) · Year"
      />
    </AbsoluteFill>
  );
};

export default BentoDataVizSceneShowcase;
