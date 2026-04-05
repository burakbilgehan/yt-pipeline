import React from "react";
import { AbsoluteFill } from "remotion";
import { VerticalTabScene } from "../../../../templates/voiceover-visuals/VerticalTabScene";

const VerticalTabSceneShowcase: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#2A2A32" }}>
    <VerticalTabScene
      chart={{
        type: "vertical-tabs",
        title: "How to Live Longer",
        subtitle: "KEY FACTORS",
        items: [
          {
            id: "01",
            title: "Sleep Quality",
            description:
              "Consistent 7-9 hours of sleep reduces mortality risk by 30% and improves cognitive function across all age groups.",
          },
          {
            id: "02",
            title: "Nutrition",
            description:
              "A Mediterranean diet rich in vegetables, healthy fats, and lean protein is linked to 25% lower heart disease risk.",
          },
          {
            id: "03",
            title: "Physical Activity",
            description:
              "Just 150 minutes of moderate exercise per week adds an average of 4.5 years to life expectancy.",
          },
        ],
      }}
      brandColor="#E88CA5"
      fontFamily="Inter, sans-serif"
    />
  </AbsoluteFill>
);

export default VerticalTabSceneShowcase;
