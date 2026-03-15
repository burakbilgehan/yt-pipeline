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
import { getLatestVersionedFile, loadProjectConfig, saveProjectConfig, loadChannelConfig } from "../utils/project";

const PROJECTS_DIR = path.resolve("projects");
const REMOTION_ENTRY = path.resolve("src", "remotion", "index.ts");

interface AudioSegment {
  src: string;
  startTime: number;
}

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

  // ── Parse scenes and calculate duration ──
  const scenes = storyboard.scenes || [];
  if (scenes.length === 0) {
    console.error("Storyboard has no scenes.");
    process.exit(1);
  }

  const lastScene = scenes[scenes.length - 1];
  const totalDurationSec = lastScene.endTime || storyboard.totalDuration || 60;
  const channelConfig = loadChannelConfig();
  const format: "long" | "short" = (config as any).metadata?.format || "long";
  const isShorts = format === "short";
  const fps = isShorts
    ? ((channelConfig as any).shorts?.fps || channelConfig.visuals.fps)
    : channelConfig.visuals.fps;
  const totalFrames = Math.ceil(totalDurationSec * fps);

  // Determine composition and resolution based on format
  const compositionId = isShorts ? "ShortsVideo" : "MainVideo";
  const width = isShorts ? 1080 : channelConfig.visuals.resolution.width;
  const height = isShorts ? 1920 : channelConfig.visuals.resolution.height;

  console.log(`Format: ${format} (${compositionId}, ${width}x${height})`);

  console.log(`Total duration: ${totalDurationSec}s (${totalFrames} frames @ ${fps}fps)`);

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

  // ── Build audio segments with correct timing ──
  // Audio files correspond to script sections (voiceover blocks), not individual scenes.
  // Each [VOICEOVER] block in the script becomes one audio file (via TTS).
  //
  // Strategy 1: Parse the script file for section timestamps (e.g., "## Hook (0:00 - 0:15)")
  // Strategy 2: Detect voiceover block boundaries from storyboard scene gaps
  // Strategy 3: Fallback to even distribution
  const audioSegments: AudioSegment[] = [];

  if (audioFiles.length > 0 && scenes.length > 0) {
    // Try to read the script file and extract section start times
    const scriptFile = getLatestVersionedFile(slug, "content", "script");
    let sectionStartTimes: number[] = [];

    if (scriptFile) {
      const scriptPath = path.join(projectDir, "content", scriptFile);
      const scriptContent = fs.readFileSync(scriptPath, "utf-8");

      // Parse timestamps from section headers like "## Hook (0:00 - 0:15)"
      // or "## Section 1: #10 to #8 — The Everyday Shockers (0:15 - 0:55)"
      const sectionRegex = /^## .+\((\d+):(\d+)\s*-\s*\d+:\d+\)/gm;
      let match: RegExpExecArray | null;
      while ((match = sectionRegex.exec(scriptContent)) !== null) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        sectionStartTimes.push(minutes * 60 + seconds);
      }
      console.log(`\nParsed ${sectionStartTimes.length} section timestamps from ${scriptFile}`);
    }

    if (sectionStartTimes.length === audioFiles.length) {
      console.log(`Audio-section mapping (${audioFiles.length} segments):`);
      for (let i = 0; i < audioFiles.length; i++) {
        audioSegments.push({
          src: audioFiles[i],
          startTime: sectionStartTimes[i],
        });
        console.log(`  ${audioFiles[i]} → starts at ${sectionStartTimes[i]}s`);
      }
    } else {
      // Fallback: detect from storyboard voiceover gaps
      console.log(`Script sections (${sectionStartTimes.length}) don't match audio files (${audioFiles.length}).`);
      console.log("Trying storyboard voiceover gap detection...");

      sectionStartTimes = [];
      let inVoiceoverBlock = false;
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        const hasVoiceover = scene.voiceover && scene.voiceover.trim().length > 0;
        if (hasVoiceover && !inVoiceoverBlock) {
          sectionStartTimes.push(scene.startTime);
          inVoiceoverBlock = true;
        } else if (!hasVoiceover) {
          inVoiceoverBlock = false;
        }
      }

      if (sectionStartTimes.length === audioFiles.length) {
        console.log(`Audio-section mapping (${audioFiles.length} segments):`);
        for (let i = 0; i < audioFiles.length; i++) {
          audioSegments.push({
            src: audioFiles[i],
            startTime: sectionStartTimes[i],
          });
          console.log(`  ${audioFiles[i]} → starts at ${sectionStartTimes[i]}s`);
        }
      } else {
        // Final fallback: even distribution
        console.log(`Warning: Detected ${sectionStartTimes.length} blocks but have ${audioFiles.length} audio files.`);
        console.log("Falling back to even distribution across timeline.");
        const segmentDuration = totalDurationSec / audioFiles.length;
        for (let i = 0; i < audioFiles.length; i++) {
          audioSegments.push({
            src: audioFiles[i],
            startTime: i * segmentDuration,
          });
          console.log(`  ${audioFiles[i]} → starts at ${(i * segmentDuration).toFixed(1)}s`);
        }
      }
    }
  }

  // ── Prepare output directory ──
  const outputDir = path.join(projectDir, "production", "output");
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, "final.mp4");

  // ── Propagate fallback images for scenes without visuals ──
  let lastAssetPath: string | undefined;
  for (const scene of scenes) {
    if (scene.visual?.assetPath) {
      lastAssetPath = scene.visual.assetPath;
    } else if (lastAssetPath && scene.visual && scene.visual.type !== "text-overlay") {
      // Mark the fallback so the component can use it
      scene.visual._fallbackAssetPath = lastAssetPath;
    }
  }

  // ── Composition input props (from channel config) ──
  const inputProps: Record<string, unknown> = {
    title: config.title || slug,
    scenes,
    audioFiles,
    audioSegments,
    showSubtitles: true,
    brandColor: channelConfig.visuals.brandColor,
    fontFamily: channelConfig.visuals.fontFamily,
  };

  // MainVideo gets progress bar, shorts don't
  if (!isShorts) {
    (inputProps as any).showProgressBar = true;
  }

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
    id: compositionId,
    inputProps,
  });

  // Override duration and resolution with actual values
  composition.durationInFrames = totalFrames;
  composition.fps = fps;
  composition.width = width;
  composition.height = height;

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
