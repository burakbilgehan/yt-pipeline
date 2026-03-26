/**
 * Dashboard List — Data table/grid style item reveal.
 *
 * Dashboard style: compact table rows, mono values, snap-in rows,
 * color-coded left border, status-dot indicators.
 */

import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import type { ListSceneProps } from '../types';
import { useVibeTheme } from '../theme-context';

export const DashboardList: React.FC<ListSceneProps> = ({
  title,
  items,
  footerText,
}) => {
  const theme = useVibeTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const { colors, animation, typography, layout } = theme;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.backgroundColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: layout.padding,
      }}
    >
      <div
        style={{
          width: `${layout.screenUtilization * 100}%`,
          maxWidth: 1200,
          backgroundColor: colors.surface,
          border: `${layout.borderWidth}px solid ${colors.surfaceBorder}`,
          borderRadius: layout.cornerRadius,
          overflow: 'hidden',
        }}
      >
        {/* Table header */}
        {title && (
          <div
            style={{
              padding: '14px 24px',
              borderBottom: `1px solid ${colors.surfaceBorder}`,
              fontFamily: theme.monoFont,
              fontSize: typography.labelSize,
              color: colors.textMuted,
              textTransform: 'uppercase',
              letterSpacing: 1.5,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: theme.brandColor }} />
            {title}
          </div>
        )}

        {/* Table rows */}
        {items.map((item, i) => {
          const rowDelay = i * animation.staggerDelayFrames;
          const rowIn = spring({
            fps,
            frame: Math.max(0, frame - rowDelay - Math.round(fps * 0.3)),
            config: { damping: animation.springDamping, stiffness: animation.springStiffness },
          });

          const isPositive = !item.value.startsWith('-');

          return (
            <div
              key={i}
              style={{
                opacity: rowIn,
                transform: `translateX(${interpolate(rowIn, [0, 1], [-12, 0])}px)`,
                display: 'flex',
                alignItems: 'center',
                padding: '14px 24px',
                borderBottom: i < items.length - 1 ? `1px solid ${colors.surfaceBorder}` : undefined,
                borderLeft: `3px solid ${item.color}`,
                gap: 16,
              }}
            >
              {/* Rank number */}
              <span
                style={{
                  fontFamily: theme.monoFont,
                  fontSize: typography.labelSize,
                  color: colors.textMuted,
                  width: 28,
                  textAlign: 'right',
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>

              {/* Name */}
              <span
                style={{
                  fontFamily: theme.fontFamily,
                  fontSize: typography.bodySize,
                  fontWeight: 600,
                  color: colors.textPrimary,
                  flex: 1,
                }}
              >
                {item.name}
              </span>

              {/* Computed value (if present) */}
              {item.computedValue && (
                <span
                  style={{
                    fontFamily: theme.monoFont,
                    fontSize: typography.bodySize - 2,
                    color: colors.textMuted,
                    marginRight: 8,
                  }}
                >
                  {item.computedValue}
                </span>
              )}

              {/* Primary value */}
              <span
                style={{
                  fontFamily: theme.monoFont,
                  fontSize: typography.bodySize,
                  fontWeight: 700,
                  color: isPositive ? colors.positive : colors.negative,
                }}
              >
                {item.value}{item.suffix ?? ''}
              </span>

              {/* Period */}
              {item.period && (
                <span
                  style={{
                    fontFamily: theme.monoFont,
                    fontSize: typography.labelSize,
                    color: colors.textMuted,
                  }}
                >
                  {item.period}
                </span>
              )}
            </div>
          );
        })}

        {/* Footer */}
        {footerText && (
          <div
            style={{
              padding: '12px 24px',
              borderTop: `1px solid ${colors.surfaceBorder}`,
              fontFamily: theme.monoFont,
              fontSize: typography.labelSize - 2,
              color: colors.textMuted,
              opacity: spring({
                fps,
                frame: Math.max(0, frame - Math.round(fps * 2)),
                config: { damping: 20, stiffness: 150 },
              }),
            }}
          >
            {footerText}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
