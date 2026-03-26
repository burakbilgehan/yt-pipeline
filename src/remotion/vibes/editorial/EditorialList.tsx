/**
 * Editorial List — Clean numbered list with accent markers.
 *
 * Editorial style: numbered items with clean typography, generous line spacing,
 * accent-colored rank numbers, smooth staggered slide-up.
 */

import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import type { ListSceneProps } from '../types';
import { useVibeTheme } from '../theme-context';

export const EditorialList: React.FC<ListSceneProps> = ({
  title,
  items,
  footerText,
}) => {
  const theme = useVibeTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const { colors, animation, typography, layout } = theme;

  const titleIn = spring({ fps, frame, config: { damping: animation.springDamping, stiffness: animation.springStiffness } });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.backgroundColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: layout.padding * 1.5,
      }}
    >
      <div style={{ maxWidth: 900, width: '100%' }}>
        {/* Title */}
        {title && (
          <div
            style={{
              opacity: titleIn,
              transform: `translateY(${interpolate(titleIn, [0, 1], [15, 0])}px)`,
              fontFamily: theme.fontFamily,
              fontSize: typography.titleSize,
              fontWeight: typography.headingWeight,
              color: colors.textPrimary,
              marginBottom: 36,
              textAlign: layout.alignment,
            }}
          >
            {title}
          </div>
        )}

        {/* Items */}
        {items.map((item, i) => {
          const itemDelay = (i + 1) * animation.staggerDelayFrames + Math.round(fps * 0.4);
          const itemIn = spring({
            fps,
            frame: Math.max(0, frame - itemDelay),
            config: { damping: animation.springDamping, stiffness: animation.springStiffness },
          });

          return (
            <div
              key={i}
              style={{
                opacity: itemIn,
                transform: `translateY(${interpolate(itemIn, [0, 1], [12, 0])}px)`,
                display: 'flex',
                alignItems: 'baseline',
                gap: 20,
                marginBottom: 24,
                paddingBottom: 24,
                borderBottom: i < items.length - 1 ? `1px solid ${colors.surfaceBorder}` : undefined,
              }}
            >
              {/* Rank number — large, accent colored */}
              <span
                style={{
                  fontFamily: theme.fontFamily,
                  fontSize: typography.titleSize + 8,
                  fontWeight: 300,
                  color: theme.brandColor,
                  minWidth: 50,
                  textAlign: 'right',
                  lineHeight: 1,
                }}
              >
                {i + 1}
              </span>

              {/* Content */}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontFamily: theme.fontFamily,
                    fontSize: typography.bodySize + 2,
                    fontWeight: 600,
                    color: item.color || colors.textPrimary,
                    marginBottom: 4,
                  }}
                >
                  {item.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                  <span
                    style={{
                      fontFamily: theme.fontFamily,
                      fontSize: typography.bodySize,
                      fontWeight: 700,
                      color: colors.textPrimary,
                    }}
                  >
                    {item.value}{item.suffix ?? ''}
                  </span>
                  {item.computedValue && (
                    <span
                      style={{
                        fontFamily: theme.fontFamily,
                        fontSize: typography.labelSize,
                        color: colors.textMuted,
                      }}
                    >
                      {item.computedValue}
                    </span>
                  )}
                  {item.period && (
                    <span
                      style={{
                        fontFamily: theme.fontFamily,
                        fontSize: typography.labelSize,
                        color: colors.textMuted,
                        fontStyle: 'italic',
                      }}
                    >
                      {item.period}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Footer */}
        {footerText && (
          <div
            style={{
              opacity: spring({
                fps,
                frame: Math.max(0, frame - Math.round(fps * 2.5)),
                config: { damping: 18, stiffness: 100 },
              }),
              fontFamily: theme.fontFamily,
              fontSize: typography.labelSize,
              color: colors.textMuted,
              marginTop: 16,
              textAlign: layout.alignment,
              fontStyle: 'italic',
            }}
          >
            {footerText}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
