/**
 * Cinematic CTA — Wraps existing ClosingCTA.
 *
 * Cinematic style: dramatic fade-in message, accent separator,
 * spring-animated subscribe button, YouTube end screen boxes.
 */

import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { CTASceneProps } from '../types';
import { useVibeTheme } from '../theme-context';
import { ClosingCTA } from '../../templates/voiceover-visuals/ClosingCTA';

export const CinematicCTA: React.FC<CTASceneProps> = ({
  message,
  channelName,
  ctaText,
  accentColor,
  showEndScreen,
}) => {
  const theme = useVibeTheme();

  return (
    <AbsoluteFill>
      <ClosingCTA
        message={message}
        channelName={channelName}
        ctaText={ctaText}
        backgroundColor={theme.backgroundColor}
        accentColor={accentColor ?? theme.brandColor}
        fontFamily={theme.fontFamily}
        showEndScreen={showEndScreen}
      />
    </AbsoluteFill>
  );
};
