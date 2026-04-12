import React from 'react';
import { AbsoluteFill } from 'remotion';
import { FrostedPanelSurface } from '../surfaces/FrostedPanelSurface';
import { CardSurface } from '../surfaces/CardSurface';
import { ACCENT_PINK, ACCENT_BLUE } from '../../palette';

/**
 * DS-Surface showcase 3 — demonstrates FrostedPanelSurface, CardSurface
 * 1920×1080, 300 frames @ 30fps (10 seconds)
 *
 * FrostedPanelSurface: matte frosted glass (from Glass Calendar intake)
 * CardSurface: glassmorphic stat card with corner glow (from Glassmorphism Trust Hero intake)
 *
 * Dark gradient background with decorative blurred blobs.
 */

/** Card wrapper for consistent sizing and layout */
const CardContent: React.FC<{ label: string; stat: string; subtitle: string }> = ({
  label,
  stat,
  subtitle,
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: 440 }}>
    <span style={{ fontSize: 22, fontWeight: 500, color: 'rgba(255,255,255,0.5)', fontFamily: 'Montserrat, sans-serif', letterSpacing: 2, textTransform: 'uppercase' }}>
      {label}
    </span>
    <span style={{ fontSize: 80, fontWeight: 800, color: '#FFFFFF', fontFamily: 'Montserrat, sans-serif' }}>
      {stat}
    </span>
    <span style={{ fontSize: 24, fontWeight: 400, color: 'rgba(255,255,255,0.6)', fontFamily: 'Montserrat, sans-serif' }}>
      {subtitle}
    </span>
  </div>
);

const SurfaceShowcase3: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1025 50%, #0d1117 100%)' }}>
      {/* Decorative blurred blobs for depth and frosted blur refraction */}
      <div style={{ position: 'absolute', top: 150, left: 250, width: 500, height: 500, borderRadius: '50%', background: `${ACCENT_PINK}20`, filter: 'blur(90px)' }} />
      <div style={{ position: 'absolute', top: 250, right: 250, width: 450, height: 450, borderRadius: '50%', background: `${ACCENT_BLUE}18`, filter: 'blur(100px)' }} />

      {/* Title */}
      <div style={{ position: 'absolute', top: 60, width: '100%', textAlign: 'center' }}>
        <span style={{ fontSize: 40, fontWeight: 700, color: '#FFFFFF', fontFamily: 'Montserrat, sans-serif' }}>
          L4 Surface Treatments — Frosted
        </span>
      </div>

      {/* Two cards side by side */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 64 }}>
        {/* Frosted Panel — matte frosted glass */}
        <div style={{ width: 520, height: 380 }}>
          <FrostedPanelSurface
            id="frosted-panel"
            blur={24}
            opacity={0.2}
            borderRadius={24}
            borderWidth={1}
            borderColor="rgba(255,255,255,0.10)"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', padding: 40 }}>
              <CardContent label="Frosted Panel" stat="$1.2T" subtitle="Annual Revenue" />
            </div>
          </FrostedPanelSurface>
        </div>

        {/* Card — glassmorphic stat card with corner glow */}
        <div style={{ width: 520, height: 380 }}>
          <CardSurface
            id="card"
            blur={20}
            opacity={0.05}
            borderRadius={24}
            borderWidth={1}
            borderColor="rgba(255,255,255,0.10)"
            glowColor="rgba(255,255,255,0.05)"
            glowIntensity={1.0}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', padding: 40 }}>
              <CardContent label="Card" stat="98%" subtitle="Satisfaction" />
            </div>
          </CardSurface>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default SurfaceShowcase3;
