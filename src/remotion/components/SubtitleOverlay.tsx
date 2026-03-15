import React from "react";
import { interpolate, useCurrentFrame, spring, useVideoConfig } from "remotion";

interface SubtitleOverlayProps {
  /** The voiceover text for this scene */
  text: string;
  /** Font family */
  fontFamily: string;
  /** Duration of this scene in frames */
  sceneDurationInFrames: number;
}

/**
 * Cinematic subtitle overlay — splits text into short sentences and reveals
 * them one at a time across the scene duration.
 *
 * Each sentence fades in (spring) and fades out before the next one appears.
 * Styled like YouTube captions: short lines, centered at bottom, with a
 * semi-transparent pill background and subtle shadow.
 */
export const SubtitleOverlay: React.FC<SubtitleOverlayProps> = ({
  text,
  fontFamily,
  sceneDurationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!text || text.trim().length === 0) {
    return null;
  }

  // Split text into sentences / short phrases
  const sentences = splitIntoSubtitleChunks(text);
  if (sentences.length === 0) return null;

  // Distribute sentences evenly across the scene duration
  // Leave a small buffer at start (8 frames) and end (8 frames)
  const buffer = 8;
  const usableFrames = sceneDurationInFrames - buffer * 2;
  const framesPerSentence = Math.max(
    Math.floor(usableFrames / sentences.length),
    20 // minimum ~0.7s per sentence at 30fps
  );

  // Which sentence should be showing right now?
  const adjustedFrame = frame - buffer;
  const currentIndex = Math.floor(adjustedFrame / framesPerSentence);

  if (currentIndex < 0 || currentIndex >= sentences.length) return null;

  const sentenceLocalFrame = adjustedFrame - currentIndex * framesPerSentence;
  const currentSentence = sentences[currentIndex];

  // Entrance spring
  const enterSpring = spring({
    fps,
    frame: sentenceLocalFrame,
    config: { damping: 22, stiffness: 120 },
  });

  // Fade out in the last 6 frames of each sentence
  const fadeOutStart = framesPerSentence - 6;
  const exitOpacity = interpolate(
    sentenceLocalFrame,
    [fadeOutStart, framesPerSentence],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const opacity = Math.min(enterSpring, exitOpacity);
  const translateY = interpolate(enterSpring, [0, 1], [12, 0]);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 60,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        zIndex: 50,
        opacity,
        transform: `translateY(${translateY}px)`,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.65)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          borderRadius: 6,
          padding: "10px 28px",
          maxWidth: "75%",
        }}
      >
        <p
          style={{
            color: "#FFFFFF",
            fontSize: 26,
            fontFamily,
            lineHeight: 1.35,
            margin: 0,
            textAlign: "center",
            fontWeight: 500,
            textShadow: "0 1px 4px rgba(0,0,0,0.6)",
          }}
        >
          {currentSentence}
        </p>
      </div>
    </div>
  );
};

/**
 * Splits a paragraph into subtitle-friendly chunks.
 * Tries to split on sentence boundaries (., !, ?) first, then on commas/dashes
 * for long sentences. Each chunk ≤ ~80 chars.
 */
function splitIntoSubtitleChunks(text: string): string[] {
  // First split into sentences
  const rawSentences = text
    .replace(/\n/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const chunks: string[] = [];
  const MAX_CHARS = 80;

  for (const sentence of rawSentences) {
    if (sentence.length <= MAX_CHARS) {
      chunks.push(sentence);
    } else {
      // Split long sentence on commas, semicolons, or dashes
      const parts = sentence
        .split(/(?<=[,;–—])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      let current = "";
      for (const part of parts) {
        if (current.length + part.length + 1 <= MAX_CHARS) {
          current = current ? `${current} ${part}` : part;
        } else {
          if (current) chunks.push(current);
          current = part;
        }
      }
      if (current) chunks.push(current);
    }
  }

  return chunks;
}
