import React from "react";
import { AbsoluteFill } from "remotion";
import { ClosingScene } from "../../../../templates/data-charts/ClosingScene";

/**
 * ClosingScene has 3 phases: chart → video → end screen.
 * Showcase skips video phase by making it zero-length, shows chart then end card.
 * Total 300 frames = 10 sec: chart 0-7s, endScreen 7-10s.
 */
const ClosingSceneShowcase: React.FC = () => (
  <AbsoluteFill>
    <ClosingScene
      chart={{
        type: "closing-scene",
        chartEndSec: 7,
        videoStartSec: 7,
        videoEndSec: 7,
        endScreenStartSec: 7,
        chartConfig: {
          title: "Final Overview",
          points: [
            { label: "NOR", x: 26, y: 40, quadrant: "dream" },
            { label: "USA", x: 38, y: 42, quadrant: "grind" },
            { label: "MEX", x: 42, y: 8, quadrant: "trap" },
          ],
          xAxis: { label: "Hours", min: 20, max: 48, origin: 33 },
          yAxis: { label: "$/hour", min: 0, max: 50, origin: 25 },
          skipEntrance: true,
        },
      } as any}
      brandColor="#E88CA5"
      fontFamily="Inter, sans-serif"
    />
  </AbsoluteFill>
);

export default ClosingSceneShowcase;
