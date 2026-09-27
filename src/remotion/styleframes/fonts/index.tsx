/**
 * Display font comparison (27.09.2026), round 4: round 3 read as one family ("hepsi cok ayni"),
 * because every candidate was a heavy geometric sans. This round spans categories: serif, slab,
 * condensed, wide, mono and technical, with Montserrat and Red Hat Display as references.
 * 28 panels, 7 x 4, at 3840 x 2160. k scales a panel's type so wide families fit the panel.
 */
import React from "react";
import { AbsoluteFill } from "remotion";
import { loadFont as f0 } from "@remotion/google-fonts/Montserrat";
import { loadFont as f1 } from "@remotion/google-fonts/RedHatDisplay";
import { loadFont as f2 } from "@remotion/google-fonts/Fraunces";
import { loadFont as f3 } from "@remotion/google-fonts/DMSerifDisplay";
import { loadFont as f4 } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as f5 } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as f6 } from "@remotion/google-fonts/BodoniModa";
import { loadFont as f7 } from "@remotion/google-fonts/RobotoSlab";
import { loadFont as f8 } from "@remotion/google-fonts/ZillaSlab";
import { loadFont as f9 } from "@remotion/google-fonts/AlfaSlabOne";
import { loadFont as f10 } from "@remotion/google-fonts/Arvo";
import { loadFont as f11 } from "@remotion/google-fonts/BebasNeue";
import { loadFont as f12 } from "@remotion/google-fonts/Anton";
import { loadFont as f13 } from "@remotion/google-fonts/BarlowCondensed";
import { loadFont as f14 } from "@remotion/google-fonts/Antonio";
import { loadFont as f15 } from "@remotion/google-fonts/SairaExtraCondensed";
import { loadFont as f16 } from "@remotion/google-fonts/Staatliches";
import { loadFont as f17 } from "@remotion/google-fonts/DelaGothicOne";
import { loadFont as f18 } from "@remotion/google-fonts/SpecialGothicExpandedOne";
import { loadFont as f19 } from "@remotion/google-fonts/Michroma";
import { loadFont as f20 } from "@remotion/google-fonts/Syncopate";
import { loadFont as f21 } from "@remotion/google-fonts/RussoOne";
import { loadFont as f22 } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as f23 } from "@remotion/google-fonts/SpaceMono";
import { loadFont as f24 } from "@remotion/google-fonts/IBMPlexMono";
import { loadFont as f25 } from "@remotion/google-fonts/ChakraPetch";
import { loadFont as f26 } from "@remotion/google-fonts/Tektur";
import { loadFont as f27 } from "@remotion/google-fonts/Oxanium";
import { loadFont as inter } from "@remotion/google-fonts/Inter";
import { COLOR, SHAPE } from "../../catalog/tokens";

const TEXT = inter("normal", { weights: ["500"], subsets: ["latin"] }).fontFamily;

const CANDIDATES: Array<{ label: string; group: string; family: string; weight: number; k: number }> = [
  { label: "01 · Montserrat 800", group: "reference", family: f0("normal", { weights: ["800"], subsets: ["latin"] }).fontFamily, weight: 800, k: 1 },
  { label: "02 · Red Hat Display 800", group: "reference", family: f1("normal", { weights: ["800"], subsets: ["latin"] }).fontFamily, weight: 800, k: 1 },
  { label: "03 · Fraunces 800", group: "serif", family: f2("normal", { weights: ["800"], subsets: ["latin"] }).fontFamily, weight: 800, k: 1 },
  { label: "04 · DM Serif Display 400", group: "serif", family: f3("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily, weight: 400, k: 1 },
  { label: "05 · Playfair Display 800", group: "serif", family: f4("normal", { weights: ["800"], subsets: ["latin"] }).fontFamily, weight: 800, k: 1 },
  { label: "06 · Instrument Serif 400", group: "serif", family: f5("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily, weight: 400, k: 1.1 },
  { label: "07 · Bodoni Moda 800", group: "serif", family: f6("normal", { weights: ["800"], subsets: ["latin"] }).fontFamily, weight: 800, k: 1 },
  { label: "08 · Roboto Slab 800", group: "slab", family: f7("normal", { weights: ["800"], subsets: ["latin"] }).fontFamily, weight: 800, k: 1 },
  { label: "09 · Zilla Slab 700", group: "slab", family: f8("normal", { weights: ["700"], subsets: ["latin"] }).fontFamily, weight: 700, k: 1.05 },
  { label: "10 · Alfa Slab One 400", group: "slab", family: f9("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily, weight: 400, k: 0.85 },
  { label: "11 · Arvo 700", group: "slab", family: f10("normal", { weights: ["700"], subsets: ["latin"] }).fontFamily, weight: 700, k: 0.95 },
  { label: "12 · Bebas Neue 400", group: "condensed", family: f11("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily, weight: 400, k: 1.05 },
  { label: "13 · Anton 400", group: "condensed", family: f12("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily, weight: 400, k: 1.1 },
  { label: "14 · Barlow Condensed 800", group: "condensed", family: f13("normal", { weights: ["800"], subsets: ["latin"] }).fontFamily, weight: 800, k: 1 },
  { label: "15 · Antonio 700", group: "condensed", family: f14("normal", { weights: ["700"], subsets: ["latin"] }).fontFamily, weight: 700, k: 0.95 },
  { label: "16 · Saira Extra Condensed 800", group: "condensed", family: f15("normal", { weights: ["800"], subsets: ["latin"] }).fontFamily, weight: 800, k: 1 },
  { label: "17 · Staatliches 400", group: "condensed", family: f16("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily, weight: 400, k: 1 },
  { label: "18 · Dela Gothic One 400", group: "wide", family: f17("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily, weight: 400, k: 0.72 },
  { label: "19 · Special Gothic Expanded One 400", group: "wide", family: f18("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily, weight: 400, k: 0.7 },
  { label: "20 · Michroma 400", group: "wide", family: f19("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily, weight: 400, k: 0.62 },
  { label: "21 · Syncopate 700", group: "wide", family: f20("normal", { weights: ["700"], subsets: ["latin"] }).fontFamily, weight: 700, k: 0.62 },
  { label: "22 · Russo One 400", group: "wide", family: f21("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily, weight: 400, k: 0.85 },
  { label: "23 · JetBrains Mono 800", group: "mono", family: f22("normal", { weights: ["800"], subsets: ["latin"] }).fontFamily, weight: 800, k: 0.8 },
  { label: "24 · Space Mono 700", group: "mono", family: f23("normal", { weights: ["700"], subsets: ["latin"] }).fontFamily, weight: 700, k: 0.8 },
  { label: "25 · IBM Plex Mono 700", group: "mono", family: f24("normal", { weights: ["700"], subsets: ["latin"] }).fontFamily, weight: 700, k: 0.8 },
  { label: "26 · Chakra Petch 700", group: "technical", family: f25("normal", { weights: ["700"], subsets: ["latin"] }).fontFamily, weight: 700, k: 1 },
  { label: "27 · Tektur 800", group: "technical", family: f26("normal", { weights: ["800"], subsets: ["latin"] }).fontFamily, weight: 800, k: 0.95 },
  { label: "28 · Oxanium 800", group: "technical", family: f27("normal", { weights: ["800"], subsets: ["latin"] }).fontFamily, weight: 800, k: 0.95 },
];

export const FONTS_DURATION = 1;
export const FONTS_SIZE = { width: 3840, height: 2160 };

const Panel: React.FC<{ c: (typeof CANDIDATES)[number] }> = ({ c }) => {
  const display: React.CSSProperties = { fontFamily: c.family, fontWeight: c.weight, lineHeight: 1, letterSpacing: "-0.03em", color: COLOR.textPrimary, whiteSpace: "nowrap" };
  const cap: React.CSSProperties = { fontFamily: TEXT, fontWeight: 500, fontSize: 20, letterSpacing: "0.12em", textTransform: "uppercase", whiteSpace: "nowrap" };
  return (
    <div style={{ position: "relative", background: COLOR.bg, overflow: "hidden" }}>
      <div style={{ ...cap, position: "absolute", left: 32, top: 26, color: COLOR.textTertiary }}>{c.label}</div>
      <div style={{ ...cap, position: "absolute", left: 32, top: 54, color: COLOR.contrast }}>{c.group}</div>
      <div style={{ ...display, position: "absolute", left: 28, top: 88, fontSize: Math.round(190 * c.k), color: COLOR.highlight }}>11.9</div>
      <div style={{ ...display, position: "absolute", left: 32, top: 306, fontSize: Math.round(40 * Math.min(1, c.k)) }}>A fifth of the world&rsquo;s oil</div>
      <div style={{ ...display, position: "absolute", left: 32, top: 356, fontSize: Math.round(40 * Math.min(1, c.k)) }}>$73 to $119, +63%</div>
      <div style={{ position: "absolute", left: 32, top: 424, height: 40, padding: "0 18px", background: COLOR.highlight, borderRadius: SHAPE.radius, display: "flex", alignItems: "center" }}>
        <span style={{ ...cap, color: COLOR.bg }}>No other route</span>
      </div>
    </div>
  );
};

export const FontCompare: React.FC = () => (
  <AbsoluteFill style={{ background: COLOR.grid, display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridTemplateRows: "repeat(4, 1fr)", gap: 12, padding: 16, boxSizing: "border-box" }}>
    {CANDIDATES.map((c) => (
      <Panel key={c.label} c={c} />
    ))}
  </AbsoluteFill>
);
