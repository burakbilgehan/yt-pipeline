/**
 * Bridge between src/remotion/catalog/tokens.ts (the only source of visual values)
 * and the Claude Design system's project/tokens.json.
 *
 *   npm run design-tokens -- --out <file>     write tokens.json generated from tokens.ts
 *   npm run design-tokens -- --diff <file>    compare a tokens.json downloaded from Claude Design
 *                                             with tokens.ts; prints every changed color and type
 *                                             style, exits 1 if anything differs
 *
 * Direction of truth: an edit made in Claude Design is applied by changing tokens.ts,
 * then regenerating tokens.json with --out.
 */
import fs from "node:fs";
import { COLOR, TYPE, FONT, LAYOUT, SHAPE } from "../remotion/catalog/tokens.js";

const kebab = (s: string) => s.replace(/([a-z])([A-Z0-9])/g, "$1-$2").toLowerCase();

const USAGE: Record<string, string> = {
  bg: "The only background of every frame. Flat.",
  surface: "Cards (the map card), digit-cell housings, chips. Elevation by lightness only.",
  surface2: "Second elevation step: land on the map card, digit cells, neutral panels.",
  grid: "Gridlines, axis hairlines, map borders and coastlines.",
  textPrimary: "Titles and values that matter.",
  textSecondary: "Labels and secondary values.",
  textTertiary: "Header caption, axis ticks, source line; caption size only.",
  highlight: "The one thing the narration is about: at most one item or series per scene.",
  contrast: "The single comparison item, only when the narration names both.",
  dataNeutral: "Every other bar, line, country or segment.",
};

export function generate() {
  return {
    name: "The World With Numbers",
    version: 8,
    meta: { source: "generated from yt-pipeline src/remotion/catalog/tokens.ts by npm run design-tokens" },
    color: {
      themes: [{ id: "dark", name: "Night" }],
      tokens: Object.entries(COLOR).map(([k, v]) => ({ name: kebab(k), value: v, usage: USAGE[k] ?? "" })),
    },
    type: {
      fonts: [],
      families: { display: `"${FONT.display}", system-ui, sans-serif`, text: `"${FONT.text}", system-ui, sans-serif` },
      groups: [
        { name: "Giant", family: "display", styles: styles("giant") },
        { name: "Values", family: "text", styles: styles("value") },
        { name: "Body", family: "text", styles: styles("body") },
        { name: "Captions (uppercase)", family: "text", styles: styles("caption") },
      ],
    },
    spacing: {
      tokens: [
        { name: "space-base", value: "8px", usage: "Base grid; every position is a multiple." },
        { name: "margin", value: `${LAYOUT.margin}px`, usage: "Frame margin at 1080p; every scene hangs from it." },
        { name: "header-top", value: `${LAYOUT.header.top}px`, usage: "Top of the header caption." },
      ],
    },
    radius: {
      tokens: [
        { name: "radius-mark", value: `${SHAPE.radius}px`, usage: "Every mark: bars (value end only, baseline square), segments, panels, digit cells." },
        { name: "radius-card", value: `${SHAPE.cardRadius}px`, usage: "Cards that turn in as objects (the map card)." },
        { name: "radius-chip", value: `${LAYOUT.chip.height / 2}px`, usage: "Status chips." },
      ],
    },
  };
}

function styles(role: keyof typeof TYPE) {
  const t = TYPE[role];
  return Object.entries(t.sizes).map(([size, px]) => ({ name: `${role}-${size}`, fontSize: `${px}px`, lineHeight: t.lineHeight, fontWeight: t.weight, letterSpacing: t.letterSpacing }));
}

function diff(file: string): string[] {
  const remote = JSON.parse(fs.readFileSync(file, "utf8"));
  const local = generate();
  const out: string[] = [];
  const lc = new Map(local.color.tokens.map((t) => [t.name, t.value]));
  for (const t of remote.color?.tokens ?? []) {
    const value = typeof t.value === "string" ? t.value : t.value?.dark ?? Object.values(t.value ?? {})[0];
    if (!lc.has(t.name)) out.push(`color ${t.name}: only in Claude Design (${value})`);
    else if (String(value).toLowerCase() !== String(lc.get(t.name)).toLowerCase()) out.push(`color ${t.name}: tokens.ts ${lc.get(t.name)} -> Claude Design ${value}`);
  }
  const ls = new Map(local.type.groups.flatMap((g) => g.styles).map((s) => [s.name as string, s]));
  for (const s of (remote.type?.groups ?? []).flatMap((g: any) => g.styles ?? [])) {
    const l = ls.get(s.name);
    if (!l) out.push(`type ${s.name}: only in Claude Design`);
    else for (const k of ["fontSize", "fontWeight", "lineHeight"]) if (String(s[k]) !== String((l as any)[k])) out.push(`type ${s.name}.${k}: tokens.ts ${(l as any)[k]} -> Claude Design ${s[k]}`);
  }
  for (const [k, v] of Object.entries(remote.type?.families ?? {})) {
    const lv = (local.type.families as Record<string, string>)[k];
    if (lv !== v) out.push(`type family ${k}: tokens.ts ${lv} -> Claude Design ${v}`);
  }
  return out;
}

const outAt = process.argv.indexOf("--out");
const diffAt = process.argv.indexOf("--diff");
if (outAt > 0) {
  fs.writeFileSync(process.argv[outAt + 1], JSON.stringify(generate(), null, 2) + "\n");
  console.log(`wrote ${process.argv[outAt + 1]}`);
} else if (diffAt > 0) {
  const changes = diff(process.argv[diffAt + 1]);
  console.log(changes.length ? changes.join("\n") : "Claude Design tokens match tokens.ts");
  if (changes.length) process.exit(1);
} else {
  console.error("Usage: npm run design-tokens -- --out <file> | --diff <file>");
  process.exit(1);
}
