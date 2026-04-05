import React from "react";
import { AbsoluteFill } from "remotion";
import { HorseRaceChart } from "../../../../templates/data-charts/HorseRaceChart";

/**
 * HorseRaceChart — static snapshot with inline demo data.
 * Normally requires rupi-data.json, but here we provide minimal inline series.
 */
const HorseRaceChartShowcase: React.FC = () => (
  <AbsoluteFill>
    <HorseRaceChart
      series={[
        {
          id: "eggs",
          label: "Eggs",
          color: "#E88CA5",
          data: [
            { date: "2000-01-01", ratio: 1.0 },
            { date: "2005-01-01", ratio: 1.1 },
            { date: "2010-01-01", ratio: 1.3 },
            { date: "2015-01-01", ratio: 1.2 },
            { date: "2020-01-01", ratio: 1.6 },
            { date: "2025-01-01", ratio: 2.8 },
          ],
        },
        {
          id: "milk",
          label: "Milk",
          color: "#7BA7C9",
          data: [
            { date: "2000-01-01", ratio: 1.0 },
            { date: "2005-01-01", ratio: 1.05 },
            { date: "2010-01-01", ratio: 1.08 },
            { date: "2015-01-01", ratio: 0.95 },
            { date: "2020-01-01", ratio: 0.9 },
            { date: "2025-01-01", ratio: 0.85 },
          ],
        },
        {
          id: "chips",
          label: "Chips",
          color: "#5BBF8C",
          data: [
            { date: "2000-01-01", ratio: 1.0 },
            { date: "2005-01-01", ratio: 0.98 },
            { date: "2010-01-01", ratio: 0.95 },
            { date: "2015-01-01", ratio: 0.88 },
            { date: "2020-01-01", ratio: 0.82 },
            { date: "2025-01-01", ratio: 0.75 },
          ],
        },
      ]}
      cameraKeyframes={[]}
      annotations={[
        { year: 2008, text: "Financial Crisis", style: "crisis-flash" },
        { year: 2020, text: "COVID-19 Pandemic", style: "major-crisis-flash" },
      ]}
      timeRange={{ start: 2000, end: 2025 }}
      sceneYearRanges={[
        { sceneStartSec: 0, sceneEndSec: 10, yearStart: 2000, yearEnd: 2025 },
      ]}
      backgroundColor="#2A2A32"
      brandColor="#E88CA5"
      fontFamily="Inter, sans-serif"
      yAxisLabel="Price/Wage Ratio"
    />
  </AbsoluteFill>
);

export default HorseRaceChartShowcase;
