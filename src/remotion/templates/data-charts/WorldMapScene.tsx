import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COUNTRY_PATHS } from "./world-map-data";

// --- Types ---

export interface WorldMapConfig {
  type: "world-map";
  region: string;
  zoom: number;
  center: [number, number]; // [lon, lat]
  highlights?: string[];
  highlightColor?: string;
  chokepoints?: Array<{
    name: string;
    lon: number;
    lat: number;
    color: string;
    pulse?: boolean;
  }>;
  shippingLanes?: Array<{
    from: [number, number];
    to: [number, number];
    color: string;
    animated?: boolean;
  }>;
  annotations?: Array<{
    text: string;
    lon: number;
    lat: number;
    fontSize?: number;
  }>;
  routes?: Array<{
    points: [number, number][];
    color: string;
    dashed?: boolean;
    label?: string;
  }>;
  statusIndicator?: {
    text: string;
    color: string;
  };
  title?: string;
  subtitle?: string;
}

interface WorldMapSceneProps {
  config: WorldMapConfig;
  brandColor: string;
  fontFamily: string;
}

// --- Constants ---
const MAP_W = 1000;
const MAP_H = 500;
const BG = "#2A2A32";
const COUNTRY_FILL = "rgba(255,255,255,0.10)";
const COUNTRY_STROKE = "rgba(240,237,232,0.40)";
const HIGHLIGHT_FILL = "rgba(232,140,165,0.2)";
const TEXT_COLOR = "#F0EDE8";

// --- Projection helpers ---

function lonToX(lon: number): number {
  return ((lon + 180) / 360) * MAP_W;
}

function latToY(lat: number): number {
  return ((90 - lat) / 180) * MAP_H;
}

/** Compute animated viewBox for zoom/pan */
function useViewBox(config: WorldMapConfig, frame: number, fps: number) {
  const targetZoom = config.zoom || 1;
  const [cLon, cLat] = config.center || [0, 20];
  const cx = lonToX(cLon);
  const cy = latToY(cLat);

  // Animate zoom from 60% to target over first 30 frames
  const zoomProgress = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
  });
  const startZoom = Math.max(1, targetZoom * 0.6);
  const zoom = interpolate(zoomProgress, [0, 1], [startZoom, targetZoom]);

  const vw = MAP_W / zoom;
  const vh = MAP_H / zoom;
  const vx = Math.max(0, Math.min(MAP_W - vw, cx - vw / 2));
  const vy = Math.max(0, Math.min(MAP_H - vh, cy - vh / 2));

  return { vx, vy, vw, vh, zoom };
}

// --- Sub-components ---

const Countries: React.FC<{ highlights: Set<string>; highlightColor: string }> = React.memo(
  ({ highlights, highlightColor }) => (
    <g>
      {COUNTRY_PATHS.map((c) => (
        <path
          key={c.iso3}
          d={c.path}
          fill={highlights.has(c.iso3) ? highlightColor : COUNTRY_FILL}
          stroke={COUNTRY_STROKE}
          strokeWidth={0.5}
        />
      ))}
    </g>
  )
);

const ChokepointPin: React.FC<{
  cp: NonNullable<WorldMapConfig["chokepoints"]>[0];
  frame: number;
  fps: number;
  index: number;
}> = ({ cp, frame, fps, index }) => {
  const x = lonToX(cp.lon);
  const y = latToY(cp.lat);
  const delay = 30 + index * 5; // appear after zoom

  const scaleSpring = spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 120 } });
  const scale = Math.max(0, scaleSpring);

  // Pulse: subtle sine oscillation after spring settles
  const pulseScale = cp.pulse && frame > delay + 15
    ? 1 + 0.15 * Math.sin((frame - delay) * 0.12)
    : 1;

  const r = 4 * scale * pulseScale;

  return (
    <g>
      {/* Outer glow */}
      <circle cx={x} cy={y} r={r * 2} fill={cp.color} opacity={0.15 * scale} />
      {/* Main pin */}
      <circle cx={x} cy={y} r={r} fill={cp.color} opacity={0.9 * scale} />
      {/* Inner dot */}
      <circle cx={x} cy={y} r={r * 0.4} fill="#fff" opacity={0.8 * scale} />
    </g>
  );
};

const ShippingLane: React.FC<{
  lane: NonNullable<WorldMapConfig["shippingLanes"]>[0];
  frame: number;
}> = ({ lane, frame }) => {
  const x1 = lonToX(lane.from[0]);
  const y1 = latToY(lane.from[1]);
  const x2 = lonToX(lane.to[0]);
  const y2 = latToY(lane.to[1]);

  // Midpoint with curve offset
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2 - 15;
  const d = `M${x1},${y1} Q${mx},${my} ${x2},${y2}`;

  const dashOffset = lane.animated ? -(frame * 0.8) : 0;

  return (
    <path
      d={d}
      fill="none"
      stroke={lane.color}
      strokeWidth={1.2}
      strokeDasharray="6,4"
      strokeDashoffset={dashOffset}
      opacity={interpolate(frame, [20, 40], [0, 0.7], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
    />
  );
};

const RoutePath: React.FC<{
  route: NonNullable<WorldMapConfig["routes"]>[0];
  frame: number;
  index: number;
}> = ({ route, frame, index }) => {
  if (route.points.length < 2) return null;

  const projected = route.points.map(([lon, lat]) => [lonToX(lon), latToY(lat)] as const);

  // Build path: straight segments (could use bezier for smoothing)
  let d = `M${projected[0][0].toFixed(1)},${projected[0][1].toFixed(1)}`;
  for (let i = 1; i < projected.length; i++) {
    d += ` L${projected[i][0].toFixed(1)},${projected[i][1].toFixed(1)}`;
  }

  // Draw-on animation: estimate path length roughly
  const totalLen = projected.reduce((sum, p, i) => {
    if (i === 0) return 0;
    const dx = p[0] - projected[i - 1][0];
    const dy = p[1] - projected[i - 1][1];
    return sum + Math.sqrt(dx * dx + dy * dy);
  }, 0);

  const drawDelay = 35 + index * 10;
  const drawProgress = interpolate(frame, [drawDelay, drawDelay + 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const drawn = totalLen * drawProgress;

  return (
    <path
      d={d}
      fill="none"
      stroke={route.color}
      strokeWidth={1.5}
      strokeDasharray={route.dashed ? `${totalLen},${totalLen}` : `${totalLen},${totalLen}`}
      strokeDashoffset={totalLen - drawn}
      strokeLinecap="round"
    />
  );
};

const Annotation: React.FC<{
  ann: NonNullable<WorldMapConfig["annotations"]>[0];
  frame: number;
  index: number;
}> = ({ ann, frame, index }) => {
  const x = lonToX(ann.lon);
  const y = latToY(ann.lat);
  const delay = 45 + index * 8;
  const opacity = interpolate(frame, [delay, delay + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fontSize = ann.fontSize || 8;

  return (
    <text
      x={x}
      y={y}
      fill={TEXT_COLOR}
      fontSize={fontSize}
      fontFamily="sans-serif"
      textAnchor="middle"
      opacity={opacity}
      style={{ filter: `drop-shadow(0 1px 2px rgba(0,0,0,0.6))` }}
    >
      {ann.text}
    </text>
  );
};

// --- Main component ---

export const WorldMapScene: React.FC<WorldMapSceneProps> = ({
  config,
  brandColor,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { vx, vy, vw, vh } = useViewBox(config, frame, fps);

  const highlightSet = React.useMemo(
    () => new Set(config.highlights || []),
    [config.highlights]
  );
  const hlColor = config.highlightColor || HIGHLIGHT_FILL;

  return (
    <div style={{ width: "100%", height: "100%", backgroundColor: BG, position: "relative", overflow: "hidden" }}>
      <svg
        viewBox={`${vx.toFixed(1)} ${vy.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}`}
        style={{ width: "100%", height: "100%" }}
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Country polygons */}
        <Countries highlights={highlightSet} highlightColor={hlColor} />

        {/* Shipping lanes */}
        {config.shippingLanes?.map((lane, i) => (
          <ShippingLane key={i} lane={lane} frame={frame} />
        ))}

        {/* Routes */}
        {config.routes?.map((route, i) => (
          <RoutePath key={i} route={route} frame={frame} index={i} />
        ))}

        {/* Chokepoint pins */}
        {config.chokepoints?.map((cp, i) => (
          <ChokepointPin key={cp.name} cp={cp} frame={frame} fps={fps} index={i} />
        ))}

        {/* Annotations */}
        {config.annotations?.map((ann, i) => (
          <Annotation key={i} ann={ann} frame={frame} index={i} />
        ))}
      </svg>

      {/* Title + subtitle overlay */}
      {(config.title || config.subtitle) && (
        <div
          style={{
            position: "absolute",
            top: 48,
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily,
            pointerEvents: "none",
            opacity: interpolate(frame, [10, 40], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          {config.title && (
            <div
              style={{
                fontSize: 56,
                fontWeight: 700,
                color: TEXT_COLOR,
                letterSpacing: "0.08em",
                textShadow: "0 2px 12px rgba(0,0,0,0.8)",
              }}
            >
              {config.title}
            </div>
          )}
          {config.subtitle && (
            <div
              style={{
                fontSize: 22,
                fontWeight: 500,
                color: "rgba(240,237,232,0.7)",
                letterSpacing: "0.15em",
                marginTop: 12,
                textShadow: "0 2px 8px rgba(0,0,0,0.8)",
              }}
            >
              {config.subtitle}
            </div>
          )}
        </div>
      )}

      {/* Status indicator */}
      {config.statusIndicator && (
        <div
          style={{
            position: "absolute",
            top: 24,
            right: 24,
            backgroundColor: "rgba(0,0,0,0.5)",
            border: `1px solid ${config.statusIndicator.color}`,
            borderRadius: 6,
            padding: "6px 14px",
            color: config.statusIndicator.color,
            fontFamily,
            fontSize: 14,
            fontWeight: 600,
            opacity: interpolate(frame, [40, 55], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          {config.statusIndicator.text}
        </div>
      )}
    </div>
  );
};
