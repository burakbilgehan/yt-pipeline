/**
 * Editorial Hero — Vox/Visual Capitalist style statement reveal.
 *
 * Editorial style: large serif/clean headline, generous whitespace,
 * accent underline, smooth slide-up entrance, storytelling tone.
 */

import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import type { HeroSceneProps } from '../types';
import { useVibeTheme } from '../theme-context';

export const EditorialHero: React.FC<HeroSceneProps> = ({
  primaryValue,
  secondaryValue,
  subtitle,
  subLabel,
  contextLine,
  primaryColor,
  secondaryColor,
}) => {
  const theme = useVibeTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const { colors, animation, typography, layout } = theme;
  const accent = primaryColor ?? theme.brandColor;

  // Smooth editorial entrance — slide up + fade
  const contextIn = spring({ fps, frame, config: { damping: animation.springDamping, stiffness: animation.springStiffness } });
  const primaryIn = spring({ fps, frame: Math.max(0, frame - Math.round(fps * 0.4)), config: { damping: 16, stiffness: 80 } });
  const secondaryIn = spring({ fps, frame: Math.max(0, frame - Math.round(fps * 1.8)), config: { damping: 16, stiffness: 80 } });
  const subtitleIn = spring({ fps, frame: Math.max(0, frame - Math.round(fps * 2.5)), config: { damping: 16, stiffness: 80 } });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.backgroundColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: layout.padding * 2,
      }}
    >
      <div style={{ maxWidth: 1100, textAlign: layout.alignment }}>
        {/* Context line — small caps, editorial */}
        {contextLine && (
          <div
            style={{
              opacity: contextIn,
              transform: `translateY(${interpolate(contextIn, [0, 1], [20, 0])}px)`,
              fontFamily: theme.fontFamily,
              fontSize: typography.labelSize + 2,
              fontWeight: 500,
              color: colors.textMuted,
              letterSpacing: 3,
              textTransform: 'uppercase',
              marginBottom: 24,
            }}
          >
            {contextLine}
          </div>
        )}

        {/* Primary value — large, clean, editorial emphasis */}
        <div
          style={{
            opacity: primaryIn,
            transform: `translateY(${interpolate(primaryIn, [0, 1], [30, 0])}px)`,
          }}
        >
          <div
            style={{
              fontFamily: theme.fontFamily,
              fontSize: typography.heroSize,
              fontWeight: typography.headingWeight,
              color: accent,
              lineHeight: 0.95,
              marginBottom: 12,
            }}
          >
            {primaryValue}
          </div>
          {/* Accent underline */}
          <div
            style={{
              width: interpolate(primaryIn, [0, 1], [0, 120]),
              height: 4,
              backgroundColor: accent,
              borderRadius: 2,
              marginTop: 8,
              marginBottom: 20,
              marginLeft: layout.alignment === 'center' ? 'auto' : 0,
              marginRight: layout.alignment === 'center' ? 'auto' : undefined,
            }}
          />
          {subLabel && (
            <div
              style={{
                fontFamily: theme.fontFamily,
                fontSize: typography.bodySize,
                color: colors.textMuted,
                fontStyle: 'italic',
              }}
            >
              {subLabel}
            </div>
          )}
        </div>

        {/* Secondary value */}
        {secondaryValue && (
          <div
            style={{
              opacity: secondaryIn,
              transform: `translateY(${interpolate(secondaryIn, [0, 1], [20, 0])}px)`,
              marginTop: 36,
            }}
          >
            <div
              style={{
                fontFamily: theme.fontFamily,
                fontSize: typography.heroSize * 0.5,
                fontWeight: typography.headingWeight,
                color: secondaryColor ?? colors.textPrimary,
                lineHeight: 1,
              }}
            >
              {secondaryValue}
            </div>
          </div>
        )}

        {/* Subtitle — body text with editorial spacing */}
        {subtitle && (
          <div
            style={{
              opacity: subtitleIn,
              transform: `translateY(${interpolate(subtitleIn, [0, 1], [15, 0])}px)`,
              fontFamily: theme.fontFamily,
              fontSize: typography.bodySize + 2,
              color: colors.textPrimary,
              marginTop: 28,
              lineHeight: 1.6,
              maxWidth: 700,
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
