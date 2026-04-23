import React from "react";
import { AbsoluteFill } from "remotion";
import { ProgressRing } from "../../../../templates/data-charts/ProgressRing";

const ProgressRingShowcase: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#1a1a2e" }}>
    <ProgressRing
      chart={{
        type: "progress",
        title: "COMPLETION RATE",
        counterValue: 73,
        counterSuffix: "%",
      }}
      brandColor="#6C63FF"
      fontFamily="Montserrat, sans-serif"
    />
  </AbsoluteFill>
);

export default ProgressRingShowcase;
