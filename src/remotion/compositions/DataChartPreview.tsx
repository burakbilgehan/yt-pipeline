import React from "react";
import { AbsoluteFill } from "remotion";
import type { DataChartCompositionProps } from "../schemas";
import { DataChartScene } from "../templates/data-charts";
import { loadFontsSync } from "../../fonts/load-fonts";

/**
 * Standalone data chart preview composition.
 * Used for testing and previewing chart animations in isolation.
 */
const DataChartPreview: React.FC<DataChartCompositionProps> = ({
  chart,
  brandColor,
  fontFamily,
}) => {
  // Safety net: ensure fonts are loaded (primary load happens in Root.tsx calculateMetadata)
  loadFontsSync(fontFamily);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 60,
      }}
    >
      <DataChartScene
        chart={chart}
        brandColor={brandColor}
        fontFamily={fontFamily}
      />
    </AbsoluteFill>
  );
};

export default DataChartPreview;
