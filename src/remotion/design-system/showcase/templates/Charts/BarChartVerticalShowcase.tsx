import React from "react";
import { AbsoluteFill } from "remotion";
import { BarChart } from "../../../../templates/data-charts/BarChart";

const BarChartVerticalShowcase: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#1a1a2e" }}>
    <BarChart
      chart={{
        type: "bar-chart",
        title: "Quarterly Revenue ($M)",
        orientation: "vertical",
        items: [
          { label: "Q1", value: 42, color: "#6C63FF" },
          { label: "Q2", value: 58, color: "#43E97B" },
          { label: "Q3", value: 35, color: "#FF6584" },
          { label: "Q4", value: 71, color: "#F9D423" },
        ],
        unit: "$",
      }}
      brandColor="#6C63FF"
      fontFamily="Inter, sans-serif"
    />
  </AbsoluteFill>
);

export default BarChartVerticalShowcase;
