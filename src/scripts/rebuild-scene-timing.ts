#!/usr/bin/env bun
/**
 * Rebuild scene timing from audio manifest.
 *
 * Reads production/audio/audio-manifest.json (TTS actual durations) and
 * rewrites storyboard scene startTime/endTime so scenes never overlap with
 * each other or with their audio.
 *
 * Usage: bun run src/scripts/rebuild-scene-timing.ts <projectDir>
 */
import fs from "node:fs";
import path from "node:path";

const INTER_SCENE_GAP = 0.4; // seconds of silence between scenes
const TAIL_BUFFER = 0.25;    // seconds visual continues after audio ends

const projectDir = process.argv[2];
if (!projectDir) {
  console.error("Usage: rebuild-scene-timing.ts <projectDir>");
  process.exit(1);
}

const manifestPath = path.join(projectDir, "production/audio/audio-manifest.json");
const storyboardPath = (() => {
  const dir = path.join(projectDir, "storyboard");
  const files = fs.readdirSync(dir).filter((f) => f.startsWith("storyboard-v") && f.endsWith(".json"));
  files.sort((a, b) => {
    const va = parseInt(a.match(/v(\d+)/)?.[1] ?? "0", 10);
    const vb = parseInt(b.match(/v(\d+)/)?.[1] ?? "0", 10);
    return vb - va;
  });
  return path.join(dir, files[0]);
})();

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
const storyboard = JSON.parse(fs.readFileSync(storyboardPath, "utf-8"));

const audioById = new Map<string, { duration: number; file: string; section: string }>();
for (const block of manifest.blocks) {
  audioById.set(block.id, { duration: block.duration, file: block.file, section: block.section });
}

let cursor = 0;
const newBlocks: any[] = [];

for (const scene of storyboard.scenes) {
  const audio = audioById.get(scene.id);
  if (!audio) {
    console.warn(`No audio for ${scene.id} — skipping`);
    continue;
  }

  const startTime = cursor;
  const endTime = startTime + audio.duration + TAIL_BUFFER;

  scene.startTime = round(startTime);
  scene.endTime = round(endTime);

  newBlocks.push({
    id: scene.id,
    section: audio.section,
    file: audio.file,
    text: manifest.blocks.find((b: any) => b.id === scene.id)?.text ?? "",
    duration: audio.duration,
    wordCount: manifest.blocks.find((b: any) => b.id === scene.id)?.wordCount ?? 0,
    speed: manifest.speed,
    startTime: round(startTime),
    endTime: round(startTime + audio.duration),
  });

  cursor = endTime + INTER_SCENE_GAP;
}

storyboard.totalDuration = round(cursor - INTER_SCENE_GAP);
manifest.totalDuration = newBlocks.reduce((s, b) => s + b.duration, 0);
manifest.blocks = newBlocks;
manifest.regeneratedAt = new Date().toISOString();
manifest.timingSource = "rebuild-scene-timing.ts";

fs.writeFileSync(storyboardPath, JSON.stringify(storyboard, null, 2));
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log(`Rewrote ${newBlocks.length} scenes`);
console.log(`Total duration: ${storyboard.totalDuration}s`);
console.log(`Storyboard: ${storyboardPath}`);
console.log(`Manifest: ${manifestPath}`);

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
