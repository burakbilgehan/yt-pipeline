import React from "react";
import { AbsoluteFill } from "remotion";
import { LineChart } from "../../../../templates/data-charts/LineChart";

const LineChartShowcase: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#1a1a2e" }}>
    <LineChart
      chart={{
        type: "line-chart",
        title: "Global Average Temperature Anomaly (°C)",
        items: [
          { label: "2015", value: 0.87 },
          { label: "2016", value: 1.01 },
          { label: "2017", value: 0.92 },
          { label: "2018", value: 0.83 },
          { label: "2019", value: 0.98 },
          { label: "2020", value: 1.02 },
          { label: "2021", value: 0.84 },
          { label: "2022", value: 0.89 },
          { label: "2023", value: 1.17 },
          { label: "2024", value: 1.29 },
        ],
        unit: "°C",
      }}
      brandColor="#FF6584"
      fontFamily="Inter, sans-serif"
    />
  </AbsoluteFill>
);

export default LineChartShowcase;
