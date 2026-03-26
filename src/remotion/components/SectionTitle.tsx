import React from "react";

interface SectionTitleProps {
  title: string;
  brandColor: string;
  fontFamily: string;
}

/**
 * SectionTitle — DISABLED.
 * Previously showed "HOOK", "Act 1" etc. on screen transitions.
 * Removed as part of visual overhaul — viewers should never see internal section labels.
 */
export const SectionTitle: React.FC<SectionTitleProps> = () => {
  return null;
};
