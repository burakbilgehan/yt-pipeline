/**
 * Cinematic List — Wraps existing Scoreboard.
 *
 * Cinematic style: editorial bar chart with staggered reveal,
 * ranked items, slow spring entrance.
 */

import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { ListSceneProps } from '../types';
import { useVibeTheme } from '../theme-context';
import { Scoreboard } from '../../templates/voiceover-visuals/Scoreboard';

export const CinematicList: React.FC<ListSceneProps> = ({
  title,
  items,
  footerText,
}) => {
  const theme = useVibeTheme();

  // Map generic ListSceneProps to Scoreboard's item format
  const scoreboardItems = items.map((item) => ({
    label: item.name,
    value: parseFloat(item.value) || 0,
    color: item.color,
    suffix: item.suffix,
    period: item.period,
  }));

  return (
    <AbsoluteFill>
      <Scoreboard
        title={title}
        items={scoreboardItems}
        footerText={footerText}
        backgroundColor={theme.backgroundColor}
        fontFamily={theme.fontFamily}
      />
    </AbsoluteFill>
  );
};
