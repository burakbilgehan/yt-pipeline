import React from "react";
import { AbsoluteFill } from "remotion";
import { BLSShrinkExplainer } from "../../../../templates/data-charts/BLSShrinkExplainer";

/**
 * BLSShrinkExplainer requires a staticFile image — may not render in Studio
 * without the correct public dir. Demo shows animation structure.
 */
const BLSShrinkExplainerShowcase: React.FC = () => (
  <AbsoluteFill>
    <BLSShrinkExplainer
      chart={{
        type: "bls-shrink-explainer",
        startSize: "16 oz",
        endSize: "10 oz",
        stickerPrice: "$4.99",
        startPerUnit: "$4.99/lb",
        endPerUnit: "$7.99/lb",
        blsAttribution: "BLS tracks per-unit price",
      } as any}
      brandColor="#E88CA5"
      fontFamily="Inter, sans-serif"
    />
  </AbsoluteFill>
);

export default BLSShrinkExplainerShowcase;
