import React from "react";
import { AbsoluteFill } from "remotion";
import { CalendarGrid } from "../../../../templates/data-charts/CalendarGrid";

const CalendarGridShowcase: React.FC = () => (
  <AbsoluteFill>
    <CalendarGrid
      chart={{
        type: "calendar-grid",
        months: 12,
        highlightedDays: 104,
        highlightColor: "#E06070",
        source: "Demo Data",
        labels: [
          { text: "Weekend days per year", size: "large" },
          { text: "104 out of 365 days", delay: "1s", color: "#E06070" },
        ],
      } as any}
      brandColor="#E88CA5"
      fontFamily="Inter, sans-serif"
    />
  </AbsoluteFill>
);

export default CalendarGridShowcase;
