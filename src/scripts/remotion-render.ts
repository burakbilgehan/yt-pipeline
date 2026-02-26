/**
 * Remotion Video Render Script
 *
 * Renders the final video using Remotion.
 *
 * Usage: npm run render <project-slug>
 *
 * Reads:
 *   - projects/<slug>/storyboard/storyboard-v<latest>.json (scene data)
 *   - projects/<slug>/production/audio/ (TTS voiceover files)
 *   - projects/<slug>/production/visuals/ (stock/AI images)
 *   - projects/<slug>/config.json (project metadata)
 *
 * Writes:
 *   - projects/<slug>/production/output/final.mp4
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { getLatestVersionedFile, loadProjectConfig, saveProjectConfig } from "../utils/project";

const PROJECTS_DIR = path.resolve("projects");
const REMOTION_ENTRY = path.resolve("src", "remotion", "index.ts");

async function main() {
  const slug = process.argv[2];

  if (!slug) {
    console.error("Usage: npm run render <project-slug>");
    process.exit(1);
  }

  const projectDir = path.join(PROJECTS_DIR, slug);

  if (!fs.existsSync(projectDir)) {
    console.error(`Project not found: ${projectDir}`);
    process.exit(1);
  }

  // ── Load project config ──
  const config = loadProjectConfig(slug);
  console.log(`Rendering video for project: ${config.title || slug}`);

  // ── Find latest storyboard JSON ──
  const storyboardFile = getLatestVersionedFile(
    slug,
    "storyboard",
    "storyboard"
  );

  if (!storyboardFile) {
    console.error("No storyboard file found. Run the storyboard agent first.");
    process.exit(1);
  }

  const storyboardPath = path.join(projectDir, "storyboard", storyboardFile);
  console.log(`Using storyboard: ${storyboardFile}`);

  const storyboard = JSON.parse(fs.readFileSync(storyboardPath, "utf-8"));

  // ── Collect audio files ──
  const audioDir = path.join(projectDir, "production", "audio");
  let audioFiles: string[] = [];

  if (fs.existsSync(audioDir)) {
    audioFiles = fs
      .readdirSync(audioDir)
      .filter((f) => f.endsWith(".mp3") || f.endsWith(".wav"))
      .sort()
      .map((f) => path.join("production", "audio", f));
    console.log(`Found ${audioFiles.length} audio files`);
  } else {
    console.log("No audio directory found - rendering without voiceover");
  }

  // ── Calculate total duration ──
  const scenes = storyboard.scenes || [];
  if (scenes.length === 0) {
    console.error("Storyboard has no scenes.");
    process.exit(1);
  }

  const lastScene = scenes[scenes.length - 1];
  const totalDurationSec = lastScene.endTime || storyboard.totalDuration || 60;
  const fps = 30;
  const totalFrames = Math.ceil(totalDurationSec * fps);

  console.log(`Total duration: ${totalDurationSec}s (${totalFrames} frames @ ${fps}fps)`);

  // ── Prepare output directory ──
  const outputDir = path.join(projectDir, "production", "output");
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, "final.mp4");

  // ── Composition input props ──
  const inputProps = {
    title: config.title || slug,
    scenes,
    audioFiles,
    showSubtitles: true,
    showProgressBar: true,
    brandColor: "#6C63FF",
    fontFamily: "Inter, sans-serif",
  };

  console.log("\nBundling Remotion project...");

  // ── Bundle ──
  const bundleLocation = await bundle({
    entryPoint: REMOTION_ENTRY,
    // Copy project assets to the bundle's public directory
    publicDir: projectDir,
  });

  console.log("Bundle complete. Selecting composition...");

  // ── Select composition ──
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "MainVideo",
    inputProps,
  });

  // Override duration with actual storyboard duration
  composition.durationInFrames = totalFrames;
  composition.fps = fps;

  console.log(`\nRendering ${composition.width}x${composition.height} @ ${fps}fps...`);
  console.log(`Output: ${outputPath}\n`);

  // ── Render ──
  const startTime = Date.now();

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: outputPath,
    inputProps,
    onProgress: ({ progress }) => {
      const percent = Math.round(progress * 100);
      process.stdout.write(`\rRendering: ${percent}%`);
    },
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\nRender complete in ${elapsed}s`);
  console.log(`Output: ${outputPath}`);

  // ── Update config ──
  const version = config.pipeline.production.version || 1;
  config.pipeline.production.status = "completed";
  config.pipeline.production.completedAt = new Date().toISOString();
  config.history.push({
    action: "production.completed",
    version,
    at: new Date().toISOString(),
    reason: `Rendered ${totalDurationSec}s video (${totalFrames} frames)`,
  });
  saveProjectConfig(slug, config);

  console.log("Config updated.");
}

main().catch((err) => {
  console.error("Render failed:", err);
  process.exit(1);
});
