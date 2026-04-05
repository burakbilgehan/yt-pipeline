import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { TextShimmer } from '../motion/TextShimmer';
import { BG, ACCENT_PINK, TEXT_MUTED } from '../../palette';

/**
 * DS-TextShimmer showcase — demonstrates the shimmer sweep effect
 * 1920×1080, 300 frames @ 30fps (10 seconds)
 *
 * Three examples stacked vertically:
 *   1. Large title with default settings
 *   2. Medium text with pink shimmer color
 *   3. Small text with slow speed (120 frames per sweep)
 */
const TextShimmerShowcase: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 80,
      }}
    >
      {/* Top label */}
      <div
        style={{
          position: 'absolute',
          top: 40,
          width: '100%',
          textAlign: 'center',
          fontSize: 32,
          fontWeight: 700,
          fontFamily: 'Montserrat, sans-serif',
          color: 'rgba(255,255,255,0.85)',
          letterSpacing: 2,
        }}
      >
        TEXT SHIMMER
      </div>

      {/* 1. Default shimmer — large title */}
      <Sequence from={0} durationInFrames={300}>
        <div
          style={{
            position: 'absolute',
            top: 180,
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <TextShimmer text="THE SHIMMER EFFECT" fontSize={72} />
        </div>
      </Sequence>

      {/* 2. Pink shimmer — medium text */}
      <Sequence from={0} durationInFrames={300}>
        <div
          style={{
            position: 'absolute',
            top: 420,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <TextShimmer
            text="Pink Accent Shimmer"
            fontSize={52}
            shimmerColor={ACCENT_PINK}
          />
          <div
            style={{
              fontSize: 18,
              color: TEXT_MUTED,
              fontFamily: 'Montserrat, sans-serif',
            }}
          >
            shimmerColor = ACCENT_PINK
          </div>
        </div>
      </Sequence>

      {/* 3. Slow shimmer — small text */}
      <Sequence from={0} durationInFrames={300}>
        <div
          style={{
            position: 'absolute',
            top: 640,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <TextShimmer
            text="Slow and steady sweep"
            fontSize={40}
            speed={120}
          />
          <div
            style={{
              fontSize: 18,
              color: TEXT_MUTED,
              fontFamily: 'Montserrat, sans-serif',
            }}
          >
            speed = 120 frames per sweep
          </div>
        </div>
      </Sequence>

      {/* Bottom label */}
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          width: '100%',
          textAlign: 'center',
          fontSize: 20,
          fontWeight: 400,
          fontFamily: 'Montserrat, sans-serif',
          color: 'rgba(255,255,255,0.4)',
        }}
      >
        L3 Motion Primitive — Design System Showcase
      </div>
    </AbsoluteFill>
  );
};

export default TextShimmerShowcase;
