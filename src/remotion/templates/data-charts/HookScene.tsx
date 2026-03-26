import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  OffthreadVideo,
  staticFile,
  Easing,
  Sequence,
} from "remotion";

/**
 * HookScene — Scene 001: "What is one hour of your life worth?"
 *
 * Visual sequence:
 * 1. Dark screen → Question text ease-in + clock icon below (0–3.5s)
 * 2. Hard cut → World map footage (3.5s–8s)
 * 3. Hard cut → White-collar worker footage (8s–12s)
 * 4. Hard cut → Factory worker footage (14s–end of scene)
 *
 * Each video phase uses a Remotion <Sequence> with exact frame boundaries.
 * Videos use OffthreadVideo (works in both Studio and render).
 */

interface HookSceneProps {
  chart: {
    type: string;
    questionText?: string;
    slug?: string;
    videos?: {
      worldmap?: string;
      whitecollar?: string;
      factory?: string;
    };
    phaseTimes?: {
      textEnd?: number;
      mapStart?: number;
      mapEnd?: number;
      whitecollarStart?: number;
      whitecollarEnd?: number;
      factoryStart?: number;
    };
    [key: string]: unknown;
  };
  brandColor: string;
  fontFamily: string;
}

// Simple clock icon using SVG
const ClockIcon: React.FC<{ progress: number; color: string; size: number }> = ({
  progress,
  color,
  size,
}) => {
  const tickAngle = progress * 360 * 2;
  const minuteAngle = progress * 360 * 0.5;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx={50} cy={50} r={45} fill="none" stroke={color} strokeWidth={2} opacity={0.6} />
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 30 - 90) * (Math.PI / 180);
        const x1 = 50 + 38 * Math.cos(angle);
        const y1 = 50 + 38 * Math.sin(angle);
        const x2 = 50 + 42 * Math.cos(angle);
        const y2 = 50 + 42 * Math.sin(angle);
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={color} strokeWidth={i % 3 === 0 ? 2.5 : 1.5} opacity={0.5} />
        );
      })}
      <line x1={50} y1={50}
        x2={50 + 30 * Math.cos((minuteAngle - 90) * (Math.PI / 180))}
        y2={50 + 30 * Math.sin((minuteAngle - 90) * (Math.PI / 180))}
        stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.8} />
      <line x1={50} y1={50}
        x2={50 + 20 * Math.cos((tickAngle - 90) * (Math.PI / 180))}
        y2={50 + 20 * Math.sin((tickAngle - 90) * (Math.PI / 180))}
        stroke={color} strokeWidth={3} strokeLinecap="round" />
      <circle cx={50} cy={50} r={3} fill={color} />
    </svg>
  );
};

export const HookScene: React.FC<HookSceneProps> = ({
  chart,
  brandColor,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;

  const questionText = chart.questionText || "Question text not configured";
  const slug = chart.slug || "";

  // Video file paths — prepend slug prefix for public dir lookup
  const videos = chart.videos || {};
  const prefix = slug ? `${slug}/` : "";
  const worldmapSrc = `${prefix}${videos.worldmap || "hook-worldmap.mp4"}`;
  const whitecollarSrc = `${prefix}${videos.whitecollar || "hook-whitecollar.mp4"}`;
  const factorySrc = `${prefix}${videos.factory || "hook-factory.mp4"}`;

  // Phase timings (configurable via storyboard)
  const phases = chart.phaseTimes || {};
  const TEXT_END = phases.textEnd ?? 3.5;
  const MAP_START = phases.mapStart ?? 3.5;
  const MAP_END = phases.mapEnd ?? 8.0;
  const WC_START = phases.whitecollarStart ?? 8.0;
  const WC_END = phases.whitecollarEnd ?? 12.0;
  const FAC_START = phases.factoryStart ?? 14.0;

  // ── Faz 1: Text + Clock (0 – TEXT_END) ──
  const textOpacity = interpolate(
    time,
    [0, 0.8, TEXT_END - 0.3, TEXT_END],
    [0, 1, 1, 0],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp", easing: Easing.out(Easing.cubic) }
  );
  const textScale = interpolate(
    time,
    [0, 0.8],
    [0.92, 1],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp", easing: Easing.out(Easing.cubic) }
  );
  const clockOpacity = interpolate(
    time,
    [0.2, 0.8, TEXT_END - 0.3, TEXT_END],
    [0, 0.7, 0.7, 0],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );
  const clockProgress = interpolate(time, [0, TEXT_END], [0, 1], {
    extrapolateRight: "clamp",
  });

  const showText = time < TEXT_END;

  const videoStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
  };

  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        backgroundColor: "#1A1B22",
        position: "relative",
        overflow: "hidden",
        fontFamily: fontFamily || "Inter, sans-serif",
      }}
    >
      {/* ── Faz 1: Question text + Clock ── */}
      {showText && (
        <div
          style={{
            position: "absolute",
            top: 0, left: 0, width: "100%", height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2,
          }}
        >
          <div
            style={{
              transform: `scale(${textScale})`,
              opacity: textOpacity,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: fontFamily || "Inter, sans-serif",
                fontSize: 52,
                color: "#EAE0D5",
                fontWeight: 500,
                letterSpacing: "0.02em",
                lineHeight: 1.3,
                maxWidth: 900,
              }}
            >
              {questionText}
            </div>
          </div>
          <div style={{ marginTop: 30, opacity: clockOpacity }}>
            <ClockIcon progress={clockProgress} color={brandColor || "#D8A7B1"} size={70} />
          </div>
        </div>
      )}

      {/* ── Faz 2: World map footage (MAP_START – MAP_END) ── */}
      <Sequence
        from={Math.round(MAP_START * fps)}
        durationInFrames={Math.round((MAP_END - MAP_START) * fps)}
      >
        <OffthreadVideo
          src={staticFile(worldmapSrc)}
          style={videoStyle}
          muted
        />
      </Sequence>

      {/* ── Faz 3: White-collar worker (WC_START – WC_END) ── */}
      <Sequence
        from={Math.round(WC_START * fps)}
        durationInFrames={Math.round((WC_END - WC_START) * fps)}
      >
        <OffthreadVideo
          src={staticFile(whitecollarSrc)}
          style={videoStyle}
          muted
        />
      </Sequence>

      {/* ── Faz 4: Factory worker (FAC_START – end of scene) ── */}
      <Sequence from={Math.round(FAC_START * fps)}>
        <OffthreadVideo
          src={staticFile(factorySrc)}
          style={videoStyle}
          muted
        />
      </Sequence>
    </div>
  );
};
