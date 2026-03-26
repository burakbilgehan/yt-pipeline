import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
// TransitionType is a simple union, define locally to avoid circular deps
type TransitionType = "fade" | "cut" | "slide" | "zoom" | "crossfade" | "morph" | "seamless" | "cross-dissolve" | "fade-to-black";

interface TransitionWrapperProps {
  type: TransitionType;
  children: React.ReactNode;
  /** Duration of the transition in frames */
  transitionDuration?: number;
  /** Total duration of this scene in frames */
  sceneDurationInFrames: number;
}

/**
 * Wraps a scene with enter/exit transitions.
 * Fade, slide, zoom transitions are supported. Cut = no transition.
 */
export const TransitionWrapper: React.FC<TransitionWrapperProps> = ({
  type,
  children,
  transitionDuration = 15,
  sceneDurationInFrames,
}) => {
  const frame = useCurrentFrame();

  if (type === "cut" || type === "seamless") {
    return <AbsoluteFill>{children}</AbsoluteFill>;
  }

  // Enter transition (first N frames)
  const enterProgress = interpolate(frame, [0, transitionDuration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Exit transition (last N frames)
  const exitProgress = interpolate(
    frame,
    [sceneDurationInFrames - transitionDuration, sceneDurationInFrames],
    [1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  // Use the minimum of enter and exit for smooth in/out
  const progress = Math.min(enterProgress, exitProgress);

  const style = getTransitionStyle(type, progress);

  return <AbsoluteFill style={style}>{children}</AbsoluteFill>;
};

function getTransitionStyle(
  type: TransitionType,
  progress: number
): React.CSSProperties {
  switch (type) {
    case "fade":
    case "crossfade":
    case "cross-dissolve":
    case "morph":
      return { opacity: progress };

    case "fade-to-black":
      return { opacity: progress };

    case "slide":
      const translateX = interpolate(progress, [0, 1], [100, 0]);
      return {
        opacity: progress,
        transform: `translateX(${translateX}%)`,
      };

    case "zoom":
      const scale = interpolate(progress, [0, 1], [1.2, 1]);
      return {
        opacity: progress,
        transform: `scale(${scale})`,
      };

    default:
      return {};
  }
}
