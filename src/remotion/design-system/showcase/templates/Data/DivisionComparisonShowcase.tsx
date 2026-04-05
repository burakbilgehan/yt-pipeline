import React from "react";
import { AbsoluteFill } from "remotion";
import { DivisionComparison } from "../../../../templates/data-charts/DivisionComparison";

const DivisionComparisonShowcase: React.FC = () => (
  <AbsoluteFill>
    <DivisionComparison
      chart={{
        type: "division-comparison",
        title: "Hourly Rate Comparison",
        source: "OECD 2023",
        left: {
          flag: "PT",
          label: "Portugal",
          wage: 32000,
          hours: 1780,
          result: 18.0,
          resultColor: "#7BA7C9",
        },
        right: {
          flag: "HU",
          label: "Hungary",
          wage: 28000,
          hours: 1870,
          result: 15.0,
          resultColor: "#E06070",
        },
        operator: "÷",
        conclusion: "Portugal earns $3/hr more despite similar GDP",
      } as any}
      brandColor="#E88CA5"
      fontFamily="Inter, sans-serif"
    />
  </AbsoluteFill>
);

export default DivisionComparisonShowcase;
