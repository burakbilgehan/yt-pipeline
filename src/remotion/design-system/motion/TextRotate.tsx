import React from 'react';
import { useCurrentFrame, spring, useVideoConfig, interpolate } from 'remotion';

// ─── Public Interface ─────────────────────────────────────────

export interface TextRotateProps {
  texts: string[];
  /**
   * Total frames allocated per text (includes exit + resize + enter).
   * Default 60 (2s at 30fps).
   */
  frameDuration?: number;
  /** Frames between each character's animation start. Default 1. */
  staggerFrames?: number;
  /** Which end of the text starts animating first. Default 'last'. */
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
 * Good enough for pill resize — not pixel-perfect.
 */
function estimateTextWidth(text: string, fontSize: number, fontWeight: number): number {
  const factor = fontWeight >= 700 ? 0.62 : 0.55;
  // Count only non-space chars, add partial width for spaces
  let w = 0;
  for (const ch of text) {
    w += ch === ' ' ? fontSize * 0.28 : fontSize * factor;
  }
  return w;
}

// ─── Component ────────────────────────────────────────────────

/**
 * TextRotate — cycles through texts with a 3-phase animation per transition:
 *
 *   Phase 1  (exit):   Current text characters slide up & out, staggered.
 *   Phase 2  (resize): Container width springs to the incoming text's width.
 *   Phase 3  (enter):  New text characters slide up from below, staggered.
 *
 * This mirrors the original 21st.dev TextRotate which uses
 * AnimatePresence mode="wait" + layout animations.
 */
export const TextRotate: React.FC<TextRotateProps> = ({
  texts,
  frameDuration = 60,
  staggerFrames = 1,
  staggerFrom = 'last',
  splitBy = 'characters',
  fontSize = 48,
  fontWeight = 700,
  color = '#FFFFFF',
  fontFamily = 'Montserrat, sans-serif',
  loop = true,
  springConfig = {},
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const damping = springConfig.damping ?? 15;
  const stiffness = springConfig.stiffness ?? 400;
  const mass = springConfig.mass ?? 0.8;

  const lineHeight = fontSize * 1.3;
  const totalTexts = texts.length;
  if (totalTexts === 0) return null;

  // ── Timing budget per slot ──
  // We split frameDuration into 3 phases.
  // The stagger spread = maxUnits * staggerFrames.
  // We need enough room for exit stagger + spring settle (~15 frames)
  // plus the same for enter.
  const maxUnits = Math.max(...texts.map(t => splitText(t, splitBy).length));
  const staggerSpread = maxUnits * staggerFrames;
  const springSettle = 15; // frames for a spring to visually settle
  const exitDuration = staggerSpread + springSettle;
  const resizeDuration = 8; // short spring for width change
  const enterStart = exitDuration + resizeDuration;
  // enterDuration fills the rest
  // const enterDuration = frameDuration - enterStart;

  // ── Which text is active? ──
  const totalCycleFrames = totalTexts * frameDuration;
  const cycleFrame = loop
    ? frame % totalCycleFrames
    : Math.min(frame, (totalTexts - 1) * frameDuration);
  const activeIndex = Math.floor(cycleFrame / frameDuration);
  const f = cycleFrame % frameDuration; // local frame within this slot

  const prevIndex = activeIndex === 0
    ? (loop ? totalTexts - 1 : -1)
    : activeIndex - 1;

  const isVeryFirst = frame < frameDuration && activeIndex === 0;

  // ── Container width animation (phase 2) ──
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

  // ── Render characters for a given text + phase ──
  const renderUnits = (
    text: string,
    mode: 'enter' | 'exit',
    localFrame: number,
  ) => {
    const units = splitText(text, splitBy);
    const totalUnits = units.length;

    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexWrap: 'nowrap',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {units.map((unit, index) => {
          const delay = getStaggerDelay(index, totalUnits, staggerFrames, staggerFrom);

          const springVal = spring({
            frame: Math.max(0, localFrame - delay),
            fps,
            config: { damping, stiffness, mass },
            durationInFrames: springSettle + 10,
          });

          let translateY: number;
          let opacity: number;

          if (mode === 'enter') {
            // Rise from below
            translateY = interpolate(springVal, [0, 1], [lineHeight, 0]);
            opacity = interpolate(springVal, [0, 0.25], [0, 1], {
              extrapolateRight: 'clamp',
            });
          } else {
            // Slide up and out
            translateY = interpolate(springVal, [0, 1], [0, -lineHeight * 1.2]);
            opacity = interpolate(springVal, [0.6, 1], [1, 0], {
              extrapolateLeft: 'clamp',
            });
          }

          return (
            <span
              key={index}
              style={{
                display: 'inline-block',
                overflow: 'hidden',
                height: lineHeight,
                lineHeight: `${lineHeight}px`,
                marginRight: unit.trailingSpace ? fontSize * 0.28 : 0,
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  transform: `translateY(${translateY}px)`,
                  opacity,
                  fontSize,
                  fontWeight,
                  color,
                  fontFamily,
                  whiteSpace: 'pre',
                }}
              >
                {unit.text}
              </span>
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div
      style={{
        position: 'relative',
        width: containerWidth,
        height: lineHeight,
        overflow: 'hidden',
      }}
    >
      {/* Phase 1: exit — only during first exitDuration frames */}
      {prevIndex >= 0 && !isVeryFirst && f < exitDuration + springSettle &&
        renderUnits(texts[prevIndex], 'exit', f)}

      {/* Phase 3: enter — starts after exitDuration + resizeDuration */}
      {isVeryFirst
        ? renderUnits(texts[activeIndex], 'enter', f)
        : f >= enterStart - 2 && renderUnits(texts[activeIndex], 'enter', f - enterStart)
      }
    </div>
  );
};
