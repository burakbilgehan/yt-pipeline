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
import { EndCardScene } from "./EndCardScene";
import { HookScene } from "./HookScene";
import { HorizontalBarChart } from "./HorizontalBarChart";
import { SplitComparison } from "./SplitComparison";
import { TitleCard } from "./TitleCard";
import { CompositePhases } from "./CompositePhases";
import { ClosingScene } from "./ClosingScene";
import { ClosingSequence } from "./ClosingSequence";
import { DeflatorSummaryGrid } from "./DeflatorSummaryGrid";
import { MetricScene } from "./MetricScene";
import { HookPunchline } from "./HookPunchline";
import { HorseRaceChart } from "./HorseRaceChart";
import { VerticalTabScene } from "../voiceover-visuals/VerticalTabScene";
import { WorldMapScene } from "./WorldMapScene";
import { HookReveal } from "../voiceover-visuals/HookReveal";
import { LocationMapScene } from "../voiceover-visuals/LocationMapScene";
import { Scoreboard } from "../voiceover-visuals/Scoreboard";
import { ClosingCTA } from "../voiceover-visuals/ClosingCTA";

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

    case "hook-punchline":
      return (
        <HookPunchline chart={chart as any} brandColor={brandColor} fontFamily={fontFamily} />
      );

    case "closing-sequence":
      return (
        <ClosingSequence chart={chart as any} brandColor={brandColor} fontFamily={fontFamily} />
      );

    case "vertical-tabs":
      return (
        <VerticalTabScene chart={chart as any} brandColor={brandColor} fontFamily={fontFamily} />
      );

    case "world-map-scene": {
      // Adapt scene dataChart → WorldMapScene config prop
      const c = chart as any;
      const wmConfig = {
        type: "world-map" as const,
        region: c.region || "world",
        zoom: c.zoom || 1,
        center: c.center || [30, 20] as [number, number],
        highlights: c.highlights,
        highlightColor: c.highlightColor,
        chokepoints: c.markers?.map((m: any) => ({
          name: m.label || m.id,
          lon: m.lng ?? m.lon,
          lat: m.lat,
          color: m.color || brandColor,
          pulse: m.status !== "blocked",
        })),
        annotations: c.annotations,
        title: c.title,
        subtitle: c.subtitle,
        statusIndicator: c.statusIndicator,
      };
      return <WorldMapScene config={wmConfig as any} brandColor={brandColor} fontFamily={fontFamily} />;
    }

    case "hook-reveal": {
      const c = chart as any;
      return (
        <HookReveal
          bigNumber={c.bigNumber || ""}
          smallNumber={c.smallNumber || ""}
          subtitle={c.subtitle}
          contextLine={c.contextLine}
          variant={c.variant}
        />
      );
    }

    case "location-map":
      return (
        <LocationMapScene chart={chart as any} brandColor={brandColor} fontFamily={fontFamily} />
      );

    case "scoreboard": {
      const c = chart as any;
      return (
        <Scoreboard
          title={c.title}
          items={c.items || []}
          footerText={c.footerText}
          fontFamily={fontFamily}
          showBars={c.showBars !== false}
        />
      );
    }

    case "closing-cta": {
      const c = chart as any;
      return (
        <ClosingCTA
          message={c.message}
          channelName={c.channelName}
          ctaText={c.ctaText}
          accentColor={brandColor}
          fontFamily={fontFamily}
          showEndScreen={c.showEndScreen}
        />
      );
    }

    case "horse-race": {
      // Extract HorseRaceChartProps from the chart object.
      // These fields are injected by Root.tsx after bridgeAllScenes().
      const hrChart = chart as DataChartInput & Partial<HorseRaceChartProps>;
      // Build deflator label from yAxisLabel or deflator field
      const deflatorLabel = hrChart.yAxisLabel || (hrChart as any).deflator || undefined;

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
        deflatorLabel,
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
