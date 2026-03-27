/**
 * retime-storyboard.ts
 *
 * Reads the audio manifest (actual TTS durations) and updates storyboard timing
 * so scenes match actual audio length + appropriate padding.
 *
 * Usage: npx tsx scripts/retime-storyboard.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const BASE = "channels/the-world-with-numbers/videos/shrinkflation-decoded";
const AUDIO_MANIFEST_PATH = join(BASE, "production/audio/audio-manifest.json");
const STORYBOARD_PATH = join(BASE, "storyboard/storyboard-v1.json");
const SCENES_DIR = join(BASE, "storyboard/scenes");

// ── Load files ────────────────────────────────────────────────────────────────

const audioManifest = JSON.parse(readFileSync(AUDIO_MANIFEST_PATH, "utf-8"));
const storyboard = JSON.parse(readFileSync(STORYBOARD_PATH, "utf-8"));

// Build a map: sceneId → audio block
const audioMap = new Map<string, any>();
for (const block of audioManifest.blocks) {
  audioMap.set(block.id, block);
}

// ── Reconstruct original timings ──────────────────────────────────────────────
// The audio manifest block startTimes still contain the original scene startTimes.
// Original scene boundaries: startTime[i] = audioBlock[i].startTime,
// endTime[i] = audioBlock[i+1].startTime (or 874.07 for last scene).

const ORIGINAL_TOTAL = 874.07; // from original storyboard

interface OriginalTiming {
  startTime: number;
  endTime: number;
  duration: number;
}

const originalTimings = new Map<string, OriginalTiming>();
const sceneIds = storyboard.scenes.map((s: any) => s.id);
for (let i = 0; i < sceneIds.length; i++) {
  const id = sceneIds[i];
  const block = audioMap.get(id);
  if (!block) continue;
  const startTime = block.startTime;
  const endTime = i < sceneIds.length - 1
    ? audioMap.get(sceneIds[i + 1])!.startTime
    : ORIGINAL_TOTAL;
  originalTimings.set(id, {
    startTime,
    endTime,
    duration: Math.round((endTime - startTime) * 1000) / 1000,
  });
}

// ── Padding rules ─────────────────────────────────────────────────────────────

function getPadding(scene: any): number {
  const id = scene.id as string;
  const transition = (scene.transition || "cut").toLowerCase();

  // Special-case overrides (checked first)
  if (id === "scene-001") return -Infinity; // handled separately with max()
  if (id === "scene-020") return 3.0; // emotional pause moment
  if (id === "scene-027") return 4.0; // closing needs time to land

  // Transition-based padding
  if (transition === "crossfade" || transition === "fade") return 1.5;
  if (transition === "cut") return 0.5;

  // Fallback
  return 0.5;
}

function computeSceneDuration(scene: any, audioDuration: number | null): number {
  const id = scene.id as string;

  // Scenes without audio: keep original duration
  if (audioDuration === null || audioDuration === undefined) {
    const orig = originalTimings.get(id);
    return orig ? orig.duration : scene.duration;
  }

  // Scene-001 (hook): max(audio + 0.5, 20s) — needs time for shrink animations
  if (id === "scene-001") {
    return Math.max(audioDuration + 0.5, 20);
  }

  const padding = getPadding(scene);
  return audioDuration + padding;
}

// ── Retime ────────────────────────────────────────────────────────────────────

interface TimingRow {
  id: string;
  section: string;
  oldStart: number;
  oldEnd: number;
  oldDuration: number;
  audioDuration: number | null;
  padding: number;
  newDuration: number;
  newStart: number;
  newEnd: number;
}

const rows: TimingRow[] = [];
let cursor = 0; // running start time

for (const scene of storyboard.scenes) {
  const audio = audioMap.get(scene.id);
  const audioDuration = audio ? audio.duration : null;

  const orig = originalTimings.get(scene.id);
  const oldStart = orig ? orig.startTime : scene.startTime;
  const oldEnd = orig ? orig.endTime : scene.endTime;
  const oldDuration = orig ? orig.duration : scene.duration;

  const newDuration = computeSceneDuration(scene, audioDuration);
  const newStart = Math.round(cursor * 1000) / 1000;
  const newEnd = Math.round((cursor + newDuration) * 1000) / 1000;

  // Determine effective padding for reporting
  let effectivePadding: number;
  if (audioDuration === null) {
    effectivePadding = 0;
  } else if (scene.id === "scene-001") {
    effectivePadding = newDuration - audioDuration;
  } else {
    effectivePadding = getPadding(scene);
  }

  rows.push({
    id: scene.id,
    section: scene.section,
    oldStart,
    oldEnd,
    oldDuration,
    audioDuration,
    padding: effectivePadding,
    newDuration,
    newStart,
    newEnd,
  });

  // Update storyboard skeleton scene
  scene.startTime = newStart;
  scene.endTime = newEnd;
  scene.duration = Math.round(newDuration * 1000) / 1000;

  cursor = newEnd;
}

// Update storyboard totals
const newTotal = Math.round(cursor * 1000) / 1000;
storyboard.totalDuration = newTotal;
const delta = newTotal - storyboard.targetDuration;
const deltaPct = ((delta / storyboard.targetDuration) * 100).toFixed(1);
const sign = delta >= 0 ? "+" : "";
storyboard.durationDelta = `${sign}${delta.toFixed(2)}s (${sign}${deltaPct}%)`;

// ── Write storyboard skeleton ─────────────────────────────────────────────────

writeFileSync(STORYBOARD_PATH, JSON.stringify(storyboard, null, 2) + "\n");
console.log(`✓ Updated ${STORYBOARD_PATH}`);

// ── Update scene detail files ─────────────────────────────────────────────────

for (const row of rows) {
  const scenePath = join(SCENES_DIR, `${row.id}.json`);
  const sceneData = JSON.parse(readFileSync(scenePath, "utf-8"));

  sceneData.startTime = row.newStart;
  sceneData.endTime = row.newEnd;
  sceneData.duration = Math.round(row.newDuration * 1000) / 1000;

  writeFileSync(scenePath, JSON.stringify(sceneData, null, 2) + "\n");
}
console.log(`✓ Updated ${rows.length} scene detail files in ${SCENES_DIR}/`);

// ── Update audio manifest timing ──────────────────────────────────────────────

for (const block of audioManifest.blocks) {
  const row = rows.find((r) => r.id === block.id);
  if (row) {
    block.startTime = row.newStart;
    // Audio endTime = startTime + audio duration (not scene end — audio ends before scene padding)
    block.endTime = Math.round((row.newStart + block.duration) * 1000) / 1000;
  }
}

writeFileSync(AUDIO_MANIFEST_PATH, JSON.stringify(audioManifest, null, 2) + "\n");
console.log(`✓ Updated ${AUDIO_MANIFEST_PATH}`);

// ── Print summary ─────────────────────────────────────────────────────────────

console.log("\n" + "═".repeat(120));
console.log("RETIME SUMMARY — Storyboard scene durations adjusted to match actual TTS audio");
console.log("═".repeat(120));
console.log(
  `${"Scene".padEnd(12)} ${"Section".padEnd(38)} ${"Old Dur".padStart(9)} ${"Audio".padStart(9)} ${"Pad".padStart(6)} ${"New Dur".padStart(9)} ${"Delta".padStart(9)} ${"New Start".padStart(10)} ${"New End".padStart(10)}`
);
console.log("─".repeat(120));

let totalOldDur = 0;
let totalNewDur = 0;
for (const r of rows) {
  totalOldDur += r.oldDuration;
  totalNewDur += r.newDuration;
  const deltaDur = r.newDuration - r.oldDuration;
  const audioStr = r.audioDuration !== null ? r.audioDuration.toFixed(2) : "N/A";
  const deltaStr = `${deltaDur >= 0 ? "+" : ""}${deltaDur.toFixed(2)}`;

  console.log(
    `${r.id.padEnd(12)} ${r.section.padEnd(38)} ${r.oldDuration.toFixed(2).padStart(9)} ${audioStr.padStart(9)} ${r.padding.toFixed(1).padStart(6)} ${r.newDuration.toFixed(2).padStart(9)} ${deltaStr.padStart(9)} ${r.newStart.toFixed(2).padStart(10)} ${r.newEnd.toFixed(2).padStart(10)}`
  );
}

const totalChange = totalNewDur - ORIGINAL_TOTAL;
console.log("─".repeat(120));
console.log(`Original total duration: ${ORIGINAL_TOTAL.toFixed(2)}s`);
console.log(`New total duration:      ${newTotal.toFixed(2)}s`);
console.log(`Change:                  ${totalChange >= 0 ? "+" : ""}${totalChange.toFixed(2)}s (${((totalChange / ORIGINAL_TOTAL) * 100).toFixed(1)}%)`);
console.log(`Target duration:         ${storyboard.targetDuration}s`);
console.log(`Delta from target:       ${storyboard.durationDelta}`);
console.log("═".repeat(120));
