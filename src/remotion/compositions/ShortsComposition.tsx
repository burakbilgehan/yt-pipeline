import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { ShortsCompositionProps, SceneInput } from "../schemas";
import { SubtitleOverlay } from "../components";
import { SceneVisual } from "../templates/voiceover-visuals";
import { DataChartScene } from "../templates/data-charts";
import { loadFontsSync } from "../../fonts/load-fonts";

/**
 * Shorts video composition (9:16, 1080x1920).
 *
 * Optimized for vertical format:
 * - Image fills the top portion
 * - Bigger subtitles at bottom
 * - No progress bar
 * - Cuts only (faster transitions)
 * - Data charts centered
 */
const ShortsComposition: React.FC<ShortsCompositionProps> = ({
  title,
  scenes,
  audioFiles,
  audioSegments,
  showSubtitles,
  brandColor,
  fontFamily,
}) => {
  const { fps } = useVideoConfig();

  // Safety net: ensure fonts are loaded (primary load happens in Root.tsx calculateMetadata)
  loadFontsSync(fontFamily);

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
            {/* Cuts only for shorts — no transition wrapper */}
            <AbsoluteFill>
              {/* Visual background */}
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

              {/* Data chart overlay */}
              {isDataChart && (
                <AbsoluteFill
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 30,
                  }}
                >
                  <DataChartScene
                    chart={scene.visual.dataChart!}
                    brandColor={brandColor}
                    fontFamily={fontFamily}
                  />
                </AbsoluteFill>
              )}

              {/* Shorts subtitles — bigger, lower, wider */}
              {showSubtitles && scene.voiceover && (
                <ShortsSubtitle
                  text={scene.voiceover}
                  fontFamily={fontFamily}
                  sceneDurationInFrames={sceneDuration}
                />
              )}
            </AbsoluteFill>
          </Sequence>
        );
      })}

      {/* ── Audio tracks ── */}
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
    </AbsoluteFill>
  );
};

export default ShortsComposition;

// ─── Internal helpers ─────────────────────────────────────────

function findPreviousAsset(scenes: SceneInput[], currentIndex: number): string | undefined {
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (scenes[i].visual.assetPath) {
      return scenes[i].visual.assetPath;
    }
  }
  return undefined;
}

// ─── Shorts-optimized subtitle ────────────────────────────────

import { spring, interpolate } from "remotion";

interface ShortsSubtitleProps {
  text: string;
  fontFamily: string;
  sceneDurationInFrames: number;
}

const ShortsSubtitle: React.FC<ShortsSubtitleProps> = ({
  text,
  fontFamily,
  sceneDurationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!text || text.trim().length === 0) return null;

  // Split into shorter chunks for vertical format
  const sentences = text
    .replace(/\n/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (sentences.length === 0) return null;

  const buffer = 6;
  const usableFrames = sceneDurationInFrames - buffer * 2;
  const framesPerSentence = Math.max(
    Math.floor(usableFrames / sentences.length),
    15
  );

  const adjustedFrame = frame - buffer;
  const currentIndex = Math.floor(adjustedFrame / framesPerSentence);

  if (currentIndex < 0 || currentIndex >= sentences.length) return null;

  const sentenceLocalFrame = adjustedFrame - currentIndex * framesPerSentence;
  const currentSentence = sentences[currentIndex];

  const enterSpring = spring({
    fps,
    frame: sentenceLocalFrame,
    config: { damping: 20, stiffness: 120 },
  });

  const fadeOutStart = framesPerSentence - 5;
  const exitOpacity = interpolate(
    sentenceLocalFrame,
    [fadeOutStart, framesPerSentence],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const opacity = Math.min(enterSpring, exitOpacity);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 100,
        left: 20,
        right: 20,
        display: "flex",
        justifyContent: "center",
        zIndex: 50,
        opacity,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.75)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          borderRadius: 10,
          padding: "14px 24px",
          maxWidth: "95%",
        }}
      >
        <p
          style={{
            color: "#FFFFFF",
            fontSize: 36, // bigger for shorts
            fontFamily,
            lineHeight: 1.3,
            margin: 0,
            textAlign: "center",
            fontWeight: 600,
            textShadow: "0 2px 6px rgba(0,0,0,0.8)",
          }}
        >
          {currentSentence}
        </p>
      </div>
    </div>
  );
};
