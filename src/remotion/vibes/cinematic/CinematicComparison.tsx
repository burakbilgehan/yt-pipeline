/**
 * Cinematic Comparison — Wraps existing FormulaCard.
 *
 * Cinematic style: dark background, formula parts animate in one by one
 * with slow springs, accent-colored highlights.
 */

import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { ComparisonSceneProps } from '../types';
import { useVibeTheme } from '../theme-context';
import { FormulaCard } from '../../templates/voiceover-visuals/FormulaCard';

export const CinematicComparison: React.FC<ComparisonSceneProps> = ({
  formulaParts,
  example,
  dataBadge,
  accentColor,
}) => {
  const theme = useVibeTheme();

  return (
    <AbsoluteFill>
      <FormulaCard
        formulaParts={formulaParts}
        example={example}
        dataBadge={dataBadge}
        backgroundColor={theme.backgroundColor}
        accentColor={accentColor ?? theme.brandColor}
        fontFamily={theme.fontFamily}
      />
    </AbsoluteFill>
  );
};
