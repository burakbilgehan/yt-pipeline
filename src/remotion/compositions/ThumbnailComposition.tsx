import React from "react";
import { Thumbnail } from "../templates/Thumbnail";
import type { ThumbnailCompositionProps } from "../schemas";

/**
 * ThumbnailComposition — Wrapper for the Thumbnail template.
 * Registered in Root.tsx at 1280x720, 1 frame (static image).
 * Render with: npx remotion still Thumbnail --props="<path>" --output="<path>" --log=warn
 */
const ThumbnailComposition: React.FC<ThumbnailCompositionProps> = (props) => {
  return <Thumbnail {...props} />;
};

export default ThumbnailComposition;
