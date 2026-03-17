import React from "react";
import type { DataChartInput } from "../../schemas";
import { BarChart } from "./BarChart";
import { Counter } from "./Counter";
import { ComparisonTable } from "./ComparisonTable";
import { PieChart } from "./PieChart";
import { LineChart } from "./LineChart";
import { TimelineChart } from "./TimelineChart";
import { ScaleComparison } from "./ScaleComparison";
import { ProgressRing } from "./ProgressRing";

interface DataChartSceneProps {
  chart: DataChartInput;
  brandColor: string;
  fontFamily: string;
}

/**
 * Routes to the correct chart component based on chart.type.
 */
export const DataChartScene: React.FC<DataChartSceneProps> = ({
  chart,
  brandColor,
  fontFamily,
}) => {
  switch (chart.type) {
    case "bar-chart":
      return (
        <BarChart chart={chart} brandColor={brandColor} fontFamily={fontFamily} />
      );

    case "counter":
      return (
        <Counter chart={chart} brandColor={brandColor} fontFamily={fontFamily} />
      );

    case "comparison":
      return (
        <ComparisonTable
          chart={chart}
          brandColor={brandColor}
          fontFamily={fontFamily}
        />
      );

    case "pie-chart":
      return (
        <PieChart chart={chart} brandColor={brandColor} fontFamily={fontFamily} />
      );

    case "line-chart":
      return (
        <LineChart chart={chart} brandColor={brandColor} fontFamily={fontFamily} />
      );

    case "timeline":
      return (
        <TimelineChart chart={chart} brandColor={brandColor} fontFamily={fontFamily} />
      );

    case "scale-comparison":
      return (
        <ScaleComparison chart={chart} brandColor={brandColor} fontFamily={fontFamily} />
      );

    case "progress":
      return (
        <ProgressRing chart={chart} brandColor={brandColor} fontFamily={fontFamily} />
      );

    case "horse-race":
      // HorseRaceChart has its own composition with specialized props.
      // Use the HorseRacePreview composition directly in Root.tsx.
      return null;

    default:
      return null;
  }
};
