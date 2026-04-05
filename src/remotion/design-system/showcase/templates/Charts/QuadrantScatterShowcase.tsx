import React from "react";
import { AbsoluteFill } from "remotion";
import { QuadrantScatter } from "../../../../templates/data-charts/QuadrantScatter";

/** Simplified QuadrantScatter with 8 demo data points */
const QuadrantScatterShowcase: React.FC = () => (
  <AbsoluteFill>
    <QuadrantScatter
      chart={{
        type: "quadrant-scatter",
        title: "Work-Life Balance Index",
        subtitle: "Hours worked vs. hourly compensation",
        points: [
          { label: "NOR", x: 26, y: 40, quadrant: "dream" as const },
          { label: "DEU", x: 28, y: 35, quadrant: "dream" as const },
          { label: "USA", x: 38, y: 42, quadrant: "grind" as const },
          { label: "KOR", x: 40, y: 22, quadrant: "grind" as const },
          { label: "FRA", x: 25, y: 28, quadrant: "chill" as const },
          { label: "GRC", x: 35, y: 18, quadrant: "trap" as const },
          { label: "MEX", x: 42, y: 8, quadrant: "trap" as const },
          { label: "JPN", x: 36, y: 25, quadrant: "grind" as const },
        ],
        xAxis: { label: "Hours / week", min: 20, max: 48, origin: 33 },
        yAxis: { label: "$/hour (PPP)", min: 0, max: 50, origin: 25 },
        quadrantLabels: { topLeft: "DREAM", topRight: "GRIND", bottomLeft: "CHILL", bottomRight: "TRAP" },
        spotlights: ["NOR", "MEX"],
        skipEntrance: false,
      } as any}
      brandColor="#E88CA5"
      fontFamily="Inter, sans-serif"
    />
  </AbsoluteFill>
);

export default QuadrantScatterShowcase;
