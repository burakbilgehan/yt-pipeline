import React from "react";
import { AbsoluteFill } from "remotion";
import { SplitComparison } from "../../../../templates/data-charts/SplitComparison";

const SplitComparisonShowcase: React.FC = () => (
  <AbsoluteFill>
    <SplitComparison
      chart={{
        type: "split-comparison",
        left: {
          city: "Zurich",
          country: "Switzerland",
          items: [
            { name: "Bread", price: "$6.50" },
            { name: "Milk (1L)", price: "$1.80" },
            { name: "Eggs (12)", price: "$5.20" },
            { name: "Rice (1kg)", price: "$3.40" },
            { name: "Chicken (1kg)", price: "$14.00" },
          ],
          total: "$30.90",
        },
        right: {
          city: "Mexico City",
          country: "Mexico",
          items: [
            { name: "Bread", price: "$1.20" },
            { name: "Milk (1L)", price: "$0.90" },
            { name: "Eggs (12)", price: "$1.60" },
            { name: "Rice (1kg)", price: "$0.80" },
            { name: "Chicken (1kg)", price: "$3.50" },
          ],
          total: "$8.00",
        },
        comparisonLabel: "Same basket. Different price.",
      }}
      brandColor="#E88CA5"
      fontFamily="Inter, sans-serif"
    />
  </AbsoluteFill>
);

export default SplitComparisonShowcase;
