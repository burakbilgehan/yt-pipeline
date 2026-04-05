import React from "react";
import { AbsoluteFill } from "remotion";
import { RankingResortScene } from "../../../../templates/data-charts/RankingResortScene";

const RankingResortSceneShowcase: React.FC = () => (
  <AbsoluteFill>
    <RankingResortScene
      chart={{
        type: "ranking-resort",
        source: "OECD 2023",
        leftColumn: {
          title: "By Annual Salary",
          items: [
            { rank: 1, label: "Switzerland", value: "$94,447" },
            { rank: 2, label: "United States", value: "$77,463" },
            { rank: 3, label: "Germany", value: "$58,940" },
            { rank: 4, label: "Japan", value: "$41,509", highlight: "negative" },
          ],
        },
        rightColumn: {
          title: "By Hourly Rate",
          items: [
            { rank: 1, label: "Switzerland", value: "$56.50" },
            { rank: 2, label: "Germany", value: "$44.00", highlight: "positive" },
            { rank: 3, label: "United States", value: "$44.10" },
            { rank: 4, label: "Japan", value: "$25.80" },
          ],
        },
      } as any}
      brandColor="#E88CA5"
      fontFamily="Inter, sans-serif"
    />
  </AbsoluteFill>
);

export default RankingResortSceneShowcase;
