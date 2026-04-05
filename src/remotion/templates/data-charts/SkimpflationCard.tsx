import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate, staticFile, Img } from "remotion";
import { BG, TEXT, ACCENT_PINK } from "../../palette";

/**
 * SkimpflationCard — Scene 015
 * Shows a real skimpflation reference photo: same price, lower quality.
 */

interface SkimpflationCardProps {
  chart: { type: "skimpflation-card"; title?: string; subtitle?: string; [k: string]: unknown };
  brandColor: string;
  fontFamily: string;
  /** Path passed to staticFile() for the skimpflation photo. */
  imageSrc?: string;
}

// ─── Main export ───────────────────────────────────────────────

export const SkimpflationCard: React.FC<SkimpflationCardProps> = ({ chart, brandColor: _brandColor, fontFamily, imageSrc = "shrinkflation-decoded/skimpflation.png" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const title = chart.title || "SKIMPFLATION";
  const subtitle = chart.subtitle || "Same price. Same size. Cheaper ingredients.";

  // Title: appears at ~0.3s
  const titleDelay = Math.round(fps * 0.3);
  const titleSpring = spring({ fps, frame: frame - titleDelay, config: { damping: 18, stiffness: 60 } });

  // Photo: fades in at ~0.5s with scale 0.95→1.0
  const photoDelay = Math.round(fps * 0.5);
  const photoSpring = spring({ fps, frame: frame - photoDelay, config: { damping: 16, stiffness: 70 } });
  const photoScale = interpolate(photoSpring, [0, 1], [0.95, 1]);

  // Subtitle: appears at ~1.5s
  const subtitleOpacity = interpolate(frame, [fps * 1.5, fps * 2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ width: "100%", height: "100%", backgroundColor: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
      {/* Title */}
      <div style={{
        fontFamily: "'Montserrat',sans-serif", fontSize: 52, fontWeight: 800,
        color: ACCENT_PINK, letterSpacing: "0.1em",
        opacity: titleSpring, transform: `translateY(${(1 - titleSpring) * -24}px)`,
      }}>
        {title}
      </div>

      {/* Skimpflation photo */}
      <div style={{
        opacity: photoSpring,
        transform: `scale(${photoScale})`,
      }}>
        <Img
          src={staticFile(imageSrc)}
          style={{
            maxWidth: 1200,
            maxHeight: 650,
            objectFit: "contain",
            borderRadius: 16,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            border: "1px solid rgba(240, 237, 232, 0.1)",
          }}
        />
      </div>

      {/* Subtitle */}
      <div style={{
        fontFamily: fontFamily || "Inter,sans-serif", fontSize: 22, color: TEXT,
        opacity: subtitleOpacity, textAlign: "center", maxWidth: 700, lineHeight: 1.5, marginTop: 8,
      }}>
        {subtitle}
      </div>
    </div>
  );
};
