import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  staticFile,
  getRemotionEnvironment,
} from "remotion";
import type { VideoCompositionProps, SceneInput } from "../schemas";
import { TransitionWrapper, SubtitleOverlay, BackgroundMusicLayer } from "../components";
import { SceneVisual } from "../templates/voiceover-visuals";
import { DataChartScene } from "../templates/data-charts";
import { loadFontsSync } from "../../fonts/load-fonts";
import { BG } from "../palette";

// ─── Design System integration ────────────────────────────────
// Importing layer index files triggers component registration in the DS registry
import '../design-system/atmospheres';
import '../design-system/surfaces';
import '../design-system/motion';
import { getAtmosphere, getSurface } from '../design-system/registry';
import { BlurFadeIn } from '../design-system/motion/BlurFadeIn';
import { TiltCard } from '../design-system/motion/TiltCard';
import { ContainerTextFlip } from '../design-system/motion/ContainerTextFlip';

// ─── Debug overlay (Studio only) ──────────────────────────────
const IS_STUDIO = getRemotionEnvironment().isStudio;

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

        // ── Design System layer resolution ──
        const visual = scene.visual as any;
        const atmosphereId: string | undefined = visual.atmosphere;
        const atmosphereConf = visual.atmosphereConfig;
        const surfaceId: string | undefined = visual.surface;
        const surfaceConf = visual.surfaceConfig;
        const motionId: string | undefined = visual.motion;
        const motionConf = visual.motionConfig;

        // Resolve DS components from registry (undefined if id is "none" or unregistered)
        const AtmosphereComp = atmosphereId && atmosphereId !== "none"
          ? getAtmosphere(atmosphereId) : undefined;
        // Full-screen chart types manage their own AbsoluteFill + background.
        // Wrapping them in a surface (which has no intrinsic dimensions) causes
        // the AbsoluteFill child to collapse to 0×0 → blank render.
        const FULL_SCREEN_CHART_TYPES = new Set([
          "vertical-tabs",
          "composite-phases",
          "closing-scene",
          "metric-scene",
        ]);
        const chartIsFullScreen = dc && FULL_SCREEN_CHART_TYPES.has(dc.type);
        const SurfaceComp = surfaceId && surfaceId !== "none" && !chartIsFullScreen
          ? getSurface(surfaceId) : undefined;
        const useBlurFade = motionId && motionId !== "none" && motionId === "blur-fade-in" && !chartIsFullScreen;
        const useTilt = motionId === "tilt" && !chartIsFullScreen;

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
              {/* Layer 0 (DS): Atmosphere background — full-screen behind everything */}
              {AtmosphereComp && !isInChartGroup && (
                <AbsoluteFill style={{ zIndex: 0 }}>
                  <AtmosphereComp
                    id={atmosphereId!}
                    width={1920}
                    height={1080}
                    opacity={atmosphereConf?.opacity ?? 0.12}
                    speed={atmosphereConf?.speed ?? 1}
                    color={atmosphereConf?.color}
                    scale={atmosphereConf?.scale}
                  />
                </AbsoluteFill>
              )}

              {/* Layer 1: SceneVisual background — skip for chart-group scenes
                  (chart group layer already provides the visual).
                  Data-chart scenes do NOT inherit previous scene's image — they use
                  their own atmosphere (e.g. dot-grid) on a clean background. */}
              {!isInChartGroup && (
                <SceneVisual
                  visual={scene.visual}
                  brandColor={brandColor}
                  fontFamily={fontFamily}
                  fallbackImage={
                    !scene.visual.assetPath && scene.visual.type !== "text-overlay" && !isDataChart
                      ? findPreviousAsset(scenes, index)
                      : undefined
                  }
                />
              )}

              {/* Layer 2: Non-horse-race data chart overlay — with optional Tilt + Surface + BlurFadeIn */}
              {isDataChart && (
                <PhaseAwareChart
                  hasPhase2={
                    !!(visual.textOverlay && typeof visual.textOverlay === "object" && (visual.textOverlay as any).phase === 2)
                  }
                  keepChartVisible={
                    !!(visual.textOverlay && typeof visual.textOverlay === "object" && (visual.textOverlay as any).keepChartVisible)
                  }
                  sceneDurationInFrames={sceneDuration}
                >
                  <MaybeTiltCard active={!!useTilt} motionConf={motionConf}>
                    <MaybeBlurFadeIn active={!!useBlurFade} delay={motionConf?.delayFrames}>
                      <MaybeSurface
                        SurfaceComp={SurfaceComp}
                        surfaceId={surfaceId}
                        surfaceConf={surfaceConf}
                      >
                        <DataChartScene
                          chart={dc!}
                          brandColor={brandColor}
                          fontFamily={fontFamily}
                        />
                      </MaybeSurface>
                    </MaybeBlurFadeIn>
                  </MaybeTiltCard>
                </PhaseAwareChart>
              )}

              {/* Layer 2.5: Text overlay for scenes (flip text, callouts, lines) */}
              {visual.textOverlay &&
                typeof visual.textOverlay === "object" &&
                (visual.textOverlay.text || (visual.textOverlay.texts && visual.textOverlay.texts.length > 0)) && (
                  <FlipTextOverlay
                    config={visual.textOverlay as TextOverlayConfig}
                    sceneDurationInFrames={sceneDuration}
                  />
                )}
              {visual.textOverlay &&
                typeof visual.textOverlay === "object" &&
                Array.isArray(visual.textOverlay.lines) &&
                visual.textOverlay.lines.length > 0 && (
                  <LinesTextOverlay
                    lines={visual.textOverlay.lines as TextOverlayLine[]}
                    sceneDurationInFrames={sceneDuration}
                    brandColor={brandColor}
                  />
                )}

              {/* Subtitles */}
              {showSubtitles && scene.voiceover && (
                <SubtitleOverlay
                  text={scene.voiceover}
                  fontFamily={fontFamily}
                  sceneDurationInFrames={sceneDuration}
                />
              )}

              {/* Source citation — small disclaimer in bottom-right */}
              {visual.sourceText && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 24,
                    right: 32,
                    color: "rgba(240, 237, 232, 0.35)",
                    fontFamily: "Montserrat, sans-serif",
                    fontSize: 16,
                    fontWeight: 400,
                    maxWidth: 600,
                    textAlign: "right",
                    lineHeight: 1.3,
                    pointerEvents: "none",
                    zIndex: 2,
                  }}
                >
                  {visual.sourceText}
                </div>
              )}

              {/* Debug overlay — Studio only, hidden in renders */}
              {IS_STUDIO && (
                <div
                  style={{
                    position: "absolute",
                    top: 20,
                    left: 20,
                    background: "rgba(0,0,0,0.85)",
                    color: "#fff",
                    fontFamily: "Montserrat, sans-serif",
                    fontSize: 28,
                    fontWeight: 600,
                    padding: "10px 20px",
                    borderRadius: 8,
                    border: "2px solid rgba(255,255,255,0.3)",
                    zIndex: 9999,
                    pointerEvents: "none",
                  }}
                >
                  {scene.id} · {scene.section}
                </div>
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

// ─── DS helper wrappers ───────────────────────────────────────

// ─── Lines Text Overlay (staggered spring animation) ──────────

interface TextOverlayLine {
  text: string;
  position?: string;
  delay?: number;
  color?: string;
}

/**
 * Renders a textOverlay that uses a `lines` array instead of a single `text` string.
 * Each line fades+slides in with a staggered spring animation.
 *
 * Position mapping:
 * - "left-label" / "lung-area"  → left column
 * - "right-label"               → right column
 * - "brain-area"                → center-top area
 * - "placenta-area"             → center-bottom area
 * - fallback                    → vertically stacked at center
 */
const LinesTextOverlay: React.FC<{
  lines: TextOverlayLine[];
  sceneDurationInFrames: number;
  brandColor: string;
}> = ({ lines, sceneDurationInFrames, brandColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /** Map semantic position strings to CSS positioning */
  const getPositionStyle = (
    pos: string | undefined,
    idx: number,
    total: number,
  ): React.CSSProperties => {
    switch (pos) {
      case "left-label":
        return {
          position: "absolute",
          left: 120,
          top: "50%",
          transform: "translateY(-50%)",
          textAlign: "left",
        };
      case "right-label":
        return {
          position: "absolute",
          right: 120,
          top: "50%",
          transform: "translateY(-50%)",
          textAlign: "right",
        };
      case "lung-area":
        return {
          position: "absolute",
          left: 200,
          top: "38%",
          textAlign: "left",
        };
      case "brain-area":
        return {
          position: "absolute",
          left: 200,
          top: "22%",
          textAlign: "left",
        };
      case "placenta-area":
        return {
          position: "absolute",
          left: 200,
          top: "58%",
          textAlign: "left",
        };
      case "top-center":
        return {
          position: "absolute",
          top: 80,
          left: 0,
          right: 0,
          textAlign: "center",
        };
      case "bottom-center":
        return {
          position: "absolute",
          bottom: 100,
          left: 0,
          right: 0,
          textAlign: "center",
        };
      default:
        // Stack lines vertically in the center
        return {
          position: "absolute",
          top: `${35 + idx * 12}%`,
          left: 0,
          right: 0,
          textAlign: "center",
        };
    }
  };

  return (
    <AbsoluteFill style={{ zIndex: 2, pointerEvents: "none" }}>
      {lines.map((line, idx) => {
        const delayFrames = line.delay ?? idx * 20;
        const localFrame = frame - delayFrames;

        if (localFrame < 0) return null;

        const springProgress = spring({
          frame: localFrame,
          fps,
          config: { damping: 18, stiffness: 120, mass: 0.8 },
        });

        const opacity = interpolate(springProgress, [0, 1], [0, 1], {
          extrapolateRight: "clamp",
        });

        const translateY = interpolate(springProgress, [0, 1], [20, 0], {
          extrapolateRight: "clamp",
        });

        const posStyle = getPositionStyle(line.position, idx, lines.length);
        const lineColor = line.color || brandColor;

        return (
          <div
            key={`line-${idx}`}
            style={{
              ...posStyle,
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 600,
              fontSize: 48,
              color: lineColor,
              opacity,
              transform: `${posStyle.transform || ""} translateY(${translateY}px)`.trim(),
              filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.6))",
              letterSpacing: 1,
              padding: "0 40px",
            }}
          >
            {line.text}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ─── Text Overlay with ContainerTextFlip ──────────────────────

interface TextOverlayConfig {
  text: string;          // single text (backward compat)
  texts?: string[];      // multi-text array — if provided, ContainerTextFlip cycles through these
  style?: string;
  color?: string;
  phase?: number;
  position?: string;
  showPill?: boolean;
  keepChartVisible?: boolean;
}

/**
 * Renders a text overlay using ContainerTextFlip (pill style).
 * Replaces the old GlitchTextOverlay with a cleaner blur-fade character animation.
 *
 * - `phase: 2` delays appearance to the second half of the scene (50% mark).
 * - `position: "top-center"` places near top; "bottom-center" near bottom; default is centered.
 */
const FlipTextOverlay: React.FC<{
  config: TextOverlayConfig;
  sceneDurationInFrames: number;
}> = ({ config, sceneDurationInFrames }) => {
  const { text, color = "#E06070", phase, position } = config;

  // Multi-text support: use config.texts if provided, fall back to single text
  const textsArray = config.texts && config.texts.length > 0 ? config.texts : [text];

  // Phase delay: phase 2 = start at 50% of scene
  const delayFrames = phase === 2 ? Math.round(sceneDurationInFrames * 0.5) : 0;

  // Available frames for the overlay after the delay
  const availableFrames = sceneDurationInFrames - delayFrames;
  const perTextFrames = Math.round(availableFrames / textsArray.length);

  // Positioning
  const isTop = position === "top-center";
  const isBottom = position === "bottom-center";

  // Wrap in Sequence so ContainerTextFlip's useCurrentFrame() starts from 0
  // after the delay. This fixes the loop=false + single-text timing bug.
  return (
    <Sequence from={delayFrames} durationInFrames={availableFrames} layout="none">
      <FlipTextOverlayInner
        textsArray={textsArray}
        color={color}
        perTextFrames={perTextFrames}
        isTop={isTop}
        isBottom={isBottom}
      />
    </Sequence>
  );
};

/** Inner component rendered inside Sequence so useCurrentFrame resets to 0. */
const FlipTextOverlayInner: React.FC<{
  textsArray: string[];
  color: string;
  perTextFrames: number;
  isTop: boolean;
  isBottom: boolean;
}> = ({ textsArray, color, perTextFrames, isTop, isBottom }) => {
  const frame = useCurrentFrame();

  // Dynamic font sizing based on longest text to prevent overflow.
  // Target: pill should fit within ~1600px (1920 - 2*160 margin).
  const longestText = textsArray.reduce((a, b) => (a.length > b.length ? a : b), "");
  const charCount = longestText.length;
  // Approximate: at fontWeight 700, each char ≈ 0.62 * fontSize wide
  // Max pill width ~1600px → fontSize ≈ 1600 / (charCount * 0.62 + pillPadding)
  const maxFontSize = 96;
  const minFontSize = 44;
  const maxPillWidth = 1600;
  const pillPad = 72; // 36px * 2
  const computedSize = Math.floor((maxPillWidth - pillPad) / (charCount * 0.62));
  const fontSize = Math.max(minFontSize, Math.min(maxFontSize, computedSize));

  // Fade in wrapper
  const wrapperOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        zIndex: 2,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: isTop ? 80 : isBottom ? undefined : "50%",
          bottom: isBottom ? 100 : undefined,
          left: 0,
          right: 0,
          transform: isTop || isBottom ? undefined : "translateY(-50%)",
          display: "flex",
          justifyContent: "center",
          opacity: wrapperOpacity,
          filter: `drop-shadow(0 4px 16px rgba(0,0,0,0.6))`,
        }}
      >
        <ContainerTextFlip
          texts={textsArray}
          fontSize={fontSize}
          fontWeight={700}
          color={color}
          fontFamily="Montserrat, sans-serif"
          showPill={true}
          loop={false}
          frameDuration={perTextFrames}
          staggerFrames={2}
          staggerFrom="first"
          splitBy="characters"
          blurAmount={8}
        />
      </div>
    </AbsoluteFill>
  );
};

/**
 * Wraps the data chart in a phase-aware container.
 * When `hasPhase2` is true, the chart fades out before the Phase 2 text overlay appears
 * (at 50% of scene duration). This prevents the counter/chart from colliding with Phase 2 text.
 * When `keepChartVisible` is true, the chart stays at full opacity even with Phase 2 —
 * the FlipTextOverlay pill simply overlays on top.
 * Without Phase 2, the chart renders at full opacity for the entire scene.
 */
const PhaseAwareChart: React.FC<{
  hasPhase2: boolean;
  keepChartVisible?: boolean;
  sceneDurationInFrames: number;
  children: React.ReactNode;
}> = ({ hasPhase2, keepChartVisible, sceneDurationInFrames, children }) => {
  const frame = useCurrentFrame();

  if (!hasPhase2) {
    return <AbsoluteFill style={{ zIndex: 1 }}>{children}</AbsoluteFill>;
  }

  if (keepChartVisible) {
    // keepChartVisible: chart dims to 55% opacity when phase-2 overlay appears
    // so the overlay pill is clearly readable while chart remains visible underneath
    const fadeStart = Math.round(sceneDurationInFrames * 0.48);
    const fadeEnd = Math.round(sceneDurationInFrames * 0.56);
    const opacity = interpolate(frame, [fadeStart, fadeEnd], [1, 0.55], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return <AbsoluteFill style={{ zIndex: 1, opacity }}>{children}</AbsoluteFill>;
  }

  // Phase 2 text overlay starts at 50% of scene (see FlipTextOverlay delayFrames).
  // Chart fades out slightly AFTER text starts fading in, so there's a brief overlap
  // and never a blank screen. Counter visible 0%→52%, cross-fading 50%→58%, text-only 58%→100%.
  const fadeOutStart = Math.round(sceneDurationInFrames * 0.50);
  const fadeOutEnd = Math.round(sceneDurationInFrames * 0.58);
  const opacity = interpolate(frame, [fadeOutStart, fadeOutEnd], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ zIndex: 1, opacity }}>
      {children}
    </AbsoluteFill>
  );
};

/**
 * Conditionally wraps children in BlurFadeIn entrance motion.
 * If not active, renders children directly (zero overhead).
 */
const MaybeBlurFadeIn: React.FC<{
  active: boolean;
  delay?: number;
  children: React.ReactNode;
}> = ({ active, delay, children }) => {
  if (!active) return <>{children}</>;
  return (
    <BlurFadeIn startFrame={delay ?? 0} blurAmount={10} damping={20} stiffness={200}>
      {children}
    </BlurFadeIn>
  );
};

/**
 * Conditionally wraps children in TiltCard 3D perspective motion.
 * If not active, renders children directly (zero overhead).
 */
const MaybeTiltCard: React.FC<{
  active: boolean;
  motionConf?: { maxTilt?: number; speed?: number; perspective?: number };
  children: React.ReactNode;
}> = ({ active, motionConf, children }) => {
  if (!active) return <>{children}</>;
  return (
    <TiltCard
      maxTilt={motionConf?.maxTilt ?? 8}
      speed={motionConf?.speed ?? 1}
      perspective={motionConf?.perspective ?? 1000}
    >
      {children}
    </TiltCard>
  );
};

/**
 * Conditionally wraps children in a DS Surface component.
 * If SurfaceComp is undefined, renders children directly.
 */
const MaybeSurface: React.FC<{
  SurfaceComp: React.FC<any> | undefined;
  surfaceId: string | undefined;
  surfaceConf: any;
  children: React.ReactNode;
}> = ({ SurfaceComp, surfaceId, surfaceConf, children }) => {
  if (!SurfaceComp) return <>{children}</>;
  return (
    <SurfaceComp
      id={surfaceId!}
      blur={surfaceConf?.blur ?? 12}
      opacity={surfaceConf?.opacity ?? 0.08}
      borderRadius={surfaceConf?.borderRadius ?? 16}
      borderColor={surfaceConf?.borderColor}
      borderWidth={surfaceConf?.borderWidth}
      glowColor={surfaceConf?.glowColor}
      glowIntensity={surfaceConf?.glowIntensity}
    >
      {children}
    </SurfaceComp>
  );
};

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
