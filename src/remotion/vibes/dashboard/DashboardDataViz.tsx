/**
 * Dashboard Data Viz — Grid panel style chart display.
 *
 * Dashboard style: chart sits inside a bordered panel with a header bar,
 * tight padding, mono-font labels, snap-in animation.
 */

import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from 'remotion';
import type { DataVizSceneProps } from '../types';
import { useVibeTheme } from '../theme-context';
import { DataChartScene } from '../../templates/data-charts';

export const DashboardDataViz: React.FC<DataVizSceneProps> = ({
  chartType,
  title,
  subtitle,
  items,
  counterValue,
  counterPrefix,
  counterSuffix,
  unit,
  colors,
  orientation,
  duel,
}) => {
  const theme = useVibeTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const { layout, animation, colors: themeColors } = theme;

  const panelIn = spring({
    fps,
    frame,
    config: { damping: animation.springDamping, stiffness: animation.springStiffness },
  });

  const chart = {
    type: chartType as 'bar-chart' | 'line-chart' | 'pie-chart' | 'counter' | 'comparison' | 'timeline' | 'progress' | 'scale-comparison',
    title,
    subtitle,
    items,
    counterValue,
    counterPrefix,
    counterSuffix,
    unit,
    colors,
    orientation,
    duel,
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.backgroundColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: layout.padding,
      }}
    >
      {/* Dashboard panel container */}
      <div
        style={{
          opacity: panelIn,
          transform: `scale(${0.96 + panelIn * 0.04})`,
          width: `${layout.screenUtilization * 100}%`,
          maxWidth: 1600,
          backgroundColor: themeColors.surface,
          border: `${layout.borderWidth}px solid ${themeColors.surfaceBorder}`,
          borderRadius: layout.cornerRadius,
          overflow: 'hidden',
        }}
      >
        {/* Panel header bar */}
        {title && (
          <div
            style={{
              padding: '12px 20px',
              borderBottom: `1px solid ${themeColors.surfaceBorder}`,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            {/* Status dot */}
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: theme.brandColor,
              }}
            />
            <span
              style={{
                fontFamily: theme.monoFont,
                fontSize: theme.typography.labelSize,
                color: themeColors.textMuted,
                textTransform: 'uppercase',
                letterSpacing: 1.5,
              }}
            >
              {title}
            </span>
          </div>
        )}

        {/* Chart content */}
        <div style={{ padding: layout.padding * 0.6 }}>
          <DataChartScene
            chart={chart}
            brandColor={theme.brandColor}
            fontFamily={theme.fontFamily}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
