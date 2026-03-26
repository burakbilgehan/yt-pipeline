/**
 * Dashboard Comparison — Terminal-style formula display.
 *
 * Dashboard style: code-block aesthetic, mono font formula,
 * syntax-highlighted operators, compact layout.
 */

import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import type { ComparisonSceneProps } from '../types';
import { useVibeTheme } from '../theme-context';

export const DashboardComparison: React.FC<ComparisonSceneProps> = ({
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
        padding: layout.padding,
      }}
    >
      {/* Terminal-style container */}
      <div
        style={{
          backgroundColor: colors.surface,
          border: `${layout.borderWidth}px solid ${colors.surfaceBorder}`,
          borderRadius: layout.cornerRadius,
          width: '85%',
          maxWidth: 1200,
          overflow: 'hidden',
        }}
      >
        {/* Terminal title bar */}
        <div
          style={{
            padding: '10px 16px',
            borderBottom: `1px solid ${colors.surfaceBorder}`,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#FF5F57' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#FEBC2E' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#28C840' }} />
          <span
            style={{
              fontFamily: theme.monoFont,
              fontSize: typography.labelSize - 2,
              color: colors.textMuted,
              marginLeft: 8,
            }}
          >
            formula.ts
          </span>
        </div>

        {/* Formula body */}
        <div style={{ padding: '32px 40px' }}>
          {/* Formula line — monospace, syntax-highlighted */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 12,
              marginBottom: 28,
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
                    transform: `translateY(${interpolate(partIn, [0, 1], [8, 0])}px)`,
                    fontFamily: theme.monoFont,
                    fontSize: isOp ? typography.titleSize - 4 : typography.titleSize,
                    fontWeight: isResult ? 700 : isOp ? 400 : 600,
                    color: isOp
                      ? colors.textMuted
                      : isResult
                        ? accent
                        : colors.textPrimary,
                    padding: isOp ? '0 4px' : undefined,
                  }}
                >
                  {part}
                </span>
              );
            })}
          </div>

          {/* Example — code comment style */}
          {example && (
            <div
              style={{
                opacity: spring({
                  fps,
                  frame: Math.max(0, frame - Math.round(fps * 1.5)),
                  config: { damping: 20, stiffness: 150 },
                }),
                fontFamily: theme.monoFont,
                fontSize: typography.bodySize - 2,
                color: colors.textMuted,
                marginBottom: 16,
              }}
            >
              <span style={{ color: '#6A9955' }}>{'// '}</span>
              {example}
            </div>
          )}

          {/* Data badge */}
          {dataBadge && (
            <div
              style={{
                opacity: spring({
                  fps,
                  frame: Math.max(0, frame - Math.round(fps * 2.5)),
                  config: { damping: 20, stiffness: 150 },
                }),
                fontFamily: theme.monoFont,
                fontSize: typography.labelSize,
                color: colors.textMuted,
                borderTop: `1px solid ${colors.surfaceBorder}`,
                paddingTop: 16,
              }}
            >
              {dataBadge}
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
