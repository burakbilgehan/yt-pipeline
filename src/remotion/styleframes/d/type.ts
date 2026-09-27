/**
 * Type of direction D. Giant words and board digits in Anton (one heavy condensed weight, like
 * the reference edits); UI labels in Barlow Condensed; running copy in Inter (channel body font).
 */
import React from "react";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadBarlowCondensed } from "@remotion/google-fonts/BarlowCondensed";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { COLOR, FONT } from "../../catalog/tokens";

const anton = loadAnton("normal", { weights: ["400"], subsets: ["latin"] });
const barlow = loadBarlowCondensed("normal", { weights: ["500", "700"], subsets: ["latin"] });
loadInter("normal", { weights: ["400", "500"], subsets: ["latin"] });

export const GIANT = anton.fontFamily;
export const LABEL = barlow.fontFamily;

export const giant = (size: number, color: string = COLOR.textPrimary): React.CSSProperties => ({
  fontFamily: GIANT,
  fontWeight: 400,
  fontSize: size,
  lineHeight: 1,
  letterSpacing: "0",
  color,
  textTransform: "uppercase",
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
});

export const label = (size: number, color: string = COLOR.textSecondary, weight: 500 | 700 = 700): React.CSSProperties => ({
  fontFamily: LABEL,
  fontWeight: weight,
  fontSize: size,
  lineHeight: 1,
  letterSpacing: "0.06em",
  color,
  textTransform: "uppercase",
  whiteSpace: "nowrap",
});

export const body = (size: number, color: string = COLOR.textSecondary, weight: 400 | 500 = 400): React.CSSProperties => ({
  fontFamily: FONT.body,
  fontWeight: weight,
  fontSize: size,
  lineHeight: 1.3,
  letterSpacing: "-0.005em",
  color,
  whiteSpace: "nowrap",
});

/** Palette of a ground state: the navy stage or the flat light stage of the blockade snap. */
export type Ground = {
  light: boolean;
  bg: string;
  ink: string;
  ink2: string;
  ink3: string;
  slab: string;
  slab2: string;
  band: string;
};

export const NAVY: Ground = {
  light: false,
  bg: COLOR.bg,
  ink: COLOR.textPrimary,
  ink2: COLOR.textSecondary,
  ink3: COLOR.textTertiary,
  slab: COLOR.surface,
  slab2: COLOR.surface2,
  band: COLOR.surface2,
};

export const LIGHT: Ground = {
  light: true,
  bg: "#ECEAE6",
  ink: COLOR.bg,
  ink2: "#4A4F5C",
  ink3: "#7C8190",
  slab: COLOR.bg,
  slab2: "#DDDAD4",
  band: "#DAD7D0",
};
