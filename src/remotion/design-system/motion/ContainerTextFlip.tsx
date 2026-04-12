import React from 'react';
import { useCurrentFrame, spring, useVideoConfig, interpolate } from 'remotion';

// ─── Public Interface ─────────────────────────────────────────

export interface ContainerTextFlipProps {
  texts: string[];
  /** Total frames allocated per text. Default 60 (2s at 30fps). */
  frameDuration?: number;
  /** Frames between each character's animation start. Default 2. */
  staggerFrames?: number;
  /** Which end of the text starts animating first. Default 'first'. */
  staggerFrom?: 'first' | 'last' | 'center';
  splitBy?: 'characters' | 'words';
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  fontFamily?: string;
  loop?: boolean;
  springConfig?: {
    damping?: number;
    stiffness?: number;
    mass?: number;
  };
  /** Maximum blur in pixels for the blur-fade effect. Default 10. */
  blurAmount?: number;
  /** Whether to render the gradient pill background. Default false. */
  showPill?: boolean;
}

// ─── Internal helpers ─────────────────────────────────────────

interface TextUnit {
  text: string;
  trailingSpace: boolean;
}

function splitText(text: string, splitBy: 'characters' | 'words'): TextUnit[] {
  if (splitBy === 'words') {
    const words = text.split(/(\s+)/);
    const units: TextUnit[] = [];
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (word.trim().length === 0) continue;
      const nextIsSpace = i + 1 < words.length && words[i + 1]?.trim().length === 0;
      units.push({ text: word, trailingSpace: nextIsSpace });
    }
    return units;
  }

  const units: TextUnit[] = [];
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === ' ') {
      if (units.length > 0) {
        units[units.length - 1].trailingSpace = true;
      }
    } else {
      units.push({ text: char, trailingSpace: false });
    }
  }
  return units;
}

function getStaggerDelay(
  index: number,
  total: number,
  staggerFrames: number,
  staggerFrom: 'first' | 'last' | 'center',
): number {
  switch (staggerFrom) {
    case 'last':
      return (total - 1 - index) * staggerFrames;
    case 'center': {
      const center = Math.floor(total / 2);
      return Math.abs(center - index) * staggerFrames;
    }
    case 'first':
    default:
      return index * staggerFrames;
  }
}

/**
 * Rough pixel-width estimate for a proportional font string.
 * Good enough for container resize — not pixel-perfect.
 */
function estimateTextWidth(text: string, fontSize: number, fontWeight: number): number {
  const factor = fontWeight >= 700 ? 0.62 : 0.55;
  let w = 0;
  for (const ch of text) {
    w += ch === ' ' ? fontSize * 0.28 : fontSize * factor;
  }
  return w;
}

// ─── Component ────────────────────────────────────────────────

/**
 * ContainerTextFlip — cycles through texts with whole-text blur-fade transitions.
 *
 * Unlike TextRotate (slide up/down), this component uses blur + opacity transitions
 * for a softer, more elegant feel. The entire text line transitions as a single unit
 * (blur+opacity spring) — this is render-safe across Remotion's multi-threaded renderer.
 *
 * Container width auto-sizes with a spring animation.
 * Optional gradient pill background for badge-style presentation.
 */
export const ContainerTextFlip: React.FC<ContainerTextFlipProps> = ({
  texts,
  frameDuration = 60,
  staggerFrames = 2,
  staggerFrom = 'first',
  splitBy = 'characters',
  fontSize = 48,
  fontWeight = 700,
  color = '#FFFFFF',
  fontFamily = 'Montserrat, sans-serif',
  loop = true,
  springConfig = {},
  blurAmount = 10,
  showPill = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const damping = springConfig.damping ?? 20;
  const stiffness = springConfig.stiffness ?? 300;
  const mass = springConfig.mass ?? 0.8;

  const lineHeight = fontSize * 1.3;
  const totalTexts = texts.length;
  if (totalTexts === 0) return null;

  // ── Timing: split frameDuration into exit + enter phases ──
  // No per-character stagger — whole-text transitions are render-safe.
  const springSettle = 15;
  const exitDuration = springSettle;
  const resizeDuration = 8;
  const enterStart = exitDuration + resizeDuration;

  // ── Which text is active? ──
  const totalCycleFrames = totalTexts * frameDuration;
  // For loop=false with a single text, clamp to frameDuration-1 so the text stays
  // on its enter animation and doesn't get stuck at f=0.
  const maxNonLoopFrame = Math.max((totalTexts - 1) * frameDuration, frameDuration - 1);
  const cycleFrame = loop
    ? frame % totalCycleFrames
    : Math.min(frame, maxNonLoopFrame);
  const activeIndex = Math.min(
    Math.floor(cycleFrame / frameDuration),
    totalTexts - 1
  );
  const f = cycleFrame - activeIndex * frameDuration;

  const prevIndex = activeIndex === 0
    ? (loop ? totalTexts - 1 : -1)
    : activeIndex - 1;

  const isVeryFirst = frame < frameDuration && activeIndex === 0;

  // ── Container width animation ──
  const activeWidth = estimateTextWidth(texts[activeIndex], fontSize, fontWeight);
  const prevWidth = prevIndex >= 0
    ? estimateTextWidth(texts[prevIndex], fontSize, fontWeight)
    : activeWidth;

  const resizeProgress = spring({
    frame: Math.max(0, f - exitDuration),
    fps,
    config: { damping: 25, stiffness: 300, mass: 0.8 },
    durationInFrames: resizeDuration + 10,
  });

  const containerWidth = isVeryFirst
    ? activeWidth
    : interpolate(resizeProgress, [0, 1], [prevWidth, activeWidth]);

  // Pill padding
  const pillPaddingH = showPill ? 36 : 0;
  const pillPaddingV = showPill ? 16 : 0;

  // ── Render whole text with blur-fade (render-safe, no per-character stagger) ──
  const renderUnits = (
    text: string,
    mode: 'enter' | 'exit',
    localFrame: number,
  ) => {
    const springVal = spring({
      frame: Math.max(0, localFrame),
      fps,
      config: { damping, stiffness, mass },
      durationInFrames: springSettle + 10,
    });

    let textOpacity: number;
    let blur: number;

    if (mode === 'enter') {
      // Blur-fade in: blurred+transparent → clear+opaque
      textOpacity = interpolate(springVal, [0, 1], [0, 1]);
      blur = interpolate(springVal, [0, 1], [blurAmount, 0]);
    } else {
      // Blur-fade out: clear+opaque → blurred+transparent
      textOpacity = interpolate(springVal, [0, 1], [1, 0]);
      blur = interpolate(springVal, [0, 1], [0, blurAmount]);
    }

    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: textOpacity,
          filter: `blur(${blur}px)`,
        }}
      >
        <span
          style={{
            display: 'inline-block',
            fontSize,
            fontWeight,
            color,
            fontFamily,
            whiteSpace: 'pre',
            lineHeight: `${lineHeight}px`,
          }}
        >
          {text}
        </span>
      </div>
    );
  };

  // ── Pill background wrapper ──
  const innerContent = (
    <div
      style={{
        position: 'relative',
        width: containerWidth,
        height: lineHeight,
        overflow: 'hidden',
      }}
    >
      {/* Exit phase — previous text blurs out */}
      {prevIndex >= 0 && !isVeryFirst && f < exitDuration + springSettle &&
        renderUnits(texts[prevIndex], 'exit', f)}

      {/* Enter phase — new text blurs in */}
      {isVeryFirst
        ? renderUnits(texts[activeIndex], 'enter', f)
        : f >= enterStart - 2 && renderUnits(texts[activeIndex], 'enter', f - enterStart)
      }
    </div>
  );

  if (!showPill) return innerContent;

  return (
    <div
      className="inline-flex items-center justify-center rounded-lg"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
        paddingLeft: pillPaddingH,
        paddingRight: pillPaddingH,
        paddingTop: pillPaddingV,
        paddingBottom: pillPaddingV,
        width: containerWidth + pillPaddingH * 2,
        overflow: 'hidden',
      }}
    >
      {innerContent}
    </div>
  );
};
