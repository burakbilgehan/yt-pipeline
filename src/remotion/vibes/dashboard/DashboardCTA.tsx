/**
 * Dashboard CTA — Compact, minimal end card.
 *
 * Dashboard style: no dramatic reveal, just a clean panel
 * with channel name, subscribe link, compact end screen.
 */

import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import type { CTASceneProps } from '../types';
import { useVibeTheme } from '../theme-context';

export const DashboardCTA: React.FC<CTASceneProps> = ({
  message,
  channelName,
  ctaText,
  accentColor,
  showEndScreen = true,
}) => {
  const theme = useVibeTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const { colors, animation, typography, layout } = theme;
  const accent = accentColor ?? theme.brandColor;

  const panelIn = spring({ fps, frame, config: { damping: animation.springDamping, stiffness: animation.springStiffness } });
  const ctaIn = spring({ fps, frame: Math.max(0, frame - Math.round(fps * 0.8)), config: { damping: 20, stiffness: 180 } });
  const endIn = spring({ fps, frame: Math.max(0, frame - Math.round(fps * 1.5)), config: { damping: 20, stiffness: 150 } });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.backgroundColor,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: layout.padding,
        gap: 32,
      }}
    >
      {/* Message + Channel */}
      <div
        style={{
          opacity: panelIn,
          textAlign: 'center',
          maxWidth: 800,
        }}
      >
        {message && (
          <div
            style={{
              fontFamily: theme.fontFamily,
              fontSize: typography.titleSize,
              fontWeight: typography.headingWeight,
              color: colors.textPrimary,
              marginBottom: 16,
            }}
          >
            {message}
          </div>
        )}
        {channelName && (
          <div
            style={{
              fontFamily: theme.monoFont,
              fontSize: typography.bodySize,
              color: colors.textMuted,
              letterSpacing: 1,
            }}
          >
            {channelName}
          </div>
        )}
      </div>

      {/* Subscribe button — compact pill */}
      <div
        style={{
          opacity: ctaIn,
          transform: `scale(${interpolate(ctaIn, [0, 1], [0.9, 1])})`,
          backgroundColor: accent,
          color: '#000',
          fontFamily: theme.fontFamily,
          fontSize: typography.bodySize,
          fontWeight: 700,
          padding: '12px 32px',
          borderRadius: layout.cornerRadius,
          letterSpacing: 0.5,
        }}
      >
        {ctaText ?? 'Subscribe'}
      </div>

      {/* End screen boxes */}
      {showEndScreen && (
        <div
          style={{
            opacity: endIn,
            display: 'flex',
            gap: 20,
            marginTop: 20,
          }}
        >
          {['Next Video', 'More Videos'].map((label) => (
            <div
              key={label}
              style={{
                width: 240,
                height: 135,
                border: `1px dashed ${colors.surfaceBorder}`,
                borderRadius: layout.cornerRadius,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: theme.monoFont,
                fontSize: typography.labelSize,
                color: colors.textMuted,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      )}
    </AbsoluteFill>
  );
};
