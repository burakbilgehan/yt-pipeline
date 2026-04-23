import React from "react";
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import {
  BG,
  TEXT,
  TEXT_MUTED,
  TEXT_FAINT,
  SURFACE,
  SURFACE_BORDER,
} from "../../palette";
import { FrostedPanelSurface } from "../../design-system/surfaces/FrostedPanelSurface";
import { TiltCard } from "../../design-system/motion/TiltCard";

// ─── Types ──────────────────────────────────────────────────

interface TabItem {
  id: string;
  title: string;
  description: string;
  image?: string;
}

interface VerticalTabSceneProps {
  chart: {
    type: string;
    items: TabItem[];
    activeTimings?: number[];
    title?: string;
    subtitle?: string;
    showProgress?: boolean;
    imagePosition?: "left" | "right";
    [key: string]: unknown;
  };
  brandColor: string;
  fontFamily: string;
}

// ─── Timing helpers ─────────────────────────────────────────

function computeActiveIndex(frame: number, timings: number[]): number {
  for (let i = timings.length - 1; i >= 0; i--) {
    if (frame >= timings[i]) return i;
  }
  return 0;
}

function getTabTimings(
  activeTimings: number[] | undefined,
  itemCount: number,
  durationInFrames: number,
): number[] {
  if (activeTimings && activeTimings.length === itemCount) {
    return activeTimings;
  }
  return Array.from({ length: itemCount }, (_, i) =>
    Math.floor((i * durationInFrames) / itemCount),
  );
}

function getTabDuration(
  index: number,
  timings: number[],
  durationInFrames: number,
): number {
  const start = timings[index];
  const end =
    index < timings.length - 1 ? timings[index + 1] : durationInFrames;
  return end - start;
}

// ─── Constants ──────────────────────────────────────────────

// Accordion animation: 0.3s = 9 frames at 30fps
const ACCORDION_FRAMES = 9;
// Max height description can expand to (px) — must fit ~2 lines at 20px font, 1.5 line-height
const MAX_DESC_HEIGHT = 180;

// ─── Main component ─────────────────────────────────────────

export const VerticalTabScene: React.FC<VerticalTabSceneProps> = ({
  chart,
  brandColor,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const items = chart.items ?? [];
  const showProgress = chart.showProgress !== false;
  const imageOnRight = (chart.imagePosition ?? "right") === "right";
  const itemCount = items.length;

  const timings = getTabTimings(chart.activeTimings, itemCount, durationInFrames);
  const activeIndex = computeActiveIndex(frame, timings);
  const tabStart = timings[activeIndex];
  const tabDuration = getTabDuration(activeIndex, timings, durationInFrames);
  const localFrame = frame - tabStart;
  const prevIndex = activeIndex > 0 ? activeIndex - 1 : 0;

  const hasAnyImage = items.some((item) => !!item.image);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG,
        fontFamily,
        padding: "72px 80px",
        display: "flex",
        flexDirection: hasAnyImage ? (imageOnRight ? "row" : "row-reverse") : "row",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: 64,
      }}
    >
      {/* ── Left column: heading + tabs ── */}
      <div
        style={{
          width: hasAnyImage ? "42%" : "48%",
          flexShrink: 0,
        }}
      >
        {/* Heading */}
        {chart.title && (
          <div style={{ marginBottom: 48 }}>
            <div
              style={{
                fontSize: 56,
                fontWeight: 500,
                color: TEXT,
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
              }}
            >
              {chart.title}
            </div>
            {chart.subtitle && (
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: TEXT_MUTED,
                  letterSpacing: "0.3em",
                  textTransform: "uppercase" as const,
                  marginTop: 6,
                  marginLeft: 2,
                }}
              >
                ({chart.subtitle})
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {items.map((item, i) => (
            <TabItemRow
              key={item.id}
              item={item}
              index={i}
              isActive={i === activeIndex}
              localFrame={i === activeIndex ? localFrame : 0}
              tabDuration={i === activeIndex ? tabDuration : 1}
              brandColor={brandColor}
              fontFamily={fontFamily}
              showProgress={showProgress}
            />
          ))}
        </div>
      </div>

      {/* ── Right column: ImagePanel (with images) or InfoPanel (no images) ── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {hasAnyImage ? (
          <ImagePanel
            items={items}
            activeIndex={activeIndex}
            prevIndex={prevIndex}
            localFrame={localFrame}
            fps={fps}
            brandColor={brandColor}
          />
        ) : (
          <InfoPanel
            items={items}
            activeIndex={activeIndex}
            localFrame={localFrame}
            fps={fps}
            brandColor={brandColor}
            fontFamily={fontFamily}
          />
        )}
      </div>
    </AbsoluteFill>
  );
};

// ─── TabItemRow ─────────────────────────────────────────────

interface TabItemRowProps {
  item: TabItem;
  index: number;
  isActive: boolean;
  localFrame: number;
  tabDuration: number;
  brandColor: string;
  fontFamily: string;
  showProgress: boolean;
}

const TabItemRow: React.FC<TabItemRowProps> = ({
  item,
  index,
  isActive,
  localFrame,
  tabDuration,
  brandColor,
  fontFamily,
  showProgress,
}) => {
  const titleColor = isActive ? TEXT : TEXT_MUTED;
  const titleOpacity = isActive ? 1 : 0.6;
  const numberColor = isActive ? brandColor : TEXT_MUTED;
  const numberOpacity = isActive ? 1 : 0.5;

  // Accordion height: 0 → MAX_DESC_HEIGHT over ACCORDION_FRAMES
  const descHeight = isActive
    ? interpolate(localFrame, [0, ACCORDION_FRAMES], [0, MAX_DESC_HEIGHT], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  // Opacity: delayed start at 30% of accordion, finishes with it
  const descOpacity = isActive
    ? interpolate(
        localFrame,
        [Math.floor(ACCORDION_FRAMES * 0.3), ACCORDION_FRAMES],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      )
    : 0;

  // Progress bar: linear fill over tab duration
  const progressPercent = isActive
    ? interpolate(localFrame, [0, Math.max(tabDuration, 1)], [0, 100], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  return (
    <div
      style={{
        position: "relative",
        padding: "24px 0",
        borderTop: index > 0 ? `1px solid ${SURFACE_BORDER}` : "none",
      }}
    >
      {/* Progress bar — left edge, outside content */}
      {showProgress && (
        <div
          style={{
            position: "absolute",
            left: -24,
            top: 0,
            bottom: 0,
            width: 2,
            backgroundColor: SURFACE_BORDER,
            overflow: "hidden",
          }}
        >
          {isActive && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${progressPercent}%`,
                backgroundColor: brandColor,
              }}
            />
          )}
        </div>
      )}

      {/* Number + Title */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <span
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: numberColor,
            opacity: numberOpacity,
            fontFamily,
            fontVariantNumeric: "tabular-nums",
            flexShrink: 0,
          }}
        >
          /{String(index + 1).padStart(2, "0")}
        </span>
        <span
          style={{
            fontSize: 42,
            fontWeight: 400,
            color: titleColor,
            opacity: titleOpacity,
            fontFamily,
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
          }}
        >
          {item.title}
        </span>
      </div>

      {/* Description — accordion: height animates, only active shows text */}
      <div
        style={{
          height: descHeight,
          overflow: "hidden",
          opacity: descOpacity,
          marginTop: descHeight > 0 ? 8 : 0,
        }}
      >
        <div
          style={{
            fontSize: 20,
            fontWeight: 400,
            color: TEXT_MUTED,
            lineHeight: 1.5,
            maxWidth: 460,
          }}
        >
          {item.description}
        </div>
      </div>
    </div>
  );
};

// ─── InfoPanel (no-image fallback) ──────────────────────────

interface InfoPanelProps {
  items: TabItem[];
  activeIndex: number;
  localFrame: number;
  fps: number;
  brandColor: string;
  fontFamily: string;
}

const InfoPanel: React.FC<InfoPanelProps> = ({
  items,
  activeIndex,
  localFrame,
  fps,
  brandColor,
  fontFamily,
}) => {
  const item = items[activeIndex];
  if (!item) return null;

  // Slide-up from below + fade
  const enterSpring = spring({
    fps,
    frame: localFrame,
    config: { stiffness: 200, damping: 28 },
  });

  const translateY = interpolate(enterSpring, [0, 1], [40, 0]);
  const opacity = interpolate(enterSpring, [0, 1], [0, 1]);

  // Stagger: accent line slightly after title
  const lineSpring = spring({
    fps,
    frame: Math.max(0, localFrame - 3),
    config: { stiffness: 220, damping: 30 },
  });
  const lineScaleX = interpolate(lineSpring, [0, 1], [0, 1]);

  // Stagger: description after accent line
  const descSpring = spring({
    fps,
    frame: Math.max(0, localFrame - 6),
    config: { stiffness: 180, damping: 26 },
  });
  const descOpacity = interpolate(descSpring, [0, 1], [0, 1]);
  const descTranslateY = interpolate(descSpring, [0, 1], [20, 0]);

  const indexLabel = String(activeIndex + 1).padStart(2, "0");

  return (
    <TiltCard maxTilt={6} speed={0.8} perspective={800}>
      <FrostedPanelSurface
        id="frosted-panel"
        blur={12}
        opacity={0.08}
        borderRadius={24}
      >
        <div
          style={{
            width: "100%",
            padding: 48,
            transform: `translateY(${translateY}px)`,
            opacity,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            minHeight: 400,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Large background index number */}
          <div
            style={{
              fontFamily,
              fontSize: 120,
              fontWeight: 700,
              color: brandColor,
              opacity: 0.25,
              lineHeight: 1,
              marginBottom: 16,
              userSelect: "none",
            }}
          >
            {indexLabel}
          </div>

          {/* Title in brandColor */}
          <div
            style={{
              fontSize: 48,
              fontWeight: 600,
              color: brandColor,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              fontFamily,
              marginBottom: 20,
            }}
          >
            {item.title}
          </div>

          {/* Decorative accent line */}
          <div
            style={{
              width: 80,
              height: 3,
              backgroundColor: brandColor,
              borderRadius: 2,
              marginBottom: 24,
              transform: `scaleX(${lineScaleX})`,
              transformOrigin: "left",
            }}
          />

          {/* Description text */}
          <div
            style={{
              fontSize: 24,
              fontWeight: 400,
              color: TEXT_MUTED,
              lineHeight: 1.6,
              maxWidth: 480,
              opacity: descOpacity,
              transform: `translateY(${descTranslateY}px)`,
            }}
          >
            {item.description}
          </div>
        </div>
      </FrostedPanelSurface>
    </TiltCard>
  );
};

// ─── ImagePanel ─────────────────────────────────────────────

interface ImagePanelProps {
  items: TabItem[];
  activeIndex: number;
  prevIndex: number;
  localFrame: number;
  fps: number;
  brandColor: string;
}

const ImagePanel: React.FC<ImagePanelProps> = ({
  items,
  activeIndex,
  prevIndex,
  localFrame,
  fps,
  brandColor,
}) => {
  const slideSpring = spring({
    fps,
    frame: localFrame,
    config: { stiffness: 260, damping: 32 },
  });

  const isFirstTab = activeIndex === 0;
  const enterY = interpolate(slideSpring, [0, 1], [-100, 0]);
  const exitY = interpolate(slideSpring, [0, 1], [0, 100]);
  const enterOpacity = isFirstTab
    ? 1
    : interpolate(localFrame, [0, 12], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });

  return (
    <TiltCard maxTilt={12} speed={0.3} perspective={800}>
      <div
        style={{
          width: "100%",
          aspectRatio: "16 / 11",
          position: "relative",
          borderRadius: 32,
          overflow: "hidden",
          backgroundColor: SURFACE,
          border: `1px solid ${SURFACE_BORDER}`,
        }}
      >
        {/* Exiting image */}
        {prevIndex !== activeIndex && (
          <ImageLayer
            item={items[prevIndex]}
            itemIndex={prevIndex}
            brandColor={brandColor}
            style={{ transform: `translateY(${exitY}%)`, zIndex: 0 }}
          />
        )}

        {/* Entering image */}
        <ImageLayer
          item={items[activeIndex]}
          itemIndex={activeIndex}
          brandColor={brandColor}
          style={{
            transform: isFirstTab ? "translateY(0%)" : `translateY(${enterY}%)`,
            opacity: enterOpacity,
            zIndex: 1,
          }}
        />

        {/* Bottom gradient */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "33%",
            background: "linear-gradient(transparent, rgba(0,0,0,0.2))",
            pointerEvents: "none",
            zIndex: 2,
          }}
        />

        {/* Tab ID overlay */}
        <div
          style={{
            position: "absolute",
            bottom: 24,
            left: 32,
            fontSize: 22,
            fontWeight: 600,
            color: brandColor,
            letterSpacing: 2,
            opacity: 0.8,
            zIndex: 3,
          }}
        >
          {String(activeIndex + 1).padStart(2, "0")}
        </div>
      </div>
    </TiltCard>
  );
};

// ─── ImageLayer ─────────────────────────────────────────────

interface ImageLayerProps {
  item: TabItem;
  itemIndex: number;
  brandColor: string;
  style?: React.CSSProperties;
}

const ImageLayer: React.FC<ImageLayerProps> = ({ item, itemIndex, brandColor, style }) => {
  if (!item) return null;

  if (!item.image) {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
          ...style,
        }}
      >
        <div
          style={{
            fontSize: 80,
            fontWeight: 800,
            color: brandColor,
            opacity: 0.2,
            marginBottom: 16,
          }}
        >
          {String(itemIndex + 1).padStart(2, "0")}
        </div>
        <div
          style={{
            fontSize: 36,
            fontWeight: 600,
            color: TEXT_MUTED,
            textAlign: "center" as const,
          }}
        >
          {item.title}
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "absolute", inset: 0, ...style }}>
      <Img
        src={staticFile(item.image)}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
};
