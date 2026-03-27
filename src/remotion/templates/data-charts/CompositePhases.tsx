import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  Sequence,
  AbsoluteFill,
  interpolate,
} from "remotion";
import { HorizontalBarChart } from "./HorizontalBarChart";
import { SplitComparison } from "./SplitComparison";
import { TitleCard } from "./TitleCard";
import { BG } from "../../palette";

/**
 * CompositePhases — Renders sequential phases within a single scene.
 *
 * Used for scene-003 (PPP Explanation):
 *   Phase 1: SplitComparison (grocery basket Zurich vs Mexico City) — 15s
 *   Phase 2: TitleCard ("Purchasing Power Parity") — 5s
 *   Phase 3: HorizontalBarChart (PPP-adjusted bars) — remaining time
 *
 * Each phase gets its own Sequence. Crossfade transitions between phases.
 * Phase durations from storyboard are treated as proportional hints,
 * scaled to the actual scene duration.
 */

interface PhaseData {
  type: string;
  durationSec: number;
  [key: string]: unknown;
}

interface CompositePhasesProps {
  chart: {
    type: string;
    phases?: PhaseData[];
    [key: string]: unknown;
  };
  brandColor: string;
  fontFamily: string;
}

const CROSSFADE_FRAMES = 15; // ~0.5s crossfade between phases

export const CompositePhases: React.FC<CompositePhasesProps> = ({
  chart,
  brandColor,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const phases = chart.phases || [];
  if (phases.length === 0) return null;

  // Calculate total storyboard duration to get proportions
  const totalStoryboardSec = phases.reduce((sum, p) => sum + (p.durationSec || 10), 0);

  // Map proportional durations to actual scene frame count
  let runningFrame = 0;
  const phaseLayouts = phases.map((phase, i) => {
    const proportion = (phase.durationSec || 10) / totalStoryboardSec;
    const frames = Math.round(proportion * durationInFrames);
    const layout = {
      phase,
      startFrame: runningFrame,
      durationFrames: frames,
    };
    runningFrame += frames;
    return layout;
  });

  // Render the correct component for each phase type
  const renderPhase = (phase: PhaseData) => {
    const phaseChart = { ...phase } as any;

    switch (phase.type) {
      case "split-comparison":
        return (
          <SplitComparison
            chart={phaseChart}
            brandColor={brandColor}
            fontFamily={fontFamily}
          />
        );
      case "title-card":
        return (
          <TitleCard
            chart={phaseChart}
            brandColor={brandColor}
            fontFamily={fontFamily}
          />
        );
      case "horizontal-bar-chart":
        return (
          <HorizontalBarChart
            chart={phaseChart}
            brandColor={brandColor}
            fontFamily={fontFamily}
          />
        );
      default:
        return null;
    }
  };

  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      {phaseLayouts.map((layout, index) => {
        // Crossfade: phase fades out in last CROSSFADE_FRAMES
        const phaseLocalFrame = frame - layout.startFrame;
        const isActive = phaseLocalFrame >= 0 && phaseLocalFrame < layout.durationFrames;
        const isNext = index < phaseLayouts.length - 1;

        // Fade out at end of phase (except last phase)
        let opacity = 1;
        if (isNext && phaseLocalFrame > layout.durationFrames - CROSSFADE_FRAMES) {
          opacity = interpolate(
            phaseLocalFrame,
            [layout.durationFrames - CROSSFADE_FRAMES, layout.durationFrames],
            [1, 0],
            { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
          );
        }
        // Fade in at start of phase (except first phase)
        if (index > 0 && phaseLocalFrame < CROSSFADE_FRAMES) {
          opacity = Math.min(
            opacity,
            interpolate(
              phaseLocalFrame,
              [0, CROSSFADE_FRAMES],
              [0, 1],
              { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
            )
          );
        }

        return (
          <Sequence
            key={index}
            from={layout.startFrame}
            durationInFrames={layout.durationFrames}
            name={`Phase ${index + 1}: ${layout.phase.type}`}
          >
            <AbsoluteFill style={{ opacity }}>
              {renderPhase(layout.phase)}
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
