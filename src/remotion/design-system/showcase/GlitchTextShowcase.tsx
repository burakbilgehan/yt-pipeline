import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { GlitchText } from '../motion/GlitchText';
import { BG, TEXT_MUTED } from '../../palette';

/**
 * DS-GlitchText showcase — demonstrates the digital glitch effect
 * 1920×1080, 300 frames @ 30fps (10 seconds)
 *
 * Three examples stacked vertically:
 *   1. "SYSTEM ERROR" — default glitch settings
 *   2. "DATA BREACH" — high intensity (8px)
 *   3. "SIGNAL LOST" — frequent glitches (every 6 frames)
 */
const GlitchTextShowcase: React.FC = () => {
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
        GLITCH TEXT
      </div>

      {/* 1. Default glitch */}
      <Sequence from={0} durationInFrames={300}>
        <div
          style={{
            position: 'absolute',
            top: 200,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <GlitchText text="SYSTEM ERROR" fontSize={64} />
          <div
            style={{
              fontSize: 18,
              color: TEXT_MUTED,
              fontFamily: 'Montserrat, sans-serif',
            }}
          >
            intensity=4 · interval=12 · duration=3
          </div>
        </div>
      </Sequence>

      {/* 2. High intensity */}
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
          <GlitchText text="DATA BREACH" fontSize={64} intensity={8} />
          <div
            style={{
              fontSize: 18,
              color: TEXT_MUTED,
              fontFamily: 'Montserrat, sans-serif',
            }}
          >
            intensity=8 (high displacement)
          </div>
        </div>
      </Sequence>

      {/* 3. Frequent glitches */}
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
          <GlitchText
            text="SIGNAL LOST"
            fontSize={64}
            glitchInterval={6}
          />
          <div
            style={{
              fontSize: 18,
              color: TEXT_MUTED,
              fontFamily: 'Montserrat, sans-serif',
            }}
          >
            glitchInterval=6 (frequent bursts)
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

export default GlitchTextShowcase;
