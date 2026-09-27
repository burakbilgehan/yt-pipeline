/**
 * Showcase sequence for reviewing the catalog look (style frame E language). Real numbers from
 * channels/the-world-with-numbers/videos/5-chokepoints-global-trade/research/research-v1.md and
 * the hormuz-pilot research notes. Three sections, so both transitions (push inside a section,
 * stage turn between sections) and one kick are exercised.
 */
import type { CatalogRenderScene, CatalogVideoProps } from "./CatalogVideo";

type ShowcaseScene = Omit<CatalogRenderScene, "id" | "startTime" | "endTime" | "cues"> & { durationInFrames: number; cues?: Record<string, number> };

const SRC = "EIA; research-v1 (5 chokepoints)";

const SHOWCASE_SCENES: ShowcaseScene[] = [
  {
    section: "Bottleneck",
    type: "statement",
    durationInFrames: 150,
    kicker: "Strait of Hormuz",
    title: "World oil supply",
    props: { text: "A fifth of the world's oil passes through one narrow strait.", emphasis: "one narrow strait.", fraction: { n: 1, d: 5 } },
  },
  {
    section: "Bottleneck",
    type: "map-focus",
    durationInFrames: 210,
    kicker: "Strait of Hormuz",
    title: "Between Iran and Oman",
    source: "Natural Earth",
    props: {
      focus: ["364", "512"],
      contrast: ["784"],
      route: [
        [50.6, 26.8],
        [56.3, 26.5],
        [58.6, 24.8],
      ],
      routeLabel: "Tanker route, schematic",
      marker: { lon: 56.3, lat: 26.5, label: "Strait of Hormuz" },
      frame: "marker",
    },
    cues: { zoom: 40 },
  },
  {
    section: "Flow",
    type: "big-number",
    durationInFrames: 240,
    kicker: "Strait of Hormuz",
    title: "Crude oil flow, million barrels a day",
    source: SRC,
    props: {
      value: 20.9,
      decimals: 1,
      unit: "million barrels a day",
      context: "of oil flows through Hormuz, about 20% of global consumption",
      reference: { label: "can bypass by pipeline", value: 9, kind: "part", remainderLabel: "no other route" },
    },
    cues: { reference: 70, remainder: 140, kick: 140 },
  },
  {
    section: "Flow",
    type: "ranked-bars",
    durationInFrames: 180,
    kicker: "Oil chokepoints",
    title: "Flow, million barrels a day",
    source: SRC,
    props: {
      decimals: 1,
      unit: "mb/d",
      items: [
        { label: "Malacca", value: 23.2 },
        { label: "Hormuz", value: 20.9, highlight: true },
        { label: "Suez + SUMED", value: 4.9 },
        { label: "Bab el-Mandeb", value: 4.2 },
        { label: "Panama", value: 2.3 },
      ],
      annotation: { text: "Under a quarter of Hormuz's flow", item: "Suez + SUMED" },
    },
    cues: { annotation: 90 },
  },
  {
    section: "Flow",
    type: "big-number",
    durationInFrames: 150,
    kicker: "Strait of Hormuz",
    title: "Flow against bypass capacity",
    source: SRC,
    props: {
      value: 20.9,
      decimals: 1,
      unit: "million barrels a day",
      context: "through the strait",
      label: "Through Hormuz",
      reference: { label: "Pipeline bypass capacity", value: 9, kind: "benchmark" },
    },
    cues: { reference: 60 },
  },
  {
    section: "Price",
    type: "compare-values",
    durationInFrames: 240,
    kicker: "Brent crude",
    title: "US dollars a barrel",
    source: "research notes (market data)",
    status: { text: "Blockade since Mar 2", tone: "pink" },
    props: {
      prefix: "$",
      items: [
        { label: "Before", value: 73 },
        { label: "Peak, Mar 19", value: 119, highlight: true },
      ],
    },
    cues: { second: 110, kick: 110 },
  },
  {
    section: "Price",
    type: "compare-values",
    durationInFrames: 150,
    kicker: "Oil flow",
    title: "Million barrels a day",
    source: SRC,
    props: {
      decimals: 1,
      items: [
        { label: "Hormuz", value: 20.9, highlight: true },
        { label: "Suez + SUMED", value: 4.9 },
        { label: "Panama", value: 2.3 },
      ],
    },
  },
];

/** The showcase as render input, laid out at 30 fps with no audio. */
export const SHOWCASE_FPS = 30;
export const SHOWCASE: CatalogVideoProps = (() => {
  let t = 0;
  const scenes: CatalogRenderScene[] = SHOWCASE_SCENES.map((s, i) => {
    const { durationInFrames, cues, ...rest } = s;
    const startTime = t;
    t += durationInFrames / SHOWCASE_FPS;
    return { ...rest, id: `showcase-${i + 1}`, startTime, endTime: t, cues: cues ?? {} } as CatalogRenderScene;
  });
  return { renderer: "catalog", title: "Catalog showcase", scenes, audioSegments: [] };
})();
