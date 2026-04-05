import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { RetroGrid } from '../atmospheres/RetroGrid';
import { ShootingStars } from '../atmospheres/ShootingStars';
import { BlurryBlob } from '../atmospheres/BlurryBlob';

/**
 * DS-Atmosphere2 showcase — demonstrates RetroGrid + ShootingStars + BlurryBlob
 * 1920×1080, 300 frames @ 30fps (10 seconds)
 *
 * 3-column split: Left = RetroGrid, Center = ShootingStars, Right = BlurryBlob
 */
const AtmosphereShowcase2: React.FC = () => {
  const WIDTH = 1920;
  const HEIGHT = 1080;
  const COL_W = WIDTH / 3; // 640px each
  const BG = '#1a1a22';

  const LABEL_STYLE: React.CSSProperties = {
    position: 'absolute',
    top: 40,
    left: 0,
    width: '100%',
    textAlign: 'center',
    fontSize: 28,
    fontWeight: 700,
    fontFamily: 'Montserrat, sans-serif',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 2,
    zIndex: 10,
  };

  const colStyle = (colIndex: number): React.CSSProperties => ({
    position: 'absolute',
    top: 0,
    left: colIndex * COL_W,
    width: COL_W,
    height: HEIGHT,
    overflow: 'hidden',
  });

  const dividerStyle = (x: number): React.CSSProperties => ({
    position: 'absolute',
    top: 0,
    left: x - 1,
    width: 2,
    height: HEIGHT,
    backgroundColor: 'rgba(255,255,255,0.15)',
    zIndex: 20,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      {/* ── Left: RetroGrid ── */}
      <Sequence from={0} durationInFrames={300}>
        <div style={colStyle(0)}>
          <RetroGrid
            id="retro-grid"
            width={COL_W}
            height={HEIGHT}
            opacity={0.9}
            speed={1}
            color="rgba(255,255,255,0.2)"
            scale={50}
          />
          <div style={LABEL_STYLE}>RETRO GRID</div>
        </div>
      </Sequence>

      {/* ── Center: ShootingStars ── */}
      <Sequence from={0} durationInFrames={300}>
        <div style={colStyle(1)}>
          <ShootingStars
            id="shooting-stars"
            width={COL_W}
            height={HEIGHT}
            opacity={0.9}
            speed={1}
            scale={10}
          />
          <div style={LABEL_STYLE}>SHOOTING STARS</div>
        </div>
      </Sequence>

      {/* ── Right: BlurryBlob ── */}
      <Sequence from={0} durationInFrames={300}>
        <div style={colStyle(2)}>
          <BlurryBlob
            id="blurry-blob"
            width={COL_W}
            height={HEIGHT}
            opacity={0.8}
            speed={1}
          />
          <div style={LABEL_STYLE}>BLURRY BLOB</div>
        </div>
      </Sequence>

      {/* ── Column dividers ── */}
      <div style={dividerStyle(COL_W)} />
      <div style={dividerStyle(COL_W * 2)} />

      {/* ── Bottom label ── */}
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          width: WIDTH,
          textAlign: 'center',
          fontSize: 20,
          fontWeight: 400,
          fontFamily: 'Montserrat, sans-serif',
          color: 'rgba(255,255,255,0.4)',
          zIndex: 10,
        }}
      >
        L2 Atmosphere Components — Design System Showcase 2
      </div>
    </AbsoluteFill>
  );
};

export default AtmosphereShowcase2;
