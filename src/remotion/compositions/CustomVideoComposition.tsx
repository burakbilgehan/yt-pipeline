import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";
import { horseRaceCompositionSchema, audioSegmentSchema } from "../schemas";
import { HorseRaceChart } from "../templates/data-charts";
import { HookReveal } from "../templates/voiceover-visuals/HookReveal";
import { FormulaCard } from "../templates/voiceover-visuals/FormulaCard";
import { AssetParade } from "../templates/voiceover-visuals/AssetParade";
import { Scoreboard } from "../templates/voiceover-visuals/Scoreboard";
import { ClosingCTA } from "../templates/voiceover-visuals/ClosingCTA";
import { SubtitleOverlay } from "../components";
import type { HorseRaceChartProps, SceneYearRange } from "../types";

// ─── Scene types enum — each maps to a visual component ──────

type SceneType =
  | "hook-reveal"
  | "formula-card"
  | "asset-parade"
  | "horse-race"
  | "scoreboard"
  | "closing-cta";

// ─── Video Config JSON shape ─────────────────────────────────

interface VideoConfigScene {
  id: string;
  type: SceneType;
  startTime: number;
  endTime: number;
  voiceover?: string;
  props?: Record<string, unknown>;
  crossfade?: {
    chartFadeInStart: number;
    chartFadeInEnd: number;
    formulaFadeOutStart: number;
    formulaFadeOutEnd: number;
  };
}

interface BackgroundMusicConfig {
  /** Path to audio file (relative to publicDir) */
  src: string;
  /** Volume 0-1 (e.g. 0.15 = 15%) */
  volume: number;
  /** Whether to loop if music is shorter than video */
  loop?: boolean;
  /** Fade-in duration in seconds at video start */
  fadeInSec?: number;
  /** Fade-out duration in seconds at video end */
  fadeOutSec?: number;
}

interface VideoConfig {
  title: string;
  durationSeconds: number;
  backgroundColor: string;
  brandColor: string;
  fontFamily: string;
  showSubtitles: boolean;
  horseRaceDataFile?: string;
  horseRaceYAxisLabel?: string;
  scenes: VideoConfigScene[];
  audioSegments?: Array<{ src: string; startTime: number }>;
  backgroundMusic?: BackgroundMusicConfig;
}

// ─── Composition Schema ──────────────────────────────────────

export const customVideoCompositionSchema = z.object({
  /** Video config loaded from JSON */
  videoConfig: z.any(), // VideoConfig type, validated at runtime
  /** Horse race chart data (loaded separately for performance) */
  horseRace: horseRaceCompositionSchema.optional(),
  /** Audio segments with precise timing */
  audioSegments: z.array(audioSegmentSchema).optional(),
});

export type CustomVideoCompositionProps = z.infer<typeof customVideoCompositionSchema>;

// ─── Component ───────────────────────────────────────────────

/**
 * CustomVideoComposition — Generic data-driven video composition.
 *
 * Reads a video-config.json to determine which scenes to render,
 * what component to use for each scene, and all scene-specific props.
 *
 * Supported scene types:
 * - "hook-reveal" → HookReveal component
 * - "formula-card" → FormulaCard component (with optional crossfade to chart)
 * - "asset-parade" → AssetParade component (interactive formula + asset-by-asset)
 * - "horse-race" → HorseRaceChart (continuous, spans multiple scenes)
 * - "scoreboard" → Scoreboard component
 * - "closing-cta" → ClosingCTA component
 */
const CustomVideoComposition: React.FC<CustomVideoCompositionProps> = ({
  videoConfig: rawConfig,
  horseRace,
  audioSegments: audioSegmentsOverride,
}) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  const config = rawConfig as VideoConfig;
  const {
    backgroundColor,
    fontFamily,
    showSubtitles,
    scenes,
    horseRaceYAxisLabel,
  } = config;

  const toFrame = (seconds: number) => Math.round(seconds * fps);

  // ── Find the continuous horse-race range ──
  const horseRaceScenes = scenes.filter((s) => s.type === "horse-race");
  const formulaScene = scenes.find((s) => s.type === "formula-card" || s.type === "asset-parade");

  // Chart starts when formula/parade scene starts (fades in behind it)
  const chartStartSec = formulaScene
    ? formulaScene.startTime
    : horseRaceScenes.length > 0
      ? horseRaceScenes[0].startTime
      : 0;
  const chartEndSec =
    horseRaceScenes.length > 0
      ? horseRaceScenes[horseRaceScenes.length - 1].endTime
      : 0;

  const hasChart = horseRace && horseRaceScenes.length > 0;

  // ── Build sceneYearRanges from horse-race scenes that have yearStart/yearEnd ──
  const sceneYearRanges: SceneYearRange[] = horseRaceScenes
    .filter((s) => s.props?.yearStart !== undefined && s.props?.yearEnd !== undefined)
    .map((s) => ({
      sceneStartSec: s.startTime - chartStartSec, // relative to chart sequence start
      sceneEndSec: s.endTime - chartStartSec,
      yearStart: s.props!.yearStart as number,
      yearEnd: s.props!.yearEnd as number,
    }));

  // ── Crossfade timing for formula/parade → chart ──
  const crossfade = formulaScene?.crossfade;
  const chartFadeInStart = crossfade ? toFrame(crossfade.chartFadeInStart) : 0;
  const chartFadeInEnd = crossfade ? toFrame(crossfade.chartFadeInEnd) : 0;
  const formulaFadeOutStart = crossfade ? toFrame(crossfade.formulaFadeOutStart) : 0;
  const formulaFadeOutEnd = crossfade ? toFrame(crossfade.formulaFadeOutEnd) : 0;

  const chartOpacity = crossfade
    ? interpolate(frame, [chartFadeInStart, chartFadeInEnd], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;

  const formulaOpacity = crossfade
    ? interpolate(frame, [formulaFadeOutStart, formulaFadeOutEnd], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;

  // ── Resolve audio segments ──
  const audioSegments = audioSegmentsOverride ?? config.audioSegments ?? [];

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {/* ═══ Render each scene ═══ */}
      {scenes.map((scene) => {
        const startFrame = toFrame(scene.startTime);
        const duration = toFrame(scene.endTime - scene.startTime);
        if (duration <= 0) return null;

        const props = (scene.props || {}) as Record<string, unknown>;

        return (
          <React.Fragment key={scene.id}>
            <Sequence
              from={startFrame}
              durationInFrames={duration}
              name={`Scene: ${scene.id}`}
            >
              {/* Scene visual */}
              {scene.type === "hook-reveal" && (
                <HookReveal
                  bigNumber={props.bigNumber as string}
                  smallNumber={props.smallNumber as string}
                  subtitle={props.subtitle as string | undefined}
                  subLabel={props.subLabel as string | undefined}
                  contextLine={props.contextLine as string | undefined}
                  contextDuration={props.contextDuration as number | undefined}
                  bigColor={props.bigColor as string | undefined}
                  smallColor={props.smallColor as string | undefined}
                  backgroundColor={backgroundColor}
                  fontFamily={fontFamily}
                  bigHoldDuration={props.bigHoldDuration as number | undefined}
                  deflationDuration={props.deflationDuration as number | undefined}
                  subtitleDelay={props.subtitleDelay as number | undefined}
                  variant={props.variant as "classic" | "counting-ticker" | undefined}
                />
              )}

              {scene.type === "formula-card" && (
                <AbsoluteFill style={{ opacity: formulaOpacity }}>
                  <FormulaCard
                    formulaParts={props.formulaParts as string[] | undefined}
                    example={props.example as string | undefined}
                    dataBadge={props.dataBadge as string | undefined}
                    backgroundColor={backgroundColor}
                    accentColor={props.accentColor as string | undefined}
                    fontFamily={fontFamily}
                  />
                </AbsoluteFill>
              )}

              {scene.type === "asset-parade" && (
                <AbsoluteFill style={{ opacity: formulaOpacity }}>
                  <AssetParade
                    formulaParts={props.formulaParts as string[] | undefined}
                    assets={props.assets as Array<{
                      name: string;
                      price: string;
                      ratio: string;
                      color: string;
                    }>}
                    goldPrice={props.goldPrice as string}
                    dataBadge={props.dataBadge as string | undefined}
                    backgroundColor={backgroundColor}
                    accentColor={props.accentColor as string | undefined}
                    fontFamily={fontFamily}
                    formulaDuration={props.formulaDuration as number | undefined}
                    assetDuration={props.assetDuration as number | undefined}
                  />
                </AbsoluteFill>
              )}

              {scene.type === "scoreboard" && (
                <Scoreboard
                  title={props.title as string | undefined}
                  items={props.items as Array<{
                    label: string;
                    value: number;
                    color: string;
                    suffix?: string;
                    period?: string;
                  }>}
                  footerText={props.footerText as string | undefined}
                  backgroundColor={backgroundColor}
                  fontFamily={fontFamily}
                />
              )}

              {scene.type === "closing-cta" && (
                <ClosingCTA
                  message={props.message as string | undefined}
                  channelName={props.channelName as string | undefined}
                  ctaText={props.ctaText as string | undefined}
                  backgroundColor={backgroundColor}
                  accentColor={props.accentColor as string | undefined}
                  fontFamily={fontFamily}
                  showEndScreen={props.showEndScreen as boolean | undefined}
                />
              )}

              {/* Subtitles for non-horse-race scenes */}
              {showSubtitles &&
                scene.voiceover &&
                scene.type !== "horse-race" && (
                  <SubtitleOverlay
                    text={scene.voiceover}
                    fontFamily={fontFamily}
                    sceneDurationInFrames={duration}
                  />
                )}
            </Sequence>

            {/* Subtitles for horse-race scenes (on their own Sequence) */}
            {showSubtitles &&
              scene.voiceover &&
              scene.type === "horse-race" && (
                <Sequence
                  from={startFrame}
                  durationInFrames={duration}
                  name={`Subtitles: ${scene.id}`}
                >
                  <SubtitleOverlay
                    text={scene.voiceover}
                    fontFamily={fontFamily}
                    sceneDurationInFrames={duration}
                  />
                </Sequence>
              )}
          </React.Fragment>
        );
      })}

      {/* ═══ Continuous Horse Race Chart (spans formula/parade + all horse-race scenes) ═══ */}
      {hasChart && horseRace && (
        <Sequence
          from={toFrame(chartStartSec)}
          durationInFrames={toFrame(chartEndSec - chartStartSec)}
          name="Horse Race Chart (continuous)"
        >
          <AbsoluteFill style={{ opacity: chartOpacity }}>
            <HorseRaceChart
              series={horseRace.series}
              cameraKeyframes={horseRace.cameraKeyframes}
              annotations={horseRace.annotations}
              timeRange={horseRace.timeRange}
              sceneYearRanges={sceneYearRanges.length > 0 ? sceneYearRanges : undefined}
              backgroundColor="transparent"
              brandColor={horseRace.brandColor}
              fontFamily={fontFamily}
              logScale={horseRace.logScale}
              yAxisLabel={horseRaceYAxisLabel}
            />
          </AbsoluteFill>
        </Sequence>
      )}

      {/* ═══ Voiceover Audio Tracks ═══ */}
      {audioSegments.map(
        (segment: { src: string; startTime: number }, index: number) => {
          const startFrame = toFrame(segment.startTime);
          return (
            <Sequence
              key={`audio-${index}`}
              from={startFrame}
              name={`Audio Segment ${index + 1}`}
            >
              <Audio src={staticFile(segment.src)} />
            </Sequence>
          );
        }
      )}

      {/* ═══ Background Music ═══ */}
      {config.backgroundMusic && (
        <Audio
          src={staticFile(config.backgroundMusic.src)}
          loop={config.backgroundMusic.loop !== false}
          volume={(f) => {
            const bgm = config.backgroundMusic!;
            const baseVolume = bgm.volume ?? 0.15;
            const totalFrames = toFrame(config.durationSeconds);
            const fadeInFrames = toFrame(bgm.fadeInSec ?? 2);
            const fadeOutFrames = toFrame(bgm.fadeOutSec ?? 3);

            // Fade in at start
            const fadeIn = fadeInFrames > 0
              ? interpolate(f, [0, fadeInFrames], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                })
              : 1;

            // Fade out at end
            const fadeOut = fadeOutFrames > 0
              ? interpolate(
                  f,
                  [totalFrames - fadeOutFrames, totalFrames],
                  [1, 0],
                  {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }
                )
              : 1;

            return baseVolume * fadeIn * fadeOut;
          }}
        />
      )}
    </AbsoluteFill>
  );
};

export default CustomVideoComposition;
