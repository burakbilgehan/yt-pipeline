import React from "react";
import { AbsoluteFill } from "remotion";
import type { HorseRaceCompositionProps } from "../schemas";
import { HorseRaceChart } from "../templates/data-charts";
import { loadFontsSync } from "../../fonts/load-fonts";

/**
 * Standalone horse race chart preview composition.
 * Used for testing the multi-series "horse race" line chart in Remotion Studio.
 */
const HorseRacePreview: React.FC<HorseRaceCompositionProps> = (props) => {
  // Safety net: ensure fonts are loaded (primary load happens in Root.tsx calculateMetadata)
  loadFontsSync(props.fontFamily);

  return (
    <AbsoluteFill>
      <HorseRaceChart {...props} />
    </AbsoluteFill>
  );
};

export default HorseRacePreview;
