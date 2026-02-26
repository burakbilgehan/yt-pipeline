import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

interface ProgressBarProps {
  /** Current scene index (0-based) */
  currentScene: number;
  /** Total number of scenes */
  totalScenes: number;
  /** Current frame within the entire composition */
  globalFrame: number;
  /** Total frames in the composition */
  totalFrames: number;
  /** Brand color */
  color: string;
}

/**
 * Bottom progress bar showing video playback position.
 * Shows both continuous progress and scene markers.
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  currentScene,
  totalScenes,
  globalFrame,
  totalFrames,
  color,
}) => {
  const progress = interpolate(globalFrame, [0, totalFrames], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 6,
        backgroundColor: "rgba(255,255,255,0.15)",
        zIndex: 100,
      }}
    >
      {/* Continuous progress */}
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          backgroundColor: color,
          borderRadius: "0 3px 3px 0",
          transition: "width 0.1s linear",
        }}
      />

      {/* Scene markers */}
      {Array.from({ length: totalScenes - 1 }).map((_, i) => {
        const markerPosition = ((i + 1) / totalScenes) * 100;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: 0,
              left: `${markerPosition}%`,
              width: 2,
              height: "100%",
              backgroundColor: "rgba(255,255,255,0.4)",
            }}
          />
        );
      })}
    </div>
  );
};
