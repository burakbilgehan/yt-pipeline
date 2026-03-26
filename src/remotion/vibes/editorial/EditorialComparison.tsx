/**
 * Editorial Comparison — Clean infographic formula display.
 *
 * Editorial style: large clean typography, generous spacing,
 * left-aligned flow, accent color for operators, subtle card.
 */

import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import type { ComparisonSceneProps } from '../types';
import { useVibeTheme } from '../theme-context';

export const EditorialComparison: React.FC<ComparisonSceneProps> = ({
  formulaParts,
  example,
  dataBadge,
  accentColor,
}) => {
  const theme = useVibeTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const { colors, animation, typography, layout } = theme;
  const parts = formulaParts ?? ['Value A', '÷', 'Value B', '=', 'Result'];
  const operators = new Set(['÷', '×', '+', '-', '=', '/', '*']);
  const accent = accentColor ?? theme.brandColor;

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
      <div style={{ maxWidth: 1000 }}>
        {/* Formula — large, spaced, clean */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'baseline',
            gap: 20,
            marginBottom: 40,
          }}
        >
          {parts.map((part, i) => {
            const partDelay = i * animation.staggerDelayFrames;
            const partIn = spring({
              fps,
              frame: Math.max(0, frame - partDelay),
              config: { damping: animation.springDamping, stiffness: animation.springStiffness },
            });

            const isOp = operators.has(part);
            const isResult = i === parts.length - 1 && !isOp;

            return (
              <span
                key={i}
                style={{
                  opacity: partIn,
                  transform: `translateY(${interpolate(partIn, [0, 1], [15, 0])}px)`,
                  display: 'inline-block',
                }}
              >
                {isOp ? (
                  <span
                    style={{
                      fontFamily: theme.fontFamily,
                      fontSize: typography.titleSize,
                      fontWeight: 300,
                      color: accent,
                    }}
                  >
                    {part}
                  </span>
                ) : (
                  <span
                    style={{
                      fontFamily: theme.fontFamily,
                      fontSize: typography.titleSize + 4,
                      fontWeight: isResult ? 700 : 500,
                      color: isResult ? accent : colors.textPrimary,
                      borderBottom: isResult ? `3px solid ${accent}` : undefined,
                      paddingBottom: isResult ? 4 : undefined,
                    }}
                  >
                    {part}
                  </span>
                )}
              </span>
            );
          })}
        </div>

        {/* Example — italicized, editorial style */}
        {example && (
          <div
            style={{
              opacity: spring({
                fps,
                frame: Math.max(0, frame - Math.round(fps * 1.5)),
                config: { damping: 18, stiffness: 100 },
              }),
              fontFamily: theme.fontFamily,
              fontSize: typography.bodySize,
              fontStyle: 'italic',
              color: colors.textMuted,
              borderLeft: `3px solid ${accent}`,
              paddingLeft: 20,
              marginBottom: 24,
            }}
          >
            {example}
          </div>
        )}

        {/* Data badge — small, understated */}
        {dataBadge && (
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
            }}
          >
            {dataBadge}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
