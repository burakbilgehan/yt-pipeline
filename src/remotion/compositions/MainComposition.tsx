import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { VideoCompositionProps, SceneInput } from "../schemas";
import { TransitionWrapper, ProgressBar, SubtitleOverlay, SectionTitle } from "../components";
import { SceneVisual } from "../templates/voiceover-visuals";
import { DataChartScene } from "../templates/data-charts";

/**
 * Main video composition.
 *
 * Takes storyboard scenes + audio files as input, renders the full video:
 * - Each scene is a Remotion <Sequence> positioned at the correct frame
 * - Scenes contain visuals (stock images, text overlays, or data charts)
 * - Data-chart scenes ALWAYS have a stock image background with the chart overlaid
 * - Audio segments are placed at their correct timeline positions
 * - Subtitles progress sentence-by-sentence
 * - Progress bar shows minimal YouTube-style chapter markers
 */
const MainComposition: React.FC<VideoCompositionProps> = ({
  title,
  scenes,
  audioFiles,
  audioSegments,
  showSubtitles,
  showProgressBar,
  brandColor,
  fontFamily,
}) => {
  const { fps, durationInFrames } = useVideoConfig();

  // Compute unique section count for the progress bar chapter markers
  const uniqueSections = new Set(scenes.map((s) => s.section)).size;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      {/* ── Scene sequences ── */}
      {scenes.map((scene, index) => {
        const startFrame = Math.round(scene.startTime * fps);
        const endFrame = Math.round(scene.endTime * fps);
        const sceneDuration = endFrame - startFrame;

        if (sceneDuration <= 0) return null;

        const isDataChart =
          scene.visual.type === "data-chart" && scene.visual.dataChart;

        return (
          <Sequence
            key={scene.id}
            from={startFrame}
            durationInFrames={sceneDuration}
            name={`Scene: ${scene.section}`}
          >
            <TransitionWrapper
              type={scene.transition}
              sceneDurationInFrames={sceneDuration}
            >
              {/* Layer 1: Always show SceneVisual as background
                  (provides Ken Burns image or cinematic gradient)
                  Fallback: use previous scene's image for continuity */}
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

              {/* Layer 2: Data chart overlay (semi-transparent, on top of image) */}
              {isDataChart && (
                <AbsoluteFill
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 40,
                  }}
                >
                  <DataChartScene
                    chart={scene.visual.dataChart!}
                    brandColor={brandColor}
                    fontFamily={fontFamily}
                  />
                </AbsoluteFill>
              )}

              {/* Section title (appears briefly at scene start) */}
              <SectionTitle
                title={scene.section}
                brandColor={brandColor}
                fontFamily={fontFamily}
              />

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
            const startFrame = Math.round(segment.startTime * fps);
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
            const startFrame = Math.round(scene.startTime * fps);
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

      {/* ── Progress bar overlay ── */}
      {showProgressBar && scenes.length > 0 && (
        <ProgressBarOverlay
          scenes={scenes}
          fps={fps}
          totalFrames={durationInFrames}
          color={brandColor}
          sectionCount={uniqueSections}
        />
      )}
    </AbsoluteFill>
  );
};

export default MainComposition;

// ─── Internal: Find previous scene's asset for fallback ───────

function findPreviousAsset(scenes: SceneInput[], currentIndex: number): string | undefined {
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (scenes[i].visual.assetPath) {
      return scenes[i].visual.assetPath;
    }
  }
  return undefined;
}

// ─── Internal: Progress bar that tracks current scene ─────────

interface ProgressBarOverlayProps {
  scenes: SceneInput[];
  fps: number;
  totalFrames: number;
  color: string;
  sectionCount: number;
}

const ProgressBarOverlay: React.FC<ProgressBarOverlayProps> = ({
  scenes,
  fps,
  totalFrames,
  color,
  sectionCount,
}) => {
  const frame = useCurrentFrame();

  let currentScene = 0;
  for (let i = 0; i < scenes.length; i++) {
    const sceneStart = Math.round(scenes[i].startTime * fps);
    const sceneEnd = Math.round(scenes[i].endTime * fps);
    if (frame >= sceneStart && frame < sceneEnd) {
      currentScene = i;
      break;
    }
  }

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <ProgressBar
        currentScene={currentScene}
        totalScenes={scenes.length}
        globalFrame={frame}
        totalFrames={totalFrames}
        color={color}
        sectionCount={sectionCount}
      />
    </AbsoluteFill>
  );
};
