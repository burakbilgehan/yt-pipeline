import React from "react";
import { AbsoluteFill } from "remotion";
import { TiltCard } from "../motion/TiltCard";
import { BG, TEXT, TEXT_MUTED, ACCENT_PINK, SURFACE, SURFACE_BORDER } from "../../palette";

/**
 * DS-TiltCard showcase — demonstrates 3D tilt motion primitive
 * 1920×1080, 300 frames @ 30fps (10 seconds)
 *
 * Shows three cards with different tilt speeds side by side.
 */
const TiltCardShowcase: React.FC = () => {
  const cards = [
    { label: "Slow Tilt", speed: 0.5, maxTilt: 6 },
    { label: "Default Tilt", speed: 1, maxTilt: 8 },
    { label: "Fast Tilt", speed: 2, maxTilt: 12 },
  ];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 40,
      }}
    >
      {/* Top label */}
      <div
        style={{
          position: "absolute",
          top: 40,
          width: "100%",
          textAlign: "center",
          fontSize: 32,
          fontWeight: 700,
          fontFamily: "Montserrat, sans-serif",
          color: "rgba(255,255,255,0.85)",
          letterSpacing: 2,
        }}
      >
        TILT CARD
      </div>

      {/* Three cards */}
      <div
        style={{
          display: "flex",
          gap: 60,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {cards.map((cfg) => (
          <TiltCard
            key={cfg.label}
            speed={cfg.speed}
            maxTilt={cfg.maxTilt}
            perspective={800}
          >
            <div
              style={{
                width: 400,
                height: 280,
                borderRadius: 16,
                backgroundColor: SURFACE,
                border: `1px solid ${SURFACE_BORDER}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
              }}
            >
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 600,
                  color: TEXT,
                  fontFamily: "Inter, sans-serif",
                }}
              >
                {cfg.label}
              </div>
              <div
                style={{
                  fontSize: 20,
                  color: TEXT_MUTED,
                  fontFamily: "Inter, sans-serif",
                }}
              >
                speed={cfg.speed} · maxTilt={cfg.maxTilt}°
              </div>
              <div
                style={{
                  width: 60,
                  height: 3,
                  borderRadius: 2,
                  backgroundColor: ACCENT_PINK,
                  opacity: 0.6,
                }}
              />
            </div>
          </TiltCard>
        ))}
      </div>

      {/* Bottom label */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          width: "100%",
          textAlign: "center",
          fontSize: 20,
          fontWeight: 400,
          fontFamily: "Montserrat, sans-serif",
          color: "rgba(255,255,255,0.4)",
        }}
      >
        L3 Motion Primitive — Design System Showcase
      </div>
    </AbsoluteFill>
  );
};

export default TiltCardShowcase;
