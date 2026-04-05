import React from "react";
import { AbsoluteFill } from "remotion";
import { HookScene } from "../../../../templates/data-charts/HookScene";

/**
 * Simplified HookScene — text phase only (no video files needed).
 * Video phases need durationInFrames > 0, so we give them 1-frame durations
 * starting past the composition end. The text question fills the full duration.
 */
const HookSceneShowcase: React.FC = () => (
  <AbsoluteFill>
    <HookScene
      chart={{
        type: "hook-scene",
        questionText: "What is one hour of your life worth?",
        phaseTimes: {
          textEnd: 10,
          mapStart: 10,
          mapEnd: 11,
          whitecollarStart: 11,
          whitecollarEnd: 12,
          factoryStart: 12,
        },
      }}
      brandColor="#E88CA5"
      fontFamily="Inter, sans-serif"
    />
  </AbsoluteFill>
);

export default HookSceneShowcase;
