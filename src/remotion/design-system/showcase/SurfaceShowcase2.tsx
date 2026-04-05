import React from 'react';
import { AbsoluteFill } from 'remotion';
import { NeonGradientSurface } from '../surfaces/NeonGradientSurface';
import { BacklightSurface } from '../surfaces/BacklightSurface';
import { ACCENT_PINK, ACCENT_BLUE } from '../../palette';

/**
 * DS-Surface showcase 2 — demonstrates NeonGradientSurface, BacklightSurface
 * 1920×1080, 300 frames @ 30fps (10 seconds)
 *
 * Dark gradient background with decorative blurred blobs.
 * Two cards side by side with sample stat content.
 */

/** Shared surface config defaults */
const SURFACE_BASE = {
  blur: 12,
  opacity: 0.6,
  borderRadius: 16,
  borderWidth: 2,
};

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

const SurfaceShowcase2: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1025 50%, #0d1117 100%)' }}>
      {/* Decorative blurred blobs for depth and glass refraction */}
      <div style={{ position: 'absolute', top: 150, left: 250, width: 500, height: 500, borderRadius: '50%', background: `${ACCENT_PINK}20`, filter: 'blur(90px)' }} />
      <div style={{ position: 'absolute', top: 250, right: 250, width: 450, height: 450, borderRadius: '50%', background: `${ACCENT_BLUE}18`, filter: 'blur(100px)' }} />

      {/* Title */}
      <div style={{ position: 'absolute', top: 60, width: '100%', textAlign: 'center' }}>
        <span style={{ fontSize: 40, fontWeight: 700, color: '#FFFFFF', fontFamily: 'Montserrat, sans-serif' }}>
          L4 Surface Treatments — New
        </span>
      </div>

      {/* Two cards side by side */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 64 }}>
        {/* Neon Gradient */}
        <NeonGradientSurface
          {...SURFACE_BASE}
          id="neon-gradient"
          glowColor={ACCENT_PINK}
          glowIntensity={0.9}
        >
          <CardContent label="Neon Gradient" stat="$847B" subtitle="Revenue" />
        </NeonGradientSurface>

        {/* Backlight */}
        <BacklightSurface
          {...SURFACE_BASE}
          id="backlight"
          glowColor={ACCENT_BLUE}
          glowIntensity={0.85}
          borderWidth={1}
        >
          <CardContent label="Backlight" stat="2,450" subtitle="Data Points" />
        </BacklightSurface>
      </div>
    </AbsoluteFill>
  );
};

export default SurfaceShowcase2;
