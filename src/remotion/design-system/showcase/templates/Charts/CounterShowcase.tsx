import React from "react";
import { AbsoluteFill } from "remotion";
import { Counter } from "../../../../templates/data-charts/Counter";

const CounterShowcase: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#1a1a2e" }}>
    <Counter
      chart={{
        type: "counter",
        title: "WORLD POPULATION",
        subtitle: "Estimated total as of 2025",
        counterValue: 8200,
        counterPrefix: "",
        counterSuffix: " million",
        items: [
          { label: "Asia", value: 4800 },
          { label: "Africa", value: 1500 },
          { label: "Europe", value: 750 },
          { label: "Americas", value: 1050 },
        ],
      }}
      brandColor="#6C63FF"
      fontFamily="Inter, sans-serif"
    />
  </AbsoluteFill>
);

export default CounterShowcase;
