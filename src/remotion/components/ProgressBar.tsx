import React from "react";
import { interpolate } from "remotion";

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
  /** Optional: unique section count for chapter markers */
  sectionCount?: number;
}

/**
 * Minimal YouTube-style progress bar.
 * Thin line at the very bottom with continuous fill.
 * Only shows section-level chapter markers (not per-scene).
 * Appears subtly — doesn't distract from the video.
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  currentScene,
  totalScenes,
  globalFrame,
  totalFrames,
  color,
  sectionCount,
}) => {
  const progress = interpolate(globalFrame, [0, totalFrames], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Use sectionCount for markers if provided, otherwise show NO markers
  // (30 scene markers look awful — only show a few chapter dividers)
  const markerCount = sectionCount ?? 0;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 4,
        backgroundColor: "rgba(255,255,255,0.1)",
        zIndex: 100,
      }}
    >
      {/* Continuous progress fill */}
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          backgroundColor: color,
          borderRadius: "0 2px 2px 0",
        }}
      />

      {/* Section chapter markers (only a few, subtle) */}
      {markerCount > 1 &&
        Array.from({ length: markerCount - 1 }).map((_, i) => {
          const markerPosition = ((i + 1) / markerCount) * 100;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                top: 0,
                left: `${markerPosition}%`,
                width: 2,
                height: "100%",
                backgroundColor: "rgba(255,255,255,0.25)",
              }}
            />
          );
        })}
    </div>
  );
};
