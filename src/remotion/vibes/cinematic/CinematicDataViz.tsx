/**
 * Cinematic Data Viz — Wraps existing DataChartScene + SceneVisual overlay pattern.
 *
 * Cinematic style: glass-morphism chart panels floating over Ken Burns backgrounds,
 * slow fade-in, centered layout.
 */

import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { DataVizSceneProps } from '../types';
import { useVibeTheme } from '../theme-context';
import { DataChartScene } from '../../templates/data-charts';

export const CinematicDataViz: React.FC<DataVizSceneProps> = ({
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

  // Map generic DataVizSceneProps to existing DataChartInput
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
        padding: theme.layout.padding,
      }}
    >
      <DataChartScene
        chart={chart}
        brandColor={theme.brandColor}
        fontFamily={theme.fontFamily}
      />
    </AbsoluteFill>
  );
};
