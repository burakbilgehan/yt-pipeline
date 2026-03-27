/**
 * Preview Frames Script
 *
 * Renders key frames from each scene as PNG stills for quick visual QA.
 * Much faster than a full video render — preview 27 scenes in ~30-60 seconds.
 *
 * Usage: npm run preview <project-slug>
 *
 * Output:
 *   - channels/<channel>/videos/<slug>/preview/  (wiped on each run)
 *     - 01-scene-001.png, 02-scene-001-mid.png, ...
 *     - contact-sheet.png  (grid of all frames)
 *
 * Frame selection logic:
 *   - data-chart scenes (animated): 3 frames (10%, 50%, 90% through scene)
 *   - stock-video scenes: 2 frames (25%, 75%)
 *   - text-overlay / static: 1 frame (50%)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { getProjectDir, loadProjectConfig, loadChannelConfig } from "../utils/project";

const REMOTION_ENTRY = path.resolve("src", "remotion", "index.ts");

// Contact sheet settings
const THUMB_WIDTH = 480;
const THUMB_HEIGHT = 270;
const GRID_COLS = 5;
const GRID_PADDING = 8;
const LABEL_HEIGHT = 28;

interface FrameJob {
  /** Incremental counter (1-based) for filename sorting */
  counter: number;
  /** Scene ID e.g. "scene-001" */
  sceneId: string;
  /** Label for the frame: "start", "mid", "end" */
  label: string;
  /** Absolute frame number in the composition timeline */
  frame: number;
  /** Output filename e.g. "01-scene-001.png" */
  filename: string;
}

interface VideoConfig {
  title: string;
  durationSeconds: number;
  fps: number;
  width: number;
  height: number;
  backgroundColor: string;
  brandColor: string;
  fontFamily: string;
  showSubtitles: boolean;
  showProgressBar: boolean;
  scenes: Array<{
    id: string;
    section: string;
    startTime: number;
    endTime: number;
    voiceover: string;
    transition: string;
    visual: {
      type: string;
      assetPath?: string;
      textOverlay?: string;
      dataChart?: {
        type: string;
        [key: string]: unknown;
      };
    };
  }>;
  audioFiles: string[];
  audioSegments: Array<{
    src: string;
    startTime: number;
  }>;
}

function formatTimestamp(frame: number, fps: number): string {
  const totalSeconds = Math.round(frame / fps);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}m${String(s).padStart(2, "0")}s`;
}

function classifyScene(scene: VideoConfig["scenes"][0]): "dynamic-chart" | "dynamic-video" | "static" {
  if (scene.visual.type === "data-chart" && scene.visual.dataChart) {
    return "dynamic-chart";
  }
  if (
    scene.visual.type === "stock-video" ||
    (scene.visual.assetPath && /\.(mp4|webm|mov)$/i.test(scene.visual.assetPath))
  ) {
    return "dynamic-video";
  }
  return "static";
}

function buildFrameJobs(scenes: VideoConfig["scenes"], fps: number): FrameJob[] {
  const jobs: FrameJob[] = [];
  let counter = 1;

  for (const scene of scenes) {
    const startFrame = Math.round(scene.startTime * fps);
    const endFrame = Math.round(scene.endTime * fps);
    const duration = endFrame - startFrame;

    if (duration <= 0) continue;

    const sceneType = classifyScene(scene);

    switch (sceneType) {
      case "dynamic-chart": {
        // 3 frames: early (10%), mid (50%), late (90%) — see full animation arc
        const frames = [0.10, 0.50, 0.90];
        const labels = ["start", "mid", "end"];
        for (let i = 0; i < frames.length; i++) {
          const f = startFrame + Math.round(duration * frames[i]);
          const clampedFrame = Math.min(f, endFrame - 1);
          const ts = formatTimestamp(clampedFrame, fps);
          const suffix = labels[i];
          jobs.push({
            counter: counter++,
            sceneId: scene.id,
            label: suffix,
            frame: clampedFrame,
            filename: `${String(counter - 1).padStart(2, "0")}-${scene.id}-${suffix}-${ts}.png`,
          });
        }
        break;
      }
      case "dynamic-video": {
        // 2 frames: 25% and 75% — see different moments of stock footage
        const frames = [0.25, 0.75];
        const labels = ["early", "late"];
        for (let i = 0; i < frames.length; i++) {
          const f = startFrame + Math.round(duration * frames[i]);
          const clampedFrame = Math.min(f, endFrame - 1);
          const ts = formatTimestamp(clampedFrame, fps);
          const suffix = labels[i];
          jobs.push({
            counter: counter++,
            sceneId: scene.id,
            label: suffix,
            frame: clampedFrame,
            filename: `${String(counter - 1).padStart(2, "0")}-${scene.id}-${suffix}-${ts}.png`,
          });
        }
        break;
      }
      case "static": {
        // 1 frame: middle of scene
        const f = startFrame + Math.round(duration * 0.5);
        const clampedFrame = Math.min(f, endFrame - 1);
        const ts = formatTimestamp(clampedFrame, fps);
        jobs.push({
          counter: counter++,
          sceneId: scene.id,
          label: "mid",
          frame: clampedFrame,
          filename: `${String(counter - 1).padStart(2, "0")}-${scene.id}-${ts}.png`,
        });
        break;
      }
    }
  }

  return jobs;
}

async function createContactSheet(
  previewDir: string,
  jobs: FrameJob[],
  scenes: VideoConfig["scenes"],
  fps: number,
): Promise<void> {
  // We'll create an HTML file that displays all frames in a grid
  // This avoids needing sharp/canvas native dependencies
  const pngFiles = jobs.map((j) => j.filename);
  const cols = Math.min(GRID_COLS, pngFiles.length);
  const rows = Math.ceil(pngFiles.length / cols);

  let html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Preview Contact Sheet</title>
<style>
  body {
    margin: 0; padding: 16px;
    background: #2A2A32; color: #F0EDE8;
    font-family: Inter, system-ui, sans-serif;
  }
  h1 { font-size: 18px; font-weight: 500; margin-bottom: 16px; color: #E88CA5; }
  .grid {
    display: grid;
    grid-template-columns: repeat(${cols}, ${THUMB_WIDTH}px);
    gap: ${GRID_PADDING}px;
  }
  .cell {
    background: rgba(255,255,255,0.06);
    border-radius: 6px;
    overflow: hidden;
  }
  .cell img {
    width: ${THUMB_WIDTH}px;
    height: ${THUMB_HEIGHT}px;
    object-fit: cover;
    display: block;
  }
  .cell .label {
    padding: 4px 8px;
    font-size: 11px;
    color: rgba(240,237,232,0.7);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .cell .label .scene-id { color: #E88CA5; font-weight: 600; }
  .cell .label .scene-type { color: #5BBF8C; }
  .cell .label .timestamp { color: #F0EDE8; float: right; }
  .stats {
    margin-bottom: 12px;
    font-size: 13px;
    color: rgba(240,237,232,0.5);
  }
</style>
</head>
<body>
<h1>Preview Contact Sheet</h1>
<div class="stats">${pngFiles.length} frames from ${scenes.length} scenes</div>
<div class="grid">
`;

  for (const job of jobs) {
    const scene = scenes.find((s) => s.id === job.sceneId);
    const sceneType = scene ? classifyScene(scene) : "static";
    const typeLabel = sceneType === "dynamic-chart"
      ? scene?.visual.dataChart?.type || "chart"
      : sceneType === "dynamic-video"
        ? "video"
        : "text";
    const totalSec = Math.round(job.frame / fps);
    const mm = Math.floor(totalSec / 60);
    const ss = totalSec % 60;
    const ts = `${mm}:${String(ss).padStart(2, "0")}`;

    html += `  <div class="cell">
    <img src="${job.filename}" alt="${job.sceneId} ${job.label}" loading="lazy">
    <div class="label"><span class="scene-id">${job.sceneId}</span> [${job.label}] <span class="scene-type">${typeLabel}</span><span class="timestamp">${ts}</span></div>
  </div>\n`;
  }

  html += `</div>
</body>
</html>`;

  const outPath = path.join(previewDir, "contact-sheet.html");
  fs.writeFileSync(outPath, html);
  console.log(`\n📋 Contact sheet: ${outPath}`);
}

async function main() {
  const slug = process.argv[2];

  if (!slug) {
    console.error("Usage: npm run preview <project-slug>");
    process.exit(1);
  }

  const projectDir = getProjectDir(slug);
  if (!fs.existsSync(projectDir)) {
    console.error(`Project not found: ${projectDir}`);
    process.exit(1);
  }

  // ── Load video-config.json ──
  const videoConfigPath = path.join(projectDir, "production", "video-config.json");
  if (!fs.existsSync(videoConfigPath)) {
    console.error("No video-config.json found. Run production pipeline first.");
    process.exit(1);
  }

  const videoConfig: VideoConfig = JSON.parse(fs.readFileSync(videoConfigPath, "utf-8"));

  // ── Remap colors from legacy palettes to dusty-editorial theme ──
  // This remaps at runtime without modifying the original video-config.json
  const COLOR_REMAP: Record<string, string> = {
    "#1A1824": "#2A2A32",  // Legacy background → dusty editorial bg
    "#1A1B22": "#2A2A32",  // Old dark bg → dusty editorial bg
    "#2D2B3D": "#2A2A32",  // Old gradient end → solid bg
    "#D47FA6": "#E88CA5",  // Legacy pink → new accent1
    "#C97B9F": "#E88CA5",  // Legacy secondary pink → new accent1
    "#D8A7B1": "#E88CA5",  // Old muted pink → new accent1
    "#90AFC5": "#7BA7C9",  // Old muted blue → new accent2
    "#E8E0D4": "#F0EDE8",  // Legacy cream → new text
    "#EAE0D5": "#F0EDE8",  // Old accent cream → new text
    "#A3B18A": "#8A9A7A",  // Old sage/grid → new grid
  };

  function remapColor(hex: string | undefined): string | undefined {
    if (!hex) return hex;
    const upper = hex.toUpperCase();
    for (const [oldColor, newColor] of Object.entries(COLOR_REMAP)) {
      if (upper === oldColor.toUpperCase()) return newColor;
    }
    return hex;
  }

  // Remap top-level config colors
  videoConfig.backgroundColor = remapColor(videoConfig.backgroundColor) || videoConfig.backgroundColor;
  videoConfig.brandColor = remapColor(videoConfig.brandColor) || videoConfig.brandColor;

  // Remap per-scene item colors
  let remappedCount = 0;
  for (const scene of videoConfig.scenes) {
    if (scene.visual.dataChart?.items) {
      for (const item of scene.visual.dataChart.items as Array<{ color?: string }>) {
        const newColor = remapColor(item.color);
        if (newColor !== item.color) {
          item.color = newColor;
          remappedCount++;
        }
      }
    }
  }

  console.log(`🎨 Color remap: ${remappedCount} item colors + top-level bg/brand updated to dusty-editorial v3`);
  const fps = videoConfig.fps || 30;
  const width = videoConfig.width || 1920;
  const height = videoConfig.height || 1080;
  const totalDuration = videoConfig.durationSeconds || 60;
  const totalFrames = Math.ceil(totalDuration * fps);

  console.log(`🎬 Preview: ${videoConfig.title || slug}`);
  console.log(`   ${videoConfig.scenes.length} scenes, ${totalDuration}s, ${width}x${height} @ ${fps}fps`);

  // ── Prepare preview directory (wipe + recreate) ──
  const previewDir = path.join(projectDir, "preview");
  if (fs.existsSync(previewDir)) {
    fs.rmSync(previewDir, { recursive: true, force: true });
  }
  fs.mkdirSync(previewDir, { recursive: true });

  // ── Build frame jobs ──
  const jobs = buildFrameJobs(videoConfig.scenes, fps);

  // Count by type
  const chartFrames = jobs.filter((j) => j.label === "start" || j.label === "end").length;
  const videoFrames = jobs.filter((j) => j.label === "early" || j.label === "late").length;
  const staticFrames = jobs.length - chartFrames - videoFrames;

  console.log(`\n📸 ${jobs.length} frames to render:`);
  console.log(`   Charts: ${chartFrames + jobs.filter(j => j.label === "mid" && jobs.filter(jj => jj.sceneId === j.sceneId).length === 3).length} frames (3 per chart scene)`);
  console.log(`   Video: ${videoFrames} frames (2 per video scene)`);
  console.log(`   Static: ${staticFrames} frames (1 per text scene)`);

  // ── Bundle Remotion ──
  console.log("\n⚙️  Bundling Remotion...");
  const bundleStart = Date.now();
  const bundleLocation = await bundle({
    entryPoint: REMOTION_ENTRY,
    publicDir: projectDir,
  });
  console.log(`   Bundled in ${((Date.now() - bundleStart) / 1000).toFixed(1)}s`);

  // ── Select composition ──
  const channelConfig = loadChannelConfig();
  const compositionId = "MainVideo";

  const inputProps = {
    title: videoConfig.title || slug,
    scenes: videoConfig.scenes || [],
    audioFiles: videoConfig.audioFiles || [],
    audioSegments: videoConfig.audioSegments || [],
    showSubtitles: videoConfig.showSubtitles ?? true,
    showProgressBar: videoConfig.showProgressBar ?? false,
    brandColor: videoConfig.brandColor || channelConfig.visuals.brandColor,
    fontFamily: videoConfig.fontFamily || channelConfig.visuals.fontFamily,
  };

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: compositionId,
    inputProps,
  });

  composition.durationInFrames = totalFrames;
  composition.fps = fps;
  composition.width = width;
  composition.height = height;

  // ── Render frames ──
  console.log("\n🖼️  Rendering frames...\n");
  const renderStart = Date.now();
  let completed = 0;

  for (const job of jobs) {
    const outputPath = path.join(previewDir, job.filename);

    try {
      await renderStill({
        composition,
        serveUrl: bundleLocation,
        output: outputPath,
        inputProps,
        frame: job.frame,
        imageFormat: "png",
      });
      completed++;
      const elapsed = ((Date.now() - renderStart) / 1000).toFixed(0);
      const eta = completed < jobs.length
        ? ((Date.now() - renderStart) / completed * (jobs.length - completed) / 1000).toFixed(0)
        : "0";
      process.stdout.write(
        `\r   [${completed}/${jobs.length}] ${job.filename} (${elapsed}s elapsed, ~${eta}s remaining)`
      );
    } catch (err) {
      console.error(`\n   ❌ Failed: ${job.filename} (frame ${job.frame}): ${err}`);
    }
  }

  const totalTime = ((Date.now() - renderStart) / 1000).toFixed(1);
  console.log(`\n\n✅ ${completed}/${jobs.length} frames rendered in ${totalTime}s`);
  console.log(`   Average: ${(parseFloat(totalTime) / completed).toFixed(2)}s per frame`);
  console.log(`📁 Output: ${previewDir}`);

  // ── Create contact sheet ──
  await createContactSheet(previewDir, jobs, videoConfig.scenes, fps);

  console.log("\n🎉 Done! Open the contact sheet in a browser to review all frames.");
}

main().catch((err) => {
  console.error("Preview failed:", err);
  process.exit(1);
});
