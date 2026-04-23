import React from "react";
import { AbsoluteFill } from "remotion";
import { TimelineChart } from "../../../../templates/data-charts/TimelineChart";

const TimelineChartShowcase: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#1a1a2e" }}>
    <TimelineChart
      chart={{
        type: "timeline",
        title: "History of Space Exploration",
        items: [
          { label: "Sputnik", value: 1957 },
          { label: "Moon Landing", value: 1969 },
          { label: "Space Shuttle", value: 1981 },
          { label: "ISS", value: 1998 },
          { label: "SpaceX Crew", value: 2020 },
        ],
      }}
      brandColor="#E88CA5"
      fontFamily="Montserrat, sans-serif"
    />
  </AbsoluteFill>
);

export default TimelineChartShowcase;
