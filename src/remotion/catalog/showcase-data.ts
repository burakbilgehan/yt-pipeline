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
  {
    section: "Types",
    type: "chapter-card",
    durationInFrames: 120,
    kicker: "Chapter two",
    title: "The price of a closed strait",
    props: { number: 2, title: "The price of a closed strait" },
  },
  {
    section: "Types",
    type: "time-series",
    durationInFrames: 180,
    kicker: "US eggs",
    title: "Average price, US dollars a dozen",
    source: "BLS average price data (shrinkflation research)",
    props: {
      prefix: "$",
      decimals: 2,
      series: [{ label: "Eggs, dozen", role: "highlight", points: [{ x: 2000, y: 0.913 }, { x: 2001, y: 0.929 }, { x: 2002, y: 1.032 }, { x: 2003, y: 1.244 }, { x: 2004, y: 1.34 }, { x: 2005, y: 1.218 }, { x: 2006, y: 1.306 }, { x: 2007, y: 1.676 }, { x: 2008, y: 1.987 }, { x: 2009, y: 1.664 }, { x: 2010, y: 1.66 }, { x: 2011, y: 1.769 }, { x: 2012, y: 1.838 }, { x: 2013, y: 1.91 }, { x: 2014, y: 2.018 }, { x: 2015, y: 2.469 }, { x: 2016, y: 1.684 }, { x: 2017, y: 1.467 }, { x: 2018, y: 1.742 }, { x: 2019, y: 1.396 }, { x: 2020, y: 1.506 }, { x: 2021, y: 1.674 }, { x: 2022, y: 2.857 }, { x: 2023, y: 2.796 }, { x: 2024, y: 3.171 }, { x: 2025, y: 4.252 }] }],
      annotations: [{ x: 2025, text: "Highest in the series" }],
    },
    cues: { annotation1: 110 },
  },
  {
    section: "Types",
    type: "timeline",
    durationInFrames: 180,
    kicker: "Strait of Hormuz",
    title: "Threat to blockade",
    source: "research-v1 (5 chokepoints)",
    props: {
      scale: "even",
      events: [
        { date: "Jun 14 2025", text: "Iran threatens a blockade after Israeli strikes" },
        { date: "Jun 23 2025", text: "Threat fades, oil back below $70" },
        { date: "Mar 2 2026", text: "Full blockade begins" },
        { date: "Mar 8 2026", text: "Brent passes $100" },
        { date: "Mar 19 2026", text: "Brent peaks near $119", emphasis: true },
      ],
    },
  },
  {
    section: "Types",
    type: "breakdown",
    durationInFrames: 150,
    kicker: "Crude through Hormuz",
    title: "Share by destination",
    source: "EIA, 1H 2025, via research-v1",
    props: {
      variant: "bar",
      unit: "%",
      total: 100,
      parts: [
        { label: "Four Asian buyers", value: 74, role: "highlight" },
        { label: "Everyone else", value: 26 },
      ],
    },
  },
  {
    section: "Types",
    type: "breakdown",
    durationInFrames: 150,
    kicker: "Crude through Hormuz",
    title: "Share by destination",
    source: "EIA, 1H 2025, via research-v1",
    props: {
      variant: "waffle",
      unit: "%",
      total: 100,
      parts: [
        { label: "Four Asian buyers", value: 74, role: "highlight" },
        { label: "Everyone else", value: 26 },
      ],
    },
  },
  {
    section: "Types",
    type: "matrix",
    durationInFrames: 150,
    kicker: "Oil chokepoints",
    title: "Flow and share of maritime oil",
    source: "EIA, 1H 2025, via research-v1",
    props: {
      columns: ["Million b/d", "Share"],
      rows: [
        { label: "Malacca", values: [23.2, "29%"] },
        { label: "Hormuz", values: [20.9, "25%"] },
        { label: "Suez + SUMED", values: [4.9, "6%"] },
        { label: "Panama", values: [2.3, "3%"] },
      ],
      highlightRow: 1,
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
