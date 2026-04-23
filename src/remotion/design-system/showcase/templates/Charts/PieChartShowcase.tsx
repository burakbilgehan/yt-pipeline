import React from "react";
import { AbsoluteFill } from "remotion";
import { PieChart } from "../../../../templates/data-charts/PieChart";

const PieChartShowcase: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#1a1a2e" }}>
    <PieChart
      chart={{
        type: "pie-chart",
        title: "World Energy Sources",
        items: [
          { label: "Oil", value: 31 },
          { label: "Coal", value: 27 },
          { label: "Natural Gas", value: 24 },
          { label: "Renewables", value: 13 },
          { label: "Nuclear", value: 5 },
        ],
      }}
      brandColor="#6C63FF"
      fontFamily="Montserrat, sans-serif"
    />
  </AbsoluteFill>
);

export default PieChartShowcase;
