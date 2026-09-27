/**
 * Type of direction E: one display family (Manrope 800, the channel heading font) for giant
 * numerals and the few giant words, Inter for everything else. Nothing else is loaded.
 */
import React from "react";
import { loadFont as loadManrope } from "@remotion/google-fonts/Manrope";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { COLOR } from "../../catalog/tokens";

const manrope = loadManrope("normal", { weights: ["800"], subsets: ["latin"] });
const inter = loadInter("normal", { weights: ["400", "500", "700"], subsets: ["latin"] });

export const DISPLAY = manrope.fontFamily;
export const TEXT = inter.fontFamily;

export const giant = (size: number, color: string = COLOR.textPrimary): React.CSSProperties => ({
  fontFamily: DISPLAY,
  fontWeight: 800,
  fontSize: size,
  lineHeight: 1,
  letterSpacing: "-0.045em",
  color,
  fontVariantNumeric: "tabular-nums lining-nums",
  whiteSpace: "nowrap",
});

/** Small caps-style caption: Inter 500, uppercase, tracked. */
export const caption = (size: number, color: string = COLOR.textTertiary): React.CSSProperties => ({
  fontFamily: TEXT,
  fontWeight: 500,
  fontSize: size,
  lineHeight: 1,
  letterSpacing: "0.12em",
  color,
  textTransform: "uppercase",
  whiteSpace: "nowrap",
  fontVariantNumeric: "tabular-nums",
});

export const body = (size: number, color: string = COLOR.textSecondary, weight: 400 | 500 | 700 = 400): React.CSSProperties => ({
  fontFamily: TEXT,
  fontWeight: weight,
  fontSize: size,
  lineHeight: 1.3,
  letterSpacing: "-0.01em",
  color,
  whiteSpace: "nowrap",
  fontVariantNumeric: "tabular-nums",
});

/** Value labels under bars and above measures: Inter 700, tight, tabular. */
export const value = (size: number, color: string = COLOR.textPrimary): React.CSSProperties => ({
  fontFamily: TEXT,
  fontWeight: 700,
  fontSize: size,
  lineHeight: 1,
  letterSpacing: "-0.03em",
  color,
  whiteSpace: "nowrap",
  fontVariantNumeric: "tabular-nums",
});
