import React from "react";
import { AbsoluteFill } from "remotion";
import { BaselineReference } from "../../../../templates/data-charts/BaselineReference";

const BaselineReferenceShowcase: React.FC = () => (
  <AbsoluteFill>
    <BaselineReference
      chart={{
        type: "baseline-reference",
        baselineValue: 1.0,
        zones: {
          above: { color: "#E06070", label: "More expensive than wages grew", opacity: 0.15 },
          below: { color: "#5BBF8C", label: "Cheaper relative to wages", opacity: 0.15 },
          at: { label: "Prices grew exactly as fast as wages" },
        },
      } as any}
      brandColor="#E88CA5"
      fontFamily="Inter, sans-serif"
      metricLabel="Index"
    />
  </AbsoluteFill>
);

export default BaselineReferenceShowcase;
