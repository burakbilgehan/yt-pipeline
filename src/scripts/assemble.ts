/**
 * Build the generated files of a layout-2 project from its sources:
 *   production/timeline.json      scene timing = audio duration + holdSec, scenes tile with no gaps
 *   production/render-input.json  MainVideo props; Root.tsx, render and stills read only this
 *
 * Fails if any block has no audio for its current text (run `npm run tts` first).
 *
 * Usage: npm run assemble -- <slug>
 */

import fs from "node:fs";
import path from "node:path";
import { loadChannelConfig } from "../utils/project.js";
import { bridgeAllScenes } from "../utils/storyboard-bridge.js";
import { resolveHorseRaceScenes } from "../utils/horse-race-resolver.js";
import {
  assertLayout2,
  audioHash,
  loadGlobal,
  loadManifest,
  loadNarration,
  loadTTSSettings,
  loadOrder,
  loadVisual,
  orderedBlocks,
  paths,
  rendererOf,
  writeJson,
  type Timeline,
} from "../pipeline/v2.js";
import { catalogVisualSchema, describeIssues, type CatalogVisual } from "../remotion/catalog/schema.js";
import { countSpokenWords, sumExplicitBreaks } from "../utils/duration-predictor.js";

/** Typographic quotes and apostrophes for on-screen text (never applied to narration). */
export function smartPunctuation(s: string): string {
  return s
    .replace(/(\p{L}|\p{N})'(?=\p{L})/gu, "$1\u2019")
    .replace(/'(\d{2}s?)\b/g, "\u2019$1")
    .replace(/"([^"]*)"/g, "\u201C$1\u201D")
    .replace(/(^|[\s(])'/g, "$1\u2018")
    .replace(/'/g, "\u2019");
}

/** Apply smartPunctuation to every string inside a props object. */
function typesetStrings<T>(v: T): T {
  if (typeof v === "string") return smartPunctuation(v) as T;
  if (Array.isArray(v)) return v.map(typesetStrings) as T;
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, typesetStrings(x)])) as T;
  return v;
}

/** Validate every catalog visual file; throws one error listing every problem with file and field. */
function loadCatalogVisuals(slug: string, ids: string[]): Map<string, CatalogVisual> {
  const out = new Map<string, CatalogVisual>();
  const problems: string[] = [];
  for (const id of ids) {
    const file = paths(slug).visual(id);
    const rel = `storyboard/${id}.json`;
    if (!fs.existsSync(file)) {
      problems.push(`${rel}: missing`);
      continue;
    }
    const parsed = catalogVisualSchema.safeParse(JSON.parse(fs.readFileSync(file, "utf8")));
    if (parsed.success) out.set(id, parsed.data);
    else problems.push(...describeIssues(rel, parsed.error));
  }
  if (problems.length) throw new Error(`Storyboard is invalid:\n${problems.join("\n")}`);
  return out;
}

/**
 * Frame offset (from the scene start) at which `phrase` is spoken in a block, by word
 * position scaled to the measured audio, counting explicit <break> pauses before it.
 * A phrase that is not in the narration is an error.
 */
function cueFrame(narration: string, phrase: string, audioDuration: number, fps: number, where: string): number {
  const at = narration.toLowerCase().indexOf(phrase.toLowerCase());
  if (at < 0) throw new Error(`${where}: cue phrase "${phrase}" is not in the narration`);
  const before = narration.slice(0, at);
  const totalBreaks = sumExplicitBreaks(narration);
  const words = countSpokenWords(narration);
  const speech = Math.max(0, audioDuration - totalBreaks);
  const sec = sumExplicitBreaks(before) + (words > 0 ? (countSpokenWords(before) / words) * speech : 0);
  return Math.round(sec * fps);
}

/** BackgroundMusicLayer config from storyboard/global.json backgroundMusic; files are served from bgm/. */
function bgmConfig(bgm: any) {
  if (!(bgm?.tracks?.length > 0)) return undefined;
  return {
    tracks: bgm.tracks.map((t: any) => ({ src: `bgm/${path.basename(t.file ?? t.src)}`, durationSec: t.durationSec ?? t.duration ?? 120 })),
    volume: bgm.volume ?? 0.06,
    crossfadeSec: bgm.crossfadeSec ?? bgm.crossfadeDuration ?? 3,
    fadeInSec: bgm.fadeInSec ?? 3,
    fadeOutSec: bgm.fadeOutSec ?? 4,
  };
}

export function assemble(slug: string): { timeline: Timeline; stale: string[] } {
  assertLayout2(slug);
  const p = paths(slug);
  const tts = loadTTSSettings(slug);
  const manifest = loadManifest(slug);
  const channel = loadChannelConfig() as any;
  const fps: number = channel.visuals.fps;

  const blocks = orderedBlocks(slug);
  const stale = blocks
    .filter(({ id }) => manifest.blocks[id]?.hash !== audioHash(loadNarration(slug, id), tts))
    .map(({ id }) => id);
  if (stale.length > 0) return { timeline: { fps, totalDuration: 0, scenes: [] }, stale };

  const renderer = rendererOf(slug);
  const catalog = renderer === "catalog" ? loadCatalogVisuals(slug, blocks.map((b) => b.id)) : undefined;

  // Timeline in seconds; renderers convert to frames with ../remotion/timing toFrame.
  const round6 = (sec: number) => +sec.toFixed(6);
  let cursor = 0;
  const timeline: Timeline = { fps, totalDuration: 0, scenes: [] };
  for (const { id, section } of blocks) {
    const audio = manifest.blocks[id];
    const holdSec = catalog ? catalog.get(id)!.holdSec : loadVisual(slug, id).holdSec;
    const startTime = cursor;
    const endTime = round6(startTime + audio.duration + holdSec);
    timeline.scenes.push({ id, section, startTime, endTime, audioFile: audio.file, audioDuration: audio.duration });
    cursor = endTime;
  }
  timeline.totalDuration = cursor;

  if (catalog) {
    const sections = loadOrder(slug).sections;
    const global = loadGlobal(slug) as any;
    const renderInput = {
      renderer: "catalog",
      title: (JSON.parse(fs.readFileSync(p.config, "utf8")) as any).title ?? slug,
      scenes: timeline.scenes.map((t) => {
        const v = catalog.get(t.id)!;
        const narration = loadNarration(slug, t.id);
        const cues = Object.fromEntries(
          Object.entries(v.cues ?? {}).map(([name, phrase]) => [name, cueFrame(narration, phrase, t.audioDuration, fps, `storyboard/${t.id}.json cues.${name}`)]),
        );
        return {
          id: t.id,
          section: t.section,
          startTime: t.startTime,
          endTime: t.endTime,
          type: v.type,
          title: smartPunctuation(v.title),
          kicker: smartPunctuation(v.kicker ?? t.section),
          source: v.source,
          status: v.status ? { ...v.status, text: smartPunctuation(v.status.text) } : undefined,
          chapter: { index: sections.findIndex((s) => s.title === t.section) + 1, total: sections.length },
          props: typesetStrings(v.props),
          cues,
        };
      }),
      audioSegments: timeline.scenes.map((t) => ({ src: `production/audio/${t.audioFile}`, startTime: t.startTime })),
      backgroundMusic: bgmConfig(global.backgroundMusic),
    };
    writeJson(p.timeline, timeline);
    writeJson(p.renderInput, renderInput);
    return { timeline, stale };
  }

  // Legacy renderer: legacy scene shape, so the existing MainComposition renders it unchanged.
  const scenes: any[] = timeline.scenes.map((t) => {
    const { holdSec: _hold, ...visual } = loadVisual(slug, t.id);
    return {
      ...visual,
      id: t.id,
      section: t.section,
      startTime: t.startTime,
      endTime: t.endTime,
      duration: +(t.endTime - t.startTime).toFixed(6),
      voiceover: loadNarration(slug, t.id),
      transition: (visual as any).transition ?? "cut",
    };
  });
  bridgeAllScenes(scenes);
  const rupi = path.join(p.root, "production", "rupi-data.json");
  if (fs.existsSync(rupi)) resolveHorseRaceScenes(scenes, JSON.parse(fs.readFileSync(rupi, "utf8")));

  const global = loadGlobal(slug) as any;
  const bgm = global.backgroundMusic;
  const renderInput = {
    title: (JSON.parse(fs.readFileSync(p.config, "utf8")) as any).title ?? slug,
    scenes,
    audioFiles: [],
    audioSegments: timeline.scenes.map((t) => ({ src: `production/audio/${t.audioFile}`, startTime: t.startTime })),
    backgroundMusic: bgmConfig(bgm),
    showSubtitles: false,
    showProgressBar: true,
    brandColor: channel.visuals.brandColor,
    fontFamily: channel.visuals.fontFamily,
  };

  writeJson(p.timeline, timeline);
  writeJson(p.renderInput, renderInput);
  return { timeline, stale };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]).endsWith(path.join("scripts", "assemble.ts"));
if (isMain) {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Usage: npm run assemble -- <slug>");
    process.exit(1);
  }
  const { timeline, stale } = assemble(slug);
  if (stale.length > 0) {
    console.error(`Audio is missing or out of date for: ${stale.join(", ")}. Run npm run tts -- ${slug}`);
    process.exit(1);
  }
  console.log(`timeline.json + render-input.json: ${timeline.scenes.length} scenes, ${timeline.totalDuration.toFixed(3)}s`);
}
