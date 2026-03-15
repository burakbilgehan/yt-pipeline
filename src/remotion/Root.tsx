import React from "react";
import { Composition } from "remotion";
import { videoCompositionSchema, dataChartCompositionSchema, shortsCompositionSchema } from "./schemas";

const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;

/**
 * Root component that registers all Remotion compositions.
 */
export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Main video composition - used for full video renders */}
      <Composition
        id="MainVideo"
        lazyComponent={() => import("./compositions/MainComposition")}
        schema={videoCompositionSchema}
        durationInFrames={FPS * 60}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{
          title: "Sample Video",
          scenes: [
            {
              id: "scene-1",
              section: "Introduction",
              startTime: 0,
              endTime: 5,
              voiceover: "Welcome to this video.",
              visual: {
                type: "text-overlay" as const,
                description: "Title card",
                textOverlay: "Sample Video Title",
              },
              transition: "fade" as const,
            },
          ],
          audioFiles: [],
          audioSegments: [],
          showSubtitles: true,
          showProgressBar: true,
          brandColor: "#6C63FF",
          fontFamily: "Inter, sans-serif",
        }}
      />

      {/* Data chart preview - for testing chart animations */}
      <Composition
        id="DataChartPreview"
        lazyComponent={() => import("./compositions/DataChartPreview")}
        schema={dataChartCompositionSchema}
        durationInFrames={90}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{
          chart: {
            type: "bar-chart" as const,
            title: "Sample Chart",
            items: [
              { label: "Item A", value: 100 },
              { label: "Item B", value: 75 },
              { label: "Item C", value: 50 },
            ],
            unit: "units",
          },
          durationInFrames: 90,
          brandColor: "#6C63FF",
          fontFamily: "Inter, sans-serif",
        }}
      />
      {/* Shorts video composition - 9:16 vertical format */}
      <Composition
        id="ShortsVideo"
        lazyComponent={() => import("./compositions/ShortsComposition")}
        schema={shortsCompositionSchema}
        durationInFrames={FPS * 60}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{
          title: "Sample Short",
          scenes: [
            {
              id: "scene-1",
              section: "Hook",
              startTime: 0,
              endTime: 5,
              voiceover: "Did you know?",
              visual: {
                type: "text-overlay" as const,
                description: "Title card",
                textOverlay: "Sample Short",
              },
              transition: "cut" as const,
            },
          ],
          audioFiles: [],
          audioSegments: [],
          showSubtitles: true,
          brandColor: "#6C63FF",
          fontFamily: "Inter, sans-serif",
        }}
      />
    </>
  );
};
