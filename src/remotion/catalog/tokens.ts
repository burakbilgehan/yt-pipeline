/**
 * Design tokens of the scene catalog. The only source of colors, type, layout and motion
 * for catalog scenes. Visual language: style frame E (src/remotion/styleframes/e, the
 * approved reference, 26.09.2026): an interface card is the stage, giant display numerals,
 * hard snaps with motion blur, skewed panels, a slow drifting camera with parallax, real
 * 3D turns, and at most one kick on a key reveal. Palette v7.
 */
import { Easing } from "remotion";

export const COLOR = {
  bg: "#161820",
  surface: "#1E212A",
  surface2: "#262A36",
  grid: "#30353F",
  textPrimary: "#ECEAE6",
  textSecondary: "#A7ABB6",
  textTertiary: "#6F7483",
  highlight: "#F27FA3",
  contrast: "#5A9BD8",
  dataNeutral: "#5E6474",
} as const;

/** Tinted fill behind contrast-colored ink (the blue status chip). */
export const TINT = { contrast: "rgba(90,155,216,0.16)" } as const;

export const FONT = {
  /** Giant numerals and the few giant words. Loaded at 800 only. (user, 27.09.2026: Red Hat Display over Manrope) */
  display: "Red Hat Display",
  /** Everything else. */
  text: "Inter",
  /** Legacy aliases used by the frozen style frames only. */
  heading: "Manrope",
  body: "Inter",
} as const;

/**
 * One type system, four roles. Sizes are px at 1080p; a role is always used at one of its sizes.
 *   giant:   Red Hat Display 800, the number or phrase the scene is about.
 *   value:   Inter 700, numbers on marks (bar values, axis ends of a measure).
 *   body:    Inter 400/500, sentences and context lines.
 *   caption: Inter 500, uppercase and tracked: headers, labels, chips, panels, sources.
 */
export const TYPE = {
  giant: { family: FONT.display, weight: 800, lineHeight: 1, letterSpacing: "-0.02em", sizes: { xl: 440, l: 300, m: 220, s: 160, statementLarge: 144, statement: 112, statementSmall: 88 } },
  value: { family: FONT.text, weight: 700, lineHeight: 1, letterSpacing: "-0.03em", sizes: { l: 48, m: 40, s: 32 } },
  body: { family: FONT.text, weight: 400, lineHeight: 1.3, letterSpacing: "-0.01em", sizes: { l: 34, m: 28 } },
  caption: { family: FONT.text, weight: 500, lineHeight: 1, letterSpacing: "0.12em", sizes: { l: 28, m: 24, s: 22, xs: 20, xxs: 16 } },
} as const;
export type TypeRole = keyof typeof TYPE;

type SizeOf<R extends TypeRole> = keyof (typeof TYPE)[R]["sizes"];

function base(role: TypeRole, px: number, color: string): React.CSSProperties {
  const t = TYPE[role];
  return {
    fontFamily: t.family,
    fontWeight: t.weight,
    fontSize: px,
    lineHeight: t.lineHeight,
    letterSpacing: t.letterSpacing,
    color,
    whiteSpace: "nowrap",
    fontVariantNumeric: "tabular-nums",
  };
}

/** Giant display type. `px` overrides the named size when a figure is fitted to a width. */
export function giant(size: SizeOf<"giant"> | number, color: string = COLOR.textPrimary): React.CSSProperties {
  const px = typeof size === "number" ? size : TYPE.giant.sizes[size];
  // Proportional figures: a left-aligned numeral starts on the margin (a tabular 1 would not).
  return { ...base("giant", px, color), fontVariantNumeric: "proportional-nums lining-nums" };
}
export function value(size: SizeOf<"value">, color: string = COLOR.textPrimary): React.CSSProperties {
  return base("value", TYPE.value.sizes[size], color);
}
export function body(size: SizeOf<"body">, color: string = COLOR.textSecondary, weight: 400 | 500 | 700 = 400): React.CSSProperties {
  return { ...base("body", TYPE.body.sizes[size], color), fontWeight: weight };
}
export function caption(size: SizeOf<"caption">, color: string = COLOR.textTertiary): React.CSSProperties {
  return { ...base("caption", TYPE.caption.sizes[size], color), textTransform: "uppercase" };
}

/**
 * Advance width of the display family at 800, 1 px, with the giant tracking, per character class.
 * Used only to fit a giant figure to a width; drawing uses real layout.
 */
export const GIANT_EM = { digit: 0.6, punct: 0.26, sign: 0.62, percent: 0.84, letter: 0.62 } as const;

/** Left side bearing of display figures at 800 (em): a left-aligned giant is pulled left by it so its ink starts on the margin. */
export const GIANT_BEARING: Record<string, number> = { default: 0.01 };

/** Layout at 1920x1080. Everything hangs from the 96 px margin. */
export const LAYOUT = {
  width: 1920,
  height: 1080,
  margin: 96,
  /** Header caption (scope and unit) at top left; status chip at top right. */
  header: { top: 72 },
  chip: { top: 58, height: 44 },
  /** The area scenes may draw in. */
  content: { top: 150, bottom: 968, left: 96, right: 1824 },
  /** Source line at bottom left. */
  source: { top: 1010 },
  /** Right column for a scene's second figure (a delta, an annotation). */
  aside: { left: 1392, right: 1824 },
} as const;

/** Easing curves (style frame E). */
export const EASE = {
  /** Hard ease-out, no overshoot: fills, wipes, bar growth. */
  hard: Easing.bezier(0.1, 0.9, 0.15, 1),
  /** Stage turns: symmetric and confident. */
  turn: Easing.bezier(0.7, 0, 0.2, 1),
  /** Camera and measure moves. */
  move: Easing.bezier(0.2, 0, 0, 1),
  /** Headers and cards settling into place. */
  settle: Easing.bezier(0.05, 0.7, 0.1, 1),
  linear: Easing.linear,
  /** Number count-ups land the last digit without a freeze. */
  count: Easing.out(Easing.cubic),
  /** Legacy names used by the frozen style frames. */
  enter: Easing.bezier(0.05, 0.7, 0.1, 1),
  exit: Easing.bezier(0.3, 0, 0.8, 0.15),
} as const;

/** Durations in frames at 30 fps. */
export const DUR = {
  /** A snap: slide in with overshoot. */
  snap: 10,
  /** A snap out: slide away, fading over its last two thirds. */
  snapOut: 8,
  /** Offset between consecutive snaps of a group (words, rows). */
  stagger: 3,
  staggerMaxTotal: 24,
  /** Header caption swap. */
  header: 12,
  barGrow: 20,
  countUp: 30,
  /** A measure rising from one value to another (compare-values duel). */
  rise: 40,
  /** A digit cell turning on its axis. */
  flip: 12,
  /** The whole stage turning 180 degrees at a section boundary. */
  turn: 30,
  mapZoom: 36,
  route: 45,
  cardTurnIn: 26,
  kick: 9,
} as const;

/** Motion constants (style frame E). */
export const MOTION = {
  /** Overshoot of a snap: 1.1 is about 6 %; 0.9 is gentler. */
  overshoot: 1.0,
  /** Distance a scene slides in from (right) and out to (left) inside a section. */
  sceneIn: 160,
  sceneOut: 120,
  /** The outgoing scene is gone after this fraction of DUR.snapOut; the incoming one starts after this many frames. */
  sceneOutFade: 0.6,
  sceneEnterDelay: 3,
  /** Distance words and rows snap in from. */
  itemIn: 48,
  /** Scale punch of a kick. */
  kick: 0.028,
  /** Slow drift of depth layers: degrees of rotation, two incommensurate periods (frames). */
  drift: { ry: 1.6, rx: 0.8, periodA: 97, periodB: 151, phaseX: 300 },
  /** Perspective of depth layers and of the stage turn. */
  perspective: 2400,
  turnPerspective: 2600,
  /** Scale dip in the middle of a stage turn, so the edges stay in frame. */
  turnDip: 0.14,
  /** Corner radius of the stage while it turns. */
  turnRadius: 28,
  /** Pink slab that sweeps across mid-turn: width and skew in px. */
  wipe: { width: 90, skew: 360, from: 0.27, to: 0.73 },
  /** Motion blur: px/frame thresholds for levels 1..3 and their blur radii. */
  blur: { min: 14, l2: 40, l3: 90, radius: [5, 11, 18] as const },
  /** Stage turn blur: deg/frame thresholds for levels 1..3. */
  turnBlur: { min: 3, l2: 7, l3: 12 },
  /** Depth of named layers (px, negative is behind). */
  z: { card: -60, measure: 0, figure: 80, panel: 110 },
} as const;

/** Panels (skewed slabs), cards and chips. */
export const SHAPE = {
  /** Corner radius of every mark: bars (value end only), segments, panels, digit cells. (user, 27.09.2026) */
  radius: 4,
  panelSkew: 18,
  panelSkewLarge: 40,
  cardRadius: 24,
  /** A card turns in from this angle (degrees, around its left edge) and rests face-on. */
  cardTurnFrom: -78,
  chipPadX: 20,
  chipDot: 10,
} as const;

/** Atmosphere. Grain on every frame; light and vignette are used by the frozen style frames only. */
export const ATMOSPHERE = {
  grain: { opacity: 0.035, baseFrequency: 0.85, octaves: 2, tile: 384, seedBase: 11, seedCycle: 8, framesPerSeed: 2 },
  light: { rgba: "242,127,163", alpha: 0.06, x: 0.18, y: 0.1, driftX: 40, driftY: 24, periodX: 24, periodY: 31 },
  vignette: { alpha: 0.18 },
} as const;

/** Map card styling (map-focus). Opacities apply to existing color tokens. */
export const MAP = {
  graticule: { width: 0.75, opacityWorld: 0.5, opacityFit: 0.2 },
  borders: { width: 0.75, opacity: 0.9 },
  focus: { fillOpacity: 0.26, strokeWidth: 2, strokeOpacity: 1 },
  marker: { r: 14, stroke: 2.5, dot: 3.5 },
  labelHalo: 6,
  route: { width: 3, dash: "10 8", head: 5 },
  drift: 0.03,
  /** Inset of the fitted view inside the card. */
  pad: 96,
} as const;

/** Stagger offset of item i, compressed so the whole group lands within DUR.staggerMaxTotal. */
export function staggerDelay(i: number, count: number): number {
  if (count <= 8) return Math.min(i * DUR.stagger, DUR.staggerMaxTotal);
  return i < 5 ? i * DUR.stagger : 5 * DUR.stagger;
}
