import React from "react";
import { AbsoluteFill } from "remotion";
import { MetricScene } from "../../../../templates/data-charts/MetricScene";

/** Simplified demo — shows Phase 1 (split comparison) only */
const MetricSceneShowcase: React.FC = () => (
  <AbsoluteFill>
    <MetricScene
      chart={{
        type: "metric-scene",
        phase1: {
          left: { year: 2000, wage: "$572/week", product: "Eggs", price: "$0.91/dozen" },
          right: { year: 2025, wage: "$1,206/week", product: "Eggs", price: "$4.25/dozen" },
        },
        phase2: { formulaParts: ["Price Growth", "\u00F7", "Wage Growth", "=", "Index"] },
        phaseSplitSec: 999,
      }}
      brandColor="#E88CA5"
      fontFamily="Inter, sans-serif"
    />
  </AbsoluteFill>
);

export default MetricSceneShowcase;
