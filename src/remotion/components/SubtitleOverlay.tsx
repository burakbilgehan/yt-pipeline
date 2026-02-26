import React from "react";
import { interpolate, useCurrentFrame, spring, useVideoConfig } from "remotion";

interface SubtitleOverlayProps {
  /** The text to display */
  text: string;
  /** Font family */
  fontFamily: string;
  /** Duration of this scene in frames */
  sceneDurationInFrames: number;
}

/**
 * Animated subtitle overlay at the bottom of the screen.
 * Fades in, stays visible, fades out at the end of the scene.
 */
export const SubtitleOverlay: React.FC<SubtitleOverlayProps> = ({
  text,
  fontFamily,
  sceneDurationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!text || text.trim().length === 0) {
    return null;
  }

  // Spring entrance
  const enterSpring = spring({
    fps,
    frame,
    config: { damping: 20, stiffness: 100 },
  });

  // Fade out in the last 10 frames
  const exitOpacity = interpolate(
    frame,
    [sceneDurationInFrames - 10, sceneDurationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const opacity = Math.min(enterSpring, exitOpacity);
  const translateY = interpolate(enterSpring, [0, 1], [20, 0]);

  // Truncate long text for display
  const displayText =
    text.length > 200 ? text.substring(0, 200) + "..." : text;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 40,
        left: 60,
        right: 60,
        display: "flex",
        justifyContent: "center",
        zIndex: 50,
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      <div
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.75)",
          borderRadius: 8,
          padding: "12px 24px",
          maxWidth: "80%",
        }}
      >
        <p
          style={{
            color: "#FFFFFF",
            fontSize: 28,
            fontFamily,
            lineHeight: 1.4,
            margin: 0,
            textAlign: "center",
          }}
        >
          {displayText}
        </p>
      </div>
    </div>
  );
};
