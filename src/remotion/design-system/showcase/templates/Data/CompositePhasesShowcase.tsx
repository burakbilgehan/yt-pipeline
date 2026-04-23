import React from "react";
import { AbsoluteFill } from "remotion";
import { CompositePhases } from "../../../../templates/data-charts/CompositePhases";

/**
 * Requires storyboard context — simplified demo.
 * Shows 3 phases: TitleCard → SplitComparison → HorizontalBarChart
 */
const CompositePhasesShowcase: React.FC = () => (
  <AbsoluteFill>
    <CompositePhases
      chart={{
        type: "composite-phases",
        phases: [
          {
            type: "title-card",
            durationSec: 3,
            title: "Phase 1: Introduction",
            subtitle: "Setting the stage",
          },
          {
            type: "title-card",
            durationSec: 3,
            title: "Phase 2: Deep Dive",
            subtitle: "Exploring the data",
          },
          {
            type: "title-card",
            durationSec: 4,
            title: "Phase 3: Conclusion",
            subtitle: "Key takeaways",
          },
        ],
      } as any}
      brandColor="#E88CA5"
      fontFamily="Montserrat, sans-serif"
    />
  </AbsoluteFill>
);

export default CompositePhasesShowcase;
