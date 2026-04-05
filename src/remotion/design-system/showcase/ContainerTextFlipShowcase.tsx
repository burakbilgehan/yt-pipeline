import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { ContainerTextFlip } from '../motion/ContainerTextFlip';

/**
 * DS-ContainerTextFlip showcase — demonstrates blur-fade word cycling
 * 1920×1080, 300 frames @ 30fps (10 seconds)
 *
 * Two variants:
 *   Top: Raw text cycling without pill (blur-fade only)
 *   Bottom: With gradient pill background enabled
 */
const ContainerTextFlipShowcase: React.FC = () => {
  const BG_COLOR = '#1a1a2e';
  const LABEL_STYLE: React.CSSProperties = {
    fontSize: 20,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Montserrat, sans-serif',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 16,
  };

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
      {/* ── Top: Raw blur-fade cycling (no pill) ── */}
      <Sequence from={0} durationInFrames={300}>
        <div
          style={{
            position: 'absolute',
            top: 200,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div style={LABEL_STYLE}>Blur-Fade (No Pill)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span
              style={{
                fontSize: 52,
                fontWeight: 400,
                color: 'rgba(255,255,255,0.8)',
                fontFamily: 'Montserrat, sans-serif',
              }}
            >
              Make it
            </span>
            <ContainerTextFlip
              texts={['beautiful', 'modern', 'elegant', 'powerful']}
              frameDuration={60}
              staggerFrames={2}
              staggerFrom="first"
              splitBy="characters"
              fontSize={52}
              fontWeight={700}
              color="#FFFFFF"
              fontFamily="Montserrat, sans-serif"
              loop
              blurAmount={10}
              showPill={false}
            />
          </div>
        </div>
      </Sequence>

      {/* ── Bottom: With gradient pill background ── */}
      <Sequence from={0} durationInFrames={300}>
        <div
          style={{
            position: 'absolute',
            bottom: 200,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div style={LABEL_STYLE}>Blur-Fade (With Pill)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span
              style={{
                fontSize: 52,
                fontWeight: 400,
                color: 'rgba(255,255,255,0.8)',
                fontFamily: 'Montserrat, sans-serif',
              }}
            >
              Ship with
            </span>
            <ContainerTextFlip
              texts={['confidence', 'speed', 'quality', 'style']}
              frameDuration={60}
              staggerFrames={2}
              staggerFrom="last"
              splitBy="characters"
              fontSize={52}
              fontWeight={700}
              color="#FFFFFF"
              fontFamily="Montserrat, sans-serif"
              loop
              blurAmount={12}
              showPill
              springConfig={{ damping: 15, stiffness: 400, mass: 0.8 }}
            />
          </div>
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};

export default ContainerTextFlipShowcase;
