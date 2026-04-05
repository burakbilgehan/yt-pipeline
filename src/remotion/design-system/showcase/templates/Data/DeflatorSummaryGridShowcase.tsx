import React from "react";
import { AbsoluteFill } from "remotion";
import { DeflatorSummaryGrid } from "../../../../templates/data-charts/DeflatorSummaryGrid";

const DeflatorSummaryGridShowcase: React.FC = () => (
  <AbsoluteFill>
    <DeflatorSummaryGrid
      chart={{
        type: "deflator-summary-grid",
        title: "Deflator Results Summary",
        charts: [
          {
            deflator: "CPI-U",
            above: ["Eggs", "Coffee"],
            below: ["Chips", "Milk", "Ice Cream", "Peanut Butter"],
          },
          {
            deflator: "CPI-W",
            above: ["Eggs", "Coffee", "Milk"],
            below: ["Chips", "Ice Cream", "Peanut Butter"],
          },
          {
            deflator: "PCE",
            above: ["Eggs"],
            below: ["Coffee", "Chips", "Milk", "Ice Cream", "Peanut Butter"],
          },
          {
            deflator: "C-CPI-U",
            above: ["Eggs", "Coffee"],
            below: ["Chips", "Milk", "Ice Cream", "Peanut Butter"],
          },
        ],
        source: "BLS 2025",
      } as any}
      brandColor="#E88CA5"
      fontFamily="Inter, sans-serif"
    />
  </AbsoluteFill>
);

export default DeflatorSummaryGridShowcase;
