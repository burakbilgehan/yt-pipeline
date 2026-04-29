import React from "react";
import { Composition, Folder, staticFile } from "remotion";
import "./styles.css";
import { videoCompositionSchema, dataChartCompositionSchema, shortsCompositionSchema, horseRaceCompositionSchema, thumbnailCompositionSchema, thumbnailOverlayCompositionSchema } from "./schemas";
import { customVideoCompositionSchema } from "./compositions/CustomVideoComposition";
import { ensureFontsLoaded } from "../fonts/load-fonts";
import { bridgeAllScenes } from "../utils/storyboard-bridge";
import { resolveHorseRaceScenes } from "../utils/horse-race-resolver";
import { BG, ACCENT_PINK } from "./palette";
import { START_PADDING_SEC, END_PADDING_SEC } from "./compositions/MainComposition";
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
  fontFamily: "Montserrat, sans-serif",
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
    const brandColor = manifest?.brandColor || ACCENT_PINK;
    const fontFamily = manifest?.fontFamily || "Montserrat, sans-serif";

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

    // ── Inject HorseRaceChart data into horse-race scenes ──
    try {
      const rupiRes = await fetch(staticFile("production/rupi-data.json"));
      if (rupiRes.ok) {
        const rupiData = await rupiRes.json();
        resolveHorseRaceScenes(resolvedScenes, rupiData);
      }
    } catch { /* no RUPI data — horse-race scenes show placeholder */ }

    // Try to load audio manifest for timing
    const audioSegments: Array<{ src: string; startTime: number }> = [];
    try {
      const manifestRes = await fetch(staticFile(`${audioPrefix}/audio-manifest.json`));
      if (manifestRes.ok) {
        const audioManifest: any = await manifestRes.json();
        for (const block of audioManifest.blocks) {
          // Use storyboard scene startTime for sync (audio manifest times may drift)
          const matchingScene = resolvedScenes.find((s: any) => s.id === block.id);
          audioSegments.push({
            src: `${audioPrefix}/${block.file}`,
            startTime: matchingScene?.startTime ?? block.startTime ?? 0,
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
          brandColor: ACCENT_PINK,
          fontFamily: "Montserrat, sans-serif",
        }}
        calculateMetadata={async ({ props }) => {
          await ensureFontsLoaded(props.fontFamily);
          // Try to load real project data from publicDir (for Studio preview)
          const projectProps = await tryLoadProjectProps();
          if (projectProps) {
            await ensureFontsLoaded(projectProps.fontFamily);
            const lastScene = projectProps.scenes[projectProps.scenes.length - 1];
            const contentDurationSec = lastScene?.endTime || 60;
            const totalDurationSec = START_PADDING_SEC + contentDurationSec + END_PADDING_SEC;
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
          brandColor: ACCENT_PINK,
          fontFamily: "Montserrat, sans-serif",
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
          brandColor: ACCENT_PINK,
          fontFamily: "Montserrat, sans-serif",
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
  backgroundColor: BG,
            brandColor: ACCENT_PINK,
            fontFamily: "Montserrat, sans-serif",
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

      {/* Thumbnail Overlay — overlay logo on existing thumbnail image */}
      <Composition
        id="ThumbnailOverlay"
        lazyComponent={() => import("./compositions/ThumbnailOverlayComposition")}
        schema={thumbnailOverlayCompositionSchema}
        durationInFrames={1}
        fps={FPS}
        width={1280}
        height={720}
        defaultProps={{
          baseImage: "thumbnail.png",
          logoImage: "logo.png",
          logoSize: 100,
          logoPadding: 20,
          logoPosition: "bottom-right" as const,
        }}
      />

      {/* ═══ Design System Showcases ═══ */}
      <Folder name="DS">
        <Composition
          id="LayerCombo-L2-L3-L4-L5"
          lazyComponent={() => import("./design-system/showcase/LayerComboShowcase")}
          durationInFrames={300}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />

        <Folder name="L2-Atmospheres">
          <Composition
            id="DotGrid-FilmGrain"
            lazyComponent={() => import("./design-system/showcase/AtmosphereShowcase")}
            durationInFrames={300}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
          <Composition
            id="RetroGrid-ShootingStars-BlurryBlob"
            lazyComponent={() => import("./design-system/showcase/AtmosphereShowcase2")}
            durationInFrames={300}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
        </Folder>

        <Folder name="L3-Motion">
          <Composition
            id="StaggerTextReveal-TextRotate"
            lazyComponent={() => import("./design-system/showcase/TextMotionShowcase")}
            durationInFrames={300}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
          <Composition
            id="ContainerTextFlip"
            lazyComponent={() => import("./design-system/showcase/ContainerTextFlipShowcase")}
            durationInFrames={300}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
          <Composition
            id="TiltCard"
            lazyComponent={() => import("./design-system/showcase/TiltCardShowcase")}
            durationInFrames={300}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
          <Composition
            id="TextShimmer"
            lazyComponent={() => import("./design-system/showcase/TextShimmerShowcase")}
            durationInFrames={300}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
          <Composition
            id="GlitchText"
            lazyComponent={() => import("./design-system/showcase/GlitchTextShowcase")}
            durationInFrames={300}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
          <Composition
            id="TypingText"
            lazyComponent={() => import("./design-system/showcase/TypingTextShowcase")}
            durationInFrames={300}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
        </Folder>

        <Folder name="L4-Surfaces">
          <Composition
            id="Glass-Flat-Glow"
            lazyComponent={() => import("./design-system/showcase/SurfaceShowcase")}
            durationInFrames={300}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
          <Composition
            id="NeonGradient-Backlight"
            lazyComponent={() => import("./design-system/showcase/SurfaceShowcase2")}
            durationInFrames={300}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
          <Composition
            id="FrostedPanel-Card"
            lazyComponent={() => import("./design-system/showcase/SurfaceShowcase3")}
            durationInFrames={300}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
        </Folder>
      </Folder>

      {/* ═══ Template Showcases ═══ */}
      <Folder name="Templates">
        <Folder name="Charts">
          <Composition
            id="BarChart"
            lazyComponent={() => import("./design-system/showcase/templates/Charts/BarChartShowcase")}
            durationInFrames={180}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
          <Composition
            id="BarChartVertical"
            lazyComponent={() => import("./design-system/showcase/templates/Charts/BarChartVerticalShowcase")}
            durationInFrames={180}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
          <Composition
            id="LineChart"
            lazyComponent={() => import("./design-system/showcase/templates/Charts/LineChartShowcase")}
            durationInFrames={210}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
          <Composition
            id="PieChart"
            lazyComponent={() => import("./design-system/showcase/templates/Charts/PieChartShowcase")}
            durationInFrames={180}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
          <Composition
            id="Counter"
            lazyComponent={() => import("./design-system/showcase/templates/Charts/CounterShowcase")}
            durationInFrames={180}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
          <Composition
            id="HorizontalBarChart"
            lazyComponent={() => import("./design-system/showcase/templates/Charts/HorizontalBarChartShowcase")}
            durationInFrames={180}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
          <Composition
            id="ComparisonTable"
            lazyComponent={() => import("./design-system/showcase/templates/Charts/ComparisonTableShowcase")}
            durationInFrames={180}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
          <Composition
            id="ComparisonTableDuel"
            lazyComponent={() => import("./design-system/showcase/templates/Charts/ComparisonTableDuelShowcase")}
            durationInFrames={180}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
          <Composition
            id="TimelineChart"
            lazyComponent={() => import("./design-system/showcase/templates/Charts/TimelineChartShowcase")}
            durationInFrames={180}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
          <Composition
            id="ScaleComparison"
            lazyComponent={() => import("./design-system/showcase/templates/Charts/ScaleComparisonShowcase")}
            durationInFrames={180}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
          <Composition
            id="ProgressRing"
            lazyComponent={() => import("./design-system/showcase/templates/Charts/ProgressRingShowcase")}
            durationInFrames={180}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
          <Composition
            id="QuadrantScatter"
            lazyComponent={() => import("./design-system/showcase/templates/Charts/QuadrantScatterShowcase")}
            durationInFrames={210}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
          <Composition
            id="HorseRaceChart"
            lazyComponent={() => import("./design-system/showcase/templates/Charts/HorseRaceChartShowcase")}
            durationInFrames={300}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
        </Folder>

        <Folder name="Scenes">
          <Composition
            id="HookScene"
            lazyComponent={() => import("./design-system/showcase/templates/Scenes/HookSceneShowcase")}
            durationInFrames={210}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
          <Composition
            id="TitleCard"
            lazyComponent={() => import("./design-system/showcase/templates/Scenes/TitleCardShowcase")}
            durationInFrames={150}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
          <Composition
            id="MetricScene"
            lazyComponent={() => import("./design-system/showcase/templates/Scenes/MetricSceneShowcase")}
            durationInFrames={300}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
          <Composition
            id="SplitComparison"
            lazyComponent={() => import("./design-system/showcase/templates/Scenes/SplitComparisonShowcase")}
            durationInFrames={210}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
          <Composition
            id="EndCardScene"
            lazyComponent={() => import("./design-system/showcase/templates/Scenes/EndCardSceneShowcase")}
            durationInFrames={300}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
          <Composition
            id="ClosingScene"
            lazyComponent={() => import("./design-system/showcase/templates/Scenes/ClosingSceneShowcase")}
            durationInFrames={300}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
          <Composition
            id="ClosingSequence"
            lazyComponent={() => import("./design-system/showcase/templates/Scenes/ClosingSequenceShowcase")}
            durationInFrames={420}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
        </Folder>

        <Folder name="Data">
          <Composition
            id="SalaryShuffleScene"
            lazyComponent={() => import("./design-system/showcase/templates/Data/SalaryShuffleSceneShowcase")}
            durationInFrames={240}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
          <Composition
            id="RankingResortScene"
            lazyComponent={() => import("./design-system/showcase/templates/Data/RankingResortSceneShowcase")}
            durationInFrames={240}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
          <Composition
            id="CalendarGrid"
            lazyComponent={() => import("./design-system/showcase/templates/Data/CalendarGridShowcase")}
            durationInFrames={210}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
          <Composition
            id="DeflatorSummaryGrid"
            lazyComponent={() => import("./design-system/showcase/templates/Data/DeflatorSummaryGridShowcase")}
            durationInFrames={240}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
          <Composition
            id="CompositePhases"
            lazyComponent={() => import("./design-system/showcase/templates/Data/CompositePhasesShowcase")}
            durationInFrames={300}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
        </Folder>

        <Folder name="Product">
          <Composition
            id="HookPunchline"
            lazyComponent={() => import("./design-system/showcase/templates/Product/HookPunchlineShowcase")}
            durationInFrames={180}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
        </Folder>

        <Folder name="Voiceover">
          <Composition
            id="VerticalTabScene"
            lazyComponent={() => import("./design-system/showcase/templates/Voiceover/VerticalTabSceneShowcase")}
            durationInFrames={300}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
          <Composition
            id="LocationMapScene"
            lazyComponent={() => import("./design-system/showcase/templates/Voiceover/LocationMapSceneShowcase")}
            durationInFrames={240}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
        </Folder>

        <Folder name="Bauhaus">
          <Composition
            id="BauhausHeroScene"
            lazyComponent={() => import("./design-system/showcase/templates/Bauhaus/BauhausHeroSceneShowcase")}
            durationInFrames={180}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
          <Composition
            id="BentoDataVizScene"
            lazyComponent={() => import("./design-system/showcase/templates/Bauhaus/BentoDataVizSceneShowcase")}
            durationInFrames={180}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
        </Folder>
      </Folder>
    </>
  );
};
