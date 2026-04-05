import React from 'react';
import { useCurrentFrame, spring, useVideoConfig, interpolate } from 'remotion';

// ─── Public Interface ─────────────────────────────────────────

export interface TextRotateProps {
  texts: string[];
  /** Total frames allocated per text slot (exit + gap + enter). Default 60. */
  frameDuration?: number;
  /** Frames between each character's animation start. Supports fractional. Default 0.75. */
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

/**
 * Compute stagger delay in frames for a given unit index.
 * Returns fractional frames — the spring caller uses Math.max(0, frame - delay)
 * which naturally handles sub-frame offsets.
 */
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
 * Used for container width animation — not pixel-perfect but close enough.
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
 * TextRotate — cycles through texts with per-character slide animation.
 *
 * Faithfully reproduces the 21st.dev TextRotate web component:
 *   - Characters EXIT by sliding UP to -120% (staggered)
 *   - AnimatePresence "wait" mode: exit completes, brief gap, then enter
 *   - Characters ENTER by sliding UP FROM BELOW at 100% → 0 (staggered)
 *   - Container width springs to match new text
 *
 * Default spring matches the demo: { damping: 30, stiffness: 400 }
 * — fast, snappy, minimal overshoot.
 */
export const TextRotate: React.FC<TextRotateProps> = ({
  texts,
  frameDuration = 60,
  staggerFrames = 0.75,
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

  // Spring config — defaults match original demo exactly
  const damping = springConfig.damping ?? 30;
  const stiffness = springConfig.stiffness ?? 400;
  const mass = springConfig.mass ?? 1;

  const lineHeight = fontSize * 1.3;
  const totalTexts = texts.length;
  if (totalTexts === 0) return null;

  // ── Phase timing budget ──
  // For fast spring (d:30, s:400), settle takes ~10-12 frames at 30fps.
  // Total stagger spread = (maxUnits - 1) * staggerFrames.
  const maxUnits = Math.max(...texts.map(t => splitText(t, splitBy).length));
  const staggerSpread = Math.max(0, maxUnits - 1) * staggerFrames;
  const springSettle = 12;
  const exitDuration = Math.ceil(staggerSpread + springSettle);
  const gapDuration = 2; // brief empty moment — "wait" mode
  const enterStart = exitDuration + gapDuration;

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

  // First text in the sequence enters immediately (no exit phase)
  const isVeryFirst = frame < frameDuration && activeIndex === 0;

  // ── Container width animation ──
  const activeWidth = estimateTextWidth(texts[activeIndex], fontSize, fontWeight);
  const prevWidth = prevIndex >= 0
    ? estimateTextWidth(texts[prevIndex], fontSize, fontWeight)
    : activeWidth;

  // Width springs during the gap/enter transition — same spring as characters
  const widthSpringFrame = Math.max(0, f - exitDuration);
  const widthProgress = spring({
    frame: widthSpringFrame,
    fps,
    config: { damping: 30, stiffness: 400, mass: 1 },
    durationInFrames: gapDuration + springSettle + 5,
  });

  const containerWidth = isVeryFirst
    ? activeWidth
    : interpolate(widthProgress, [0, 1], [prevWidth, activeWidth]);

  // ── Render characters for enter or exit phase ──
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

          // Spring progress — fractional delay works because spring()
          // treats negative/zero frame as 0 progress
          const springVal = spring({
            frame: Math.max(0, localFrame - delay),
            fps,
            config: { damping, stiffness, mass },
            durationInFrames: springSettle + 5,
          });

          let translateY: number;
          let opacity: number;

          if (mode === 'enter') {
            // Slide up from below: y 100% → 0
            translateY = interpolate(springVal, [0, 1], [lineHeight, 0]);
            // Opacity fades in early in the spring
            opacity = interpolate(springVal, [0, 0.3], [0, 1], {
              extrapolateRight: 'clamp',
            });
          } else {
            // Slide up and out: y 0 → -120%
            translateY = interpolate(springVal, [0, 1], [0, -lineHeight * 1.2]);
            // Opacity fades out near the end of the spring
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
      {/* Exit phase: previous text slides up and out */}
      {prevIndex >= 0 && !isVeryFirst && f < exitDuration + 2 &&
        renderUnits(texts[prevIndex], 'exit', f)}

      {/* Enter phase: new text slides up from below */}
      {isVeryFirst
        ? renderUnits(texts[activeIndex], 'enter', f)
        : f >= enterStart && renderUnits(texts[activeIndex], 'enter', f - enterStart)
      }
    </div>
  );
};
