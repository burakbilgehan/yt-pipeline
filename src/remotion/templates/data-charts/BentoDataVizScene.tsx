import React from 'react';
import {
  ACCENT_PINK,
  ACCENT_BLUE,
  BG,
  TEXT,
  TEXT_FAINT,
  SURFACE_BORDER_STRONG,
} from '../../palette';
import { DotGrid } from '../../design-system/atmospheres/DotGrid';
import { BlurFadeIn } from '../../design-system/motion/BlurFadeIn';
import {
  EdgeStrip,
  LogoBlock,
  SectionHeader,
  KpiCell,
  type KpiCellProps,
} from '../../design-system/primitives';

export interface BentoKpi {
  eyebrow: string;
  value: string;
  valueColor?: string;
  descriptor: string;
}

export interface BentoDataVizSceneProps {
  eyebrow: string;
  title: string;
  nInfo?: string;
  kpis: [BentoKpi, BentoKpi, BentoKpi];
  renderChart: (frame: number) => React.ReactNode;
  source: string;
  startFrame?: number;
}

const FRAME_W = 1920;
const FRAME_H = 1080;
const M = 56;
const KPI_COL_W = 360;

export const BentoDataVizScene: React.FC<BentoDataVizSceneProps> = ({
  eyebrow,
  title,
  nInfo,
  kpis,
  renderChart,
  source,
  startFrame = 0,
}) => {
  return (
    <div
      style={{
        width: FRAME_W,
        height: FRAME_H,
        background: BG,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Montserrat', sans-serif",
      }}
    >
      <DotGrid id="dot-grid" width={FRAME_W} height={FRAME_H} opacity={1} speed={0.5} />

      <EdgeStrip position="top" thickness={6} color={ACCENT_PINK} />

      <BlurFadeIn startFrame={startFrame} blurAmount={10}>
        <div
          style={{
            position: 'absolute',
            top: M + 6,
            left: M,
            right: M,
            bottom: M,
            display: 'grid',
            gridTemplateColumns: `1fr ${KPI_COL_W}px`,
            gridTemplateRows: 'auto 1fr auto',
            gap: 0,
          }}
        >
          {/* Title row — full width */}
          <div style={{ gridColumn: '1 / -1' }}>
            <SectionHeader
              eyebrow={eyebrow}
              title={title}
              meta={nInfo}
              titleSize={52}
              borderBottom
            />
          </div>

          {/* Main chart slot */}
          <div
            style={{
              paddingTop: 36,
              paddingRight: 48,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            {renderChart(0)}
          </div>

          {/* KPI column */}
          <div
            style={{
              borderLeft: `2px solid ${SURFACE_BORDER_STRONG}`,
              paddingLeft: 40,
              display: 'grid',
              gridTemplateRows: '1fr 1fr 1fr',
            }}
          >
            <KpiCell
              eyebrow={kpis[0].eyebrow}
              value={kpis[0].value}
              valueColor={kpis[0].valueColor ?? ACCENT_PINK}
              descriptor={kpis[0].descriptor}
              borderBottom
              borderColor={SURFACE_BORDER_STRONG}
            />
            <KpiCell
              eyebrow={kpis[1].eyebrow}
              value={kpis[1].value}
              valueColor={kpis[1].valueColor ?? ACCENT_BLUE}
              descriptor={kpis[1].descriptor}
              borderBottom
              borderColor={SURFACE_BORDER_STRONG}
            />
            <KpiCell
              eyebrow={kpis[2].eyebrow}
              value={kpis[2].value}
              valueColor={kpis[2].valueColor ?? TEXT}
              descriptor={kpis[2].descriptor}
            />
          </div>

          {/* Citation row — full width */}
          <div
            style={{
              gridColumn: '1 / -1',
              borderTop: `1px solid ${SURFACE_BORDER_STRONG}`,
              paddingTop: 18,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <LogoBlock markSize={20} fontSize={14} letterSpacing="0.1em" />
            <span
              style={{
                color: TEXT_FAINT,
                fontSize: 13,
                letterSpacing: '0.08em',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {source}
            </span>
          </div>
        </div>
      </BlurFadeIn>
    </div>
  );
};

export type { KpiCellProps };
