import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { DotGrid } from '../atmospheres/DotGrid';
import { FilmGrain } from '../atmospheres/FilmGrain';

/**
 * DS-Atmosphere showcase — demonstrates DotGrid + FilmGrain
 * 1920×1080, 300 frames @ 30fps (10 seconds)
 *
 * Split screen: left half = DotGrid, right half = FilmGrain
 * Labels at top identifying each component.
 */
const AtmosphereShowcase: React.FC = () => {
  const WIDTH = 1920;
  const HEIGHT = 1080;
  const HALF_W = WIDTH / 2;
  const BG = '#1a1a22';
  const LABEL_STYLE: React.CSSProperties = {
    position: 'absolute',
    top: 40,
    left: 0,
    width: '100%',
    textAlign: 'center',
    fontSize: 32,
    fontWeight: 700,
    fontFamily: 'Montserrat, sans-serif',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 2,
    zIndex: 10,
  };

  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      {/* ── Left half: DotGrid ── */}
      <Sequence from={0} durationInFrames={300}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: HALF_W,
            height: HEIGHT,
            overflow: 'hidden',
          }}
        >
          <DotGrid
            id="dot-grid"
            width={HALF_W}
            height={HEIGHT}
            opacity={0.8}
            speed={1}
            color="rgba(255,255,255,0.3)"
            scale={40}
          />
          <div style={LABEL_STYLE}>DOT GRID</div>
        </div>
      </Sequence>

      {/* ── Right half: FilmGrain ── */}
      <Sequence from={0} durationInFrames={300}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: HALF_W,
            width: HALF_W,
            height: HEIGHT,
            overflow: 'hidden',
          }}
        >
          <FilmGrain
            id="film-grain"
            width={HALF_W}
            height={HEIGHT}
            opacity={0.6}
            speed={1}
          />
          <div style={LABEL_STYLE}>FILM GRAIN</div>
        </div>
      </Sequence>

      {/* ── Center divider line ── */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: HALF_W - 1,
          width: 2,
          height: HEIGHT,
          backgroundColor: 'rgba(255,255,255,0.15)',
          zIndex: 20,
        }}
      />

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
        L2 Atmosphere Components — Design System Showcase
      </div>
    </AbsoluteFill>
  );
};

export default AtmosphereShowcase;
