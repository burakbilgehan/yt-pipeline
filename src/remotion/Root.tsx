import React from "react";
import { Composition, staticFile } from "remotion";
import "./styles.css";
import { videoCompositionSchema, dataChartCompositionSchema, shortsCompositionSchema, horseRaceCompositionSchema, thumbnailCompositionSchema, thumbnailOverlayCompositionSchema } from "./schemas";
import { customVideoCompositionSchema } from "./compositions/CustomVideoComposition";
import { ensureFontsLoaded } from "../fonts/load-fonts";
import { bridgeAllScenes } from "../utils/storyboard-bridge";
import { BG } from "./palette";
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

    // ── Inject HorseRaceChart data into horse-race scenes ──
    // Load RUPI series data and attach to each horse-race scene's dataChart
    try {
      const rupiRes = await fetch(staticFile("production/rupi-data.json"));
      if (rupiRes.ok) {
        const rupiData = (await rupiRes.json()) as Record<string, any[]>;
        // Map storyboard deflator names → rupi-data.json keys
        const deflatorKeyMap: Record<string, string> = {
          "Median Wage": "wage",
          "median wage": "wage",
          "wage": "wage",
          "CPI": "cpi",
          "cpi": "cpi",
          "Federal Minimum Wage": "minWage",
          "Minimum Wage": "minWage",
          "minWage": "minWage",
          "Gold": "gold",
          "gold": "gold",
        };

        // ── Pass 1: Inject series data + per-scene defaults ──
        const horseRaceScenes: Array<{ scene: any; dc: any }> = [];

        for (const scene of resolvedScenes) {
          const dc = scene.visual?.dataChart;
          if (!dc || dc.type !== "horse-race") continue;

          horseRaceScenes.push({ scene, dc });

          // Determine which deflator's series to use
          const deflatorName: string = dc.deflator || "Median Wage";
          const dataKey = deflatorKeyMap[deflatorName] || "wage";
          const series = rupiData[dataKey];
          if (series && Array.isArray(series)) {
            dc.series = series;
          }

          // Set time range from scene's yearRange or full range
          const yr = dc.yearRange;
          dc.timeRange = {
            start: yr?.[0] ?? 2000,
            end: yr?.[1] ?? 2025,
          };

          // Defaults for camera/annotations (per-scene overrides can be added later)
          if (!dc.cameraKeyframes) {
            dc.cameraKeyframes = [{ year: dc.timeRange.start, zoom: 1.0, speed: 1.0 }];
          }

          // Use transparent background so SceneVisual layer shows through
          dc.backgroundColor = "transparent";

          // Linear scale for RUPI (0–3.5 range) — log scale not appropriate here
          if (dc.logScale === undefined) {
            dc.logScale = false;
          }

          // Y-axis label based on deflator
          if (!dc.yAxisLabel) {
            const yLabels: Record<string, string> = {
              wage: "RUPI (Wage-Deflated)",
              cpi: "RUPI (CPI-Deflated)",
              minWage: "RUPI (Min Wage-Deflated)",
              gold: "RUPI (Gold-Deflated)",
            };
            dc.yAxisLabel = yLabels[dataKey] || "RUPI";
          }
        }

        // ── Pass 2: Build per-scene sceneYearRanges ──
        // MainComposition renders each scene inside its own <Sequence from={startFrame}>,
        // so useCurrentFrame() in HorseRaceChart returns scene-local frames (0..sceneDuration).
        // Each scene therefore needs a single-entry sceneYearRanges covering 0..sceneDurationSec
        // mapped to the appropriate yearStart..yearEnd for that scene.
        if (horseRaceScenes.length > 0) {
          let lastYearEnd = 2000;

          for (const { scene, dc } of horseRaceScenes) {
            const sceneDurationSec = (scene.endTime || 0) - (scene.startTime || 0);
            const yr = dc.yearRange;
            const state: string = dc.state || "";

            let yearStart: number;
            let yearEnd: number;

            if (state === "start-position") {
              // Use explicit yearRange if provided (e.g. [1999,2003] for wider chart window),
              // otherwise default to frozen at year 2000.
              if (yr && Array.isArray(yr) && yr.length === 2) {
                yearStart = yr[0];
                yearEnd = yr[1];
              } else {
                yearStart = 2000;
                yearEnd = 2000;
              }
            } else if (state.startsWith("frozen") || state.startsWith("paused")) {
              const frozenYear = parseInt(state.replace(/\D/g, "")) || lastYearEnd;
              yearStart = frozenYear;
              yearEnd = frozenYear;
            } else if (dc.deflator && dc.deflator !== "Median Wage" && dc.deflator !== "median wage" && dc.deflator !== "wage") {
              // Deflator switch scenes (021–025): chart at full extent, lines morph
              yearStart = 2025;
              yearEnd = 2025;
            } else if (yr && Array.isArray(yr) && yr.length === 2) {
              yearStart = yr[0];
              yearEnd = yr[1];
            } else {
              yearStart = lastYearEnd;
              yearEnd = lastYearEnd;
            }

            // Single-entry range: scene-local time 0 → sceneDuration maps to yearStart → yearEnd
            dc.sceneYearRanges = [{
              sceneStartSec: 0,
              sceneEndSec: sceneDurationSec,
              yearStart,
              yearEnd,
            }];
            lastYearEnd = yearEnd;
          }
        }

        // ── Pass 3: Build annotations + shrinkflation markers from storyboard data ──
        if (horseRaceScenes.length > 0) {
          const allAnnotations: Array<{
            year: number;
            text: string;
            style: string;
            asset?: string;
            duration?: number;
            icon?: string;
          }> = [];

          // Separate collection for shrinkflation markers (vertical dashed lines)
          const shrinkMarkers: Array<{ year: number; label: string; color?: string }> = [];
          const seenMarkers = new Set<string>();

          for (const { dc } of horseRaceScenes) {
            // eventMarker → annotation
            if (dc.eventMarker) {
              const em = dc.eventMarker;
              const textStr: string = (em.title || em.text || "").toLowerCase();
              const isMajor = textStr.includes("avian") ||
                              textStr.includes("covid") ||
                              (em.type || "") === "covid-annotation";
              allAnnotations.push({
                year: em.year,
                text: em.title || em.text,
                style: isMajor ? "major-crisis-flash" : "crisis-flash",
                duration: 2,
              });
            }

            // annotation (singular object, e.g. scene-008)
            if (dc.annotation && typeof dc.annotation === "object" && !Array.isArray(dc.annotation)) {
              allAnnotations.push({
                year: dc.annotation.year,
                text: dc.annotation.text,
                style: "milestone-flash",
                asset: dc.annotation.product,
                duration: 2,
              });
            }

            // annotations (array from storyboard)
            if (dc.annotations && Array.isArray(dc.annotations)) {
              for (const a of dc.annotations) {
                if (a.year && a.text) {
                  // Shrinkflation annotations → both general annotations AND shrinkflation markers
                  if (a.type === "shrinkflation") {
                    const markerKey = `${a.year}-${a.text}`;
                    if (!seenMarkers.has(markerKey)) {
                      seenMarkers.add(markerKey);
                      shrinkMarkers.push({
                        year: a.year,
                        label: a.text,
                      });
                    }
                    allAnnotations.push({
                      year: a.year,
                      text: a.text,
                      style: "shrinkflation-callout",
                      asset: a.product,
                      duration: 2,
                    });
                  } else if (a.near || a.product) {
                    // Regular product annotations (with near or product field)
                    allAnnotations.push({
                      year: a.year,
                      text: a.text,
                      style: "leader-callout",
                      asset: a.near || a.product,
                      duration: 2,
                    });
                  } else {
                    // Event-type annotations (no product/near, e.g. "Global commodity boom")
                    allAnnotations.push({
                      year: a.year,
                      text: a.text,
                      style: "event-flash",
                      duration: 2,
                    });
                  }
                }
              }
            }

            // crossings (from deflator switch scenes)
            if (dc.crossings && Array.isArray(dc.crossings)) {
              for (const c of dc.crossings) {
                allAnnotations.push({
                  year: 2025,
                  text: `${c.product} crosses 1.0`,
                  style: "crossing-alert",
                  asset: c.product,
                  duration: 2,
                });
              }
            }

            // overlays with type "shrinkflation" (from overlays array)
            if (dc.overlays && Array.isArray(dc.overlays)) {
              for (const o of dc.overlays) {
                if (o.type === "shrinkflation" && o.year && o.text) {
                  const markerKey = `${o.year}-${o.text}`;
                  if (!seenMarkers.has(markerKey)) {
                    seenMarkers.add(markerKey);
                    shrinkMarkers.push({
                      year: o.year,
                      label: o.text,
                    });
                  }
                }
              }
            }
          }

          // Deduplicate annotations by year+text
          const seen = new Set<string>();
          const uniqueAnnotations = allAnnotations.filter((a) => {
            const key = `${a.year}-${a.text}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

          // Inject annotations + shrinkflation markers into all horse-race scenes
          for (const { dc } of horseRaceScenes) {
            dc.annotations = uniqueAnnotations;
            if (shrinkMarkers.length > 0) {
              dc.shrinkflationMarkers = shrinkMarkers;
            }
          }
        }
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
  backgroundColor: BG,
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

      {/* Design System Showcase — text motion primitives */}
      <Composition
        id="DS-TextMotion"
        lazyComponent={() => import("./design-system/showcase/TextMotionShowcase")}
        durationInFrames={300}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};
