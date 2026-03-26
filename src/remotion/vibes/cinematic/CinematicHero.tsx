/**
 * Cinematic Hero — Wraps existing HookReveal component.
 *
 * The "cinematic" vibe uses dramatic number reveals with slow springs,
 * center-aligned layout, and fade-in timing.
 */

import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { HeroSceneProps } from '../types';
import { useVibeTheme } from '../theme-context';
import { HookReveal } from '../../templates/voiceover-visuals/HookReveal';

export const CinematicHero: React.FC<HeroSceneProps> = ({
  primaryValue,
  secondaryValue,
  subtitle,
  subLabel,
  contextLine,
  primaryColor,
  secondaryColor,
  variant,
}) => {
  const theme = useVibeTheme();

  return (
    <AbsoluteFill>
      <HookReveal
        bigNumber={primaryValue}
        smallNumber={secondaryValue ?? ''}
        subtitle={subtitle}
        subLabel={subLabel}
        contextLine={contextLine}
        bigColor={primaryColor ?? theme.brandColor}
        smallColor={secondaryColor}
        backgroundColor={theme.backgroundColor}
        fontFamily={theme.fontFamily}
        variant={variant as 'classic' | 'counting-ticker' | undefined}
      />
    </AbsoluteFill>
  );
};
