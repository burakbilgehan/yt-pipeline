import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";

export interface ThumbnailOverlayProps {
  /** Path to the base thumbnail image (relative to publicDir, used with staticFile) */
  baseImage: string;
  /** Path to the logo image (relative to publicDir, used with staticFile) */
  logoImage: string;
  /** Logo width & height in px (default 100) */
  logoSize?: number;
  /** Padding from edges in px (default 20) */
  logoPadding?: number;
  /** Corner position for the logo (default "bottom-right") */
  logoPosition?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
}

/**
 * ThumbnailOverlay — Overlays a logo on top of an existing thumbnail image.
 * Use case: covering watermarks (e.g. Gemini) with a channel logo.
 * Renders at 1280x720 as a single-frame still.
 */
export const ThumbnailOverlay: React.FC<ThumbnailOverlayProps> = ({
  baseImage,
  logoImage,
  logoSize = 100,
  logoPadding = 20,
  logoPosition = "bottom-right",
}) => {
  const positionStyles: React.CSSProperties = {};
  if (logoPosition.includes("bottom")) positionStyles.bottom = logoPadding;
  if (logoPosition.includes("top")) positionStyles.top = logoPadding;
  if (logoPosition.includes("right")) positionStyles.right = logoPadding;
  if (logoPosition.includes("left")) positionStyles.left = logoPadding;

  return (
    <AbsoluteFill>
      <Img
        src={staticFile(baseImage)}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
      <Img
        src={staticFile(logoImage)}
        style={{
          position: "absolute",
          width: logoSize,
          height: logoSize,
          objectFit: "cover",
          borderRadius: "50%",
          ...positionStyles,
        }}
      />
    </AbsoluteFill>
  );
};
