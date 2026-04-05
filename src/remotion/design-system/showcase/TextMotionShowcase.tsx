import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { StaggerTextReveal } from '../motion/StaggerTextReveal';
import { TextRotate } from '../motion/TextRotate';

/**
 * DS-TextMotion showcase — demonstrates StaggerTextReveal + TextRotate
 * 1920×1080, 300 frames @ 30fps (10 seconds)
 *
 * Key visual traits:
 *   - Characters pop in with bouncy spring overshoot (low damping)
 *   - staggerFrom: "last" — last character enters first, creating a ripple
 *   - Pill background resizes dynamically with spring to match text width
 */
const TextMotionShowcase: React.FC = () => {
  const BG_COLOR = '#2A2A32';
  const ACCENT_RED = '#ff5941';

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG_COLOR,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* ── Top half: Hero number reveal with bounce ── */}
      <Sequence from={0} durationInFrames={300}>
        <div
          style={{
            position: 'absolute',
            top: 160,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
          }}
        >
          <StaggerTextReveal
            text="1,250,000"
            startFrame={10}
            staggerFrames={2}
            staggerFrom="last"
            splitBy="characters"
            fontSize={200}
            fontWeight={800}
            color="#FFFFFF"
            fontFamily="Montserrat, sans-serif"
            springConfig={{ damping: 12, stiffness: 400, mass: 0.8 }}
          />
          <StaggerTextReveal
            text="Stagger Reveal Demo"
            startFrame={25}
            staggerFrames={1}
            staggerFrom="first"
            splitBy="words"
            fontSize={36}
            fontWeight={400}
            color="rgba(255,255,255,0.6)"
            fontFamily="Montserrat, sans-serif"
            springConfig={{ damping: 20, stiffness: 300, mass: 0.8 }}
          />
        </div>
      </Sequence>

      {/* ── Bottom half: "It's about [rotating text]" with dynamic pill ── */}
      <Sequence from={0} durationInFrames={300}>
        <div
          style={{
            position: 'absolute',
            bottom: 200,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 20,
          }}
        >
          <StaggerTextReveal
            text="It's about"
            startFrame={5}
            staggerFrames={1}
            staggerFrom="first"
            splitBy="characters"
            fontSize={52}
            fontWeight={400}
            color="rgba(255,255,255,0.8)"
            fontFamily="Montserrat, sans-serif"
            springConfig={{ damping: 20, stiffness: 300 }}
          />

          {/* Pill container — width animated by TextRotate internally */}
          <div
            style={{
              position: 'relative',
              backgroundColor: ACCENT_RED,
              borderRadius: 16,
              paddingLeft: 20,
              paddingRight: 20,
              paddingTop: 8,
              paddingBottom: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <TextRotate
              texts={[
                'Typography',
                'Animation',
                'Composable',
                'Powerful',
              ]}
              frameDuration={60}
              staggerFrames={1}
              staggerFrom="last"
              splitBy="characters"
              fontSize={52}
              fontWeight={700}
              color="#FFFFFF"
              fontFamily="Montserrat, sans-serif"
              loop
              springConfig={{ damping: 12, stiffness: 400, mass: 0.8 }}
            />
          </div>
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};

export default TextMotionShowcase;
