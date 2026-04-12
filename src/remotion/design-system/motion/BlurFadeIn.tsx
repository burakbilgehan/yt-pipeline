import React from 'react';
import { useCurrentFrame, spring, useVideoConfig, interpolate } from 'remotion';

// ─── Public Interface ─────────────────────────────────────────

export interface BlurFadeInProps {
  children: React.ReactNode;
  /** Frame at which the animation starts (relative to parent Sequence). Default 0. */
  startFrame?: number;
  /** Maximum blur in pixels. Default 10. */
  blurAmount?: number;
  /** Spring damping. Default 20. */
  damping?: number;
  /** Spring stiffness. Default 200. */
  stiffness?: number;
  /** Spring mass. Default 0.8. */
  mass?: number;
}

// ─── Component ────────────────────────────────────────────────

/**
 * BlurFadeIn — L3 Motion Wrapper
 *
 * Wraps any React children and applies a blur-fade entrance animation.
 * Children start blurred and transparent, then spring to clear and opaque.
 *
 * This is the "wrapper" form of the blur-fade-in motion — unlike
 * ContainerTextFlip (which cycles its own text), BlurFadeIn applies
 * the blur-fade to *any* child content: charts, images, cards, etc.
 *
 * Usage:
 *   <BlurFadeIn startFrame={15} blurAmount={12}>
 *     <PieChart ... />
 *   </BlurFadeIn>
 */
export const BlurFadeIn: React.FC<BlurFadeInProps> = ({
  children,
  startFrame = 0,
  blurAmount = 10,
  damping = 20,
  stiffness = 200,
  mass = 0.8,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const adjustedFrame = Math.max(0, frame - startFrame);

  const progress = spring({
    frame: adjustedFrame,
    fps,
    config: { damping, stiffness, mass },
    durationInFrames: 30,
  });

  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const blur = interpolate(progress, [0, 1], [blurAmount, 0]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        opacity,
        filter: `blur(${blur}px)`,
      }}
    >
      {children}
    </div>
  );
};
