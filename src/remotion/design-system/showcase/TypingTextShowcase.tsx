import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { TypingText } from '../motion/TypingText';
import { BG, TEXT_MUTED } from '../../palette';

/**
 * DS-TypingText showcase — demonstrates typewriter effect
 * 1920×1080, 300 frames @ 30fps (10 seconds)
 *
 * Two lines typed sequentially:
 *   1. Starting at frame 0: "The global economy produces $100 trillion annually."
 *   2. Starting at frame 90: "But where does the money actually go?"
 */
const TypingTextShowcase: React.FC = () => {
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
        TYPING TEXT
      </div>

      {/* Main content area */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 40,
          paddingLeft: 200,
          paddingRight: 200,
          width: '100%',
        }}
      >
        {/* Line 1 — starts at frame 0 */}
        <Sequence from={0} durationInFrames={300}>
          <TypingText
            text="The global economy produces $100 trillion annually."
            startFrame={0}
            fontSize={44}
          />
        </Sequence>

        {/* Line 2 — starts at frame 90 */}
        <Sequence from={0} durationInFrames={300}>
          <TypingText
            text="But where does the money actually go?"
            startFrame={90}
            fontSize={44}
          />
        </Sequence>
      </div>

      {/* Subtitle */}
      <div
        style={{
          position: 'absolute',
          bottom: 120,
          width: '100%',
          textAlign: 'center',
          fontSize: 18,
          color: TEXT_MUTED,
          fontFamily: 'Montserrat, sans-serif',
        }}
      >
        charsPerFrame=0.5 · cursorBlinkFrames=15
      </div>

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

export default TypingTextShowcase;
