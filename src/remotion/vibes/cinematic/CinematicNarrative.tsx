/**
 * Cinematic Narrative — Wraps existing SceneVisual.
 *
 * Cinematic style: Ken Burns on images, dark vignette overlays,
 * cinematic gradient backgrounds, text cards with spring entrance.
 */

import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { NarrativeSceneProps } from '../types';
import { useVibeTheme } from '../theme-context';
import { SceneVisual } from '../../templates/voiceover-visuals/SceneVisual';
import type { SceneVisualInput } from '../../types';

export const CinematicNarrative: React.FC<NarrativeSceneProps> = ({
  visualType,
  textOverlay,
  assetPath,
  fallbackAsset,
  description,
}) => {
  const theme = useVibeTheme();

  // Map NarrativeSceneProps to existing SceneVisualInput
  const visualTypeMap: Record<string, SceneVisualInput['type']> = {
    'stock-image': 'stock-image',
    'stock-video': 'stock-video',
    'ai-image': 'ai-image',
    'text-overlay': 'text-overlay',
    'composite': 'composite',
  };

  const visual: SceneVisualInput = {
    type: visualTypeMap[visualType] ?? 'text-overlay',
    description: description ?? '',
    textOverlay,
    assetPath,
  };

  return (
    <AbsoluteFill>
      <SceneVisual
        visual={visual}
        brandColor={theme.brandColor}
        fontFamily={theme.fontFamily}
        fallbackImage={fallbackAsset}
      />
    </AbsoluteFill>
  );
};
