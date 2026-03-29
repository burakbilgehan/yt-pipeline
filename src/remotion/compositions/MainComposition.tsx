import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useVideoConfig,
} from "remotion";
import type { VideoCompositionProps, SceneInput } from "../schemas";
import { TransitionWrapper, SubtitleOverlay, BackgroundMusicLayer } from "../components";
import { SceneVisual } from "../templates/voiceover-visuals";
import { DataChartScene } from "../templates/data-charts";
import { loadFontsSync } from "../../fonts/load-fonts";
import { BG } from "../palette";

// ─── Video padding (silence + dark screen) ────────────────────
/** Seconds of dark padding before first scene */
export const START_PADDING_SEC = 0.75;
/** Seconds of dark padding after last scene */
export const END_PADDING_SEC = 1.5;

// ─── Continuous chart group detection ─────────────────────────

interface ContinuousChartGroup {
  /** Index of first scene in the group */
  startIdx: number;
  /** Index of last scene in the group (inclusive) */
  endIdx: number;
  /** Absolute start time (seconds) of the group */
  startTime: number;
  /** Absolute end time (seconds) of the group */
  endTime: number;
  /** The dataChart config from the first scene (used as base — sceneYearRanges are merged) */
  chartConfig: any;
}

/**
 * Find groups of consecutive horse-race scenes that should share
 * a single HorseRaceChart instance (no blink between scenes).
 *
 * A scene belongs to a horse-race group if its dataChart.type === "horse-race".
 * Consecutive horse-race scenes form one group.
 */
function findContinuousChartGroups(scenes: SceneInput[]): ContinuousChartGroup[] {
  const groups: ContinuousChartGroup[] = [];
  let currentGroup: ContinuousChartGroup | null = null;

  const getDeflator = (dc: any): string => dc?.deflator || "Median Wage";

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const dc = (scene.visual as any)?.dataChart;
    const isHorseRace = dc && dc.type === "horse-race";

    if (isHorseRace) {
      const deflator = getDeflator(dc);

      if (!currentGroup) {
        currentGroup = {
          startIdx: i,
          endIdx: i,
          startTime: scene.startTime,
          endTime: scene.endTime,
          chartConfig: dc,
        };
      } else {
        // Break group if deflator changes — each deflator needs its own
        // chart instance with different series data
        const groupDeflator = getDeflator(currentGroup.chartConfig);
        if (deflator !== groupDeflator) {
          groups.push(currentGroup);
          currentGroup = {
            startIdx: i,
            endIdx: i,
            startTime: scene.startTime,
            endTime: scene.endTime,
            chartConfig: dc,
          };
        } else {
          currentGroup.endIdx = i;
          currentGroup.endTime = scene.endTime;
        }
      }
    } else {
      if (currentGroup) {
        groups.push(currentGroup);
        currentGroup = null;
      }
    }
  }
  if (currentGroup) groups.push(currentGroup);

  return groups;
}

/**
 * Merge sceneYearRanges from all scenes in a group into one continuous array.
 * Each scene's sceneYearRanges has times relative to scene-start (0..sceneDuration).
 * We convert them to group-relative times (offset from group start).
 */
function mergeSceneYearRanges(scenes: SceneInput[], group: ContinuousChartGroup): any[] {
  const merged: any[] = [];

  for (let i = group.startIdx; i <= group.endIdx; i++) {
    const scene = scenes[i];
    const dc = (scene.visual as any)?.dataChart;
    if (!dc?.sceneYearRanges) continue;

    // Offset from group start
    const sceneOffset = scene.startTime - group.startTime;

    for (const range of dc.sceneYearRanges) {
      merged.push({
        sceneStartSec: range.sceneStartSec + sceneOffset,
        sceneEndSec: range.sceneEndSec + sceneOffset,
        yearStart: range.yearStart,
        yearEnd: range.yearEnd,
      });
    }
  }

  return merged;
}

/**
 * Build a merged chart config for a continuous group.
 * Takes the first scene's config as base and merges sceneYearRanges + annotations.
 */
function buildGroupChartConfig(scenes: SceneInput[], group: ContinuousChartGroup): any {
  const base = { ...group.chartConfig };

  // Merge year ranges from all scenes in the group
  base.sceneYearRanges = mergeSceneYearRanges(scenes, group);

  // Merge annotations from all scenes (already deduplicated by Root.tsx)
  const allAnnotations: any[] = [];
  const seen = new Set<string>();
  for (let i = group.startIdx; i <= group.endIdx; i++) {
    const dc = (scenes[i].visual as any)?.dataChart;
    if (dc?.annotations && Array.isArray(dc.annotations)) {
      for (const a of dc.annotations) {
        const key = `${a.year}-${a.text}`;
        if (!seen.has(key)) {
          seen.add(key);
          allAnnotations.push(a);
        }
      }
    }
  }
  base.annotations = allAnnotations;

  // Merge shrinkflation markers from all scenes
  const allMarkers: any[] = [];
  const seenMarkers = new Set<string>();
  for (let i = group.startIdx; i <= group.endIdx; i++) {
    const dc = (scenes[i].visual as any)?.dataChart;
    if (dc?.shrinkflationMarkers && Array.isArray(dc.shrinkflationMarkers)) {
      for (const m of dc.shrinkflationMarkers) {
        const key = `${m.year}-${m.label}`;
        if (!seenMarkers.has(key)) {
          seenMarkers.add(key);
          allMarkers.push(m);
        }
      }
    }
  }
  if (allMarkers.length > 0) {
    base.shrinkflationMarkers = allMarkers;
  }

  return base;
}

/**
 * Main video composition.
 *
 * Takes storyboard scenes + audio files as input, renders the full video:
 * - Each scene is a Remotion <Sequence> positioned at the correct frame
 * - Scenes contain visuals (stock images, text overlays, or data charts)
 * - Data-chart scenes ALWAYS have a stock image background with the chart overlaid
 * - **Continuous horse-race chart**: consecutive horse-race scenes share a single
 *   HorseRaceChart instance rendered in one long Sequence — no blink between scenes.
 * - Audio segments are placed at their correct timeline positions
 * - Subtitles progress sentence-by-sentence
 * - Progress bar shows minimal YouTube-style chapter markers
 */
const MainComposition: React.FC<VideoCompositionProps> = ({
  title,
  scenes,
  audioFiles,
  audioSegments,
  backgroundMusic,
  showSubtitles,
  brandColor,
  fontFamily,
}) => {
  const { fps, durationInFrames } = useVideoConfig();

  // Padding offset: all content starts after startPadding dark frames
  const startPaddingFrames = Math.round(START_PADDING_SEC * fps);

  // Safety net: ensure fonts are loaded (primary load happens in Root.tsx calculateMetadata)
  loadFontsSync(fontFamily);

  // ── Detect continuous horse-race chart groups ──
  const chartGroups = useMemo(() => findContinuousChartGroups(scenes), [scenes]);

  // Build a set of scene indices that belong to a chart group
  // These scenes should NOT render their own HorseRaceChart (the group layer handles it)
  const chartGroupSceneIndices = useMemo(() => {
    const indices = new Set<number>();
    for (const group of chartGroups) {
      for (let i = group.startIdx; i <= group.endIdx; i++) {
        indices.add(i);
      }
    }
    return indices;
  }, [chartGroups]);

  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>

      {/* ── Continuous horse-race chart layers ──
          Each group gets ONE HorseRaceChart instance spanning all its scenes.
          This prevents blink/remount between scenes. */}
      {chartGroups.map((group, groupIdx) => {
        const groupStartFrame = Math.round(group.startTime * fps) + startPaddingFrames;
        const groupEndFrame = Math.round(group.endTime * fps) + startPaddingFrames;
        const groupDuration = groupEndFrame - groupStartFrame;
        if (groupDuration <= 0) return null;

        const mergedConfig = buildGroupChartConfig(scenes, group);

        return (
          <Sequence
            key={`chart-group-${groupIdx}`}
            from={groupStartFrame}
            durationInFrames={groupDuration}
            name={`Continuous Chart ${groupIdx + 1}`}
          >
            <AbsoluteFill>
              <DataChartScene
                chart={mergedConfig}
                brandColor={brandColor}
                fontFamily={fontFamily}
              />
            </AbsoluteFill>
          </Sequence>
        );
      })}

      {/* ── Scene sequences ── */}
      {scenes.map((scene, index) => {
        const startFrame = Math.round(scene.startTime * fps) + startPaddingFrames;
        const endFrame = Math.round(scene.endTime * fps) + startPaddingFrames;
        const sceneDuration = endFrame - startFrame;

        if (sceneDuration <= 0) return null;

        const dc = (scene.visual as any)?.dataChart;
        const isHorseRace = dc && dc.type === "horse-race";
        const isInChartGroup = chartGroupSceneIndices.has(index);

        // For horse-race scenes in a group: the chart is rendered by the group layer above.
        // We still render the scene Sequence for subtitles and any non-chart overlays,
        // but skip the DataChartScene to avoid double-rendering.
        const isDataChart =
          dc && !isHorseRace && (scene.visual.type === "data-chart" || scene.visual.type === "composite");

        return (
          <Sequence
            key={scene.id}
            from={startFrame}
            durationInFrames={sceneDuration}
            name={`Scene: ${scene.section}`}
          >
            <TransitionWrapper
              type={isInChartGroup ? "cut" : scene.transition}
              sceneDurationInFrames={sceneDuration}
            >
              {/* Layer 1: SceneVisual background — skip for chart-group scenes
                  (chart group layer already provides the visual) */}
              {!isInChartGroup && (
                <SceneVisual
                  visual={scene.visual}
                  brandColor={brandColor}
                  fontFamily={fontFamily}
                  fallbackImage={
                    !scene.visual.assetPath && scene.visual.type !== "text-overlay"
                      ? findPreviousAsset(scenes, index)
                      : undefined
                  }
                />
              )}

              {/* Layer 2: Non-horse-race data chart overlay */}
              {isDataChart && (
                <AbsoluteFill
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                  }}
                >
                  <DataChartScene
                    chart={dc!}
                    brandColor={brandColor}
                    fontFamily={fontFamily}
                  />
                </AbsoluteFill>
              )}

              {/* Subtitles */}
              {showSubtitles && scene.voiceover && (
                <SubtitleOverlay
                  text={scene.voiceover}
                  fontFamily={fontFamily}
                  sceneDurationInFrames={sceneDuration}
                />
              )}
            </TransitionWrapper>
          </Sequence>
        );
      })}

      {/* ── Audio tracks ── */}
      {/* Prefer audioSegments (with precise timing) over legacy audioFiles */}
      {audioSegments && audioSegments.length > 0
        ? audioSegments.map((segment, index) => {
            const startFrame = Math.round(segment.startTime * fps) + startPaddingFrames;
            return (
              <Sequence
                key={`audio-seg-${index}`}
                from={startFrame}
                name={`Audio Segment ${index + 1}`}
              >
                <Audio src={staticFile(segment.src)} />
              </Sequence>
            );
          })
        : audioFiles.map((audioPath, index) => {
            const scene = scenes[index];
            if (!scene || !audioPath) return null;
            const startFrame = Math.round(scene.startTime * fps) + startPaddingFrames;
            return (
              <Sequence
                key={`audio-${index}`}
                from={startFrame}
                name={`Audio: ${scene.section}`}
              >
                <Audio src={staticFile(audioPath)} />
              </Sequence>
            );
          })}

      {/* ── Background Music ── */}
      {backgroundMusic && (
        <BackgroundMusicLayer config={backgroundMusic} />
      )}

    </AbsoluteFill>
  );
};

export default MainComposition;

// ─── Internal: Find previous scene's asset for fallback ───────

function findPreviousAsset(scenes: SceneInput[], currentIndex: number): string | undefined {
  for (let i = currentIndex - 1; i >= 0; i--) {
    const asset = scenes[i].visual.assetPath;
    if (asset) {
      // Skip video files as fallbacks — they are too heavy for background use
      // in data-chart/text-overlay scenes and cause render hangs with large files.
      // Only static images are suitable as fallback backgrounds.
      if (/\.(mp4|webm|mov)$/i.test(asset)) continue;
      return asset;
    }
  }
  return undefined;
}

// end of file
