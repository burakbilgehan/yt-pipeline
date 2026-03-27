import React from "react";
import type { DataChartInput } from "../../schemas";
import type { HorseRaceChartProps } from "../../types";
import { TEXT } from "../../palette";
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
import { DeflatorSummaryGrid } from "./DeflatorSummaryGrid";
import { MetricScene } from "./MetricScene";
import { ShrinkflationHook } from "./ShrinkflationHook";
import { HookPunchline } from "./HookPunchline";
import { ShrinkflationCards } from "./ShrinkflationCards";
import { SkimpflationCard } from "./SkimpflationCard";
import { LensSwitchPivot } from "./LensSwitchPivot";
import { ClosingSequence } from "./ClosingSequence";
import { BaselineReference } from "./BaselineReference";
import { BLSShrinkExplainer } from "./BLSShrinkExplainer";
import { HorseRaceChart } from "./HorseRaceChart";

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

    case "metric-scene":
      return (
        <MetricScene chart={chart as any} brandColor={brandColor} fontFamily={fontFamily} />
      );

    case "deflator-summary-grid":
      return (
        <DeflatorSummaryGrid chart={chart as any} brandColor={brandColor} fontFamily={fontFamily} />
      );

    case "shrinkflation-hook":
      return (
        <ShrinkflationHook chart={chart as any} brandColor={brandColor} fontFamily={fontFamily} />
      );

    case "hook-punchline":
      return (
        <HookPunchline chart={chart as any} brandColor={brandColor} fontFamily={fontFamily} />
      );

    case "shrinkflation-cards":
      return (
        <ShrinkflationCards chart={chart as any} brandColor={brandColor} fontFamily={fontFamily} />
      );

    case "skimpflation-card":
      return (
        <SkimpflationCard chart={chart as any} brandColor={brandColor} fontFamily={fontFamily} />
      );

    case "lens-switch-pivot":
      return (
        <LensSwitchPivot chart={chart as any} brandColor={brandColor} fontFamily={fontFamily} />
      );

    case "closing-sequence":
      return (
        <ClosingSequence chart={chart as any} brandColor={brandColor} fontFamily={fontFamily} />
      );

    case "baseline-reference":
      return (
        <BaselineReference chart={chart as any} brandColor={brandColor} fontFamily={fontFamily} />
      );

    case "bls-shrink-explainer":
      return (
        <BLSShrinkExplainer chart={chart as any} brandColor={brandColor} fontFamily={fontFamily} />
      );

    case "horse-race": {
      // Extract HorseRaceChartProps from the chart object.
      // These fields are injected by Root.tsx after bridgeAllScenes().
      const hrChart = chart as DataChartInput & Partial<HorseRaceChartProps>;
      const hrProps: HorseRaceChartProps = {
        series: hrChart.series || [],
        cameraKeyframes: hrChart.cameraKeyframes || [{ year: 2000, zoom: 1.0, speed: 1.0 }],
        annotations: hrChart.annotations || [],
        timeRange: hrChart.timeRange || { start: 2000, end: 2025 },
        sceneYearRanges: hrChart.sceneYearRanges,
        backgroundColor: hrChart.backgroundColor || "transparent",
        brandColor: brandColor,
        fontFamily: fontFamily,
        logScale: hrChart.logScale,
        yAxisLabel: hrChart.yAxisLabel,
      };
      // If no series data yet (not injected), render a placeholder
      if (hrProps.series.length === 0) {
        return (
          <div style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: TEXT,
            fontFamily,
            fontSize: 24,
            opacity: 0.5,
          }}>
            Horse Race Chart — awaiting data
          </div>
        );
      }
      return <HorseRaceChart {...hrProps} />;
    }

    default:
      return null;
  }
};
