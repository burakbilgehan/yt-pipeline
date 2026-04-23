import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { DotGrid } from '../atmospheres/DotGrid';
import { GlassSurface } from '../surfaces/GlassSurface';
import { ContainerTextFlip } from '../motion/ContainerTextFlip';
import { BlurFadeIn } from '../motion/BlurFadeIn';
import { PieChart } from '../../templates/data-charts/PieChart';

/**
 * LayerCombo showcase — all DS layers composed together:
 *
 *   L2 Atmosphere:  DotGrid (full-screen animated background)
 *   L4 Surface:     GlassSurface (full card container with backdrop-blur)
 *   L3 Motion:      ContainerTextFlip (cycling title) + BlurFadeIn (chart entrance)
 *   L5 Template:    PieChart (data visualization)
 *
 * 1920×1080, 300 frames @ 30fps (10 seconds)
 */
const LayerComboShowcase: React.FC = () => {
  const BG = '#0f0f1a';
  const ACCENT = '#6C63FF';

  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      {/* ── L2: DotGrid atmosphere — full-screen, behind everything ── */}
      <DotGrid
        id="dot-grid"
        width={1920}
        height={1080}
        opacity={0.4}
        speed={0.8}
        color="rgba(108, 99, 255, 0.2)"
        scale={32}
      />

      {/* ── Content layer — centered column ── */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* ── L4: GlassSurface — the entire card ── */}
        <BlurFadeIn startFrame={0} blurAmount={16} damping={25} stiffness={120}>
          <GlassSurface
            id="glass"
            blur={20}
            opacity={0.7}
            borderRadius={28}
            borderColor="rgba(108, 99, 255, 0.25)"
            borderWidth={1}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 24,
                padding: 16,
              }}
            >
              {/* ── L3: ContainerTextFlip title — blur-fade cycling text ── */}
              <Sequence from={0} durationInFrames={300}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                  }}
                >
                  <span
                    style={{
                      fontSize: 40,
                      fontWeight: 400,
                      color: 'rgba(255,255,255,0.85)',
                      fontFamily: 'Montserrat, sans-serif',
                    }}
                  >
                    World Energy is
                  </span>
                  <ContainerTextFlip
                    texts={['shifting', 'evolving', 'changing', 'growing']}
                    frameDuration={60}
                    staggerFrames={2}
                    staggerFrom="first"
                    splitBy="characters"
                    fontSize={40}
                    fontWeight={700}
                    color="#FFFFFF"
                    fontFamily="Montserrat, sans-serif"
                    loop
                    blurAmount={12}
                    showPill
                    springConfig={{ damping: 18, stiffness: 350, mass: 0.8 }}
                  />
                </div>
              </Sequence>

              {/* ── L5 + L3: PieChart wrapped in BlurFadeIn ── */}
              <BlurFadeIn startFrame={15} blurAmount={14} damping={22} stiffness={150}>
                <div style={{ width: 900, height: 420 }}>
                  <PieChart
                    chart={{
                      type: 'pie-chart',
                      title: '',
                      items: [
                        { label: 'Oil', value: 31 },
                        { label: 'Coal', value: 27 },
                        { label: 'Natural Gas', value: 24 },
                        { label: 'Renewables', value: 13 },
                        { label: 'Nuclear', value: 5 },
                      ],
                    }}
                    brandColor={ACCENT}
                    fontFamily="Montserrat, sans-serif"
                  />
                </div>
              </BlurFadeIn>
            </div>
          </GlassSurface>
        </BlurFadeIn>
      </div>
    </AbsoluteFill>
  );
};

export default LayerComboShowcase;
