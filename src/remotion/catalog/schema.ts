/**
 * The scene catalog contract. A layout-2 video with "renderer": "catalog" has one
 * storyboard/<block-id>.json per block, validated here by `npm run assemble`.
 * Every object is strict: an unknown field is an error, never silently ignored.
 * Limits come from work/design-brief.md section 3.
 */
import { z } from "zod";

const str = (max: number) => z.string().min(1).max(max);
const lonLat = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);
/** Days since 1970 of a YYYY, YYYY-MM or YYYY-MM-DD date (start of the period), else null. */
export function isoDate(s: string): number | null {
  const m = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(s);
  if (!m) return null;
  return Date.UTC(+m[1], m[2] ? +m[2] - 1 : 0, m[3] ? +m[3] : 1) / 86400000;
}
const isoNumeric = z.string().regex(/^\d{3}$/, "ISO 3166-1 numeric id, 3 digits");

const barItem = z
  .object({ label: str(24), value: z.number().min(0), highlight: z.boolean().optional(), contrast: z.boolean().optional() })
  .strict();
const atMostOne = (items: Array<{ highlight?: boolean; contrast?: boolean }>) =>
  items.filter((i) => i.highlight).length <= 1 && items.filter((i) => i.contrast).length <= 1;
const annotation = z.object({ text: str(40), item: str(24).optional() }).strict();
const barsBase = {
  unit: str(24).optional(),
  prefix: z.string().max(3).optional(),
  decimals: z.number().int().min(0).max(2).optional(),
  /** A benchmark drawn as a thin vertical rule with a caption. */
  reference: z.object({ label: str(30), value: z.number().min(0) }).strict().optional(),
  /** One caption anchored to an item's bar end (item = its label; default the highlighted item). Lands on cue "annotation". */
  annotation: annotation.optional(),
};

export const SCENE_PROPS = {
  "chapter-card": z.object({ number: z.number().int().min(1), title: str(40) }).strict(),
  statement: z
    .object({
      text: str(120),
      emphasis: str(120).optional(),
      attribution: str(60).optional(),
      /** The fraction the sentence states ("a fifth" = 1 of 5), drawn as a segment rule in the aside. */
      fraction: z.object({ n: z.number().int().min(1), d: z.number().int().min(2).max(10) }).strict().refine((f) => f.n <= f.d, "n must be at most d").optional(),
    })
    .strict()
    .refine((p) => !p.emphasis || p.text.includes(p.emphasis), { message: "emphasis must be a substring of text", path: ["emphasis"] }),
  "big-number": z
    .object({
      value: z.number(),
      decimals: z.number().int().min(0).max(2).optional(),
      prefix: z.string().max(3).optional(),
      unit: str(24).optional(),
      context: str(70),
      label: str(30).optional(),
      /**
       * part: the reference is a share of the value (bypass capacity of a flow); drawn as one
       * stacked bar, reference then remainder, and the headline turns to the remainder.
       * benchmark: an independent figure compared on one scale; two bars, nothing stacked.
       */
      reference: z
        .object({ label: str(30), value: z.number().min(0), kind: z.enum(["part", "benchmark"]), remainderLabel: str(30).optional() })
        .strict()
        .refine((r) => r.kind !== "part" || !!r.remainderLabel, { message: "a part reference needs remainderLabel", path: ["remainderLabel"] })
        .refine((r) => r.kind === "part" || !r.remainderLabel, { message: "remainderLabel applies to a part reference only", path: ["remainderLabel"] })
        .optional(),
    })
    .strict()
    .refine((p) => !p.reference || p.reference.kind !== "part" || (p.value > 0 && p.reference.value < p.value), {
      message: "a part reference must be smaller than the value",
      path: ["reference", "value"],
    }),
  "compare-values": z
    .object({ items: z.array(barItem).min(2).max(4), ...barsBase, showDelta: z.boolean().optional() })
    .strict()
    .refine((p) => atMostOne(p.items), { message: "at most one highlight and one contrast item", path: ["items"] }),
  "ranked-bars": z
    .object({ items: z.array(barItem).min(5).max(12), ...barsBase })
    .strict()
    .refine((p) => atMostOne(p.items), { message: "at most one highlight and one contrast item", path: ["items"] }),
  "time-series": z
    .object({
      series: z
        .array(
          z
            .object({
              label: str(20),
              role: z.enum(["highlight", "contrast", "neutral"]),
              points: z.array(z.object({ x: z.union([z.number(), z.string()]), y: z.number() }).strict()).min(2).max(200),
            })
            .strict(),
        )
        .min(1)
        .max(4),
      unit: str(24).optional(),
      prefix: z.string().max(3).optional(),
      decimals: z.number().int().min(0).max(2).optional(),
      /** A y axis that does not start at 0 is labeled on screen as cropped. */
      yMin: z.number().optional(),
      yMax: z.number().optional(),
      indexLine: z.number().optional(),
      annotations: z.array(z.object({ x: z.union([z.number(), z.string()]), text: str(40) }).strict()).max(3).optional(),
    })
    .strict()
    .refine((p) => p.series.filter((s) => s.role === "highlight").length <= 1 && p.series.filter((s) => s.role === "contrast").length <= 1, {
      message: "at most one highlight and one contrast series",
      path: ["series"],
    }),
  "map-focus": z
    .object({
      focus: z.array(isoNumeric).min(1).max(6),
      contrast: z.array(isoNumeric).max(3).optional(),
      route: z.array(lonLat).min(2).max(6).optional(),
      /** Caption at the route's start. A route not traced from sourced coordinates says "schematic" here. */
      routeLabel: str(30).optional(),
      labels: z
        .array(z.object({ lon: z.number(), lat: z.number(), text: str(30), anchor: z.enum(["tr", "br", "tl", "bl"]).optional() }).strict())
        .max(6)
        .optional(),
      /** The point of interest (a strait, a port): the only saturated mark on the map. */
      marker: z.object({ lon: z.number(), lat: z.number(), label: str(30).optional() }).strict().optional(),
      /** Camera target: the focus countries (default) or the marker and route neighbourhood. */
      frame: z.enum(["countries", "marker"]).optional(),
    })
    .strict()
    .refine((p) => p.frame !== "marker" || !!p.marker, { message: 'frame "marker" needs a marker', path: ["frame"] })
    .refine((p) => !p.routeLabel || !!p.route, { message: "routeLabel needs a route", path: ["routeLabel"] }),
  timeline: z
    .object({
      events: z.array(z.object({ date: str(12), text: str(60), emphasis: z.boolean().optional() }).strict()).min(3).max(7),
      /** proportional spaces events by date; every date must then be YYYY, YYYY-MM or YYYY-MM-DD, in order. */
      scale: z.enum(["even", "proportional"]),
    })
    .strict()
    .refine((p) => p.scale === "even" || p.events.every((e) => isoDate(e.date) !== null), { message: "proportional needs dates as YYYY, YYYY-MM or YYYY-MM-DD", path: ["events"] })
    .refine((p) => p.scale === "even" || p.events.every((e, i) => i === 0 || (isoDate(e.date) ?? 0) > (isoDate(p.events[i - 1].date) ?? 0)), { message: "proportional needs events in date order", path: ["events"] })
    .refine((p) => p.events.filter((e) => e.emphasis).length <= 1, { message: "at most one emphasis event", path: ["events"] }),
  breakdown: z
    .object({
      parts: z.array(z.object({ label: str(24), value: z.number().min(0), role: z.enum(["highlight", "contrast"]).optional() }).strict()).min(2).max(8),
      /** The whole the parts belong to, when they do not add up to it; the rest is drawn as an empty track. */
      total: z.number().positive().optional(),
      unit: str(24).optional(),
      prefix: z.string().max(3).optional(),
      decimals: z.number().int().min(0).max(2).optional(),
      variant: z.enum(["bar", "waffle"]),
    })
    .strict()
    .refine((p) => !p.total || p.parts.reduce((s, x) => s + x.value, 0) <= p.total * (1 + 1e-9), { message: "parts add up to more than total", path: ["total"] })
    .refine((p) => p.parts.filter((x) => x.role === "highlight").length <= 1 && p.parts.filter((x) => x.role === "contrast").length <= 1, { message: "at most one highlight and one contrast part", path: ["parts"] })
    .refine((p) => p.parts.some((x) => x.value > 0), { message: "at least one part must be above 0", path: ["parts"] }),
  matrix: z
    .object({
      columns: z.array(str(16)).min(2).max(4),
      rows: z.array(z.object({ label: str(20), values: z.array(z.union([z.number(), z.string()])) }).strict()).min(2).max(5),
      highlightCell: z.tuple([z.number().int().min(0), z.number().int().min(0)]).optional(),
      highlightRow: z.number().int().min(0).optional(),
    })
    .strict()
    .refine((p) => p.rows.every((r) => r.values.length === p.columns.length), { message: "every row needs one value per column", path: ["rows"] })
    .refine((p) => !p.highlightCell || (p.highlightCell[0] < p.rows.length && p.highlightCell[1] < p.columns.length), { message: "highlightCell [row, column] is out of range", path: ["highlightCell"] })
    .refine((p) => p.highlightRow === undefined || p.highlightRow < p.rows.length, { message: "highlightRow is out of range", path: ["highlightRow"] })
    .refine((p) => !(p.highlightCell && p.highlightRow !== undefined), { message: "use highlightCell or highlightRow, not both", path: ["highlightRow"] }),
} as const;

export type SceneType = keyof typeof SCENE_PROPS;
export const SCENE_TYPES = Object.keys(SCENE_PROPS) as SceneType[];

/** Scene types that show data: they must name a source. */
export const DATA_TYPES: readonly SceneType[] = ["big-number", "compare-values", "ranked-bars", "time-series", "map-focus", "timeline", "breakdown", "matrix"];

/** Implemented in the renderer so far. assemble rejects the others until they exist. */
export const IMPLEMENTED_TYPES: readonly SceneType[] = SCENE_TYPES;

/** Cue names each type understands. A cue maps to a phrase of the block's narration. */
export const CUES: Record<SceneType, readonly string[]> = {
  "chapter-card": [],
  statement: ["emphasis"],
  "big-number": ["reference", "remainder"],
  "compare-values": ["second", "annotation"],
  "ranked-bars": ["annotation"],
  "time-series": ["annotation1", "annotation2", "annotation3"],
  "map-focus": ["zoom"],
  timeline: ["event2", "event3", "event4", "event5", "event6", "event7"],
  breakdown: ["highlight"],
  matrix: ["highlight"],
};

/**
 * Every type also accepts this cue: the one kick (a short scale punch of the frame) of the scene,
 * on its key reveal. Never automatic, at most one per scene.
 */
export const KICK_CUE = "kick";

/** One storyboard/<block-id>.json of a catalog video. */
export const catalogVisualSchema = z
  .object({
    holdSec: z.number().min(0).max(10).default(0.4),
    type: z.enum(SCENE_TYPES as [SceneType, ...SceneType[]]),
    title: str(60),
    kicker: str(40).optional(),
    /** Status chip at top right (a state, not a figure). */
    status: z.object({ text: str(28), tone: z.enum(["pink", "blue", "gray"]).default("gray") }).strict().optional(),
    source: str(90).optional(),
    props: z.unknown(),
    cues: z.record(z.string(), str(120)).optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    const props = SCENE_PROPS[v.type].safeParse(v.props);
    if (!props.success) {
      for (const issue of props.error.issues) ctx.addIssue({ code: "custom", message: issue.message, path: ["props", ...issue.path] });
    }
    if (DATA_TYPES.includes(v.type) && !v.source) ctx.addIssue({ code: "custom", message: `${v.type} shows data and needs a source`, path: ["source"] });
    for (const name of Object.keys(v.cues ?? {})) {
      if (name !== KICK_CUE && !CUES[v.type].includes(name)) ctx.addIssue({ code: "custom", message: `unknown cue "${name}" for ${v.type} (allowed: ${[...CUES[v.type], KICK_CUE].join(", ")})`, path: ["cues", name] });
    }
    if (!IMPLEMENTED_TYPES.includes(v.type)) ctx.addIssue({ code: "custom", message: `scene type ${v.type} is not implemented yet`, path: ["type"] });
  });
export type CatalogVisual = z.infer<typeof catalogVisualSchema>;

/** Human-readable validation errors, one line each. */
export function describeIssues(file: string, error: z.ZodError): string[] {
  return error.issues.map((i) => `${file}: ${i.path.join(".") || "(root)"}: ${i.message}`);
}
