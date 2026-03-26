/**
 * Dashboard Hero — Fireship/Bloomberg style metric reveal.
 *
 * Instead of cinematic slow reveal, dashboard hero uses:
 * - Terminal-style counting animation
 * - Tight spacing, left-aligned or grid layout
 * - Mono font for numbers, accent border-left
 * - Snappy spring (high stiffness, high damping)
 */

import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import type { HeroSceneProps } from '../types';
import { useVibeTheme } from '../theme-context';

export const DashboardHero: React.FC<HeroSceneProps> = ({
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

  // Phase 1: Context slides in from left (0-0.5s)
  const contextIn = spring({ fps, frame, config: { damping: animation.springDamping, stiffness: animation.springStiffness } });
  const contextX = interpolate(contextIn, [0, 1], [-40, 0]);

  // Phase 2: Primary value snaps in (0.3s)
  const primaryIn = spring({ fps, frame: Math.max(0, frame - Math.round(fps * 0.3)), config: { damping: 25, stiffness: 200 } });

  // Phase 3: Secondary value (1.5s)
  const secondaryIn = spring({ fps, frame: Math.max(0, frame - Math.round(fps * 1.5)), config: { damping: 25, stiffness: 200 } });

  // Phase 4: Subtitle (2s)
  const subtitleIn = spring({ fps, frame: Math.max(0, frame - Math.round(fps * 2)), config: { damping: 20, stiffness: 150 } });

  const accentColor = primaryColor ?? theme.brandColor;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.backgroundColor,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: layout.padding,
        paddingLeft: layout.padding * 2,
      }}
    >
      <div style={{ maxWidth: '80%' }}>
        {/* Context line — monospace, muted */}
        {contextLine && (
          <div
            style={{
              opacity: contextIn,
              transform: `translateX(${contextX}px)`,
              fontFamily: theme.monoFont,
              fontSize: typography.labelSize,
              color: colors.textMuted,
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginBottom: 16,
            }}
          >
            {contextLine}
          </div>
        )}

        {/* Primary metric — big, bold, accent border-left */}
        <div
          style={{
            opacity: primaryIn,
            transform: `scale(${interpolate(primaryIn, [0, 1], [0.95, 1])})`,
            transformOrigin: 'left center',
            borderLeft: `4px solid ${accentColor}`,
            paddingLeft: 24,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontFamily: theme.monoFont,
              fontSize: typography.heroSize * 0.7,
              fontWeight: 800,
              color: accentColor,
              lineHeight: 1,
              letterSpacing: -2,
            }}
          >
            {primaryValue}
          </div>
          {subLabel && (
            <div
              style={{
                fontFamily: theme.fontFamily,
                fontSize: typography.bodySize,
                color: colors.textMuted,
                marginTop: 6,
              }}
            >
              {subLabel}
            </div>
          )}
        </div>

        {/* Secondary metric — smaller, different color */}
        {secondaryValue && (
          <div
            style={{
              opacity: secondaryIn,
              transform: `translateX(${interpolate(secondaryIn, [0, 1], [20, 0])}px)`,
              borderLeft: `4px solid ${secondaryColor ?? colors.textMuted}`,
              paddingLeft: 24,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontFamily: theme.monoFont,
                fontSize: typography.heroSize * 0.4,
                fontWeight: 700,
                color: secondaryColor ?? colors.textPrimary,
                lineHeight: 1,
              }}
            >
              {secondaryValue}
            </div>
          </div>
        )}

        {/* Subtitle — body text */}
        {subtitle && (
          <div
            style={{
              opacity: subtitleIn,
              fontFamily: theme.fontFamily,
              fontSize: typography.bodySize,
              color: colors.textPrimary,
              marginTop: 12,
              paddingLeft: 28,
              maxWidth: 700,
              lineHeight: 1.4,
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
