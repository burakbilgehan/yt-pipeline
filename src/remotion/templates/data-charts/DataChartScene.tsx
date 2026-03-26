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
import { QuadrantScatter } from "./QuadrantScatter";
import { SalaryShuffleScene } from "./SalaryShuffleScene";
import { RankingResortScene } from "./RankingResortScene";
import { CalendarGrid } from "./CalendarGrid";
import { DivisionComparison } from "./DivisionComparison";
import { EndCardScene } from "./EndCardScene";
import { HookScene } from "./HookScene";
import { HorizontalBarChart } from "./HorizontalBarChart";
import { SplitComparison } from "./SplitComparison";
import { TitleCard } from "./TitleCard";
import { CompositePhases } from "./CompositePhases";
import { ClosingScene } from "./ClosingScene";

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

    case "quadrant-scatter":
      return (
        <QuadrantScatter chart={chart} brandColor={brandColor} fontFamily={fontFamily} />
      );

    case "salary-shuffle":
      return (
        <SalaryShuffleScene chart={chart} brandColor={brandColor} fontFamily={fontFamily} />
      );

    case "ranking-resort":
      return (
        <RankingResortScene chart={chart} brandColor={brandColor} fontFamily={fontFamily} />
      );

    case "calendar-grid":
      return (
        <CalendarGrid chart={chart} brandColor={brandColor} fontFamily={fontFamily} />
      );

    case "division-comparison":
      return (
        <DivisionComparison chart={chart} brandColor={brandColor} fontFamily={fontFamily} />
      );

    case "end-card":
      return (
        <EndCardScene chart={chart} brandColor={brandColor} fontFamily={fontFamily} />
      );

    case "hook-scene":
      return (
        <HookScene chart={chart} brandColor={brandColor} fontFamily={fontFamily} />
      );

    case "horizontal-bar-chart":
      return (
        <HorizontalBarChart chart={chart} brandColor={brandColor} fontFamily={fontFamily} />
      );

    case "split-comparison":
      return (
        <SplitComparison chart={chart} brandColor={brandColor} fontFamily={fontFamily} />
      );

    case "title-card":
      return (
        <TitleCard chart={chart} brandColor={brandColor} fontFamily={fontFamily} />
      );

    case "composite-phases":
      return (
        <CompositePhases chart={chart} brandColor={brandColor} fontFamily={fontFamily} />
      );

    case "closing-scene":
      return (
        <ClosingScene chart={chart} brandColor={brandColor} fontFamily={fontFamily} />
      );

    case "horse-race":
      // HorseRaceChart has its own composition with specialized props.
      // Use the HorseRacePreview composition directly in Root.tsx.
      return null;

    default:
      return null;
  }
};
