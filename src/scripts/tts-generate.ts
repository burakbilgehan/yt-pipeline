/**
 * TTS Generation Script
 *
 * Generates voiceover audio from the video script with structured, scene-aware naming.
 *
 * Features:
 *   - Scene-aware voiceover extraction (maps script sections → storyboard scenes)
 *   - Structured file naming: {section-slug}--{scene-id}.mp3
 *   - audio-manifest.json generation with per-block metadata
 *   - Single-block re-generation via --block flag
 *   - Pre-flight duration prediction (before spending API credits)
 *   - ElevenLabs speed parameter support (0.7-1.2)
 *   - Post-TTS duration measurement and validation
 *   - Auto-calibration: stores measured WPM in channel-config.json
 *   - Request stitching for prosody continuity (v2 models)
 *
 * Usage:
 *   npm run tts <slug> [-- --provider edge-tts|elevenlabs] [-- --speed 1.1]
 *   npm run tts <slug> -- --block scene-003 [--speed 1.1]   # re-generate single block
 *
 * Reads: channels/<channel>/videos/<slug>/content/script-v<latest>.md
 *        channels/<channel>/videos/<slug>/storyboard/storyboard-v<latest>.json (optional, for scene mapping)
 * Writes: channels/<channel>/videos/<slug>/production/audio/
 *         channels/<channel>/videos/<slug>/production/audio/audio-manifest.json
 */

import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  getProjectDir,
  getLatestVersionedFile,
  loadProjectConfig,
  saveProjectConfig,
  ensureProjectDir,
  loadChannelConfig,
  getChannelConfigPath,
} from "../utils/project.js";
import {
  predictDuration,
  predictBlockDuration,
  comparePredictionToActual,
  recommendSpeed,
  formatEstimate,
  formatDuration,
  countSpokenWords,
} from "../utils/duration-predictor.js";
import { getAudioDuration, getAudioDurations } from "../utils/audio-probe.js";
import type {
  TTSCalibration,
  TTSCalibrationMeasurement,
  AudioManifest,
  AudioBlock,
  Storyboard,
  Scene,
} from "../types/index.js";

type TTSProvider = "elevenlabs" | "edge-tts";

// ─── Voiceover Block (internal, pre-generation) ─────────

interface VoiceoverBlock {
  /** Scene ID from storyboard, e.g. "scene-001" */
  sceneId: string;
  /** Section slug derived from script header, e.g. "hook", "section-global-trade" */
  sectionSlug: string;
  /** The voiceover text to synthesize */
  text: string;
  /** Expected start time in seconds (from script/storyboard) */
  startTime?: number;
}

// ─── CLI Parsing ─────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const slug = args[0];

  if (!slug || slug.startsWith("--")) {
    console.error(
      "Usage: npm run tts <project-slug> [-- --provider edge-tts|elevenlabs] [-- --speed 1.1] [-- --block scene-003]"
    );
    process.exit(1);
  }

  let provider: TTSProvider | undefined;
  let speed: number | undefined;
  let blockId: string | undefined;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--provider" && args[i + 1]) {
      provider = args[i + 1] as TTSProvider;
      i++;
    } else if (args[i] === "--speed" && args[i + 1]) {
      speed = parseFloat(args[i + 1]);
      i++;
    } else if (args[i] === "--block" && args[i + 1]) {
      blockId = args[i + 1];
      i++;
    }
  }

  return { slug, provider, speed, blockId };
}

// ─── Main ────────────────────────────────────────────────

async function main() {
  const { slug, provider: providerFlag, speed: speedFlag, blockId } = parseArgs();

  const config = loadProjectConfig(slug);
  const channelConfig = loadChannelConfig();

  // Determine provider: CLI flag > channel-config > default
  const provider: TTSProvider =
    providerFlag || (channelConfig.tts?.provider as TTSProvider) || "edge-tts";

  // Determine speed: CLI flag > channel-config > default 1.0
  const baseSpeed = speedFlag || channelConfig.tts?.speed || 1.0;

  console.log(`TTS Provider: ${provider}`);
  if (baseSpeed !== 1.0) console.log(`TTS Speed: ${baseSpeed}`);

  // Find latest versioned script
  const scriptFile = getLatestVersionedFile(slug, "content", "script");

  if (!scriptFile) {
    console.error("No versioned script found in content/ directory.");
    console.error("Expected files like: script-v1.md, script-v2.md, etc.");
    console.error("Run the content-writer agent first.");
    process.exit(1);
  }

  const scriptPath = path.join(getProjectDir(slug), "content", scriptFile);
  console.log(`Using script: ${scriptFile}`);

  const audioDir = ensureProjectDir(slug, "production/audio");

  // Read script
  const script = fs.readFileSync(scriptPath, "utf-8");

  // Extract script version number from filename
  const scriptVersionMatch = scriptFile.match(/v(\d+)/);
  const scriptVersion = scriptVersionMatch ? parseInt(scriptVersionMatch[1], 10) : 1;

  // Try to load storyboard for scene mapping
  const storyboard = loadStoryboard(slug);

  // Extract scene-aware voiceover blocks
  const voiceoverBlocks = extractSceneAwareVoiceover(script, storyboard);

  console.log(`Found ${voiceoverBlocks.length} voiceover blocks:`);
  for (const block of voiceoverBlocks) {
    const words = countSpokenWords(block.text);
    console.log(`  ${block.sectionSlug}--${block.sceneId}: ~${words} words`);
  }

  // ── Single-block re-generation mode ──
  if (blockId) {
    await handleSingleBlockRegeneration(
      blockId,
      voiceoverBlocks,
      audioDir,
      channelConfig,
      provider,
      baseSpeed,
      scriptVersion,
      scriptFile,
      slug,
      config
    );
    return;
  }

  // ── Pre-flight Duration Prediction ──
  const calibration = channelConfig.tts?.calibration ?? null;
  const fullVoiceover = voiceoverBlocks.map((b) => b.text).join("\n\n");
  const prediction = predictDuration(fullVoiceover, calibration);
  const targetDuration = config.metadata?.targetLength;

  console.log("\n── Pre-flight Duration Estimate ──");
  console.log(formatEstimate(prediction));

  if (targetDuration) {
    const speedRec = recommendSpeed(
      prediction.totalEstimate,
      targetDuration,
      baseSpeed
    );
    console.log(`\n  Target duration: ${formatDuration(targetDuration)} (${targetDuration}s)`);

    if (!speedRec.feasible) {
      console.warn(`\n  ⚠️  WARNING: ${speedRec.reason}`);
      console.warn("  Consider adjusting the script before generating TTS.");
    } else if (speedRec.speed !== baseSpeed) {
      console.log(`  💡 Recommendation: ${speedRec.reason}`);
    } else {
      console.log(`  ✓ Estimate is within acceptable range.`);
    }
  }

  console.log("");

  // ── Generate TTS for all blocks ──
  const generatedBlocks: AudioBlock[] = [];

  if (provider === "edge-tts") {
    await generateAllEdgeTTS(voiceoverBlocks, audioDir, channelConfig, generatedBlocks);
  } else {
    await generateAllElevenLabs(
      voiceoverBlocks,
      audioDir,
      channelConfig,
      baseSpeed,
      generatedBlocks
    );
  }

  // ── Build and write audio manifest ──
  const manifest = buildManifest(
    generatedBlocks,
    scriptVersion,
    scriptFile,
    provider,
    channelConfig.tts?.modelId,
    baseSpeed
  );
  writeManifest(audioDir, manifest);

  // ── Post-TTS Duration Report ──
  printDurationReport(prediction, manifest, targetDuration, baseSpeed);

  // ── Auto-Calibration ──
  updateCalibration(channelConfig, prediction, manifest.totalDuration, baseSpeed);

  // ── Update project config ──
  const version = config.pipeline.production.version || 1;
  config.pipeline.production.status = "in_progress";
  config.pipeline.production.startedAt = new Date().toISOString();
  config.history.push({
    action: "production.started",
    version,
    at: new Date().toISOString(),
    reason: `Generated TTS audio (${provider}) from ${scriptFile} (${voiceoverBlocks.length} blocks, ${manifest.totalDuration.toFixed(1)}s total, speed=${baseSpeed})`,
  });
  saveProjectConfig(slug, config);

  console.log("\n✓ TTS generation complete!");
  console.log(`  Manifest: production/audio/audio-manifest.json`);
  console.log("  Config updated.");
}

// ─── Single Block Re-generation ──────────────────────────

async function handleSingleBlockRegeneration(
  blockId: string,
  voiceoverBlocks: VoiceoverBlock[],
  audioDir: string,
  channelConfig: any,
  provider: TTSProvider,
  speed: number,
  scriptVersion: number,
  scriptFile: string,
  slug: string,
  config: any
) {
  // Load existing manifest
  const manifestPath = path.join(audioDir, "audio-manifest.json");
  if (!fs.existsSync(manifestPath)) {
    console.error("No audio-manifest.json found. Run full TTS generation first.");
    process.exit(1);
  }

  const existingManifest: AudioManifest = JSON.parse(
    fs.readFileSync(manifestPath, "utf-8")
  );

  // Find the block to re-generate
  const targetBlock = voiceoverBlocks.find((b) => b.sceneId === blockId);
  if (!targetBlock) {
    console.error(`Block "${blockId}" not found in script voiceover blocks.`);
    console.error(`Available blocks: ${voiceoverBlocks.map((b) => b.sceneId).join(", ")}`);
    process.exit(1);
  }

  const existingBlockIdx = existingManifest.blocks.findIndex(
    (b) => b.id === blockId
  );
  if (existingBlockIdx === -1) {
    console.error(`Block "${blockId}" not found in existing manifest.`);
    process.exit(1);
  }

  const existingBlock = existingManifest.blocks[existingBlockIdx];
  console.log(`\n── Re-generating single block: ${blockId} ──`);
  console.log(`  Section: ${targetBlock.sectionSlug}`);
  console.log(`  Old file: ${existingBlock.file}`);
  console.log(`  Words: ~${countSpokenWords(targetBlock.text)}`);
  console.log(`  Speed: ${speed}`);

  // Generate the single block
  const fileName = `${targetBlock.sectionSlug}--${targetBlock.sceneId}.mp3`;
  const outputPath = path.join(audioDir, fileName);

  if (provider === "edge-tts") {
    await generateEdgeTTSBlock(targetBlock.text, outputPath, channelConfig);
  } else {
    // For single-block re-gen, find the previous block's request ID if we have one
    // (we don't store request IDs in manifest, so no stitching for re-gen)
    await generateElevenLabsBlock(
      targetBlock.text,
      outputPath,
      channelConfig,
      speed,
      []
    );
  }

  // Measure the new duration
  const duration = await getAudioDuration(outputPath);
  const wordCount = countSpokenWords(targetBlock.text);

  console.log(`  New duration: ${duration.toFixed(1)}s (was ${existingBlock.duration.toFixed(1)}s)`);

  // If the old file had a different name, remove it
  if (existingBlock.file !== fileName) {
    const oldPath = path.join(audioDir, existingBlock.file);
    if (fs.existsSync(oldPath)) {
      fs.unlinkSync(oldPath);
      console.log(`  Removed old file: ${existingBlock.file}`);
    }
  }

  // Update the manifest block in-place
  existingManifest.blocks[existingBlockIdx] = {
    id: blockId,
    section: targetBlock.sectionSlug,
    file: fileName,
    text: targetBlock.text,
    duration,
    wordCount,
    speed,
    startTime: targetBlock.startTime,
    endTime: targetBlock.startTime != null ? targetBlock.startTime + duration : undefined,
  };

  // Recalculate totals
  existingManifest.totalDuration = existingManifest.blocks.reduce(
    (sum, b) => sum + b.duration,
    0
  );
  existingManifest.totalWordCount = existingManifest.blocks.reduce(
    (sum, b) => sum + b.wordCount,
    0
  );
  existingManifest.generatedAt = new Date().toISOString();
  existingManifest.speed = speed;

  // Write updated manifest
  writeManifest(audioDir, existingManifest);

  console.log(`\n✓ Block ${blockId} re-generated.`);
  console.log(`  Total duration: ${existingManifest.totalDuration.toFixed(1)}s`);
  console.log(`  Manifest updated.`);
}

// ─── Scene-Aware Voiceover Extraction ────────────────────

/**
 * Extract voiceover blocks from script, mapping them to scene IDs.
 *
 * Script format expected:
 *   ## Hook (0:00-0:15)
 *   [VOICEOVER] ...
 *
 *   ## Section: Global Trade (0:15-0:55)
 *   [VOICEOVER] ...
 *
 * If storyboard is available, we match sections to scene IDs.
 * If not, we assign sequential scene IDs (scene-001, scene-002, ...).
 */
function extractSceneAwareVoiceover(
  script: string,
  storyboard: Storyboard | null
): VoiceoverBlock[] {
  const blocks: VoiceoverBlock[] = [];
  const lines = script.split("\n");

  let currentSection: string | null = null;
  let currentSectionSlug: string | null = null;
  let currentStartTime: number | undefined;
  let inVoiceover = false;
  let currentText = "";
  let sectionIndex = 0;

  for (const line of lines) {
    // Detect section headers: ## Hook (0:00-0:15) or ## Section: Title (0:15-0:55)
    const headerMatch = line.match(
      /^##\s+(?:Section:\s*)?(.+?)\s*(?:\((\d+):(\d+)\s*[-–—]\s*\d+:\d+\))?$/
    );
    if (headerMatch) {
      // Save previous voiceover block if any
      if (inVoiceover && currentText.trim()) {
        blocks.push(buildBlock(currentText, currentSectionSlug!, sectionIndex, currentStartTime, storyboard));
        sectionIndex++;
      }
      inVoiceover = false;
      currentText = "";

      currentSection = headerMatch[1].trim();
      currentSectionSlug = slugify(currentSection);
      if (headerMatch[2] && headerMatch[3]) {
        currentStartTime = parseInt(headerMatch[2], 10) * 60 + parseInt(headerMatch[3], 10);
      } else {
        currentStartTime = undefined;
      }
      continue;
    }

    if (line.trim() === "[VOICEOVER]") {
      // If we were already in a voiceover block (shouldn't happen, but defensive)
      if (inVoiceover && currentText.trim()) {
        blocks.push(buildBlock(currentText, currentSectionSlug || "unknown", sectionIndex, currentStartTime, storyboard));
        sectionIndex++;
      }
      inVoiceover = true;
      currentText = "";
      continue;
    }

    if (inVoiceover) {
      // Stop at the next marker or section header
      if (line.startsWith("[") && !line.startsWith("[VOICEOVER]")) {
        if (currentText.trim()) {
          blocks.push(buildBlock(currentText, currentSectionSlug || "unknown", sectionIndex, currentStartTime, storyboard));
          sectionIndex++;
        }
        inVoiceover = false;
        continue;
      }
      currentText += line + "\n";
    }
  }

  // Don't forget the last block
  if (inVoiceover && currentText.trim()) {
    blocks.push(buildBlock(currentText, currentSectionSlug || "unknown", sectionIndex, currentStartTime, storyboard));
  }

  return blocks;
}

function buildBlock(
  text: string,
  sectionSlug: string,
  sectionIndex: number,
  startTime: number | undefined,
  storyboard: Storyboard | null
): VoiceoverBlock {
  // Try to find matching scene ID from storyboard
  let sceneId = `scene-${String(sectionIndex + 1).padStart(3, "0")}`;

  if (storyboard) {
    // Match by section name similarity or by index
    const matchingScene = findMatchingScene(sectionSlug, sectionIndex, storyboard);
    if (matchingScene) {
      sceneId = matchingScene.id;
    }
  }

  return {
    sceneId,
    sectionSlug,
    text: text.trim(),
    startTime,
  };
}

/**
 * Find a storyboard scene that matches a script section.
 * Strategy: first try section slug match, then fall back to index-based.
 */
function findMatchingScene(
  sectionSlug: string,
  sectionIndex: number,
  storyboard: Storyboard
): Scene | null {
  // Strategy 1: Match by section name (slug comparison)
  const bySlug = storyboard.scenes.find(
    (s) => slugify(s.section).includes(sectionSlug) || sectionSlug.includes(slugify(s.section))
  );
  if (bySlug) return bySlug;

  // Strategy 2: Group scenes by section, take first scene of matching section index
  const sectionGroups: Map<string, Scene[]> = new Map();
  for (const scene of storyboard.scenes) {
    const key = slugify(scene.section);
    if (!sectionGroups.has(key)) sectionGroups.set(key, []);
    sectionGroups.get(key)!.push(scene);
  }

  const sectionKeys = [...sectionGroups.keys()];
  if (sectionIndex < sectionKeys.length) {
    const group = sectionGroups.get(sectionKeys[sectionIndex]);
    if (group && group.length > 0) return group[0];
  }

  // Strategy 3: Direct index (storyboard may have more scenes than script sections)
  if (sectionIndex < storyboard.scenes.length) {
    return storyboard.scenes[sectionIndex];
  }

  return null;
}

/**
 * Convert a section title to a URL-safe slug.
 * "Global Trade Wars" → "global-trade-wars"
 * "#10 to #8 — The Everyday Shockers" → "10-to-8-the-everyday-shockers"
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[—–-]/g, "-") // normalize dashes
    .replace(/[^a-z0-9\s-]/g, "") // remove special chars
    .replace(/\s+/g, "-") // spaces → hyphens
    .replace(/-+/g, "-") // collapse multiple hyphens
    .replace(/^-|-$/g, ""); // trim leading/trailing hyphens
}

// ─── Storyboard Loading ──────────────────────────────────

function loadStoryboard(slug: string): Storyboard | null {
  const storyboardFile = getLatestVersionedFile(slug, "storyboard", "storyboard");
  if (!storyboardFile) {
    console.log("No storyboard found — using sequential scene IDs.");
    return null;
  }

  const storyboardPath = path.join(getProjectDir(slug), "storyboard", storyboardFile);
  // Only load .json storyboards
  if (!storyboardFile.endsWith(".json")) {
    console.log(`Storyboard file is not JSON (${storyboardFile}) — using sequential scene IDs.`);
    return null;
  }

  try {
    const data = JSON.parse(fs.readFileSync(storyboardPath, "utf-8"));
    console.log(`Using storyboard: ${storyboardFile} (${data.scenes?.length || 0} scenes)`);
    return data as Storyboard;
  } catch (err) {
    console.warn(`Failed to parse storyboard: ${err}`);
    return null;
  }
}

// ─── Manifest ────────────────────────────────────────────

function buildManifest(
  blocks: AudioBlock[],
  scriptVersion: number,
  scriptFile: string,
  provider: string,
  modelId: string | undefined,
  speed: number
): AudioManifest {
  const totalDuration = blocks.reduce((sum, b) => sum + b.duration, 0);
  const totalWordCount = blocks.reduce((sum, b) => sum + b.wordCount, 0);

  return {
    generatedAt: new Date().toISOString(),
    scriptVersion,
    scriptFile,
    provider,
    modelId,
    speed,
    totalDuration,
    totalWordCount,
    blocks,
  };
}

function writeManifest(audioDir: string, manifest: AudioManifest): void {
  const manifestPath = path.join(audioDir, "audio-manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\n  Wrote audio-manifest.json (${manifest.blocks.length} blocks, ${manifest.totalDuration.toFixed(1)}s total)`);
}

// ─── Edge TTS ────────────────────────────────────────────

async function generateEdgeTTSBlock(
  text: string,
  outputPath: string,
  channelConfig: any
): Promise<void> {
  const { EdgeTTS } = await import("@andresaya/edge-tts");

  const voice =
    process.env.EDGE_TTS_VOICE ||
    channelConfig.tts?.voiceId ||
    "en-US-AndrewNeural";

  const tts = new EdgeTTS();
  await tts.synthesize(text, voice);

  // Edge TTS toFile() appends .mp3 automatically
  // We need to handle this: pass path without extension, then rename if needed
  const basePath = outputPath.replace(/\.mp3$/, "");
  await tts.toFile(basePath);

  // Edge TTS may have written to basePath.mp3
  const withExt = basePath + ".mp3";
  if (withExt !== outputPath && fs.existsSync(withExt)) {
    fs.renameSync(withExt, outputPath);
  }
}

async function generateAllEdgeTTS(
  blocks: VoiceoverBlock[],
  audioDir: string,
  channelConfig: any,
  generatedBlocks: AudioBlock[]
): Promise<void> {
  const voice =
    process.env.EDGE_TTS_VOICE ||
    channelConfig.tts?.voiceId ||
    "en-US-AndrewNeural";

  console.log(`Edge TTS voice: ${voice}`);

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const words = countSpokenWords(block.text);
    const fileName = `${block.sectionSlug}--${block.sceneId}.mp3`;
    const outputPath = path.join(audioDir, fileName);

    console.log(
      `Generating block ${i + 1}/${blocks.length}: ${block.sectionSlug}--${block.sceneId} (${block.text.length} chars, ~${words} words)...`
    );

    await generateEdgeTTSBlock(block.text, outputPath, channelConfig);

    const duration = await getAudioDuration(outputPath);
    const stat = fs.statSync(outputPath);
    console.log(
      `  Saved: ${fileName} (${(stat.size / 1024).toFixed(1)} KB, ${duration.toFixed(1)}s)`
    );

    generatedBlocks.push({
      id: block.sceneId,
      section: block.sectionSlug,
      file: fileName,
      text: block.text,
      duration,
      wordCount: words,
      speed: 1.0, // Edge TTS has no speed control
      startTime: block.startTime,
      endTime: block.startTime != null ? block.startTime + duration : undefined,
    });
  }
}

// ─── ElevenLabs ──────────────────────────────────────────

async function generateElevenLabsBlock(
  text: string,
  outputPath: string,
  channelConfig: any,
  speed: number,
  previousRequestIds: string[]
): Promise<string | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId =
    process.env.ELEVENLABS_VOICE_ID || channelConfig.tts?.voiceId;
  const modelId =
    process.env.ELEVENLABS_MODEL_ID ||
    channelConfig.tts?.modelId ||
    "eleven_multilingual_v2";
  const stability = channelConfig.tts?.stability ?? 0.5;
  const similarityBoost = channelConfig.tts?.similarityBoost ?? 0.75;

  if (!apiKey) {
    console.error("Missing ELEVENLABS_API_KEY in .env");
    process.exit(1);
  }

  if (!voiceId) {
    console.error(
      "Missing ELEVENLABS_VOICE_ID in .env or tts.voiceId in channel-config.json"
    );
    process.exit(1);
  }

  const requestBody: Record<string, unknown> = {
    text,
    model_id: modelId,
    voice_settings: {
      stability,
      similarity_boost: similarityBoost,
      speed,
    },
  };

  // Request stitching for prosody continuity (v2 models only)
  if (previousRequestIds.length > 0 && modelId.includes("v2")) {
    requestBody.previous_request_ids = previousRequestIds.slice(-3);
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    console.error(
      `ElevenLabs API error: ${response.status} ${response.statusText}`
    );
    const body = await response.text();
    console.error(body);
    return null;
  }

  // Capture request ID for stitching
  const requestId = response.headers.get("request-id");

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);

  return requestId;
}

async function generateAllElevenLabs(
  blocks: VoiceoverBlock[],
  audioDir: string,
  channelConfig: any,
  speed: number,
  generatedBlocks: AudioBlock[]
): Promise<void> {
  const voiceId =
    process.env.ELEVENLABS_VOICE_ID || channelConfig.tts?.voiceId;
  const modelId =
    process.env.ELEVENLABS_MODEL_ID ||
    channelConfig.tts?.modelId ||
    "eleven_multilingual_v2";

  console.log(
    `ElevenLabs voice: ${voiceId}, model: ${modelId}, speed: ${speed}`
  );

  const previousRequestIds: string[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const words = countSpokenWords(block.text);
    const fileName = `${block.sectionSlug}--${block.sceneId}.mp3`;
    const outputPath = path.join(audioDir, fileName);

    console.log(
      `Generating block ${i + 1}/${blocks.length}: ${block.sectionSlug}--${block.sceneId} (${block.text.length} chars, ~${words} words)...`
    );

    const requestId = await generateElevenLabsBlock(
      block.text,
      outputPath,
      channelConfig,
      speed,
      previousRequestIds
    );

    if (requestId) {
      previousRequestIds.push(requestId);
    }

    if (!fs.existsSync(outputPath)) {
      console.error(`  ✗ Failed to generate ${fileName}`);
      continue;
    }

    const duration = await getAudioDuration(outputPath);
    console.log(
      `  Saved: ${fileName} (${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB, ${duration.toFixed(1)}s)`
    );

    generatedBlocks.push({
      id: block.sceneId,
      section: block.sectionSlug,
      file: fileName,
      text: block.text,
      duration,
      wordCount: words,
      speed,
      startTime: block.startTime,
      endTime: block.startTime != null ? block.startTime + duration : undefined,
    });
  }
}

// ─── Duration Report ─────────────────────────────────────

function printDurationReport(
  prediction: ReturnType<typeof predictDuration>,
  manifest: AudioManifest,
  targetDuration: number | undefined,
  baseSpeed: number
): void {
  console.log("\n── Post-TTS Duration Report ──");

  for (const block of manifest.blocks) {
    console.log(`  ${block.file}: ${block.duration.toFixed(1)}s (~${block.wordCount} words)`);
  }
  console.log(`  ─────────────────────────`);
  console.log(
    `  Total audio:   ${manifest.totalDuration.toFixed(1)}s (${formatDuration(manifest.totalDuration)})`
  );
  console.log(
    `  Predicted:     ${prediction.totalEstimate.toFixed(1)}s (${formatDuration(prediction.totalEstimate)})`
  );

  const comparison = comparePredictionToActual(prediction, manifest.totalDuration);
  console.log(
    `  Error:         ${comparison.percentError.toFixed(1)}% (${comparison.difference > 0 ? "+" : ""}${comparison.difference.toFixed(1)}s)`
  );
  console.log(`  Implied WPM:   ${comparison.impliedWPM.toFixed(0)}`);

  if (targetDuration) {
    const targetDiff = manifest.totalDuration - targetDuration;
    const targetPct = Math.abs(targetDiff / targetDuration) * 100;

    console.log(`\n  Target:        ${formatDuration(targetDuration)} (${targetDuration}s)`);
    console.log(
      `  Actual:        ${formatDuration(manifest.totalDuration)} (${manifest.totalDuration.toFixed(1)}s)`
    );
    console.log(
      `  Difference:    ${targetDiff > 0 ? "+" : ""}${targetDiff.toFixed(1)}s (${targetPct.toFixed(1)}%)`
    );

    if (targetPct > 15) {
      const rec = recommendSpeed(manifest.totalDuration, targetDuration, baseSpeed);
      console.warn(`\n  ⚠️  Audio is ${targetPct.toFixed(0)}% off target!`);
      console.warn(`  💡 ${rec.reason}`);
    } else if (targetPct > 5) {
      console.log(`\n  ⚡ Minor deviation. Acceptable for most cases.`);
    } else {
      console.log(`\n  ✓ Duration is on target.`);
    }
  }
}

// ─── Calibration ─────────────────────────────────────────

function updateCalibration(
  channelConfig: any,
  prediction: ReturnType<typeof predictDuration>,
  actualDuration: number,
  speed: number
) {
  // Normalize actual duration to speed=1.0 for fair WPM comparison
  const normalizedDuration = actualDuration * speed;

  const comparison = comparePredictionToActual(prediction, normalizedDuration);

  if (!channelConfig.tts) channelConfig.tts = {};
  if (!channelConfig.tts.calibration) {
    channelConfig.tts.calibration = {
      measuredWPM: comparison.impliedWPM,
      naturalPauseRatio: comparison.impliedPauseRatio,
      sampleCount: 0,
      lastCalibratedAt: new Date().toISOString(),
      measurements: [],
    } satisfies TTSCalibration;
  }

  const cal = channelConfig.tts.calibration as TTSCalibration;

  // Add measurement
  const measurement: TTSCalibrationMeasurement = {
    wordCount: prediction.spokenWords,
    predictedDuration: Math.round(prediction.totalEstimate * 10) / 10,
    actualDuration: Math.round(normalizedDuration * 10) / 10,
    speed,
    date: new Date().toISOString().split("T")[0],
  };
  cal.measurements.push(measurement);

  // Keep last 20 measurements max
  if (cal.measurements.length > 20) {
    cal.measurements = cal.measurements.slice(-20);
  }

  cal.sampleCount = cal.measurements.length;

  // Rolling average WPM from all measurements (using normalized durations)
  const wpmValues = cal.measurements.map((m) => {
    const speechTime = m.actualDuration - prediction.explicitPauseDuration;
    return speechTime > 0 ? (m.wordCount / speechTime) * 60 : 150;
  });
  cal.measuredWPM =
    Math.round(
      (wpmValues.reduce((a, b) => a + b, 0) / wpmValues.length) * 10
    ) / 10;

  // Rolling average pause ratio
  const pauseRatios = cal.measurements.map((m) => {
    const impliedSpeech = (m.wordCount / cal.measuredWPM) * 60;
    const remainingPause = m.actualDuration - impliedSpeech;
    return impliedSpeech > 0
      ? Math.max(0, remainingPause / impliedSpeech)
      : 0.08;
  });
  cal.naturalPauseRatio =
    Math.round(
      (pauseRatios.reduce((a, b) => a + b, 0) / pauseRatios.length) * 1000
    ) / 1000;

  cal.lastCalibratedAt = new Date().toISOString();

  // Save updated channel config
  const configPath = getChannelConfigPath();
  fs.writeFileSync(configPath, JSON.stringify(channelConfig, null, 2));

  console.log("\n── Calibration Updated ──");
  console.log(`  Measured WPM:     ${cal.measuredWPM}`);
  console.log(`  Pause ratio:      ${(cal.naturalPauseRatio * 100).toFixed(1)}%`);
  console.log(`  Sample count:     ${cal.sampleCount}`);
  console.log(`  Prediction error: ${comparison.percentError.toFixed(1)}%`);
}

// ─── Entry Point ─────────────────────────────────────────

main();
