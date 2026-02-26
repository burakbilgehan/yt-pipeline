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
 * - Audio tracks are layered on top
 * - Subtitles and progress bar are shown as overlays
 */
const MainComposition: React.FC<VideoCompositionProps> = ({
  title,
  scenes,
  audioFiles,
  showSubtitles,
  showProgressBar,
  brandColor,
  fontFamily,
}) => {
  const { fps, durationInFrames } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      {/* ── Scene sequences ── */}
      {scenes.map((scene, index) => {
        const startFrame = Math.round(scene.startTime * fps);
        const endFrame = Math.round(scene.endTime * fps);
        const sceneDuration = endFrame - startFrame;

        if (sceneDuration <= 0) return null;

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
              {/* Background visual or data chart */}
              {scene.visual.type === "data-chart" && scene.visual.dataChart ? (
                <AbsoluteFill
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 60,
                    backgroundColor: "#0a0a0a",
                  }}
                >
                  <DataChartScene
                    chart={scene.visual.dataChart}
                    brandColor={brandColor}
                    fontFamily={fontFamily}
                  />
                </AbsoluteFill>
              ) : (
                <SceneVisual
                  visual={scene.visual}
                  brandColor={brandColor}
                  fontFamily={fontFamily}
                />
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
      {audioFiles.map((audioPath, index) => {
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
        />
      )}
    </AbsoluteFill>
  );
};

export default MainComposition;

// ─── Internal: Progress bar that tracks current scene ─────────

interface ProgressBarOverlayProps {
  scenes: SceneInput[];
  fps: number;
  totalFrames: number;
  color: string;
}

const ProgressBarOverlay: React.FC<ProgressBarOverlayProps> = ({
  scenes,
  fps,
  totalFrames,
  color,
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
      />
    </AbsoluteFill>
  );
};
