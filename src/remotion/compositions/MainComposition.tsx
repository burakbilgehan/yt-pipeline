import React from "react";
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
  backgroundMusic,
  showSubtitles,
  brandColor,
  fontFamily,
}) => {
  const { fps, durationInFrames } = useVideoConfig();

  // Safety net: ensure fonts are loaded (primary load happens in Root.tsx calculateMetadata)
  loadFontsSync(fontFamily);

  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      {/* ── Scene sequences ── */}
      {scenes.map((scene, index) => {
        const startFrame = Math.round(scene.startTime * fps);
        const endFrame = Math.round(scene.endTime * fps);
        const sceneDuration = endFrame - startFrame;

        if (sceneDuration <= 0) return null;

        const isDataChart =
          scene.visual.dataChart && (scene.visual.type === "data-chart" || scene.visual.type === "composite");

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
                    padding: 0,
                  }}
                >
                  <DataChartScene
                    chart={scene.visual.dataChart!}
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
