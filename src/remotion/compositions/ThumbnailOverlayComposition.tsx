import React from "react";
import { ThumbnailOverlay } from "../templates/ThumbnailOverlay";
import type { ThumbnailOverlayCompositionProps } from "../schemas";

/**
 * ThumbnailOverlayComposition — Wrapper for the ThumbnailOverlay template.
 * Registered in Root.tsx at 1280x720, 1 frame (static image).
 * Render with: npx remotion still ThumbnailOverlay --props="<path>" --output="<path>" --log=warn
 */
const ThumbnailOverlayComposition: React.FC<ThumbnailOverlayCompositionProps> = (props) => {
  return <ThumbnailOverlay {...props} />;
};

export default ThumbnailOverlayComposition;
