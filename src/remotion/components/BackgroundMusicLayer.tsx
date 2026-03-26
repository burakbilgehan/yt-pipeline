/**
 * BackgroundMusicLayer
 *
 * Plays multiple music tracks sequentially with crossfade transitions.
 * Loops from the beginning when all tracks finish. Fades in at video start
 * and fades out at video end. Volume is kept very low to never overpower speech.
 *
 * Used by MainComposition and CustomVideoComposition.
 */
import React from "react";
import { Audio, Sequence, interpolate, staticFile, useVideoConfig } from "remotion";

export interface BackgroundMusicTrack {
  /** Path to audio file (relative to publicDir) */
  src: string;
  /** Duration of the track in seconds */
  durationSec: number;
}

export interface BackgroundMusicConfig {
  /** Ordered list of tracks to play sequentially */
  tracks: BackgroundMusicTrack[];
  /** Base volume 0-1 (recommended: 0.04-0.08 for background) */
  volume: number;
  /** Crossfade duration between tracks in seconds (default: 3) */
  crossfadeSec?: number;
  /** Fade-in at video start in seconds (default: 3) */
  fadeInSec?: number;
  /** Fade-out at video end in seconds (default: 4) */
  fadeOutSec?: number;
}

/**
 * Compute the scheduled track instances across the full video duration.
 * Each track plays sequentially; when all finish, the playlist loops.
 * Tracks overlap by `crossfadeSec` at boundaries for smooth transitions.
 */
function computeSchedule(
  tracks: BackgroundMusicTrack[],
  totalDurationSec: number,
  crossfadeSec: number
): Array<{
  src: string;
  startSec: number;
  durationSec: number;
  trackIndex: number;
}> {
  if (tracks.length === 0) return [];

  const schedule: Array<{
    src: string;
    startSec: number;
    durationSec: number;
    trackIndex: number;
  }> = [];

  let cursor = 0; // seconds
  let idx = 0;

  while (cursor < totalDurationSec + crossfadeSec) {
    const track = tracks[idx % tracks.length];
    schedule.push({
      src: track.src,
      startSec: cursor,
      durationSec: track.durationSec,
      trackIndex: idx,
    });
    // Next track starts `crossfadeSec` before this one ends
    cursor += track.durationSec - crossfadeSec;
    idx++;

    // Safety: prevent infinite loop if tracks are very short
    if (idx > 200) break;
  }

  return schedule;
}

export const BackgroundMusicLayer: React.FC<{ config: BackgroundMusicConfig }> = ({
  config,
}) => {
  const { fps, durationInFrames } = useVideoConfig();

  const {
    tracks,
    volume: baseVolume,
    crossfadeSec = 3,
    fadeInSec = 3,
    fadeOutSec = 4,
  } = config;

  if (tracks.length === 0) return null;

  const totalDurationSec = durationInFrames / fps;
  const schedule = computeSchedule(tracks, totalDurationSec, crossfadeSec);

  const fadeInFrames = Math.round(fadeInSec * fps);
  const fadeOutFrames = Math.round(fadeOutSec * fps);
  const crossfadeFrames = Math.round(crossfadeSec * fps);

  return (
    <>
      {schedule.map((entry, i) => {
        const startFrame = Math.round(entry.startSec * fps);
        const trackDurationFrames = Math.round(entry.durationSec * fps);

        // Clamp: don't extend beyond video
        const effectiveEnd = Math.min(
          startFrame + trackDurationFrames,
          durationInFrames
        );
        const effectiveDuration = effectiveEnd - startFrame;
        if (effectiveDuration <= 0) return null;

        return (
          <Sequence
            key={`bgm-${entry.trackIndex}`}
            from={Math.max(0, startFrame)}
            durationInFrames={effectiveDuration}
            name={`BGM Track ${entry.trackIndex + 1}`}
          >
            <Audio
              src={staticFile(entry.src)}
              volume={(f) => {
                // f is frame relative to this Sequence (0-based)
                const absoluteFrame = Math.max(0, startFrame) + f;

                // ── Per-track crossfade envelope ──
                let trackEnvelope = 1;

                // Fade in this track over crossfadeSec
                // (skip for first track if it starts at 0 — video fadeIn handles it)
                if (i > 0 && crossfadeFrames > 0) {
                  trackEnvelope *= interpolate(
                    f,
                    [0, crossfadeFrames],
                    [0, 1],
                    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                  );
                }

                // Fade out this track at its end (crossfade into next)
                if (crossfadeFrames > 0) {
                  trackEnvelope *= interpolate(
                    f,
                    [effectiveDuration - crossfadeFrames, effectiveDuration],
                    [1, 0],
                    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                  );
                }

                // ── Global video fade in / fade out ──
                let globalEnvelope = 1;

                // Video start fade-in
                if (fadeInFrames > 0) {
                  globalEnvelope *= interpolate(
                    absoluteFrame,
                    [0, fadeInFrames],
                    [0, 1],
                    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                  );
                }

                // Video end fade-out
                if (fadeOutFrames > 0) {
                  globalEnvelope *= interpolate(
                    absoluteFrame,
                    [durationInFrames - fadeOutFrames, durationInFrames],
                    [1, 0],
                    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                  );
                }

                return baseVolume * trackEnvelope * globalEnvelope;
              }}
            />
          </Sequence>
        );
      })}
    </>
  );
};
