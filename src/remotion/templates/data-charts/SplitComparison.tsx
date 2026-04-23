import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { TEXT, BG, ACCENT_PINK, TEXT_MUTED, ACCENT_BLUE } from "../../palette";
import { TiltCard } from "../../design-system/motion/TiltCard";
import { NeonGradientSurface } from "../../design-system/surfaces/NeonGradientSurface";
import { FrostedPanelSurface } from "../../design-system/surfaces/FrostedPanelSurface";

/**
 * SplitComparison — Dual-panel comparison template
 *
 * Supports two modes:
 * 1. "grocery" (default/legacy) — city grocery basket comparison (Zurich vs Mexico City)
 * 2. "material-duel" — side-by-side material/property cards with DS surface treatments
 *
 * Material-duel mode wraps each panel in optional surface (frosted-panel, neon-gradient)
 * and TiltCard motion for subtle 3D animation.
 *
 * Dark-cozy theme: #2A2A32 bg, #E88CA5 divider, #F0EDE8 text
 */

// ─── Legacy Grocery Mode Types ────────────────────────────────

interface GroceryItem {
  name: string;
  price: string;
}

interface CityData {
  city: string;
  country: string;
  items: GroceryItem[];
  total: string;
}

// ─── Material-Duel Mode Types ─────────────────────────────────

interface MetricRow {
  label: string;
  value: string;
}

interface MaterialSide {
  title: string;
  subtitle?: string;
  metrics: MetricRow[];
  color?: string;
  surfaceType?: "frosted-panel" | "neon-gradient" | "backlight";
}

// ─── Unified Props ────────────────────────────────────────────

interface SplitComparisonProps {
  chart: {
    type: string;
    mode?: "material-duel";
    title?: string;
    // Legacy grocery fields
    left?: CityData | MaterialSide;
    right?: CityData | MaterialSide;
    dividerColor?: string;
    annotation?: string;
    [key: string]: unknown;
  };
  brandColor: string;
  fontFamily: string;
}

const TEXT_COLOR = TEXT;
const MUTED_TEXT = TEXT_MUTED;
const BG_COLOR = BG;

// ─── Type Guards ──────────────────────────────────────────────

function isMaterialSide(data: unknown): data is MaterialSide {
  return (
    typeof data === "object" &&
    data !== null &&
    "title" in data &&
    "metrics" in data &&
    Array.isArray((data as MaterialSide).metrics)
  );
}

function isCityData(data: unknown): data is CityData {
  return (
    typeof data === "object" &&
    data !== null &&
    "city" in data &&
    "items" in data
  );
}

const CityPanel: React.FC<{
  data: CityData;
  side: "left" | "right";
  fontFamily: string;
  brandColor: string;
  frame: number;
  fps: number;
  baseDelay: number;
}> = ({ data, side, fontFamily, brandColor, frame, fps, baseDelay }) => {
  // Panel slide in
  const slideSpring = spring({
    fps,
    frame: frame - baseDelay,
    config: { damping: 18, stiffness: 60 },
  });

  const slideX = side === "left"
    ? interpolate(slideSpring, [0, 1], [-100, 0])
    : interpolate(slideSpring, [0, 1], [100, 0]);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "40px 50px",
        transform: `translateX(${slideX}px)`,
        opacity: slideSpring,
      }}
    >
      {/* City name */}
      <div
        style={{
          fontFamily: fontFamily || "Montserrat, sans-serif",
          fontSize: 32,
          fontWeight: 600,
          color: TEXT_COLOR,
          marginBottom: 4,
        }}
      >
        {data.city}
      </div>
      <div
        style={{
          fontFamily: fontFamily || "Montserrat, sans-serif",
          fontSize: 20,
          color: MUTED_TEXT,
          marginBottom: 30,
        }}
      >
        {data.country}
      </div>

      {/* Items */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {data.items.map((item, i) => {
          const itemSpring = spring({
            fps,
            frame: frame - baseDelay - 10 - i * 6,
            config: { damping: 14, stiffness: 80 },
          });

          return (
            <div
              key={item.name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                opacity: itemSpring,
                transform: `translateY(${(1 - itemSpring) * 15}px)`,
              }}
            >
              <div
                style={{
                  fontFamily: fontFamily || "Montserrat, sans-serif",
                  fontSize: 20,
                  color: TEXT_COLOR,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                {item.name}
              </div>
              <div
                style={{
                  fontFamily: fontFamily || "Montserrat, sans-serif",
                  fontSize: 22,
                  fontWeight: 600,
                  color: TEXT_COLOR,
                }}
              >
                {item.price}
              </div>
            </div>
          );
        })}
      </div>

      {/* Divider line */}
      <div
        style={{
          width: "100%",
          height: 1,
          backgroundColor: "rgba(240,237,232,0.15)",
          margin: "20px 0",
        }}
      />

      {/* Total */}
      {(() => {
        const totalSpring = spring({
          fps,
          frame: frame - baseDelay - 10 - data.items.length * 6 - 5,
          config: { damping: 14, stiffness: 80 },
        });
        return (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              opacity: totalSpring,
            }}
          >
            <div
              style={{
                fontFamily: fontFamily || "Montserrat, sans-serif",
                fontSize: 22,
                fontWeight: 600,
                color: MUTED_TEXT,
              }}
            >
              Total
            </div>
            <div
              style={{
                fontFamily: fontFamily || "Montserrat, sans-serif",
                fontSize: 30,
                fontWeight: 700,
                color: brandColor || ACCENT_PINK,
              }}
            >
              {data.total}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

// ─── Material-Duel Panel ──────────────────────────────────────

const MaterialDuelPanel: React.FC<{
  data: MaterialSide;
  side: "left" | "right";
  fontFamily: string;
  frame: number;
  fps: number;
  baseDelay: number;
}> = ({ data, side, fontFamily, frame, fps, baseDelay }) => {
  const accentColor = data.color || (side === "left" ? ACCENT_PINK : ACCENT_BLUE);

  // Panel entrance slide
  const slideSpring = spring({
    fps,
    frame: frame - baseDelay,
    config: { damping: 18, stiffness: 60 },
  });
  const slideX = side === "left"
    ? interpolate(slideSpring, [0, 1], [-80, 0])
    : interpolate(slideSpring, [0, 1], [80, 0]);

  // Inner content — shared between surface wrappers
  const panelContent = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "36px 40px",
        minHeight: 280,
      }}
    >
      {/* Material title */}
      <div
        style={{
          fontFamily: fontFamily || "Montserrat, sans-serif",
          fontSize: 34,
          fontWeight: 700,
          color: accentColor,
          marginBottom: 4,
        }}
      >
        {data.title}
      </div>
      {data.subtitle && (
        <div
          style={{
            fontFamily: fontFamily || "Montserrat, sans-serif",
            fontSize: 18,
            color: MUTED_TEXT,
            marginBottom: 28,
            letterSpacing: "0.02em",
          }}
        >
          {data.subtitle}
        </div>
      )}

      {/* Metric rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {data.metrics.map((metric, i) => {
          const metricSpring = spring({
            fps,
            frame: frame - baseDelay - 12 - i * 8,
            config: { damping: 14, stiffness: 80 },
          });

          return (
            <div
              key={metric.label}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                opacity: metricSpring,
                transform: `translateY(${(1 - metricSpring) * 12}px)`,
              }}
            >
              <div
                style={{
                  fontFamily: fontFamily || "Montserrat, sans-serif",
                  fontSize: 14,
                  fontWeight: 500,
                  color: MUTED_TEXT,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                {metric.label}
              </div>
              <div
                style={{
                  fontFamily: fontFamily || "Montserrat, sans-serif",
                  fontSize: 22,
                  fontWeight: 600,
                  color: TEXT_COLOR,
                }}
              >
                {metric.value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Wrap content in the appropriate DS surface
  const wrappedContent = (() => {
    switch (data.surfaceType) {
      case "neon-gradient":
        return (
          <NeonGradientSurface
            id="neon-gradient"
            blur={12}
            opacity={0.95}
            borderRadius={20}
            borderWidth={2}
            glowColor={accentColor}
            glowIntensity={0.7}
          >
            {panelContent}
          </NeonGradientSurface>
        );
      case "backlight": {
        // Subtle inline backlight — very soft ambient glow, barely noticeable.
        // Replaces BacklightSurface which was too aggressive (too large, too bright, too fast pulse).
        const backlightFrame = frame;
        // Very slow pulse: ~4 second period (120 frames at 30fps)
        const pulseRaw = Math.sin((backlightFrame / 120) * Math.PI * 2);
        const backlightOpacity = interpolate(pulseRaw, [-1, 1], [0.08, 0.18]);
        // Minimal drift: 2-3px max, very slow
        const driftX = Math.sin((backlightFrame / 150) * Math.PI * 2) * 2.5;
        const driftY = Math.cos((backlightFrame / 120) * Math.PI * 2) * 2;

        return (
          <div style={{ position: 'relative' }}>
            {/* Subtle backlight glow */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '110%',
                height: '110%',
                borderRadius: '50%',
                background: `radial-gradient(ellipse at center, ${accentColor}, transparent 70%)`,
                opacity: backlightOpacity,
                filter: 'blur(80px)',
                transform: `translate(calc(-50% + ${driftX}px), calc(-50% + ${driftY}px))`,
                pointerEvents: 'none',
                zIndex: 0,
              }}
            />
            {/* Card body */}
            <div
              style={{
                position: 'relative',
                zIndex: 1,
                borderRadius: 20,
                border: `1px solid ${accentColor}33`,
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                background: `rgba(255, 255, 255, ${0.12 * 0.07})`,
                overflow: 'hidden',
              }}
            >
              {panelContent}
            </div>
          </div>
        );
      }
      case "frosted-panel":
        return (
          <FrostedPanelSurface
            id="frosted-panel"
            blur={24}
            opacity={0.2}
            borderRadius={20}
            borderColor={`${accentColor}33`}
          >
            {panelContent}
          </FrostedPanelSurface>
        );
      default:
        return (
          <div
            style={{
              borderRadius: 20,
              background: "rgba(42, 42, 50, 0.85)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {panelContent}
          </div>
        );
    }
  })();

  return (
    <div
      style={{
        flex: 1,
        padding: "0 24px",
        transform: `translateX(${slideX}px)`,
        opacity: slideSpring,
      }}
    >
      <TiltCard maxTilt={6} speed={0.6}>
        {wrappedContent}
      </TiltCard>
    </div>
  );
};

// ─── Material-Duel Layout ─────────────────────────────────────

const MaterialDuelLayout: React.FC<{
  chart: SplitComparisonProps["chart"];
  fontFamily: string;
}> = ({ chart, fontFamily }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const left = (chart.left ?? {}) as MaterialSide;
  const right = (chart.right ?? {}) as MaterialSide;
  const title = chart.title as string | undefined;
  const annotation = chart.annotation as string | undefined;

  // Title entrance
  const titleSpring = spring({
    fps,
    frame: frame - 3,
    config: { damping: 16, stiffness: 60 },
  });

  // Annotation entrance (delayed)
  const annotationSpring = spring({
    fps,
    frame: frame - 50,
    config: { damping: 14, stiffness: 60 },
  });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: BG_COLOR,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        padding: "60px 40px",
      }}
    >
      {/* Title */}
      {title && (
        <div
          style={{
            fontFamily: fontFamily || "Montserrat, sans-serif",
            fontSize: 38,
            fontWeight: 700,
            color: TEXT_COLOR,
            marginBottom: 40,
            opacity: titleSpring,
            transform: `translateY(${(1 - titleSpring) * 15}px)`,
            textAlign: "center",
          }}
        >
          {title}
        </div>
      )}

      {/* Dual panels */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          width: "100%",
          flex: 1,
          alignItems: "center",
          gap: 24,
        }}
      >
        <MaterialDuelPanel
          data={left}
          side="left"
          fontFamily={fontFamily}
          frame={frame}
          fps={fps}
          baseDelay={6}
        />

        {/* VS divider */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontFamily: fontFamily || "Montserrat, sans-serif",
              fontSize: 18,
              fontWeight: 600,
              color: MUTED_TEXT,
              letterSpacing: "0.15em",
            }}
          >
            VS
          </div>
        </div>

        <MaterialDuelPanel
          data={right}
          side="right"
          fontFamily={fontFamily}
          frame={frame}
          fps={fps}
          baseDelay={10}
        />
      </div>

      {/* Annotation at bottom */}
      {annotation && (
        <div
          style={{
            position: "absolute",
            bottom: 50,
            left: "50%",
            transform: `translateX(-50%) translateY(${(1 - annotationSpring) * 15}px)`,
            opacity: annotationSpring,
            fontFamily: fontFamily || "Montserrat, sans-serif",
            fontSize: 20,
            fontWeight: 500,
            color: MUTED_TEXT,
            letterSpacing: "0.03em",
            textAlign: "center",
            maxWidth: "80%",
          }}
        >
          {annotation}
        </div>
      )}
    </div>
  );
};

export const SplitComparison: React.FC<SplitComparisonProps> = ({
  chart,
  brandColor,
  fontFamily,
}) => {
  // Hooks must be called unconditionally (React rules of hooks)
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ─── Material-Duel mode ───────────────────────────────────
  if (chart.mode === "material-duel") {
    return <MaterialDuelLayout chart={chart} fontFamily={fontFamily} />;
  }

  // ─── Legacy Grocery mode (default) ────────────────────────

  const left: CityData = isCityData(chart.left)
    ? chart.left
    : { city: "Zurich", country: "Switzerland", items: [], total: "$0" };
  const right: CityData = isCityData(chart.right)
    ? chart.right
    : { city: "Mexico City", country: "Mexico", items: [], total: "$0" };
  const comparisonLabel = chart.comparisonLabel as string || "";
  const dividerColor = chart.dividerColor || brandColor || ACCENT_PINK;

  // Divider line animation
  const dividerSpring = spring({
    fps,
    frame: frame - 5,
    config: { damping: 20, stiffness: 60 },
  });

  // "Same basket." label animation
  const labelSpring = spring({
    fps,
    frame: frame - 40,
    config: { damping: 14, stiffness: 60 },
  });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: BG_COLOR,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        position: "relative",
      }}
    >
      {/* Left panel */}
      <CityPanel
        data={left}
        side="left"
        fontFamily={fontFamily}
        brandColor={brandColor}
        frame={frame}
        fps={fps}
        baseDelay={5}
      />

      {/* Center divider */}
      <div
        style={{
          width: 2,
          height: `${dividerSpring * 70}%`,
          backgroundColor: dividerColor,
          opacity: 0.5,
          flexShrink: 0,
        }}
      />

      {/* Right panel */}
      <CityPanel
        data={right}
        side="right"
        fontFamily={fontFamily}
        brandColor={brandColor}
        frame={frame}
        fps={fps}
        baseDelay={8}
      />

      {/* Comparison label at bottom center */}
      {comparisonLabel && (
        <div
          style={{
            position: "absolute",
            bottom: 80,
            left: "50%",
            transform: `translateX(-50%) translateY(${(1 - labelSpring) * 20}px)`,
            opacity: labelSpring,
            fontFamily: fontFamily || "Montserrat, sans-serif",
            fontSize: 24,
            fontWeight: 500,
            color: MUTED_TEXT,
            letterSpacing: "0.04em",
            textAlign: "center",
          }}
        >
          {comparisonLabel}
        </div>
      )}
    </div>
  );
};
