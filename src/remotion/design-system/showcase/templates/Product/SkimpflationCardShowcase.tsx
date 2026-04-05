import React from "react";
import { AbsoluteFill } from "remotion";
import { SkimpflationCard } from "../../../../templates/data-charts/SkimpflationCard";

/**
 * SkimpflationCard requires a staticFile image — showcase uses default path.
 * In Studio, the image may not load without the correct public dir.
 */
const SkimpflationCardShowcase: React.FC = () => (
  <AbsoluteFill>
    <SkimpflationCard
      chart={{
        type: "skimpflation-card",
        title: "SKIMPFLATION",
        subtitle: "Same price. Same size. Cheaper ingredients.",
      } as any}
      brandColor="#E88CA5"
      fontFamily="Inter, sans-serif"
    />
  </AbsoluteFill>
);

export default SkimpflationCardShowcase;
