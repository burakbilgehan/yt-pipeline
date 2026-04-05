import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { TEXT } from '../../palette';

// ─── Public Interface ─────────────────────────────────────────

export interface TextShimmerProps {
  /** The text to display */
  text: string;
  /** Frame at which the animation starts (relative to parent Sequence). Default 0. */
  startFrame?: number;
  /** Width of shimmer band in % of total text width. Default 30. */
  shimmerWidth?: number;
  /** Number of frames for one full sweep. Default 60. */
  speed?: number;
  /** Text base color. Default TEXT from palette. */
  baseColor?: string;
  /** Shimmer highlight color. Default semi-transparent white. */
  shimmerColor?: string;
  /** Font size in px. Default 48. */
  fontSize?: number;
  /** Font weight. Default 700. */
  fontWeight?: number;
  /** Font family. Default 'Montserrat, sans-serif'. */
  fontFamily?: string;
  /** Whether shimmer repeats after a full sweep. Default true. */
  loop?: boolean;
}

// ─── Component ────────────────────────────────────────────────

/**
 * TextShimmer — L3 Motion Primitive
 *
 * A glossy highlight sweeps across text left-to-right, like a metallic shine.
 * Uses CSS background-clip on text with an animated linear-gradient position.
 *
 * Usage:
 *   <TextShimmer text="BREAKING NEWS" speed={45} shimmerColor="#FFD700" />
 */
export const TextShimmer: React.FC<TextShimmerProps> = ({
  text,
  startFrame = 0,
  shimmerWidth = 30,
  speed = 60,
  baseColor = TEXT,
  shimmerColor = 'rgba(255,255,255,0.9)',
  fontSize = 48,
  fontWeight = 700,
  fontFamily = 'Montserrat, sans-serif',
  loop = true,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - startFrame);

  // For looping: use modulo so the sweep repeats every `speed` frames.
  // For non-looping: clamp so the sweep happens once.
  const cycleFrame = loop ? adjustedFrame % speed : Math.min(adjustedFrame, speed);

  // Map cycleFrame [0, speed] → position [-shimmerWidth, 100 + shimmerWidth]
  // This moves the shimmer band from fully off-screen left to fully off-screen right.
  const totalTravel = 100 + shimmerWidth * 2;
  const position = interpolate(
    cycleFrame,
    [0, speed],
    [-shimmerWidth, 100 + shimmerWidth],
    { extrapolateRight: 'clamp' },
  );

  // Build gradient: baseColor | shimmerColor band | baseColor
  const gradientLeft = position;
  const gradientRight = position + shimmerWidth;
  const backgroundImage = `linear-gradient(
    90deg,
    ${baseColor} ${gradientLeft - 1}%,
    ${shimmerColor} ${gradientLeft}%,
    ${shimmerColor} ${gradientRight}%,
    ${baseColor} ${gradientRight + 1}%
  )`;

  return (
    <div
      style={{
        fontSize,
        fontWeight,
        fontFamily,
        lineHeight: 1.2,
        backgroundImage,
        backgroundSize: `${totalTravel}% 100%`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        whiteSpace: 'pre',
      }}
    >
      {text}
    </div>
  );
};
