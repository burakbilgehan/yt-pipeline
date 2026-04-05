import React from "react";
import { AbsoluteFill } from "remotion";
import { HorizontalBarChart } from "../../../../templates/data-charts/HorizontalBarChart";

const HorizontalBarChartShowcase: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#2A2A32" }}>
    <HorizontalBarChart
      chart={{
        type: "horizontal-bar-chart",
        title: "Average Annual Salary by Country (USD)",
        bars: [
          { label: "Switzerland", code: "CHE", value: 94447, displayValue: "$94,447" },
          { label: "United States", code: "USA", value: 77463, displayValue: "$77,463" },
          { label: "Germany", code: "DEU", value: 58940, displayValue: "$58,940" },
          { label: "Japan", code: "JPN", value: 41509, displayValue: "$41,509" },
          { label: "South Korea", code: "KOR", value: 48922, displayValue: "$48,922" },
          { label: "Mexico", code: "MEX", value: 16685, displayValue: "$16,685" },
        ],
        gradientColors: { highest: "#5BBF8C", lowest: "#E06070" },
      }}
      brandColor="#7BA7C9"
      fontFamily="Inter, sans-serif"
    />
  </AbsoluteFill>
);

export default HorizontalBarChartShowcase;
