import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { DataChartInput } from "../../schemas";

interface ProgressRingProps {
  chart: DataChartInput;
  brandColor: string;
  fontFamily: string;
}

/**
 * Circular progress indicator.
 * Ring fills up to the target percentage with spring animation.
 * Shows counter value in the center.
 */
export const ProgressRing: React.FC<ProgressRingProps> = ({
  chart,
  brandColor,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const targetValue = chart.counterValue || 0;
  const maxValue = 100; // percentage-based by default
  const prefix = chart.counterPrefix || "";
  const suffix = chart.counterSuffix || "%";

  // Animation progress
  const progress = spring({
    fps,
    frame,
    config: { damping: 30, stiffness: 35 },
  });

  const currentValue = Math.round(targetValue * progress);
  const percentage = Math.min((targetValue / maxValue) * progress, 1);

  const size = 280;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - percentage);

  const ringColor = chart.colors?.[0] || brandColor;

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
        gap: 30,
      }}
    >
      {chart.title && (
        <h2
          style={{
            color: "rgba(255,255,255,0.7)",
            fontSize: 28,
            fontFamily,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: 3,
          }}
        >
          {chart.title}
        </h2>
      )}

      {/* Ring */}
      <div style={{ position: "relative", width: size, height: size }}>
        <svg
          width={size}
          height={size}
          style={{ transform: "rotate(-90deg)" }}
        >
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={strokeWidth}
          />
          {/* Progress ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>

        {/* Center value */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* TODO: hero value should be 120px+ per VB-4 — needs layout redesign */}
          <span
            style={{
              color: "#FFFFFF",
              fontSize: 64,
              fontFamily,
              fontWeight: 800,
              lineHeight: 1,
            }}
          >
            <span style={{ color: ringColor }}>{prefix}</span>
            {currentValue.toLocaleString()}
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 32 }}>
              {suffix}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};
