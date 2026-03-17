import React from "react";
import { Composition, staticFile } from "remotion";
import { videoCompositionSchema, dataChartCompositionSchema, shortsCompositionSchema, horseRaceCompositionSchema } from "./schemas";
import { customVideoCompositionSchema } from "./compositions/CustomVideoComposition";
import type { z } from "zod";

const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;

// Minimal fallback props for HorseRacePreview (used before calculateMetadata loads real data)
const horseRaceFallbackProps: z.infer<typeof horseRaceCompositionSchema> = {
  series: [],
  cameraKeyframes: [{ year: 1925, zoom: 1.0, speed: 1.0 }],
  annotations: [],
  timeRange: { start: 1925, end: 2025 },
  backgroundColor: "#0a0a0a",
  brandColor: "#FFD700",
  fontFamily: "Inter, sans-serif",
};

/**
 * Root component that registers all Remotion compositions.
 *
 * NOTE: Project-specific compositions are NOT registered here.
 * Instead, use the generic "CustomVideo" composition with --props
 * pointing to a video-config.json in the project directory.
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

      {/* Horse Race chart preview — loads real data via calculateMetadata */}
      <Composition
        id="HorseRacePreview"
        lazyComponent={() => import("./compositions/HorseRacePreview")}
        schema={horseRaceCompositionSchema}
        durationInFrames={FPS * 120}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={horseRaceFallbackProps}
      />

      {/*
        Custom Video — Generic data-driven composition.
        Usage: npx remotion render CustomVideo --props=<path-to-video-props.json>
        The props JSON should contain: { videoConfig, horseRace? }
        Use a build script to produce this props file from video-config.json + horse-race-props.json
      */}
      <Composition
        id="CustomVideo"
        lazyComponent={() => import("./compositions/CustomVideoComposition")}
        schema={customVideoCompositionSchema}
        durationInFrames={FPS * 60}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{
          videoConfig: {
            title: "Untitled",
            durationSeconds: 60,
            backgroundColor: "#0a0a0a",
            brandColor: "#6C63FF",
            fontFamily: "Inter, sans-serif",
            showSubtitles: true,
            scenes: [],
            audioSegments: [],
          },
        }}
        calculateMetadata={async ({ props }) => {
          const duration = props.videoConfig?.durationSeconds;
          if (duration && typeof duration === "number") {
            return { durationInFrames: Math.ceil(duration * FPS) };
          }
          return {};
        }}
      />
    </>
  );
};
