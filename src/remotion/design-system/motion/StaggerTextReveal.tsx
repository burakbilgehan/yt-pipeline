import React from 'react';
import { useCurrentFrame, spring, useVideoConfig, interpolate } from 'remotion';

export interface StaggerTextRevealProps {
  text: string;
  startFrame?: number;
  staggerFrames?: number;
  staggerFrom?: 'first' | 'last' | 'center' | 'random';
  splitBy?: 'characters' | 'words';
  direction?: 'up' | 'down';
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  fontFamily?: string;
  springConfig?: {
    damping?: number;
    stiffness?: number;
    mass?: number;
  };
}

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

  // Split by characters, preserving spaces as trailing on prior char
  const units: TextUnit[] = [];
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === ' ') {
      // Attach space to the previous unit if one exists
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
 * Compute stagger delay for a unit based on staggerFrom strategy.
 */
function getStaggerDelay(
  index: number,
  total: number,
  staggerFrames: number,
  staggerFrom: 'first' | 'last' | 'center' | 'random',
): number {
  switch (staggerFrom) {
    case 'last':
      return (total - 1 - index) * staggerFrames;
    case 'center': {
      const center = Math.floor(total / 2);
      return Math.abs(center - index) * staggerFrames;
    }
    case 'random':
      return ((index * 7 + 3) % total) * staggerFrames;
    case 'first':
    default:
      return index * staggerFrames;
  }
}

export const StaggerTextReveal: React.FC<StaggerTextRevealProps> = ({
  text,
  startFrame = 0,
  staggerFrames = 2,
  staggerFrom = 'first',
  splitBy = 'characters',
  direction = 'up',
  fontSize = 48,
  fontWeight = 700,
  color = '#FFFFFF',
  fontFamily = 'Montserrat, sans-serif',
  springConfig = {},
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Lower damping = more overshoot/bounce. Higher stiffness = snappier.
  const damping = springConfig.damping ?? 15;
  const stiffness = springConfig.stiffness ?? 400;
  const mass = springConfig.mass ?? 0.8;

  const units = splitText(text, splitBy);
  const totalUnits = units.length;

  const lineHeight = fontSize * 1.4;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'baseline',
      }}
    >
      {units.map((unit, index) => {
        const unitDelay = startFrame + getStaggerDelay(index, totalUnits, staggerFrames, staggerFrom);

        const springProgress = spring({
          frame: Math.max(0, frame - unitDelay),
          fps,
          config: { damping, stiffness, mass },
          durationInFrames: 25,
        });

        const initialY = direction === 'up' ? lineHeight : -lineHeight;
        const translateY = interpolate(springProgress, [0, 1], [initialY, 0]);

        const opacity = interpolate(
          springProgress,
          [0, 0.3],
          [0, 1],
          { extrapolateRight: 'clamp' },
        );

        return (
          <span
            key={index}
            style={{
              display: 'inline-block',
              overflow: 'hidden',
              height: lineHeight,
              lineHeight: `${lineHeight}px`,
              verticalAlign: 'top',
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
