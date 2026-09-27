/**
 * Copy a legacy video project into a new layout-2 project.
 * The legacy project is only read, never modified.
 *
 * Narration truth = legacy audio-manifest text (what the wav actually says).
 * Existing wavs are adopted into the hash cache, so the first `npm run tts`
 * after migration synthesizes nothing.
 * holdSec is set so the migrated timeline reproduces the legacy scene starts.
 *
 * Usage: npm run migrate-v2 -- <legacy-slug> <new-slug>
 */

import fs from "node:fs";
import path from "node:path";
import { getProjectDir, loadProjectConfig, loadStoryboardResolved } from "../utils/project.js";
import { getAudioDuration } from "../utils/audio-probe.js";
import {
  BLOCK_ID,
  audioFileName,
  audioHash,
  loadTTSSettings,
  paths,
  writeJson,
  type AudioManifest,
  type Order,
} from "../pipeline/v2.js";

const SCENE_TIMING_KEYS = ["id", "section", "startTime", "endTime", "duration", "wordCount", "voiceover", "sceneFile"];
const STORYBOARD_META_KEYS = ["title", "version", "basedOn", "totalDuration", "targetDuration", "durationDelta", "wordCount", "sceneCount", "scenes"];
const SKIP_COPY = new Set(["storyboard", "content", "config.json"]);

async function main() {
  const [from, to] = process.argv.slice(2);
  if (!from || !to || !BLOCK_ID.test(to)) {
    console.error("Usage: npm run migrate-v2 -- <legacy-slug> <new-slug>");
    process.exit(1);
  }
  const src = getProjectDir(from);
  const dst = getProjectDir(to);
  if (fs.existsSync(dst)) {
    // --force only replaces an earlier migration of the same source, never a real project.
    const prev = JSON.parse(fs.readFileSync(path.join(dst, "config.json"), "utf8"));
    if (!process.argv.includes("--force") || prev.migratedFrom !== from) {
      console.error(`${dst} already exists. Pick a new slug (or --force to redo a migration of ${from}).`);
      process.exit(1);
    }
    fs.rmSync(dst, { recursive: true });
  }

  const legacyConfig = loadProjectConfig(from) as Record<string, any>;
  if (legacyConfig.layout === 2) throw new Error(`${from} is already layout 2`);
  const storyboard = loadStoryboardResolved(from);
  if (!storyboard?.scenes?.length) throw new Error(`${from} has no resolvable storyboard`);
  const legacyManifest = JSON.parse(fs.readFileSync(path.join(src, "production", "audio", "audio-manifest.json"), "utf8"));
  const legacyBlocks = new Map<string, any>(legacyManifest.blocks.map((b: any) => [b.id, b]));

  // Copy everything that is not replaced by the new layout (research, data, assets).
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    if (SKIP_COPY.has(entry)) continue;
    fs.cpSync(path.join(src, entry), path.join(dst, entry), {
      recursive: true,
      filter: (p) => !p.includes(`${path.sep}production${path.sep}audio`) && !p.includes(`${path.sep}production${path.sep}output`),
    });
  }

  // config.json: identity + metadata only. Pipeline history stays with the legacy project.
  const tts = {
    provider: legacyManifest.provider,
    modelId: legacyManifest.modelId,
    speed: legacyManifest.speed,
  };
  const config = {
    slug: to,
    layout: 2,
    renderer: "legacy",
    title: legacyConfig.title,
    description: legacyConfig.description,
    createdAt: new Date().toISOString(),
    migratedFrom: from,
    tags: legacyConfig.tags ?? [],
    metadata: legacyConfig.metadata ?? {},
    tts,
  };
  writeJson(path.join(dst, "config.json"), config);

  const p = paths(to);
  const settings = loadTTSSettings(to);

  // storyboard/global.json
  const global = Object.fromEntries(Object.entries(storyboard).filter(([k]) => !STORYBOARD_META_KEYS.includes(k)));
  writeJson(p.global, global);

  const order: Order = { sections: [] };
  const manifest: AudioManifest = { blocks: {} };
  const mismatches: string[] = [];
  const overruns: string[] = [];
  const scenes = storyboard.scenes as any[];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const id: string = scene.id;
    if (!BLOCK_ID.test(id)) throw new Error(`scene id "${id}" is not a valid block id`);
    const block = legacyBlocks.get(id);
    if (!block) throw new Error(`no audio block for ${id}`);

    // Narration
    const text: string = block.text.trim();
    if ((scene.voiceover ?? "").trim() !== text) mismatches.push(id);
    fs.mkdirSync(path.dirname(p.block(id)), { recursive: true });
    fs.writeFileSync(p.block(id), text + "\n");

    // Order
    const last = order.sections[order.sections.length - 1];
    if (last && last.title === scene.section) last.blocks.push(id);
    else order.sections.push({ title: scene.section, blocks: [id] });

    // Audio adoption
    const wavSrc = path.join(src, "production", "audio", block.file);
    const hash = audioHash(text, settings);
    const file = audioFileName(id, hash);
    fs.mkdirSync(p.audioDir, { recursive: true });
    fs.copyFileSync(wavSrc, path.join(p.audioDir, file));
    const duration = await getAudioDuration(wavSrc);
    manifest.blocks[id] = { hash, file, duration };

    // Visual + hold so that the scene keeps its legacy slot length
    const slotEnd = i + 1 < scenes.length ? scenes[i + 1].startTime : scene.endTime;
    let holdSec = slotEnd - scene.startTime - duration;
    if (holdSec < 0) {
      overruns.push(`${id} (${(-holdSec).toFixed(2)}s)`);
      holdSec = 0;
    }
    const visual = Object.fromEntries(Object.entries(scene).filter(([k]) => !SCENE_TIMING_KEYS.includes(k)));
    writeJson(p.visual(id), { holdSec, ...visual });
  }

  writeJson(p.order, order);
  writeJson(p.manifest, manifest);

  console.log(`Migrated ${scenes.length} blocks: ${from} -> ${to}`);
  console.log(`TTS settings: ${JSON.stringify(settings)}`);
  console.log(`Narration differs from legacy storyboard voiceover in ${mismatches.length} block(s)${mismatches.length ? ": " + mismatches.join(", ") : ""}`);
  console.log(`Audio longer than legacy slot (hold clamped to 0) in ${overruns.length} block(s)${overruns.length ? ": " + overruns.join(", ") : ""}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
