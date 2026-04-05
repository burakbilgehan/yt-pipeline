import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { TEXT, BG, ACCENT_PINK } from "../../palette";

/**
 * SplitComparison — Scene 003 Phase 1
 *
 * Split screen comparing two cities' grocery baskets.
 * Left: Zurich (expensive), Right: Mexico City (cheap)
 * Same items, different prices → visual PPP explanation.
 *
 * Dark-cozy theme: #2A2A32 bg, #E88CA5 divider, #F0EDE8 text
 */

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

interface SplitComparisonProps {
  chart: {
    type: string;
    left?: CityData;
    right?: CityData;
    dividerColor?: string;
    [key: string]: unknown;
  };
  brandColor: string;
  fontFamily: string;
}

const TEXT_COLOR = TEXT;
const MUTED_TEXT = "rgba(240, 237, 232, 0.6)"; // derived from TEXT (0.6 opacity, not in palette)
const BG_COLOR = BG;

// Grocery item icons (text-based, no emoji)
const ITEM_ICONS: Record<string, string> = {
  "Bread": "🍞",
  "Milk (1L)": "🥛",
  "Eggs (12)": "🥚",
  "Rice (1kg)": "🍚",
  "Chicken (1kg)": "🍗",
};

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
          fontFamily: fontFamily || "Inter, sans-serif",
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
          fontFamily: fontFamily || "Inter, sans-serif",
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
                  fontFamily: fontFamily || "Inter, sans-serif",
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
                  fontFamily: fontFamily || "Inter, sans-serif",
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
                fontFamily: fontFamily || "Inter, sans-serif",
                fontSize: 22,
                fontWeight: 600,
                color: MUTED_TEXT,
              }}
            >
              Total
            </div>
            <div
              style={{
                fontFamily: fontFamily || "Inter, sans-serif",
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

export const SplitComparison: React.FC<SplitComparisonProps> = ({
  chart,
  brandColor,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const left = chart.left || {
    city: "Zurich",
    country: "Switzerland",
    items: [],
    total: "$0",
  };
  const right = chart.right || {
    city: "Mexico City",
    country: "Mexico",
    items: [],
    total: "$0",
  };
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
            fontFamily: fontFamily || "Inter, sans-serif",
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
