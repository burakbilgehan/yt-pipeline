/**
 * Layout 2 video project model.
 *
 * Every fact has exactly one source file:
 *   script/order.json          section order and block order
 *   script/<id>.md             narration text of one block (what TTS speaks)
 *   storyboard/<id>.json       visual spec of one block (+ holdSec)
 *   storyboard/global.json     video-wide visual/audio settings (BGM, shared components)
 *   channel-config.json tts    voice settings (channel level, optional per-video override in config.json)
 *
 * Generated files (never edited by hand, rebuilt by scripts):
 *   production/audio/manifest.json   hash -> wav + measured duration
 *   production/timeline.json         scene timing derived from audio + holdSec
 *   production/render-input.json     MainVideo props, the only input Remotion reads
 *
 * A project uses this layout iff config.json has "layout": 2.
 */

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { z } from "zod";
import { getProjectDir, loadChannelConfig, loadProjectConfig } from "../utils/project.js";

// ─── Schemas ────────────────────────────────────────────────────────

export const BLOCK_ID = /^[a-z0-9][a-z0-9-]*$/;

export const orderSchema = z.object({
  sections: z
    .array(
      z.object({
        title: z.string().min(1),
        blocks: z.array(z.string().regex(BLOCK_ID)).min(1),
      }),
    )
    .min(1),
});
export type Order = z.infer<typeof orderSchema>;

export const visualSchema = z
  .object({
    /** Seconds the scene stays on screen after its narration ends. */
    holdSec: z.number().min(0).default(0),
  })
  .passthrough();
export type VisualFile = z.infer<typeof visualSchema>;

export const ttsSettingsSchema = z.object({
  provider: z.literal("google"),
  modelId: z.string(),
  voiceName: z.string(),
  languageCode: z.string(),
  speed: z.number().min(0.25).max(2),
  sampleRateHertz: z.number().int(),
  stylePrompt: z.string().optional(),
});
export type TTSSettings = z.infer<typeof ttsSettingsSchema>;

export const manifestSchema = z.object({
  blocks: z.record(
    z.string(),
    z.object({ hash: z.string(), file: z.string(), duration: z.number().positive() }),
  ),
});
export type AudioManifest = z.infer<typeof manifestSchema>;

export interface TimelineScene {
  id: string;
  section: string;
  /** Scene start/end in seconds on the content timeline (excludes START_PADDING). */
  startTime: number;
  endTime: number;
  audioFile: string;
  audioDuration: number;
}
export interface Timeline {
  fps: number;
  totalDuration: number;
  scenes: TimelineScene[];
}

// ─── Paths ──────────────────────────────────────────────────────────

export function paths(slug: string) {
  const root = getProjectDir(slug);
  return {
    root,
    config: path.join(root, "config.json"),
    order: path.join(root, "script", "order.json"),
    block: (id: string) => path.join(root, "script", `${id}.md`),
    visual: (id: string) => path.join(root, "storyboard", `${id}.json`),
    global: path.join(root, "storyboard", "global.json"),
    audioDir: path.join(root, "production", "audio"),
    manifest: path.join(root, "production", "audio", "manifest.json"),
    timeline: path.join(root, "production", "timeline.json"),
    renderInput: path.join(root, "production", "render-input.json"),
  };
}

export function isLayout2(slug: string): boolean {
  return (loadProjectConfig(slug) as unknown as { layout?: number }).layout === 2;
}

/** Renderer of a layout-2 project: "catalog" (new videos) or "legacy" (migrated copies). Explicit in config.json. */
export function rendererOf(slug: string): "catalog" | "legacy" {
  const r = (loadProjectConfig(slug) as unknown as { renderer?: string }).renderer;
  if (r !== "catalog" && r !== "legacy") throw new Error(`${slug}: config.json "renderer" must be "catalog" or "legacy"`);
  return r;
}

export function assertLayout2(slug: string): void {
  if (!isLayout2(slug)) {
    throw new Error(`${slug} is not a layout-2 project (config.json "layout": 2 missing). Legacy projects are read-only.`);
  }
}

// ─── Loading ────────────────────────────────────────────────────────

function readJson(file: string): unknown {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function writeJson(file: string, data: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}

export function loadOrder(slug: string): Order {
  const order = orderSchema.parse(readJson(paths(slug).order));
  const seen = new Set<string>();
  for (const id of order.sections.flatMap((s) => s.blocks)) {
    if (seen.has(id)) throw new Error(`order.json lists block "${id}" twice`);
    seen.add(id);
  }
  return order;
}

/** Blocks in playback order with their section title. */
export function orderedBlocks(slug: string): Array<{ id: string; section: string }> {
  return loadOrder(slug).sections.flatMap((s) => s.blocks.map((id) => ({ id, section: s.title })));
}

export function loadNarration(slug: string, id: string): string {
  const text = fs.readFileSync(paths(slug).block(id), "utf8").trim();
  if (!text) throw new Error(`script/${id}.md is empty`);
  return text;
}

export function loadVisual(slug: string, id: string): VisualFile {
  return visualSchema.parse(readJson(paths(slug).visual(id)));
}

export function loadGlobal(slug: string): Record<string, unknown> {
  const file = paths(slug).global;
  return fs.existsSync(file) ? (readJson(file) as Record<string, unknown>) : {};
}

export function loadManifest(slug: string): AudioManifest {
  const file = paths(slug).manifest;
  return fs.existsSync(file) ? manifestSchema.parse(readJson(file)) : { blocks: {} };
}

/** Channel TTS settings with optional per-video override from config.json "tts". */
export function loadTTSSettings(slug: string): TTSSettings {
  const ch = (loadChannelConfig() as unknown as { tts?: Record<string, unknown> }).tts ?? {};
  const vid = (loadProjectConfig(slug) as unknown as { tts?: Record<string, unknown> }).tts ?? {};
  const merged = { ...ch, ...vid };
  return ttsSettingsSchema.parse({
    provider: merged.provider,
    modelId: merged.modelId,
    voiceName: merged.voiceName,
    languageCode: merged.languageCode ?? "en-US",
    speed: merged.speed ?? 1,
    sampleRateHertz: merged.sampleRateHertz ?? 24000,
    stylePrompt: merged.stylePrompt,
  });
}

// ─── Hashing ────────────────────────────────────────────────────────

/** Bump when the text-to-request conversion changes, so cached audio is regenerated. */
export const TTS_CONVERTER_VERSION = 1;

/** Cache key of one audio block: everything that changes what the wav sounds like. */
export function audioHash(text: string, tts: TTSSettings): string {
  const key = JSON.stringify({
    text,
    provider: tts.provider,
    modelId: tts.modelId,
    voiceName: tts.voiceName,
    languageCode: tts.languageCode,
    speed: tts.speed,
    sampleRateHertz: tts.sampleRateHertz,
    stylePrompt: tts.stylePrompt ?? null,
    converter: TTS_CONVERTER_VERSION,
  });
  return createHash("sha256").update(key).digest("hex");
}

export function audioFileName(id: string, hash: string): string {
  return `${id}.${hash.slice(0, 8)}.wav`;
}
