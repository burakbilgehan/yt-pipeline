import React from "react";
import { AbsoluteFill } from "remotion";
import { SalaryShuffleScene } from "../../../../templates/data-charts/SalaryShuffleScene";

const SalaryShuffleSceneShowcase: React.FC = () => (
  <AbsoluteFill>
    <SalaryShuffleScene
      chart={{
        type: "salary-shuffle",
        title: "Annual Salary → Hourly Rate",
        countries: [
          { code: "CHE", label: "Switzerland", salary: 94447, hourlyRate: 56.5 },
          { code: "USA", label: "United States", salary: 77463, hourlyRate: 44.1 },
          { code: "AUS", label: "Australia", salary: 59408, hourlyRate: 38.2 },
          { code: "DEU", label: "Germany", salary: 58940, hourlyRate: 44.0 },
          { code: "JPN", label: "Japan", salary: 41509, hourlyRate: 25.8 },
          { code: "MEX", label: "Mexico", salary: 16685, hourlyRate: 7.8 },
        ],
        initialSort: "salary",
        resortTo: "hourlyRate",
        resortLabel: "Sorted by Hourly Rate",
        resortTriggerFrame: 90,
        source: "OECD 2023",
      } as any}
      brandColor="#E88CA5"
      fontFamily="Inter, sans-serif"
    />
  </AbsoluteFill>
);

export default SalaryShuffleSceneShowcase;
