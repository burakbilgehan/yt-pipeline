import React from 'react';
import { AbsoluteFill } from 'remotion';
import { GlassSurface } from '../surfaces/GlassSurface';
import { FlatSurface } from '../surfaces/FlatSurface';
import { GlowSurface } from '../surfaces/GlowSurface';

/**
 * DS-Surface showcase — demonstrates GlassSurface, FlatSurface, GlowSurface
 * 1920×1080, 300 frames @ 30fps (10 seconds)
 *
 * Dark gradient background so glass blur and glow effects are visible.
 * Three cards side by side, each with a label + sample stat content.
 */

/** Shared surface config defaults */
const SURFACE_BASE = {
  blur: 12,
  opacity: 0.6,
  borderRadius: 16,
  borderWidth: 1,
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

const SurfaceShowcase: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1025 50%, #0d1117 100%)' }}>
      {/* Decorative blurred blobs so glass blur has something to refract */}
      <div style={{ position: 'absolute', top: 200, left: 300, width: 400, height: 400, borderRadius: '50%', background: 'rgba(99, 102, 241, 0.15)', filter: 'blur(80px)' }} />
      <div style={{ position: 'absolute', top: 300, right: 200, width: 500, height: 500, borderRadius: '50%', background: 'rgba(168, 85, 247, 0.12)', filter: 'blur(100px)' }} />

      {/* Title */}
      <div style={{ position: 'absolute', top: 60, width: '100%', textAlign: 'center' }}>
        <span style={{ fontSize: 40, fontWeight: 700, color: '#FFFFFF', fontFamily: 'Montserrat, sans-serif' }}>
          L4 Surface Treatments
        </span>
      </div>

      {/* Three cards side by side */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 48 }}>
        {/* Glass */}
        <GlassSurface {...SURFACE_BASE} id="glass">
          <CardContent label="Glass" stat="$2.4T" subtitle="Market Cap" />
        </GlassSurface>

        {/* Flat */}
        <FlatSurface {...SURFACE_BASE} id="flat" opacity={0.95}>
          <CardContent label="Flat" stat="1,250" subtitle="Companies" />
        </FlatSurface>

        {/* Glow */}
        <GlowSurface {...SURFACE_BASE} id="glow" glowColor="#8b5cf6" glowIntensity={0.9}>
          <CardContent label="Glow" stat="42%" subtitle="Growth Rate" />
        </GlowSurface>
      </div>
    </AbsoluteFill>
  );
};

export default SurfaceShowcase;
