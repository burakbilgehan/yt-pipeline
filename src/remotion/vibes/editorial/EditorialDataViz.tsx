/**
 * Editorial Data Viz — Infographic-style chart with clean whitespace.
 *
 * Editorial style: generous padding, subtle card with no border,
 * gentle drop shadow, clean title treatment.
 */

import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from 'remotion';
import type { DataVizSceneProps } from '../types';
import { useVibeTheme } from '../theme-context';
import { DataChartScene } from '../../templates/data-charts';

export const EditorialDataViz: React.FC<DataVizSceneProps> = ({
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

  const { colors: themeColors, animation, typography, layout } = theme;

  const cardIn = spring({
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
        padding: layout.padding * 1.5,
      }}
    >
      {/* Editorial card — subtle shadow, no hard border */}
      <div
        style={{
          opacity: cardIn,
          transform: `translateY(${(1 - cardIn) * 20}px)`,
          width: `${layout.screenUtilization * 100}%`,
          maxWidth: 1400,
          backgroundColor: themeColors.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.9)',
          borderRadius: layout.cornerRadius,
          boxShadow: themeColors.isDark
            ? '0 8px 40px rgba(0,0,0,0.4)'
            : '0 4px 24px rgba(0,0,0,0.08)',
          padding: layout.padding,
          position: 'relative',
        }}
      >
        {/* Accent top bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: layout.cornerRadius,
            right: layout.cornerRadius,
            height: 3,
            backgroundColor: theme.brandColor,
            borderRadius: '0 0 2px 2px',
          }}
        />

        <DataChartScene
          chart={chart}
          brandColor={theme.brandColor}
          fontFamily={theme.fontFamily}
        />
      </div>
    </AbsoluteFill>
  );
};
