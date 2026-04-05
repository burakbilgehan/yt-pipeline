import React from "react";
import { AbsoluteFill } from "remotion";
import { BarChart } from "../../../../templates/data-charts/BarChart";

const BarChartShowcase: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#1a1a2e" }}>
    <BarChart
      chart={{
        type: "bar-chart",
        title: "Top Programming Languages 2025",
        items: [
          { label: "Python", value: 28 },
          { label: "JavaScript", value: 22 },
          { label: "TypeScript", value: 18 },
          { label: "Go", value: 12 },
          { label: "Rust", value: 8 },
        ],
        unit: "%",
      }}
      brandColor="#6C63FF"
      fontFamily="Inter, sans-serif"
    />
  </AbsoluteFill>
);

export default BarChartShowcase;
