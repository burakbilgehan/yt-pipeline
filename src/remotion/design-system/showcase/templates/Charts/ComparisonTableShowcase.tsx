import React from "react";
import { AbsoluteFill } from "remotion";
import { ComparisonTable } from "../../../../templates/data-charts/ComparisonTable";

/** Tug-of-War mode (2 items) */
const ComparisonTableShowcase: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#1a1a2e" }}>
    <ComparisonTable
      chart={{
        type: "comparison",
        title: "Market Share: iOS vs Android",
        items: [
          { label: "iOS", value: 27, color: "#6C63FF" },
          { label: "Android", value: 73, color: "#43E97B" },
        ],
        unit: "%",
      }}
      brandColor="#6C63FF"
      fontFamily="Inter, sans-serif"
    />
  </AbsoluteFill>
);

export default ComparisonTableShowcase;
