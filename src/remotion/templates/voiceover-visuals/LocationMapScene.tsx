import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { TiltCard } from "../../design-system/motion/TiltCard";
import {
  BG,
  TEXT,
  TEXT_MUTED,
  SURFACE,
  SURFACE_BORDER,
  POSITIVE,
} from "../../palette";

// ─── Types ────────────────────────────────────────────────────

interface LocationMapSceneProps {
  chart: {
    type: string;
    location: string;
    coordinates?: string;
    pinColor?: string;
    expandAtFrame?: number;
    [key: string]: unknown;
  };
  brandColor: string;
  fontFamily: string;
}

// ─── Color constants matching original's CSS ──────────────────
// foreground = TEXT (#F0EDE8)
const FG_25 = "rgba(240, 237, 232, 0.25)"; // stroke foreground/25
const FG_20 = "rgba(240, 237, 232, 0.20)"; // stroke foreground/20
const FG_10 = "rgba(240, 237, 232, 0.10)"; // stroke foreground/10
const FG_05 = "rgba(240, 237, 232, 0.05)"; // bg-foreground/5
const PIN_GREEN = "#34D399"; // emerald-400
const EMERALD_500_50 = "rgba(16, 185, 129, 0.50)"; // emerald-500/50

// ─── Collapsed State Sub-Components ───────────────────────────

/** Grid pattern SVG — matches original's 20×20 pattern at opacity 0.03 */
const GridPattern: React.FC<{ scale: number }> = ({ scale }) => (
  <svg
    style={{
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      opacity: 0.03,
    }}
  >
    <defs>
      <pattern
        id="grid-pattern"
        width={20 * scale}
        height={20 * scale}
        patternUnits="userSpaceOnUse"
      >
        <path
          d={`M ${20 * scale} 0 L 0 0 0 ${20 * scale}`}
          fill="none"
          stroke={TEXT}
          strokeWidth={0.5}
        />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#grid-pattern)" />
  </svg>
);

/** Small green map icon (top-left) — original: 18×18 with glow */
const MapIcon: React.FC<{ color: string; scale: number }> = ({
  color,
  scale,
}) => (
  <div
    style={{
      position: "absolute",
      top: 20 * scale,
      left: 20 * scale,
    }}
  >
    <svg
      width={18 * scale}
      height={18 * scale}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        filter: `drop-shadow(0 0 ${6 * scale}px ${color}40)`,
      }}
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx={12} cy={10} r={3} />
    </svg>
  </div>
);

/** "LIVE" status badge (top-right) — green dot + text in pill */
const LiveBadge: React.FC<{ scale: number }> = ({ scale }) => (
  <div
    style={{
      position: "absolute",
      top: 20 * scale,
      right: 20 * scale,
      display: "flex",
      alignItems: "center",
      gap: 6 * scale,
      backgroundColor: FG_05,
      borderRadius: 999,
      padding: `${4 * scale}px ${10 * scale}px`,
    }}
  >
    <div
      style={{
        width: 6 * scale,
        height: 6 * scale,
        borderRadius: "50%",
        backgroundColor: PIN_GREEN,
      }}
    />
    <span
      style={{
        fontSize: 10 * scale,
        fontWeight: 600,
        color: TEXT_MUTED,
        letterSpacing: 1,
      }}
    >
      LIVE
    </span>
  </div>
);

/** Location name + underline (bottom of collapsed card) */
const CollapsedLabel: React.FC<{
  location: string;
  underlineScaleX: number;
  scale: number;
}> = ({ location, underlineScaleX, scale }) => (
  <div
    style={{
      position: "absolute",
      bottom: 20 * scale,
      left: 20 * scale,
      right: 20 * scale,
    }}
  >
    <div
      style={{
        fontSize: 14 * scale,
        fontWeight: 500,
        color: TEXT,
        letterSpacing: -0.3,
      }}
    >
      {location}
    </div>
    <div
      style={{
        marginTop: 6 * scale,
        height: 1 * scale,
        background: `linear-gradient(to right, ${EMERALD_500_50}, transparent)`,
        transform: `scaleX(${underlineScaleX})`,
        transformOrigin: "left",
      }}
    />
  </div>
);

// ─── Expanded State — Map Content ─────────────────────────────

/**
 * Street data matching the original's percentage-based layout.
 * Each street: x1%, y1%, x2%, y2%, strokeWidth, opacity-tier, delay (seconds)
 */
interface StreetDef {
  x1: string; y1: string; x2: string; y2: string;
  sw: number; opacity: string; delay: number;
}

// Horizontal main roads
const H_MAIN: StreetDef[] = [
  { x1: "0%", y1: "35%", x2: "100%", y2: "35%", sw: 4, opacity: FG_25, delay: 0.2 },
  { x1: "0%", y1: "65%", x2: "100%", y2: "65%", sw: 4, opacity: FG_25, delay: 0.3 },
];
// Vertical main roads
const V_MAIN: StreetDef[] = [
  { x1: "30%", y1: "0%", x2: "30%", y2: "100%", sw: 3, opacity: FG_20, delay: 0.4 },
  { x1: "70%", y1: "0%", x2: "70%", y2: "100%", sw: 3, opacity: FG_20, delay: 0.5 },
];
// Secondary horizontal
const H_SEC: StreetDef[] = [
  { x1: "0%", y1: "20%", x2: "100%", y2: "20%", sw: 1.5, opacity: FG_10, delay: 0.6 },
  { x1: "0%", y1: "50%", x2: "100%", y2: "50%", sw: 1.5, opacity: FG_10, delay: 0.7 },
  { x1: "0%", y1: "80%", x2: "100%", y2: "80%", sw: 1.5, opacity: FG_10, delay: 0.8 },
];
// Secondary vertical
const V_SEC: StreetDef[] = [
  { x1: "15%", y1: "0%", x2: "15%", y2: "100%", sw: 1.5, opacity: FG_10, delay: 0.7 },
  { x1: "45%", y1: "0%", x2: "45%", y2: "100%", sw: 1.5, opacity: FG_10, delay: 0.8 },
  { x1: "55%", y1: "0%", x2: "55%", y2: "100%", sw: 1.5, opacity: FG_10, delay: 0.9 },
  { x1: "85%", y1: "0%", x2: "85%", y2: "100%", sw: 1.5, opacity: FG_10, delay: 1.0 },
];

const ALL_STREETS: StreetDef[] = [...H_MAIN, ...V_MAIN, ...H_SEC, ...V_SEC];

/**
 * Building rectangles — positioned as in original.
 * left%, top%, width%, height%, bg opacity, border opacity
 */
interface BuildingDef {
  left: string; top: string; width: string; height: string;
  bgOpacity: number; borderOpacity: number; delay: number;
}

const BUILDINGS: BuildingDef[] = [
  { left: "8%",  top: "22%", width: "12%", height: "10%", bgOpacity: 0.2, borderOpacity: 0.12, delay: 0.50 },
  { left: "35%", top: "8%",  width: "10%", height: "14%", bgOpacity: 0.25, borderOpacity: 0.15, delay: 0.55 },
  { left: "72%", top: "22%", width: "14%", height: "10%", bgOpacity: 0.2, borderOpacity: 0.12, delay: 0.60 },
  { left: "10%", top: "68%", width: "10%", height: "12%", bgOpacity: 0.3, borderOpacity: 0.2,  delay: 0.65 },
  { left: "55%", top: "70%", width: "12%", height: "8%",  bgOpacity: 0.2, borderOpacity: 0.12, delay: 0.70 },
  { left: "78%", top: "55%", width: "10%", height: "14%", bgOpacity: 0.25, borderOpacity: 0.15, delay: 0.75 },
];

/** Streets SVG — pathLength animation like original */
const StreetsSvg: React.FC<{
  frame: number;
  fps: number;
  mapStart: number;
}> = ({ frame, fps, mapStart }) => (
  <svg
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
    style={{
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
    }}
  >
    {ALL_STREETS.map((st, i) => {
      const delayFrames = Math.round(st.delay * fps);
      const startFrame = mapStart + delayFrames;
      const drawDuration = Math.round(0.6 * fps); // ~0.6s draw
      const progress = interpolate(
        frame,
        [startFrame, startFrame + drawDuration],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      );
      return (
        <line
          key={`street-${i}`}
          x1={st.x1}
          y1={st.y1}
          x2={st.x2}
          y2={st.y2}
          stroke={st.opacity}
          strokeWidth={st.sw}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - progress}
        />
      );
    })}
  </svg>
);

/** Building rectangles — fade in + scale 0.8→1 matching original */
const BuildingsLayer: React.FC<{
  frame: number;
  fps: number;
  mapStart: number;
}> = ({ frame, fps, mapStart }) => (
  <>
    {BUILDINGS.map((b, i) => {
      const delayFrames = Math.round(b.delay * fps);
      const startFrame = mapStart + delayFrames;
      const dur = Math.round(0.4 * fps); // 0.4s
      const progress = interpolate(
        frame,
        [startFrame, startFrame + dur],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      );
      const scale = interpolate(progress, [0, 1], [0.8, 1]);
      const opacity = progress;
      return (
        <div
          key={`bld-${i}`}
          style={{
            position: "absolute",
            left: b.left,
            top: b.top,
            width: b.width,
            height: b.height,
            backgroundColor: `rgba(240, 237, 232, ${b.bgOpacity * opacity})`,
            border: `1px solid rgba(240, 237, 232, ${b.borderOpacity * opacity})`,
            borderRadius: 2,
            transform: `scale(${scale})`,
          }}
        />
      );
    })}
  </>
);

/** Pin marker — spring drop at center, matching original config */
const PinMarker: React.FC<{
  frame: number;
  fps: number;
  mapStart: number;
  pinColor: string;
}> = ({ frame, fps, mapStart, pinColor }) => {
  // Original: spring stiffness 400, damping 20, delay 0.3s
  const pinDelayFrames = Math.round(0.3 * fps);
  const pinStart = mapStart + pinDelayFrames;
  const pinSpring = spring({
    fps,
    frame: Math.max(0, frame - pinStart),
    config: { stiffness: 400, damping: 20 },
  });
  const pinProgress = frame < pinStart ? 0 : pinSpring;
  const pinScale = interpolate(pinProgress, [0, 1], [0, 1]);
  const pinY = interpolate(pinProgress, [0, 1], [-20, 0]);

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: `translate(-50%, -50%) translateY(${pinY}px) scale(${pinScale})`,
        transformOrigin: "center bottom",
      }}
    >
      <svg
        width={36}
        height={44}
        viewBox="0 0 36 44"
        fill="none"
        style={{
          filter: `drop-shadow(0 0 8px ${pinColor}80)`,
        }}
      >
        {/* Pin body */}
        <path
          d="M18 0C10 0 4 6 4 14C4 26 18 44 18 44C18 44 32 26 32 14C32 6 26 0 18 0Z"
          fill={pinColor}
        />
        {/* White inner circle */}
        <circle cx={18} cy={14} r={6} fill="white" />
      </svg>
    </div>
  );
};

/** Bottom gradient — original: from-background to transparent, opacity 60% */
const BottomGradient: React.FC = () => (
  <div
    style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: "30%",
      background: `linear-gradient(to top, ${BG}, transparent)`,
      opacity: 0.6,
      pointerEvents: "none",
    }}
  />
);

// ─── Coordinates Overlay (expanded only) ──────────────────────

const CoordinatesText: React.FC<{
  coordinates: string;
  frame: number;
  fps: number;
  showStart: number;
  scale: number;
}> = ({ coordinates, frame, fps, showStart, scale }) => {
  const dur = Math.round(0.4 * fps);
  const progress = interpolate(
    frame,
    [showStart, showStart + dur],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const slideY = interpolate(progress, [0, 1], [-10, 0]);
  return (
    <div
      style={{
        position: "absolute",
        bottom: 16 * scale,
        left: 0,
        right: 0,
        textAlign: "center",
        opacity: progress,
        transform: `translateY(${slideY}px)`,
      }}
    >
      <span
        style={{
          fontFamily: "monospace",
          fontSize: 12 * scale,
          color: TEXT_MUTED,
          letterSpacing: 0.5,
        }}
      >
        {coordinates}
      </span>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────

export const LocationMapScene: React.FC<LocationMapSceneProps> = ({
  chart,
  brandColor,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const {
    location = "Istanbul, Turkey",
    coordinates = "41.0082° N, 28.9784° E",
    pinColor = PIN_GREEN,
    expandAtFrame = Math.round(fps * 1),
  } = chart;

  // ─── Card dimensions (original: collapsed 240×140, expanded 360×280) ──
  // Scaled 2.5x for 1080p video: collapsed 600×350, expanded 900×700
  const SCALE = 2.5;
  const COLLAPSED_W = 240 * SCALE; // 600
  const COLLAPSED_H = 140 * SCALE; // 350
  const EXPANDED_W = 360 * SCALE;  // 900
  const EXPANDED_H = 280 * SCALE;  // 700

  // ─── Entrance fade ───────────────────────────────────────────
  const entranceOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ─── Card expand spring (original: stiffness 400, damping 35) ──
  const expandProgress = spring({
    fps,
    frame: Math.max(0, frame - expandAtFrame),
    config: { damping: 35, stiffness: 400 },
  });
  const rawExpand = frame < expandAtFrame ? 0 : expandProgress;

  const cardWidth = interpolate(rawExpand, [0, 1], [COLLAPSED_W, EXPANDED_W]);
  const cardHeight = interpolate(rawExpand, [0, 1], [COLLAPSED_H, EXPANDED_H]);

  // ─── Post-expand animation timing ────────────────────────────
  // Original delays are in seconds; convert to frames
  // Streets draw after expand settles (~20 frames after expandAtFrame)
  const mapStart = expandAtFrame + 20;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily,
      }}
    >
      <TiltCard maxTilt={6} speed={0.8} perspective={1000}>
        <div
          style={{
            width: cardWidth,
            height: cardHeight,
            backgroundColor: BG,
            border: `1px solid ${SURFACE_BORDER}`,
            borderRadius: 20 * SCALE / 2.5, // rounded-2xl ≈ 16px → keep 20 for video
            overflow: "hidden",
            opacity: entranceOpacity,
            position: "relative",
          }}
        >
          {/* Gradient overlay (original: from-muted/20 to-muted/40) */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.04) 100%)`,
              pointerEvents: "none",
            }}
          />

          {/* ── Collapsed state content (fades out as card expands) ── */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: interpolate(rawExpand, [0, 0.3], [1, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              pointerEvents: rawExpand > 0.3 ? "none" : "auto",
            }}
          >
            <GridPattern scale={SCALE} />
            <MapIcon color={pinColor as string} scale={SCALE} />
            <LiveBadge scale={SCALE} />
            <CollapsedLabel
              location={location as string}
              underlineScaleX={interpolate(
                frame,
                [0, 10],
                [0.3, 0.3], // static 0.3 in collapsed — original's resting state
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
              )}
              scale={SCALE}
            />
          </div>

          {/* ── Expanded state content (fades in as card expands) ── */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: interpolate(rawExpand, [0.2, 0.6], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              backgroundColor: SURFACE, // bg-muted fills entire card
            }}
          >
            {/* Street network */}
            <StreetsSvg frame={frame} fps={fps} mapStart={mapStart} />

            {/* Buildings */}
            <BuildingsLayer frame={frame} fps={fps} mapStart={mapStart} />

            {/* Center pin */}
            <PinMarker
              frame={frame}
              fps={fps}
              mapStart={mapStart}
              pinColor={pinColor as string}
            />

            {/* Bottom gradient overlay */}
            <BottomGradient />

            {/* Coordinates text — appears after pin lands */}
            <CoordinatesText
              coordinates={coordinates as string}
              frame={frame}
              fps={fps}
              showStart={mapStart + Math.round(1.2 * fps)}
              scale={SCALE}
            />
          </div>

          {/* ── Underline extends to full after map draws ── */}
          {rawExpand > 0.9 && (
            <div
              style={{
                position: "absolute",
                bottom: 20 * SCALE,
                left: 20 * SCALE,
                right: 20 * SCALE,
              }}
            >
              {/* Location name at bottom of expanded card */}
              <div
                style={{
                  fontSize: 14 * SCALE,
                  fontWeight: 500,
                  color: TEXT,
                  letterSpacing: -0.3,
                  opacity: interpolate(
                    frame,
                    [mapStart + Math.round(1.0 * fps), mapStart + Math.round(1.2 * fps)],
                    [0, 1],
                    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
                  ),
                }}
              >
                {location as string}
              </div>
              <div
                style={{
                  marginTop: 6 * SCALE,
                  height: 1 * SCALE,
                  background: `linear-gradient(to right, ${EMERALD_500_50}, transparent)`,
                  transform: `scaleX(${interpolate(
                    frame,
                    [mapStart + Math.round(1.3 * fps), mapStart + Math.round(1.6 * fps)],
                    [0.3, 1],
                    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
                  )})`,
                  transformOrigin: "left",
                }}
              />
            </div>
          )}
        </div>
      </TiltCard>
    </AbsoluteFill>
  );
};
