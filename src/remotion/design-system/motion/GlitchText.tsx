import React from 'react';
import { useCurrentFrame } from 'remotion';
import { TEXT } from '../../palette';

// ─── Public Interface ─────────────────────────────────────────

export interface GlitchTextProps {
  /** The text to display */
  text: string;
  /** Frame at which the animation starts (relative to parent Sequence). Default 0. */
  startFrame?: number;
  /** Max displacement in px during a glitch. Default 4. */
  intensity?: number;
  /** Frames between glitch bursts. Default 12. */
  glitchInterval?: number;
  /** How many frames a single glitch lasts. Default 3. */
  glitchDuration?: number;
  /** Text color. Default TEXT from palette. */
  color?: string;
  /** Font size in px. Default 48. */
  fontSize?: number;
  /** Font weight. Default 700. */
  fontWeight?: number;
  /** Font family. Default 'Montserrat, sans-serif'. */
  fontFamily?: string;
}

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Deterministic pseudo-random value derived from frame number.
 * Returns a value in [-1, 1]. Seed offsets give independent channels.
 */
function deterministicRandom(frame: number, seed: number): number {
  return Math.sin(frame * 123.456 + seed * 789.012);
}

// ─── Component ────────────────────────────────────────────────

/**
 * GlitchText — L3 Motion Primitive
 *
 * Text with RGB channel split and jitter displacement — a digital glitch effect.
 * Every `glitchInterval` frames, the text glitches for `glitchDuration` frames
 * with offset red/cyan text-shadows and subtle translateX jitter.
 *
 * Usage:
 *   <GlitchText text="SYSTEM ERROR" intensity={6} glitchInterval={8} />
 */
export const GlitchText: React.FC<GlitchTextProps> = ({
  text,
  startFrame = 0,
  intensity = 4,
  glitchInterval = 12,
  glitchDuration = 3,
  color = TEXT,
  fontSize = 48,
  fontWeight = 700,
  fontFamily = 'Montserrat, sans-serif',
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - startFrame);

  // Determine if we're in a glitch window.
  // Glitches fire at frame 0, glitchInterval, 2*glitchInterval, ...
  // Each lasts `glitchDuration` frames.
  const cyclePosition = adjustedFrame % glitchInterval;
  const isGlitching = cyclePosition < glitchDuration && adjustedFrame >= 0;

  if (!isGlitching) {
    // Normal rendering — no effects
    return (
      <div
        style={{
          fontSize,
          fontWeight,
          fontFamily,
          color,
          lineHeight: 1.2,
          whiteSpace: 'pre',
          position: 'relative',
        }}
      >
        {text}
      </div>
    );
  }

  // ── Glitch frame: compute displacement values ──
  const dx1 = deterministicRandom(adjustedFrame, 1) * intensity;
  const dx2 = deterministicRandom(adjustedFrame, 2) * intensity;
  const jitterX = deterministicRandom(adjustedFrame, 3) * (intensity * 0.5);

  // RGB channel split via text-shadow: red channel offset left, cyan offset right
  const textShadow = [
    `${dx1}px 0 rgba(255, 0, 0, 0.7)`,
    `${-dx2}px 0 rgba(0, 255, 255, 0.7)`,
  ].join(', ');

  return (
    <div
      style={{
        fontSize,
        fontWeight,
        fontFamily,
        color,
        lineHeight: 1.2,
        whiteSpace: 'pre',
        position: 'relative',
        textShadow,
        transform: `translateX(${jitterX}px)`,
      }}
    >
      {text}
    </div>
  );
};
