import React from "react";
import { AbsoluteFill } from "remotion";
import { ShrinkflationHook } from "../../../../templates/data-charts/ShrinkflationHook";

/**
 * ShrinkflationHook requires staticFile images — may not render without
 * the correct public dir. Demo shows animation structure with default products.
 */
const ShrinkflationHookShowcase: React.FC = () => (
  <AbsoluteFill>
    <ShrinkflationHook
      chart={{ type: "shrinkflation-hook" } as any}
      brandColor="#E88CA5"
      fontFamily="Inter, sans-serif"
    />
  </AbsoluteFill>
);

export default ShrinkflationHookShowcase;
