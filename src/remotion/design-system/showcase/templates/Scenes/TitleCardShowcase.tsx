import React from "react";
import { AbsoluteFill } from "remotion";
import { TitleCard } from "../../../../templates/data-charts/TitleCard";

const TitleCardShowcase: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#2A2A32" }}>
    <TitleCard
      chart={{
        type: "title-card",
        title: "Purchasing Power Parity",
        subtitle: "~3,000 goods & services tracked across 38 OECD nations",
        icon: "Source: OECD",
      }}
      brandColor="#E88CA5"
      fontFamily="Montserrat, sans-serif"
    />
  </AbsoluteFill>
);

export default TitleCardShowcase;
