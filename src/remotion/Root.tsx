import React from "react";
import { Composition, staticFile } from "remotion";
import { videoCompositionSchema, dataChartCompositionSchema, shortsCompositionSchema, horseRaceCompositionSchema, thumbnailCompositionSchema } from "./schemas";
import { customVideoCompositionSchema } from "./compositions/CustomVideoComposition";
import { ensureFontsLoaded } from "../fonts/load-fonts";
import { bridgeAllScenes } from "../utils/storyboard-bridge";
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
 * Bridge storyboard backgroundMusic format to BackgroundMusicConfig.
 * Storyboard uses: { tracks: [{ file, duration }], volume, crossfadeDuration }
 * BackgroundMusicLayer expects: { tracks: [{ src, durationSec }], volume, crossfadeSec }
 *
 * bgmPrefix: path prefix for BGM files (e.g. "bgm/")
 */
function bridgeBackgroundMusic(raw: any, bgmPrefix: string): any | undefined {
  if (!raw || !raw.tracks || raw.tracks.length === 0) return undefined;
  return {
    tracks: raw.tracks.map((t: any) => ({
      src: `${bgmPrefix}${t.file || t.src}`,
      durationSec: t.duration ?? t.durationSec ?? 120,
    })),
    volume: raw.volume ?? 0.08,
    crossfadeSec: raw.crossfadeDuration ?? raw.crossfadeSec ?? 3,
    fadeInSec: raw.fadeInSec ?? 3,
    fadeOutSec: raw.fadeOutSec ?? 4,
  };
}

/**
 * Try to load storyboard + audio from publicDir (served as static files).
 * Returns resolved props for MainVideo if successful, null otherwise.
 *
 * Uses project-manifest.json in publicDir root to discover paths.
 * If no manifest exists, tries convention-based discovery from publicDir root:
 *   storyboard/ — storyboard skeleton & scene files
 *   production/audio/ — audio manifest & WAV files
 *   bgm/ — background music tracks
 */
async function tryLoadProjectProps(): Promise<z.infer<typeof videoCompositionSchema> | null> {
  try {
    // Try to load project-manifest.json first (preferred)
    let manifest: any = null;
    try {
      const mRes = await fetch(staticFile("project-manifest.json"));
      if (mRes.ok) manifest = await mRes.json();
    } catch { /* no manifest — use convention-based discovery */ }

    const storyboardPrefix = manifest?.storyboardPrefix || "storyboard";
    const audioPrefix = manifest?.audioPrefix || "production/audio";
    const bgmPrefix = manifest?.bgmPrefix || "bgm/";
    const brandColor = manifest?.brandColor || "#6C63FF";
    const fontFamily = manifest?.fontFamily || "Inter, sans-serif";

    // Try to fetch storyboard skeleton — try latest versions first
    let storyboard: any = null;
    for (const version of ["storyboard-v5.json", "storyboard-v4.json", "storyboard-v3.json", "storyboard-v2.json", "storyboard-v1.json"]) {
      try {
        const storyboardRes = await fetch(staticFile(`${storyboardPrefix}/${version}`));
        if (storyboardRes.ok) {
          storyboard = await storyboardRes.json();
          break;
        }
      } catch { /* try next version */ }
    }
    if (!storyboard?.scenes || storyboard.scenes.length === 0) return null;

    // Resolve scene detail files
    const resolvedScenes: any[] = [];
    for (const scene of storyboard.scenes) {
      if (scene.sceneFile) {
        try {
          const detailRes = await fetch(staticFile(`${storyboardPrefix}/${scene.sceneFile}`));
          if (detailRes.ok) {
            const detail: any = await detailRes.json();
            resolvedScenes.push({
              ...detail,
              id: scene.id,
              section: scene.section,
              startTime: scene.startTime,
              endTime: scene.endTime,
              voiceover: scene.voiceover,
              transition: scene.transition ?? detail.transition ?? "cut",
            });
            continue;
          }
        } catch { /* fall through to skeleton */ }
      }
      resolvedScenes.push(scene);
    }

    // Apply dataVisualization → dataChart bridge
    bridgeAllScenes(resolvedScenes);

    // Try to load audio manifest for timing
    const audioSegments: Array<{ src: string; startTime: number }> = [];
    try {
      const manifestRes = await fetch(staticFile(`${audioPrefix}/audio-manifest.json`));
      if (manifestRes.ok) {
        const audioManifest: any = await manifestRes.json();
        for (const block of audioManifest.blocks) {
          audioSegments.push({
            src: `${audioPrefix}/${block.file}`,
            startTime: block.startTime ?? 0,
          });
        }
      }
    } catch { /* no audio — that's fine for visual preview */ }

    const lastScene = resolvedScenes[resolvedScenes.length - 1];
    const totalDuration = lastScene.endTime || storyboard.totalDuration || 60;

    return {
      title: storyboard.title || "Preview",
      scenes: resolvedScenes,
      audioFiles: [],
      audioSegments,
      backgroundMusic: bridgeBackgroundMusic(storyboard.backgroundMusic, bgmPrefix),
      showSubtitles: false,
      showProgressBar: true,
      brandColor,
      fontFamily,
    };
  } catch {
    return null;
  }
}

/**
 * Root component that registers all Remotion compositions.
 *
 * All compositions are GENERIC — no project-specific data lives here.
 * Project data is loaded at runtime via:
 *   1. --public-dir pointing to a project's asset directory
 *   2. project-manifest.json in publicDir root (optional, for path overrides)
 *   3. --props pointing to a video-config.json (for CustomVideo)
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
        calculateMetadata={async ({ props }) => {
          await ensureFontsLoaded(props.fontFamily);
          // Try to load real project data from publicDir (for Studio preview)
          const projectProps = await tryLoadProjectProps();
          if (projectProps) {
            await ensureFontsLoaded(projectProps.fontFamily);
            const lastScene = projectProps.scenes[projectProps.scenes.length - 1];
            const totalDurationSec = lastScene?.endTime || 60;
            return {
              props: projectProps,
              durationInFrames: Math.ceil(totalDurationSec * FPS),
            };
          }
          return {};
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
        calculateMetadata={async ({ props }) => {
          await ensureFontsLoaded(props.fontFamily);
          return {};
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
        calculateMetadata={async ({ props }) => {
          await ensureFontsLoaded(props.fontFamily);
          return {};
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
        calculateMetadata={async ({ props }) => {
          await ensureFontsLoaded(props.fontFamily);
          return {};
        }}
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
          // Load fonts before rendering
          await ensureFontsLoaded(props.videoConfig?.fontFamily);
          const duration = props.videoConfig?.durationSeconds;
          if (duration && typeof duration === "number") {
            return { durationInFrames: Math.ceil(duration * FPS) };
          }
          return {};
        }}
      />

      {/* Thumbnail — 1280x720 static image for YouTube thumbnails */}
      <Composition
        id="Thumbnail"
        lazyComponent={() => import("./compositions/ThumbnailComposition")}
        schema={thumbnailCompositionSchema}
        durationInFrames={1}
        fps={FPS}
        width={1280}
        height={720}
        defaultProps={{
          variant: "A" as const,
          beforeNumber: "100%",
          afterNumber: "50%",
          topLabel: "BEFORE",
          bottomLabel: "AFTER",
          cornerLabel: "DATA STORY",
          cornerPosition: "bottom-left" as const,
        }}
      />
    </>
  );
};
