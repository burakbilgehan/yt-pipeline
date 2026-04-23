import React from "react";
import { AbsoluteFill } from "remotion";
import { ComparisonTable } from "../../../../templates/data-charts/ComparisonTable";

/** Duel (butterfly chart) mode */
const ComparisonTableDuelShowcase: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#1a1a2e" }}>
    <ComparisonTable
      chart={{
        type: "comparison",
        title: "Country Comparison",
        duel: { left: "Germany", right: "Japan" },
        items: [
          { label: "GDP per capita", value: 51200, color: "#E88CA5" },
          { label: "GDP per capita", value: 34000, color: "#7BA7C9" },
          { label: "Work hours/yr", value: 1340, color: "#E88CA5" },
          { label: "Work hours/yr", value: 1607, color: "#7BA7C9" },
          { label: "Hourly rate", value: 38, color: "#E88CA5" },
          { label: "Hourly rate", value: 21, color: "#7BA7C9" },
        ],
      }}
      brandColor="#E88CA5"
      fontFamily="Montserrat, sans-serif"
    />
  </AbsoluteFill>
);

export default ComparisonTableDuelShowcase;
