/**
 * Editorial CTA — Clean, elegant closing card.
 *
 * Editorial style: generous whitespace, smooth fade-in message,
 * accent underline, subtle subscribe pill, clean end screen boxes.
 * Feels like a magazine's "next issue" page.
 */

import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import type { CTASceneProps } from '../types';
import { useVibeTheme } from '../theme-context';

export const EditorialCTA: React.FC<CTASceneProps> = ({
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

  // Smooth editorial entrances — slower, more graceful
  const messageIn = spring({
    fps,
    frame,
    config: { damping: animation.springDamping, stiffness: animation.springStiffness },
  });

  const lineIn = spring({
    fps,
    frame: Math.max(0, frame - Math.round(fps * 0.6)),
    config: { damping: 18, stiffness: 90 },
  });

  const ctaIn = spring({
    fps,
    frame: Math.max(0, frame - Math.round(fps * 1.2)),
    config: { damping: 16, stiffness: 80 },
  });

  const endIn = spring({
    fps,
    frame: Math.max(0, frame - Math.round(fps * 2.0)),
    config: { damping: 16, stiffness: 80 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.backgroundColor,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: layout.padding * 2,
        gap: 0,
      }}
    >
      {/* Message — editorial large serif/clean */}
      {message && (
        <div
          style={{
            opacity: messageIn,
            transform: `translateY(${interpolate(messageIn, [0, 1], [20, 0])}px)`,
            fontFamily: theme.fontFamily,
            fontSize: typography.titleSize + 8,
            fontWeight: typography.headingWeight,
            color: colors.textPrimary,
            textAlign: 'center',
            maxWidth: 800,
            lineHeight: 1.3,
          }}
        >
          {message}
        </div>
      )}

      {/* Accent underline */}
      <div
        style={{
          width: interpolate(lineIn, [0, 1], [0, 100]),
          height: 3,
          backgroundColor: accent,
          borderRadius: 2,
          marginTop: 24,
          marginBottom: 24,
        }}
      />

      {/* Channel name — small caps, editorial */}
      {channelName && (
        <div
          style={{
            opacity: lineIn,
            fontFamily: theme.fontFamily,
            fontSize: typography.labelSize + 2,
            fontWeight: 500,
            color: colors.textMuted,
            letterSpacing: 3,
            textTransform: 'uppercase',
            marginBottom: 28,
          }}
        >
          {channelName}
        </div>
      )}

      {/* Subscribe button — elegant pill */}
      <div
        style={{
          opacity: ctaIn,
          transform: `translateY(${interpolate(ctaIn, [0, 1], [12, 0])}px)`,
          backgroundColor: accent,
          color: colors.isDark ? '#000' : '#fff',
          fontFamily: theme.fontFamily,
          fontSize: typography.bodySize - 2,
          fontWeight: 600,
          padding: '14px 44px',
          borderRadius: 50,
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}
      >
        {ctaText ?? 'Subscribe'}
      </div>

      {/* End screen boxes — clean, minimal */}
      {showEndScreen && (
        <div
          style={{
            opacity: endIn,
            transform: `translateY(${interpolate(endIn, [0, 1], [10, 0])}px)`,
            display: 'flex',
            gap: 24,
            marginTop: 48,
          }}
        >
          {['Next Story', 'More Stories'].map((label) => (
            <div
              key={label}
              style={{
                width: 260,
                height: 146,
                border: `1px solid ${colors.surfaceBorder}`,
                borderRadius: layout.cornerRadius,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <div
                style={{
                  fontFamily: theme.fontFamily,
                  fontSize: typography.labelSize,
                  color: colors.textMuted,
                  fontWeight: 500,
                }}
              >
                {label}
              </div>
              <div
                style={{
                  width: 40,
                  height: 2,
                  backgroundColor: accent,
                  borderRadius: 1,
                  opacity: 0.5,
                }}
              />
            </div>
          ))}
        </div>
      )}
    </AbsoluteFill>
  );
};
