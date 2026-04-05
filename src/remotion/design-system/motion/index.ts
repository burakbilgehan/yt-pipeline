/**
 * L3: Motion Primitives
 *
 * Each motion primitive is a function that takes (frame, config) and returns
 * { style, progress } for animating elements (counter-up, bar-grow, stagger-reveal, etc.)
 * Functions are registered via registerMotion() in the design-system registry.
 *
 * To add a new motion primitive:
 * 1. Create a new file: motion/myMotion.ts
 * 2. Export a (frame: number, config: MotionConfig) => MotionResult function
 * 3. Register it in this index.ts
 */

import { spring, interpolate } from 'remotion';
import { registerMotion } from '../registry';
import type { MotionConfig, MotionResult } from '../types';

// ─── React component exports ────────────────────────────────
export { StaggerTextReveal } from './StaggerTextReveal';
export type { StaggerTextRevealProps } from './StaggerTextReveal';
export { TextRotate } from './TextRotate';
export type { TextRotateProps } from './TextRotate';
export { ContainerTextFlip } from './ContainerTextFlip';
export type { ContainerTextFlipProps } from './ContainerTextFlip';
export { BlurFadeIn } from './BlurFadeIn';
export type { BlurFadeInProps } from './BlurFadeIn';
export { TiltCard } from './TiltCard';
export type { TiltCardProps } from './TiltCard';
export { TextShimmer } from './TextShimmer';
export type { TextShimmerProps } from './TextShimmer';
export { GlitchText } from './GlitchText';
export type { GlitchTextProps } from './GlitchText';
export { TypingText } from './TypingText';
export type { TypingTextProps } from './TypingText';

// ─── Motion function registrations ──────────────────────────

/**
 * stagger-text-reveal: spring-based translateY from 100% → 0.
 * Uses frame-based spring for a single unit; consumers handle stagger offsets.
 */
registerMotion(
  'stagger-text-reveal',
  (frame: number, config: MotionConfig): MotionResult => {
    const adjustedFrame = Math.max(0, frame - config.delayFrames);
    const springDamping = config.springConfig?.damping ?? 25;
    const springStiffness = config.springConfig?.stiffness ?? 300;
    const springMass = config.springConfig?.mass ?? 1;

    // Use 30fps as default for registry-level motion functions
    const progress = spring({
      frame: adjustedFrame,
      fps: 30,
      config: {
        damping: springDamping,
        stiffness: springStiffness,
        mass: springMass,
      },
      durationInFrames: config.durationFrames,
    });

    const translateY = interpolate(progress, [0, 1], [100, 0]);
    const opacity = interpolate(progress, [0, 0.4], [0, 1], {
      extrapolateRight: 'clamp',
    });

    return {
      style: {
        transform: `translateY(${translateY}%)`,
        opacity,
      },
      progress,
    };
  },
);

/**
 * text-rotate: spring-based translateY exit (0 → -120%).
 * Models the "exit" half of a text rotation cycle.
 */
registerMotion(
  'text-rotate',
  (frame: number, config: MotionConfig): MotionResult => {
    const adjustedFrame = Math.max(0, frame - config.delayFrames);
    const springDamping = config.springConfig?.damping ?? 25;
    const springStiffness = config.springConfig?.stiffness ?? 300;
    const springMass = config.springConfig?.mass ?? 1;

    const progress = spring({
      frame: adjustedFrame,
      fps: 30,
      config: {
        damping: springDamping,
        stiffness: springStiffness,
        mass: springMass,
      },
      durationInFrames: config.durationFrames,
    });

    const translateY = interpolate(progress, [0, 1], [0, -120]);
    const opacity = interpolate(progress, [0.6, 1], [1, 0], {
      extrapolateLeft: 'clamp',
    });

    return {
      style: {
        transform: `translateY(${translateY}%)`,
        opacity,
      },
      progress,
    };
  },
);

/**
 * container-text-flip: blur-fade transition for cycling text.
 * Per-character blur + opacity animation — softer than text-rotate's slide.
 */
registerMotion(
  'container-text-flip',
  (frame: number, config: MotionConfig): MotionResult => {
    const adjustedFrame = Math.max(0, frame - config.delayFrames);
    const springDamping = config.springConfig?.damping ?? 20;
    const springStiffness = config.springConfig?.stiffness ?? 300;
    const springMass = config.springConfig?.mass ?? 0.8;

    const progress = spring({
      frame: adjustedFrame,
      fps: 30,
      config: {
        damping: springDamping,
        stiffness: springStiffness,
        mass: springMass,
      },
      durationInFrames: config.durationFrames,
    });

    const blurPx = interpolate(progress, [0, 1], [10, 0]);
    const opacity = interpolate(progress, [0, 1], [0, 1]);

    return {
      style: {
        filter: `blur(${blurPx}px)`,
        opacity,
      },
      progress,
    };
  },
);

/**
 * text-shimmer: spring-based opacity fade-in.
 * The real shimmer animation lives in the React component;
 * the registry entry provides a simple entrance motion.
 */
registerMotion(
  'text-shimmer',
  (frame: number, config: MotionConfig): MotionResult => {
    const adjustedFrame = Math.max(0, frame - config.delayFrames);
    const springDamping = config.springConfig?.damping ?? 20;
    const springStiffness = config.springConfig?.stiffness ?? 200;
    const springMass = config.springConfig?.mass ?? 0.8;

    const progress = spring({
      frame: adjustedFrame,
      fps: 30,
      config: {
        damping: springDamping,
        stiffness: springStiffness,
        mass: springMass,
      },
      durationInFrames: config.durationFrames,
    });

    const opacity = interpolate(progress, [0, 1], [0, 1]);

    return {
      style: { opacity },
      progress,
    };
  },
);

/**
 * glitch-text: spring-based opacity fade-in.
 * The real glitch animation lives in the React component;
 * the registry entry provides a simple entrance motion.
 */
registerMotion(
  'glitch-text',
  (frame: number, config: MotionConfig): MotionResult => {
    const adjustedFrame = Math.max(0, frame - config.delayFrames);
    const springDamping = config.springConfig?.damping ?? 20;
    const springStiffness = config.springConfig?.stiffness ?? 200;
    const springMass = config.springConfig?.mass ?? 0.8;

    const progress = spring({
      frame: adjustedFrame,
      fps: 30,
      config: {
        damping: springDamping,
        stiffness: springStiffness,
        mass: springMass,
      },
      durationInFrames: config.durationFrames,
    });

    const opacity = interpolate(progress, [0, 1], [0, 1]);

    return {
      style: { opacity },
      progress,
    };
  },
);

/**
 * typing-text: spring-based opacity fade-in.
 * The real typewriter animation lives in the React component;
 * the registry entry provides a simple entrance motion.
 */
registerMotion(
  'typing-text',
  (frame: number, config: MotionConfig): MotionResult => {
    const adjustedFrame = Math.max(0, frame - config.delayFrames);
    const springDamping = config.springConfig?.damping ?? 20;
    const springStiffness = config.springConfig?.stiffness ?? 200;
    const springMass = config.springConfig?.mass ?? 0.8;

    const progress = spring({
      frame: adjustedFrame,
      fps: 30,
      config: {
        damping: springDamping,
        stiffness: springStiffness,
        mass: springMass,
      },
      durationInFrames: config.durationFrames,
    });

    const opacity = interpolate(progress, [0, 1], [0, 1]);

    return {
      style: { opacity },
      progress,
    };
  },
);
