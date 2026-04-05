import React from "react";
import { AbsoluteFill } from "remotion";
import { ShrinkflationCards } from "../../../../templates/data-charts/ShrinkflationCards";

const ShrinkflationCardsShowcase: React.FC = () => (
  <AbsoluteFill>
    <ShrinkflationCards
      chart={{
        type: "shrinkflation-cards",
        cards: [
          { product: "Doritos", from: "12 oz", to: "9.25 oz", change: "-23%" },
          { product: "Gatorade", from: "32 oz", to: "28 oz", change: "-12.5%" },
        ],
        blsStat: { text: "BLS: 2,500+ size changes tracked since 2020", source: "BLS CPI" },
        blsStatDelaySec: 3,
      } as any}
      brandColor="#E88CA5"
      fontFamily="Inter, sans-serif"
    />
  </AbsoluteFill>
);

export default ShrinkflationCardsShowcase;
