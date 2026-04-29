import React from 'react';
import {
  ACCENT_PINK,
  ACCENT_BLUE,
  BG,
  TEXT,
  TEXT_FAINT,
  TEXT_MUTED,
  SURFACE_BORDER_STRONG,
} from '../../palette';
import { DotGrid } from '../../design-system/atmospheres/DotGrid';
import { BlurFadeIn } from '../../design-system/motion/BlurFadeIn';
import {
  EdgeStrip,
  LogoBlock,
  AccentRule,
} from '../../design-system/primitives';

export interface BauhausHeroStat {
  value: string;
  label: string;
  sub?: string;
}

export interface BauhausHeroSceneProps {
  topMetaLeft?: string;
  topMetaRight?: string;
  accentLabel?: string;
  title: string;
  primary: BauhausHeroStat;
  secondary?: BauhausHeroStat;
  source: string;
  startFrame?: number;
}

const FRAME_W = 1920;
const FRAME_H = 1080;
const M = 56;

export const BauhausHeroScene: React.FC<BauhausHeroSceneProps> = ({
  topMetaLeft = '',
  topMetaRight = 'The World With Numbers',
  accentLabel = 'Soru',
  title,
  primary,
  secondary,
  source,
  startFrame = 0,
}) => {
  return (
    <div
      style={{
        width: FRAME_W,
        height: FRAME_H,
        background: BG,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Montserrat', sans-serif",
      }}
    >
      <DotGrid id="dot-grid" width={FRAME_W} height={FRAME_H} opacity={1} speed={0.5} />

      <EdgeStrip position="right" thickness={8} color={ACCENT_PINK} />

      <BlurFadeIn startFrame={startFrame} blurAmount={10}>
        <div style={{ position: 'absolute', inset: 0 }}>
          {/* Top eyebrow row */}
          <div
            style={{
              position: 'absolute',
              top: M,
              left: M,
              right: M + 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                color: TEXT_FAINT,
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
              }}
            >
              {topMetaLeft}
            </span>
            <span
              style={{
                color: TEXT_FAINT,
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
              }}
            >
              {topMetaRight}
            </span>
          </div>

          {/* Top rule */}
          <div
            style={{
              position: 'absolute',
              top: M + 40,
              left: M,
              right: M + 8,
              height: 2,
              background: SURFACE_BORDER_STRONG,
            }}
          />

          {/* Two-column body */}
          <div
            style={{
              position: 'absolute',
              top: M + 40 + 2 + 68,
              left: M,
              right: M + 8,
              bottom: M + 56 + 2 + 20,
              display: 'grid',
              gridTemplateColumns: '1fr 500px',
              gap: 0,
            }}
          >
            {/* Left: title */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                paddingRight: 80,
              }}
            >
              {accentLabel && (
                <div
                  style={{
                    color: ACCENT_PINK,
                    fontSize: 14,
                    fontWeight: 600,
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    marginBottom: 44,
                  }}
                >
                  {accentLabel}
                </div>
              )}
              <div
                style={{
                  color: TEXT,
                  fontSize: 100,
                  fontWeight: 800,
                  lineHeight: 1.04,
                  letterSpacing: '-0.025em',
                  whiteSpace: 'pre-line',
                }}
              >
                {title}
              </div>
              <AccentRule width={120} thickness={3} marginTop={56} />
            </div>

            {/* Right: stat block */}
            <div
              style={{
                borderLeft: `2px solid ${SURFACE_BORDER_STRONG}`,
                paddingLeft: 64,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    color: ACCENT_PINK,
                    fontSize: 192,
                    fontWeight: 900,
                    lineHeight: 0.88,
                    letterSpacing: '-0.045em',
                    fontVariantNumeric: 'tabular-nums lining-nums',
                  }}
                >
                  {primary.value}
                </div>
                <div
                  style={{
                    color: TEXT,
                    fontSize: 30,
                    fontWeight: 600,
                    letterSpacing: '-0.01em',
                    marginTop: 24,
                  }}
                >
                  {primary.label}
                </div>
                {primary.sub && (
                  <div
                    style={{
                      color: TEXT_MUTED,
                      fontSize: 19,
                      fontWeight: 400,
                      marginTop: 10,
                    }}
                  >
                    {primary.sub}
                  </div>
                )}
              </div>

              {secondary && (
                <>
                  <div
                    style={{
                      width: '100%',
                      height: 1,
                      background: SURFACE_BORDER_STRONG,
                      margin: '36px 0',
                    }}
                  />
                  <div>
                    <div
                      style={{
                        color: ACCENT_BLUE,
                        fontSize: 72,
                        fontWeight: 900,
                        letterSpacing: '-0.03em',
                        fontVariantNumeric: 'tabular-nums lining-nums',
                      }}
                    >
                      {secondary.value}
                    </div>
                    <div
                      style={{
                        color: TEXT_MUTED,
                        fontSize: 18,
                        fontWeight: 400,
                        marginTop: 10,
                        lineHeight: 1.55,
                        whiteSpace: 'pre-line',
                      }}
                    >
                      {secondary.label}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Bottom rule */}
          <div
            style={{
              position: 'absolute',
              bottom: M + 24 + 26,
              left: M,
              right: M + 8,
              height: 1,
              background: SURFACE_BORDER_STRONG,
            }}
          />

          {/* Bottom bar */}
          <div
            style={{
              position: 'absolute',
              bottom: M,
              left: M,
              right: M + 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <LogoBlock markSize={28} fontSize={15} letterSpacing="0.1em" />
            <span
              style={{
                color: TEXT_FAINT,
                fontSize: 13,
                fontWeight: 400,
                letterSpacing: '0.1em',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {source}
            </span>
          </div>
        </div>
      </BlurFadeIn>
    </div>
  );
};
