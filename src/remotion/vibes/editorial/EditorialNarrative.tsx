/**
 * Editorial Narrative — Clean story-driven visual + text layout.
 *
 * Editorial style: generous whitespace, soft Ken Burns on images,
 * elegant text card with accent left-bar, smooth slide-up entrance.
 * Vox/Polymatter feel — the visual supports the narration, never competes.
 */

import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import type { NarrativeSceneProps } from '../types';
import { useVibeTheme } from '../theme-context';

export const EditorialNarrative: React.FC<NarrativeSceneProps> = ({
  visualType,
  textOverlay,
  assetPath,
  fallbackAsset,
  description,
}) => {
  const theme = useVibeTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const { colors, animation, typography, layout } = theme;
  const asset = assetPath || fallbackAsset;
  const hasImage = asset && (visualType === 'stock-image' || visualType === 'ai-image');

  // Smooth editorial springs
  const imageIn = spring({
    fps,
    frame,
    config: { damping: animation.springDamping, stiffness: animation.springStiffness },
  });

  const textIn = spring({
    fps,
    frame: Math.max(0, frame - Math.round(fps * 0.5)),
    config: { damping: 16, stiffness: 80 },
  });

  const descIn = spring({
    fps,
    frame: Math.max(0, frame - Math.round(fps * 1.0)),
    config: { damping: 16, stiffness: 80 },
  });

  // Gentle Ken Burns — editorial uses subtler motion than cinematic
  const kenBurnsScale = interpolate(frame, [0, fps * 6], [1, 1.04], {
    extrapolateRight: 'clamp',
  });

  // Text-only layout (no image)
  if (!hasImage) {
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
        <div
          style={{
            opacity: textIn,
            transform: `translateY(${interpolate(textIn, [0, 1], [20, 0])}px)`,
            maxWidth: 900,
          }}
        >
          {textOverlay && (
            <div
              style={{
                fontFamily: theme.fontFamily,
                fontSize: typography.titleSize,
                fontWeight: typography.headingWeight,
                color: colors.textPrimary,
                lineHeight: 1.5,
                borderLeft: `4px solid ${theme.brandColor}`,
                paddingLeft: 28,
              }}
            >
              {textOverlay}
            </div>
          )}
          {description && (
            <div
              style={{
                opacity: descIn,
                transform: `translateY(${interpolate(descIn, [0, 1], [10, 0])}px)`,
                fontFamily: theme.fontFamily,
                fontSize: typography.bodySize,
                color: colors.textMuted,
                marginTop: 20,
                paddingLeft: 32,
                lineHeight: 1.7,
                fontStyle: 'italic',
              }}
            >
              {description}
            </div>
          )}
        </div>
      </AbsoluteFill>
    );
  }

  // Image + text layout — image fills background, text card floats at bottom
  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.backgroundColor,
      }}
    >
      {/* Background image with gentle Ken Burns */}
      <AbsoluteFill
        style={{
          opacity: imageIn,
          overflow: 'hidden',
        }}
      >
        <Img
          src={staticFile(asset)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: `scale(${kenBurnsScale})`,
          }}
        />
        {/* Gradient overlay to ensure text readability */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: '60%',
            background: `linear-gradient(to top, ${theme.backgroundColor}ee, ${theme.backgroundColor}00)`,
          }}
        />
      </AbsoluteFill>

      {/* Text card — positioned at bottom with generous padding */}
      {(textOverlay || description) && (
        <div
          style={{
            position: 'absolute',
            left: layout.padding * 1.5,
            right: layout.padding * 1.5,
            bottom: layout.padding * 1.5,
            opacity: textIn,
            transform: `translateY(${interpolate(textIn, [0, 1], [24, 0])}px)`,
          }}
        >
          {textOverlay && (
            <div
              style={{
                fontFamily: theme.fontFamily,
                fontSize: typography.titleSize - 4,
                fontWeight: typography.headingWeight,
                color: colors.isDark ? '#fff' : colors.textPrimary,
                lineHeight: 1.4,
                maxWidth: 800,
              }}
            >
              {textOverlay}
            </div>
          )}
          {description && (
            <div
              style={{
                opacity: descIn,
                fontFamily: theme.fontFamily,
                fontSize: typography.bodySize,
                color: colors.isDark ? 'rgba(255,255,255,0.7)' : colors.textMuted,
                marginTop: 12,
                lineHeight: 1.6,
                maxWidth: 700,
              }}
            >
              {description}
            </div>
          )}
          {/* Accent line below text */}
          <div
            style={{
              width: interpolate(textIn, [0, 1], [0, 80]),
              height: 3,
              backgroundColor: theme.brandColor,
              borderRadius: 2,
              marginTop: 16,
            }}
          />
        </div>
      )}
    </AbsoluteFill>
  );
};
