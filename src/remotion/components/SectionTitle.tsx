import React from "react";
import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

interface SectionTitleProps {
  /** Section/scene title */
  title: string;
  /** Brand color for accent */
  brandColor: string;
  /** Font family */
  fontFamily: string;
}

/**
 * Animated section title that appears at the start of each scene.
 * Slides in from left with a spring animation, stays for ~2s, then fades out.
 */
export const SectionTitle: React.FC<SectionTitleProps> = ({
  title,
  brandColor,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Appear with spring
  const enterSpring = spring({
    fps,
    frame,
    config: { damping: 15, stiffness: 80 },
  });

  // Fade out after 2 seconds (60 frames at 30fps)
  const fadeOut = interpolate(frame, [50, 65], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const opacity = Math.min(enterSpring, fadeOut);
  const translateX = interpolate(enterSpring, [0, 1], [-80, 0]);

  if (opacity <= 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 60,
        left: 60,
        zIndex: 40,
        opacity,
        transform: `translateX(${translateX}px)`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        {/* Accent bar */}
        <div
          style={{
            width: 6,
            height: 40,
            backgroundColor: brandColor,
            borderRadius: 3,
          }}
        />
        <h2
          style={{
            color: "#FFFFFF",
            fontSize: 36,
            fontFamily,
            fontWeight: 700,
            margin: 0,
            textShadow: "0 2px 8px rgba(0,0,0,0.5)",
          }}
        >
          {title}
        </h2>
      </div>
    </div>
  );
};
