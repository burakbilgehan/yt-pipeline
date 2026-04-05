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
