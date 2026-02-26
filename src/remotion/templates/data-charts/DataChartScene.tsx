import React from "react";
import type { DataChartInput } from "../../schemas";
import { BarChart } from "./BarChart";
import { Counter } from "./Counter";
import { ComparisonTable } from "./ComparisonTable";

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

    case "line-chart":
    case "pie-chart":
      // Not yet implemented - show placeholder
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.85)",
            borderRadius: 20,
            color: "#FFFFFF",
            fontFamily,
            fontSize: 28,
          }}
        >
          {chart.type} coming soon
        </div>
      );

    default:
      return null;
  }
};
