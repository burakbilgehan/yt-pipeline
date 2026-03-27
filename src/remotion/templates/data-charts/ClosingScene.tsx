import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  OffthreadVideo,
  staticFile,
  Sequence,
  AbsoluteFill,
} from "remotion";
import { QuadrantScatter } from "./QuadrantScatter";
import { EndCardScene } from "./EndCardScene";
import type { DataChartInput } from "../../schemas";
import { BG } from "../../palette";

/**
 * ClosingScene — Three-phase closing for Time vs Earnings.
 *
 * Phase A: QuadrantScatter chart (spotlight on two countries)
 * Phase B: Stock video (e.g. earth from space) — voiceover continues underneath
 * Phase C: EndCardScene (subscribe + next video + fade to black)
 *
 * Each phase is a Remotion <Sequence> with crossfade transitions.
 */

interface ClosingSceneConfig {
  type: "closing-scene";

  // Phase A — chart
  chartConfig: any; // QuadrantScatter config (passed as dataChart to QuadrantScatter)
  chartEndSec: number; // seconds from scene start when chart phase ends

  // Phase B — stock video
  videoSrc: string; // staticFile path to the stock video
  videoStartSec: number; // seconds from scene start
  videoEndSec: number; // seconds from scene start
  videoOverlayTint?: string; // optional dark tint over video

  // Phase C — end screen
  endScreenStartSec: number; // seconds from scene start
  endCardConfig?: any; // EndCardScene config
}

interface ClosingSceneProps {
  chart: DataChartInput;
  brandColor: string;
  fontFamily: string;
}

const CROSSFADE_SEC = 1.5; // crossfade duration between phases

export const ClosingScene: React.FC<ClosingSceneProps> = ({
  chart,
  brandColor,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const cfg = chart as unknown as ClosingSceneConfig;

  const chartEndSec = cfg.chartEndSec ?? 17;
  const videoStartSec = cfg.videoStartSec ?? 17;
  const videoEndSec = cfg.videoEndSec ?? 34;
  const endScreenStartSec = cfg.endScreenStartSec ?? 34;
  const videoSrc = cfg.videoSrc || "";
  const tint = cfg.videoOverlayTint || "rgba(26, 27, 34, 0.3)";

  // Frame boundaries
  const chartEndFrame = Math.round(chartEndSec * fps);
  const videoStartFrame = Math.round(videoStartSec * fps);
  const videoEndFrame = Math.round(videoEndSec * fps);
  const endScreenStartFrame = Math.round(endScreenStartSec * fps);
  const crossfadeFrames = Math.round(CROSSFADE_SEC * fps);

  // Chart opacity: fade out in last crossfadeFrames before chartEnd
  const chartFadeStart = chartEndFrame - crossfadeFrames;
  const chartOpacity = interpolate(
    frame,
    [chartFadeStart, chartEndFrame],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Video opacity: fade in during first crossfadeFrames, fade out in last crossfadeFrames
  const videoFadeInEnd = videoStartFrame + crossfadeFrames;
  const videoFadeOutStart = videoEndFrame - crossfadeFrames;
  const videoOpacityIn = interpolate(
    frame,
    [videoStartFrame, videoFadeInEnd],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const videoOpacityOut = interpolate(
    frame,
    [videoFadeOutStart, videoEndFrame],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const videoOpacity = Math.min(videoOpacityIn, videoOpacityOut);

  // End screen opacity: fade in during first crossfadeFrames
  const endScreenFadeInEnd = endScreenStartFrame + crossfadeFrames;
  const endScreenOpacity = interpolate(
    frame,
    [endScreenStartFrame, endScreenFadeInEnd],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Build QuadrantScatter chart props
  const chartProps: DataChartInput = {
    type: "quadrant-scatter",
    ...(cfg.chartConfig || {}),
  };

  // Build EndCard props
  const endCardProps: DataChartInput = {
    type: "end-card",
    fadeToBlack: true,
    backgroundColor: BG,
    watermark: true,
    youtubeEndScreen: { enabled: true },
    ...(cfg.endCardConfig || {}),
  };

  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      {/* ── Phase A: QuadrantScatter chart ── */}
      {frame < chartEndFrame + crossfadeFrames && (
        <AbsoluteFill style={{ opacity: chartOpacity }}>
          <AbsoluteFill
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 40,
            }}
          >
            <QuadrantScatter
              chart={chartProps}
              brandColor={brandColor}
              fontFamily={fontFamily}
            />
          </AbsoluteFill>
        </AbsoluteFill>
      )}

      {/* ── Phase B: Stock video ── */}
      {videoSrc && (
        <Sequence
          from={videoStartFrame}
          durationInFrames={videoEndFrame - videoStartFrame}
        >
          <AbsoluteFill style={{ opacity: videoOpacity }}>
            <OffthreadVideo
              src={staticFile(videoSrc)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
              muted
            />
            {/* Dark tint overlay */}
            <AbsoluteFill
              style={{
                backgroundColor: tint,
                pointerEvents: "none",
              }}
            />
          </AbsoluteFill>
        </Sequence>
      )}

      {/* ── Phase C: End screen ── */}
      <Sequence
        from={endScreenStartFrame}
        durationInFrames={durationInFrames - endScreenStartFrame}
      >
        <AbsoluteFill style={{ opacity: endScreenOpacity }}>
          <EndCardScene
            chart={endCardProps}
            brandColor={brandColor}
            fontFamily={fontFamily}
          />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
