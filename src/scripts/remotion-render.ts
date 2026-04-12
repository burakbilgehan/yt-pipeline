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
import * as os from "node:os";
import * as path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { webpackOverride } from "../remotion/webpack-override";
import { getLatestVersionedFile, loadProjectConfig, saveProjectConfig, loadChannelConfig, getProjectDir, loadStoryboardResolved } from "../utils/project";
import { bridgeAllScenes } from "../utils/storyboard-bridge";
import type { AudioManifest } from "../types/index";
import { START_PADDING_SEC, END_PADDING_SEC } from "../remotion/compositions/MainComposition";

const REMOTION_ENTRY = path.resolve("src", "remotion", "index.ts");

/**
 * Parse concurrency from CLI args or env var.
 * Priority: --concurrency=N > REMOTION_CONCURRENCY env > default (16)
 */
function parseConcurrency(): number {
  // CLI: --concurrency=8 or --concurrency 8
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--concurrency=")) {
      const val = parseInt(args[i].split("=")[1], 10);
      if (!isNaN(val) && val > 0) return val;
    }
    if (args[i] === "--concurrency" && args[i + 1]) {
      const val = parseInt(args[i + 1], 10);
      if (!isNaN(val) && val > 0) return val;
    }
  }
  // Env var
  const envVal = process.env.REMOTION_CONCURRENCY;
  if (envVal) {
    const val = parseInt(envVal, 10);
    if (!isNaN(val) && val > 0) return val;
  }
  // Default to number of CPU cores, capped at a safe maximum
  const cpus = os.cpus().length;
  return Math.min(cpus, 16);
}

/**
 * Parse CRF from CLI args or env var.
 * Priority: --crf=N > REMOTION_CRF env > default (18)
 */
function parseCrf(): number {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--crf=")) {
      const val = parseInt(args[i].split("=")[1], 10);
      if (!isNaN(val) && val >= 0 && val <= 51) return val;
    }
    if (args[i] === "--crf" && args[i + 1]) {
      const val = parseInt(args[i + 1], 10);
      if (!isNaN(val) && val >= 0 && val <= 51) return val;
    }
  }
  const envVal = process.env.REMOTION_CRF;
  if (envVal) {
    const val = parseInt(envVal, 10);
    if (!isNaN(val) && val >= 0 && val <= 51) return val;
  }
  return 18; // default — high quality
}


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

  const projectDir = getProjectDir(slug);

  if (!fs.existsSync(projectDir)) {
    console.error(`Project not found: ${projectDir}`);
    process.exit(1);
  }

  // ── Load project config ──
  const config = loadProjectConfig(slug);
  console.log(`Rendering video for project: ${config.title || slug}`);

  const channelConfig = loadChannelConfig();
  const format: "long" | "short" = (config as any).metadata?.format || "long";
  const isShorts = format === "short";

  // ── Shared render variables (set by either video-config or storyboard path) ──
  let totalDurationSec: number;
  let fps: number;
  let totalFrames: number;
  let compositionId: string;
  let width: number;
  let height: number;
  let inputProps: Record<string, unknown>;

  // ── Check for video-config.json (preferred source of truth) ──
  const videoConfigPath = path.join(projectDir, "production", "video-config.json");
  const hasVideoConfig = fs.existsSync(videoConfigPath);

  if (hasVideoConfig) {
    // ── Video-config path (preferred) ──
    const videoConfig = JSON.parse(fs.readFileSync(videoConfigPath, "utf-8"));
    console.log(`Using video-config.json (${videoConfig.scenes?.length || 0} scenes, ${videoConfig.audioSegments?.length || 0} audio segments)`);

    totalDurationSec = videoConfig.durationSeconds || 60;
    fps = videoConfig.fps || (isShorts
      ? ((channelConfig as any).shorts?.fps || channelConfig.visuals.fps)
      : channelConfig.visuals.fps);
    // Note: video-config durationSeconds should include padding; adding here for safety
    totalFrames = Math.ceil((totalDurationSec + START_PADDING_SEC + END_PADDING_SEC) * fps);

    compositionId = isShorts ? "ShortsVideo" : "MainVideo";
    width = videoConfig.width || (isShorts ? 1080 : channelConfig.visuals.resolution.width);
    height = videoConfig.height || (isShorts ? 1920 : channelConfig.visuals.resolution.height);

    console.log(`Format: ${format} (${compositionId}, ${width}x${height})`);
    console.log(`Total duration: ${totalDurationSec}s (${totalFrames} frames @ ${fps}fps)`);

    inputProps = {
      title: videoConfig.title || config.title || slug,
      scenes: videoConfig.scenes || [],
      audioFiles: videoConfig.audioFiles || [],
      audioSegments: videoConfig.audioSegments || [],
      showSubtitles: videoConfig.showSubtitles ?? true,
      showProgressBar: videoConfig.showProgressBar ?? true,
      brandColor: videoConfig.brandColor || channelConfig.visuals.brandColor,
      fontFamily: videoConfig.fontFamily || channelConfig.visuals.fontFamily,
    };
  } else {
    // ── Storyboard path (legacy fallback) ──
    console.log("No video-config.json found — using storyboard path.");

    // ── Load storyboard (with scene detail resolution) ──
    const storyboard = loadStoryboardResolved(slug);

    if (!storyboard) {
      console.error("No storyboard file found. Run the storyboard agent first.");
      process.exit(1);
    }

    console.log(`Using storyboard v${storyboard.version} (${storyboard.scenes?.length || 0} scenes)`);

    // ── Parse scenes and calculate duration ──
    const scenes = storyboard.scenes || [];
    if (scenes.length === 0) {
      console.error("Storyboard has no scenes.");
      process.exit(1);
    }

    const lastScene = scenes[scenes.length - 1];
    totalDurationSec = lastScene.endTime || storyboard.totalDuration || 60;
    fps = isShorts
      ? ((channelConfig as any).shorts?.fps || channelConfig.visuals.fps)
      : channelConfig.visuals.fps;
    totalFrames = Math.ceil((totalDurationSec + START_PADDING_SEC + END_PADDING_SEC) * fps);

    // Determine composition and resolution based on format
    compositionId = isShorts ? "ShortsVideo" : "MainVideo";
    width = isShorts ? 1080 : channelConfig.visuals.resolution.width;
    height = isShorts ? 1920 : channelConfig.visuals.resolution.height;

    console.log(`Format: ${format} (${compositionId}, ${width}x${height})`);
    console.log(`Total duration: ${totalDurationSec}s (${totalFrames} frames @ ${fps}fps)`);

    // ── Collect audio files ──
    const audioDir = path.join(projectDir, "production", "audio");
    let audioFiles: string[] = [];
    const audioSegments: AudioSegment[] = [];

    // Strategy 1 (preferred): Read audio-manifest.json for direct scene→audio mapping
    const manifestPath = path.join(audioDir, "audio-manifest.json");
    const hasManifest = fs.existsSync(manifestPath);

    if (hasManifest) {
      const manifest: AudioManifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      console.log(`\nUsing audio-manifest.json (${manifest.blocks.length} blocks, ${manifest.totalDuration.toFixed(1)}s)`);

      for (const block of manifest.blocks) {
        const audioRelPath = path.join("production", "audio", block.file);
        const audioAbsPath = path.join(projectDir, audioRelPath);

        if (!fs.existsSync(audioAbsPath)) {
          console.warn(`  ⚠️ Missing audio file: ${block.file}`);
          continue;
        }

        audioFiles.push(audioRelPath);

        // Always use storyboard scene startTime for audio placement to stay in sync with visuals
        const matchingScene = scenes.find((s: any) => s.id === block.id);
        const startTime = matchingScene?.startTime ?? block.startTime ?? 0;

        audioSegments.push({ src: audioRelPath, startTime });
        console.log(`  ${block.file} → ${block.section}/${block.id} at ${startTime.toFixed(1)}s (${block.duration.toFixed(1)}s)`);
      }
    } else if (fs.existsSync(audioDir)) {
      // Strategy 2 (legacy fallback): Scan audio directory and match via script/storyboard heuristics
      console.log("\nNo audio-manifest.json found — using legacy audio matching.");

      audioFiles = fs
        .readdirSync(audioDir)
        .filter((f) => f.endsWith(".mp3") || f.endsWith(".wav"))
        .sort()
        .map((f) => path.join("production", "audio", f));
      console.log(`Found ${audioFiles.length} audio files`);

      // Build audio segments with timing from script or storyboard
      if (audioFiles.length > 0 && scenes.length > 0) {
        const scriptFile = getLatestVersionedFile(slug, "content", "script");
        let sectionStartTimes: number[] = [];

        if (scriptFile) {
          const scriptPath = path.join(projectDir, "content", scriptFile);
          const scriptContent = fs.readFileSync(scriptPath, "utf-8");

          const sectionRegex = /^## .+\((\d+):(\d+)\s*-\s*\d+:\d+\)/gm;
          let match: RegExpExecArray | null;
          while ((match = sectionRegex.exec(scriptContent)) !== null) {
            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);
            sectionStartTimes.push(minutes * 60 + seconds);
          }
          console.log(`Parsed ${sectionStartTimes.length} section timestamps from ${scriptFile}`);
        }

        if (sectionStartTimes.length === audioFiles.length) {
          for (let i = 0; i < audioFiles.length; i++) {
            audioSegments.push({ src: audioFiles[i], startTime: sectionStartTimes[i] });
            console.log(`  ${audioFiles[i]} → starts at ${sectionStartTimes[i]}s`);
          }
        } else {
          // Fallback: detect voiceover block boundaries from storyboard scene gaps
          sectionStartTimes = [];
          let inVoiceoverBlock = false;
          for (const scene of scenes) {
            const hasVoiceover = scene.voiceover && scene.voiceover.trim().length > 0;
            if (hasVoiceover && !inVoiceoverBlock) {
              sectionStartTimes.push(scene.startTime);
              inVoiceoverBlock = true;
            } else if (!hasVoiceover) {
              inVoiceoverBlock = false;
            }
          }

          if (sectionStartTimes.length === audioFiles.length) {
            for (let i = 0; i < audioFiles.length; i++) {
              audioSegments.push({ src: audioFiles[i], startTime: sectionStartTimes[i] });
              console.log(`  ${audioFiles[i]} → starts at ${sectionStartTimes[i]}s`);
            }
          } else {
            // Final fallback: even distribution
            console.log("Falling back to even distribution across timeline.");
            const segmentDuration = totalDurationSec / audioFiles.length;
            for (let i = 0; i < audioFiles.length; i++) {
              audioSegments.push({ src: audioFiles[i], startTime: i * segmentDuration });
              console.log(`  ${audioFiles[i]} → starts at ${(i * segmentDuration).toFixed(1)}s`);
            }
          }
        }
      }
    } else {
      console.log("No audio directory found - rendering without voiceover");
    }

    // ── Bridge: dataVisualization → visual.dataChart + propagate fallback images ──
    bridgeAllScenes(scenes);

    // ── Background music: copy channel-level music files into project dir ──
    let backgroundMusic: Record<string, unknown> | undefined;
    const bgm = storyboard.backgroundMusic;
    if (bgm && bgm.tracks && bgm.tracks.length > 0) {
      const channelDir = path.resolve(projectDir, "..", "..");
      const musicDestDir = path.join(projectDir, "production", "audio", "bgm");
      fs.mkdirSync(musicDestDir, { recursive: true });

      const resolvedTracks: Array<{ src: string; durationSec: number }> = [];
      for (const track of bgm.tracks) {
        // track.src or track.file — storyboard may use either field name
        const trackRef: string | undefined = track.src ?? track.file;
        if (!trackRef) {
          console.warn(`  ⚠️ BGM track missing src/file field — skipping`);
          continue;
        }
        // trackRef can be relative to channel dir (e.g. "channel-assets/background-music/file.mp3")
        // or just a filename (resolved to project bgm dir) or already relative to project dir
        const channelSrc = path.join(channelDir, trackRef);
        const projectSrc = path.join(projectDir, trackRef);
        const bgmDirSrc = path.join(musicDestDir, path.basename(trackRef));
        const srcPath = fs.existsSync(channelSrc) ? channelSrc : fs.existsSync(projectSrc) ? projectSrc : bgmDirSrc;

        if (!fs.existsSync(srcPath)) {
          console.warn(`  ⚠️ Missing BGM track: ${trackRef}`);
          continue;
        }

        const filename = path.basename(srcPath);
        const destPath = path.join(musicDestDir, filename);
        if (!fs.existsSync(destPath)) {
          fs.copyFileSync(srcPath, destPath);
          console.log(`  Copied BGM: ${filename}`);
        }

        resolvedTracks.push({
          src: path.join("production", "audio", "bgm", filename).replace(/\\/g, "/"),
          durationSec: (track.durationSec ?? track.duration ?? 120) as number,
        });
      }

      if (resolvedTracks.length > 0) {
        backgroundMusic = {
          tracks: resolvedTracks,
          volume: bgm.volume ?? 0.06,
          crossfadeSec: bgm.crossfadeSec ?? 3,
          fadeInSec: bgm.fadeInSec ?? 3,
          fadeOutSec: bgm.fadeOutSec ?? 4,
        };
        console.log(`\nBackground music: ${resolvedTracks.length} tracks, volume ${(bgm.volume ?? 0.06).toFixed(2)}`);
      }
    }

    // ── Composition input props (from channel config) ──
    inputProps = {
      title: config.title || slug,
      scenes,
      audioFiles,
      audioSegments,
      backgroundMusic,
      showSubtitles: false,
      brandColor: channelConfig.visuals.brandColor,
      fontFamily: channelConfig.visuals.fontFamily,
    };

    // MainVideo gets progress bar, shorts don't
    if (!isShorts) {
      (inputProps as any).showProgressBar = true;
    }
  }

  // ── Prepare output directory ──
  const outputDir = path.join(projectDir, "production", "output");
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, "final.mp4");

  // ── Copy BGM files to projectDir/bgm/ so Remotion staticFile("bgm/...") can find them ──
  const bgmSrcDir = path.join(projectDir, "production", "audio", "bgm");
  const bgmPublicDir = path.join(projectDir, "bgm");
  if (fs.existsSync(bgmSrcDir)) {
    fs.mkdirSync(bgmPublicDir, { recursive: true });
    for (const file of fs.readdirSync(bgmSrcDir)) {
      const srcFile = path.join(bgmSrcDir, file);
      const destFile = path.join(bgmPublicDir, file);
      if (fs.statSync(srcFile).isFile() && !fs.existsSync(destFile)) {
        fs.copyFileSync(srcFile, destFile);
        console.log(`  Copied BGM to public: bgm/${file}`);
      }
    }
  }

  // ── Copy stock photos from repo public/ to project dir for Remotion serving ──
  const repoPublicDir = path.resolve("public");
  const projectSlugDir = path.join(repoPublicDir, slug);
  if (fs.existsSync(projectSlugDir)) {
    const destDir = path.join(projectDir, slug);
    fs.mkdirSync(destDir, { recursive: true });
    for (const file of fs.readdirSync(projectSlugDir)) {
      const srcFile = path.join(projectSlugDir, file);
      const destFile = path.join(destDir, file);
      if (fs.statSync(srcFile).isFile() && !fs.existsSync(destFile)) {
        fs.copyFileSync(srcFile, destFile);
        console.log(`  Copied asset: ${slug}/${file}`);
      }
    }
  }

  console.log("\nBundling Remotion project...");

  // ── Bundle ──
  const bundleLocation = await bundle({
    entryPoint: REMOTION_ENTRY,
    webpackOverride,
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
  const concurrency = parseConcurrency();
  const crf = parseCrf();
  console.log(`Concurrency: ${concurrency}, CRF: ${crf}`);

  const startTime = Date.now();

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    crf,
    outputLocation: outputPath,
    inputProps,
    concurrency,
    // x264 'fast' preset: ~40% faster encoding, ~5% larger file (negligible quality loss)
    x264Preset: "fast",
    // Use GPU encoding when available (e.g., NVENC on NVIDIA)
    hardwareAcceleration: "disable",
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
