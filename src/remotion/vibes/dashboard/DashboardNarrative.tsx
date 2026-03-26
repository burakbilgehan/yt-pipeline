/**
 * Dashboard Narrative — Split-panel layout with media and text.
 *
 * Dashboard style: media on left panel, key text/stats on right,
 * sharp borders, no Ken Burns, instant snap.
 */

import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import type { NarrativeSceneProps } from '../types';
import { useVibeTheme } from '../theme-context';

export const DashboardNarrative: React.FC<NarrativeSceneProps> = ({
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

  const panelIn = spring({
    fps,
    frame,
    config: { damping: animation.springDamping, stiffness: animation.springStiffness },
  });

  const textIn = spring({
    fps,
    frame: Math.max(0, frame - Math.round(fps * 0.2)),
    config: { damping: animation.springDamping, stiffness: animation.springStiffness },
  });

  // If no image, show text-only dashboard panel
  if (!hasImage) {
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
            opacity: textIn,
            backgroundColor: colors.surface,
            border: `${layout.borderWidth}px solid ${colors.surfaceBorder}`,
            borderRadius: layout.cornerRadius,
            padding: '48px 56px',
            maxWidth: 1000,
            borderLeft: `4px solid ${theme.brandColor}`,
          }}
        >
          {textOverlay && (
            <div
              style={{
                fontFamily: theme.fontFamily,
                fontSize: typography.titleSize,
                fontWeight: typography.headingWeight,
                color: colors.textPrimary,
                lineHeight: 1.3,
              }}
            >
              {textOverlay}
            </div>
          )}
          {description && (
            <div
              style={{
                fontFamily: theme.fontFamily,
                fontSize: typography.bodySize,
                color: colors.textMuted,
                marginTop: 16,
              }}
            >
              {description}
            </div>
          )}
        </div>
      </AbsoluteFill>
    );
  }

  // Split panel: image left, text right
  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.backgroundColor,
        display: 'flex',
        flexDirection: 'row',
      }}
    >
      {/* Left: Image panel */}
      <div
        style={{
          flex: '0 0 55%',
          opacity: panelIn,
          overflow: 'hidden',
        }}
      >
        <Img
          src={staticFile(asset)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </div>

      {/* Right: Text panel */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: layout.padding,
          opacity: textIn,
          transform: `translateX(${interpolate(textIn, [0, 1], [20, 0])}px)`,
        }}
      >
        {textOverlay && (
          <div
            style={{
              fontFamily: theme.fontFamily,
              fontSize: typography.titleSize - 4,
              fontWeight: typography.headingWeight,
              color: colors.textPrimary,
              lineHeight: 1.3,
              borderLeft: `3px solid ${theme.brandColor}`,
              paddingLeft: 20,
            }}
          >
            {textOverlay}
          </div>
        )}
        {description && (
          <div
            style={{
              fontFamily: theme.fontFamily,
              fontSize: typography.bodySize,
              color: colors.textMuted,
              marginTop: 16,
              paddingLeft: 23,
            }}
          >
            {description}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
