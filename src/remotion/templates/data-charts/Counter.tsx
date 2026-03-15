import React from "react";
import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { DataChartInput } from "../../schemas";

interface CounterProps {
  chart: DataChartInput;
  brandColor: string;
  fontFamily: string;
}

/**
 * Animated counter that counts up to a target value.
 * Uses spring physics for smooth deceleration at the end.
 */
export const Counter: React.FC<CounterProps> = ({
  chart,
  brandColor,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const targetValue = chart.counterValue || 0;
  const prefix = chart.counterPrefix || "";
  const suffix = chart.counterSuffix || "";

  // Spring-based counting animation over ~2 seconds
  const progress = spring({
    fps,
    frame,
    config: { damping: 30, stiffness: 40 },
  });

  const currentValue = Math.round(targetValue * progress);

  // Format number with commas
  const formattedValue = currentValue.toLocaleString();

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRadius: 20,
        border: "1px solid rgba(255,255,255,0.08)",
        padding: 60,
      }}
    >
      {/* Title */}
      {chart.title && (
        <h2
          style={{
            color: "rgba(255,255,255,0.7)",
            fontSize: 28,
            fontFamily,
            fontWeight: 500,
            marginBottom: 20,
            textTransform: "uppercase",
            letterSpacing: 3,
          }}
        >
          {chart.title}
        </h2>
      )}

      {/* Counter value */}
      <div
        style={{
          color: "#FFFFFF",
          fontSize: 120,
          fontFamily,
          fontWeight: 800,
          lineHeight: 1,
        }}
      >
        <span style={{ color: brandColor }}>{prefix}</span>
        {formattedValue}
        <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 48 }}>
          {suffix}
        </span>
      </div>
    </div>
  );
};
