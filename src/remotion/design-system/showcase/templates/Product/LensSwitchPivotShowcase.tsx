import React from "react";
import { AbsoluteFill } from "remotion";
import { LensSwitchPivot } from "../../../../templates/data-charts/LensSwitchPivot";

const LensSwitchPivotShowcase: React.FC = () => (
  <AbsoluteFill>
    <LensSwitchPivot
      chart={{
        type: "lens-switch-pivot",
        summaryText: "4 of 6 cheaper",
        pivotQuestion: "But cheaper… for whom?",
        rulerQuestion: "What if we change the ruler?",
        deflators: [
          { name: "CPI-U", status: "done" },
          { name: "CPI-W", status: "done" },
          { name: "PCE", status: "done" },
          { name: "C-CPI-U", status: "done" },
          { name: "GDP Deflator", status: "pending" },
          { name: "PPI", status: "pending" },
        ],
      } as any}
      brandColor="#E88CA5"
      fontFamily="Inter, sans-serif"
    />
  </AbsoluteFill>
);

export default LensSwitchPivotShowcase;
