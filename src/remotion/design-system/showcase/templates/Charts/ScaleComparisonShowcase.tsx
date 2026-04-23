import React from "react";
import { AbsoluteFill } from "remotion";
import { ScaleComparison } from "../../../../templates/data-charts/ScaleComparison";

const ScaleComparisonShowcase: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#1a1a2e" }}>
    <ScaleComparison
      chart={{
        type: "scale-comparison",
        title: "Planet Sizes (Earth = 1)",
        items: [
          { label: "Mercury", value: 0.38 },
          { label: "Earth", value: 1 },
          { label: "Jupiter", value: 11.2 },
          { label: "Sun", value: 109 },
        ],
      }}
      brandColor="#F9D423"
      fontFamily="Montserrat, sans-serif"
    />
  </AbsoluteFill>
);

export default ScaleComparisonShowcase;
