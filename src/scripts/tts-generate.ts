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
 *   - Google Cloud TTS speakingRate support (0.25-2.0)
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
  loadStoryboardResolved,
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
  TTSConfig,
  AudioManifest,
  AudioBlock,
  Storyboard,
  Scene,
  ChannelConfig,
  ProjectConfig,
} from "../types/index.js";

type TTSProvider = "elevenlabs" | "edge-tts" | "google";

// ─── TTS Config Resolution ─────────────────────────────
// Single source of truth: channel-config.tts is the base.
// Video-level config.tts overrides specific fields.
// This ensures model/voice IDs are NEVER hardcoded in scripts.

interface ResolvedTTSConfig {
  provider: TTSProvider;
  voiceId: string;
  voiceName?: string;
  modelId: string;
  stability: number;
  similarityBoost: number;
  style: number;
  useSpeakerBoost: boolean;
  speed: number;
  calibration: TTSCalibration | null;
  // Google TTS specific
  languageCode: string;
  stylePrompt: string;
  sampleRateHertz: number;
}

function resolveTTSConfig(channelConfig: ChannelConfig, projectConfig?: ProjectConfig): ResolvedTTSConfig {
  const ch = channelConfig.tts;
  const vid = projectConfig?.tts;

  return {
    provider: (vid?.provider ?? ch?.provider ?? "google") as TTSProvider,
    voiceId: vid?.voiceId ?? ch?.voiceId ?? "",
    voiceName: vid?.voiceName ?? ch?.voiceName,
    modelId: vid?.modelId ?? ch?.modelId ?? "gemini-2.5-flash-tts",
    stability: vid?.stability ?? ch?.stability ?? 0.35,
    similarityBoost: vid?.similarityBoost ?? ch?.similarityBoost ?? 0.75,
    style: vid?.style ?? ch?.style ?? 0,
    useSpeakerBoost: vid?.useSpeakerBoost ?? ch?.useSpeakerBoost ?? false,
    speed: vid?.speed ?? ch?.speed ?? 1.0,
    calibration: (ch as any)?.calibration ?? null,
    languageCode: vid?.languageCode ?? ch?.languageCode ?? "en-US",
    stylePrompt: vid?.stylePrompt ?? ch?.stylePrompt ?? "Say the following",
    sampleRateHertz: vid?.sampleRateHertz ?? ch?.sampleRateHertz ?? 24000,
  };
}

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
      "Usage: npm run tts <project-slug> [-- --provider google|edge-tts|elevenlabs] [-- --speed 1.1] [-- --block scene-003]"
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

  // ── Resolve TTS settings: video override > channel default ──
  // Single source of truth: channel-config.tts is the base,
  // config.tts (video-level) overrides specific fields.
  const ttsConfig = resolveTTSConfig(channelConfig, config);

  // CLI flags override everything
  const provider: TTSProvider = providerFlag || ttsConfig.provider || "google";
  const baseSpeed = speedFlag || ttsConfig.speed || 1.0;

  console.log(`TTS Provider: ${provider}`);
  console.log(`TTS Voice: ${ttsConfig.voiceName || ttsConfig.voiceId}`);
  console.log(`TTS Model: ${ttsConfig.modelId}`);
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

  // Extract voiceover blocks — prefer storyboard scene-level blocks (modular, 1 scene = 1 audio file)
  // Falls back to script parsing only if no storyboard is available
  const voiceoverBlocks = storyboard
    ? extractVoiceoverFromStoryboard(storyboard)
    : extractSceneAwareVoiceover(script, storyboard);

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
      ttsConfig,
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
  const calibration = ttsConfig.calibration;
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
    await generateAllEdgeTTS(voiceoverBlocks, audioDir, ttsConfig, generatedBlocks);
  } else if (provider === "google") {
    await generateAllGoogleTTS(
      voiceoverBlocks,
      audioDir,
      ttsConfig,
      baseSpeed,
      generatedBlocks
    );
  } else {
    await generateAllElevenLabs(
      voiceoverBlocks,
      audioDir,
      ttsConfig,
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
    ttsConfig.modelId,
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
  ttsConfig: ResolvedTTSConfig,
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
  const ext = provider === "google" ? "wav" : "mp3";
  const fileName = `${targetBlock.sectionSlug}--${targetBlock.sceneId}.${ext}`;
  const outputPath = path.join(audioDir, fileName);

  if (provider === "edge-tts") {
    await generateEdgeTTSBlock(targetBlock.text, outputPath, ttsConfig);
  } else if (provider === "google") {
    await generateGoogleTTSBlock(
      targetBlock.text,
      outputPath,
      ttsConfig,
      speed
    );
  } else {
    // For single-block re-gen, find the previous block's request ID if we have one
    // (we don't store request IDs in manifest, so no stitching for re-gen)
    await generateElevenLabsBlock(
      targetBlock.text,
      outputPath,
      ttsConfig,
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

// ─── Storyboard-Based Voiceover Extraction (preferred) ───

/**
 * Extract voiceover blocks directly from storyboard scenes.
 * Each scene with a non-null voiceover becomes one TTS block.
 * This is the preferred method — produces modular, scene-level audio files
 * that can be individually re-generated if needed.
 *
 * Scenes with voiceover=null (title cards, transition-only scenes) are skipped.
 */
function extractVoiceoverFromStoryboard(
  storyboard: Storyboard
): VoiceoverBlock[] {
  const blocks: VoiceoverBlock[] = [];

  for (const scene of storyboard.scenes) {
    // Skip scenes without voiceover (title cards, visual-only scenes)
    if (!scene.voiceover || !scene.voiceover.trim()) {
      continue;
    }

    blocks.push({
      sceneId: scene.id,
      sectionSlug: slugify(scene.section),
      text: scene.voiceover.trim(),
      startTime: scene.startTime,
    });
  }

  return blocks;
}

// ─── Script-Based Voiceover Extraction (fallback) ────────

/**
 * FALLBACK: Extract voiceover blocks from script text when no storyboard is available.
 * Parses section headers and treats non-bracketed text as voiceover.
 * When storyboard exists, use extractVoiceoverFromStoryboard() instead.
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
  let inSection = false;
  let currentText = "";
  let sectionIndex = 0;

  /**
   * Non-voiceover line patterns — these are production directions, not spoken text.
   * Anything inside [...] brackets (visual notes, verify tags, etc.), horizontal rules,
   * blockquotes (> ...), and front-matter lines (key: value at top of file).
   */
  const isNonVoiceoverLine = (line: string): boolean => {
    const trimmed = line.trim();
    if (trimmed === "") return true; // blank lines are separators, not content
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) return true; // [VISUAL NOTE: ...], [VERIFY: ...]
    if (trimmed.startsWith("[") && trimmed.includes("]")) return true; // multi-line bracket tags on one line
    if (trimmed === "---") return true; // horizontal rule
    if (trimmed.startsWith("> ")) return true; // blockquotes (production notes)
    if (trimmed.startsWith("#")) return true; // any header (already handled above, but defensive)
    return false;
  };

  for (const line of lines) {
    // Detect section headers: ## Hook (0:00-0:15) or ## HOOK — (0:00–0:45) or ## Section: Title (0:15-0:55)
    const headerMatch = line.match(
      /^##\s+(?:Section:\s*)?(.+?)\s*(?:\((\d+):(\d+)\s*[-–—]\s*\d+:\d+\))?$/
    );
    if (headerMatch) {
      // Save previous voiceover block if any
      if (inSection && currentText.trim()) {
        blocks.push(buildBlock(currentText, currentSectionSlug!, sectionIndex, currentStartTime, storyboard));
        sectionIndex++;
      }
      currentText = "";

      currentSection = headerMatch[1].trim();
      currentSectionSlug = slugify(currentSection);
      if (headerMatch[2] && headerMatch[3]) {
        currentStartTime = parseInt(headerMatch[2], 10) * 60 + parseInt(headerMatch[3], 10);
      } else {
        currentStartTime = undefined;
      }
      inSection = true;
      continue;
    }

    // Legacy explicit [VOICEOVER] marker — still supported
    if (line.trim() === "[VOICEOVER]") {
      inSection = true;
      continue;
    }

    if (inSection) {
      // Skip non-voiceover lines (visual notes, verify tags, rules, blockquotes)
      if (isNonVoiceoverLine(line)) {
        continue;
      }
      // This is a voiceover line — append it
      currentText += line + "\n";
    }
  }

  // Don't forget the last block
  if (inSection && currentText.trim()) {
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
  const storyboard = loadStoryboardResolved(slug);
  if (!storyboard) {
    console.log("No storyboard found — using sequential scene IDs.");
    return null;
  }
  console.log(`Using storyboard (${storyboard.scenes?.length || 0} scenes)`);
  return storyboard;
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
  ttsConfig: ResolvedTTSConfig
): Promise<void> {
  const { EdgeTTS } = await import("@andresaya/edge-tts");

  const voice =
    process.env.EDGE_TTS_VOICE ||
    ttsConfig.voiceId ||
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
  ttsConfig: ResolvedTTSConfig,
  generatedBlocks: AudioBlock[]
): Promise<void> {
  const voice =
    process.env.EDGE_TTS_VOICE ||
    ttsConfig.voiceId ||
    "en-US-AndrewNeural";

  console.log(`Edge TTS voice: ${voice}`);

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const words = countSpokenWords(block.text);
    const fileName = `${block.sectionSlug}--${block.sceneId}.mp3`; // Edge TTS always produces MP3
    const outputPath = path.join(audioDir, fileName);

    console.log(
      `Generating block ${i + 1}/${blocks.length}: ${block.sectionSlug}--${block.sceneId} (${block.text.length} chars, ~${words} words)...`
    );

    await generateEdgeTTSBlock(block.text, outputPath, ttsConfig);

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

// ─── Google Cloud TTS (Gemini TTS + Chirp 3: HD) ────────
//
// Both model families use the same REST API endpoint.
// Key differences:
//   - Gemini TTS: supports `prompt` (style instructions), uses short voice name ("Erinome")
//   - Chirp 3: HD: uses `markup` input, locale-prefixed voice name ("en-US-Chirp3-HD-Achernar")
//   - Both: support `speakingRate` (0.25-2.0) in audioConfig

/**
 * Resolve the full voice name for Cloud TTS API.
 * - Gemini TTS models use short name: "Achernar"
 * - Chirp 3: HD uses locale-prefixed name: "en-US-Chirp3-HD-Achernar"
 */
function resolveGoogleVoiceName(ttsConfig: ResolvedTTSConfig): string {
  const voiceName = ttsConfig.voiceName || "Achernar";
  if (ttsConfig.modelId === "chirp3-hd") {
    // Chirp 3: HD requires locale-prefixed voice name
    const locale = ttsConfig.languageCode || "en-US";
    return `${locale}-Chirp3-HD-${voiceName}`;
  }
  // Gemini TTS uses short name
  return voiceName;
}

/**
 * Check if the model is Gemini TTS (supports style prompts) vs Chirp 3: HD.
 */
function isGeminiTTSModel(modelId: string): boolean {
  return modelId.startsWith("gemini-");
}

/**
 * Escape XML-unsafe characters in text that will be embedded in SSML.
 * Only escapes &, <, >, " — but preserves existing SSML tags (like <break>).
 *
 * Strategy: split text around known SSML tags, escape the text parts,
 * then rejoin with the tags intact.
 */
function escapeForSSML(text: string): string {
  // Split on SSML tags we generate (preserve them as-is)
  const ssmlTagPattern = /(<break\s[^>]*\/>|<speak>|<\/speak>|<prosody[^>]*>|<\/prosody>|<emphasis[^>]*>|<\/emphasis>|<sub[^>]*>|<\/sub>|<say-as[^>]*>|<\/say-as>)/g;
  const parts = text.split(ssmlTagPattern);

  return parts
    .map((part) => {
      // If this part is an SSML tag, keep it as-is
      if (ssmlTagPattern.test(part)) {
        // Reset lastIndex since we're reusing the regex
        ssmlTagPattern.lastIndex = 0;
        return part;
      }
      // Reset lastIndex for next iteration
      ssmlTagPattern.lastIndex = 0;
      // Escape XML-unsafe characters in text parts
      return part
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    })
    .join("");
}

/**
 * Convert [pause] markup tags to SSML <break> tags.
 *
 * Replaces:
 *   [pause long]  → <break time="1000ms"/>
 *   [pause short] → <break time="300ms"/>
 *   [pause]       → <break time="500ms"/>
 *
 * Values from templates/pipeline-defaults.json → tts.pauseDurations.
 * Order: longer variants first to avoid partial matches.
 */
function convertPauseMarkup(text: string): string {
  return text
    .replace(/\[pause long\]/gi, '<break time="1000ms"/>')
    .replace(/\[pause short\]/gi, '<break time="300ms"/>')
    .replace(/\[pause\]/gi, '<break time="500ms"/>');
}

/**
 * Generate a single TTS block via Google Cloud TTS REST API.
 * Works with both Gemini TTS models and Chirp 3: HD.
 *
 * API: POST https://texttospeech.googleapis.com/v1/text:synthesize
 * Auth: API key via query param
 */
async function generateGoogleTTSBlock(
  text: string,
  outputPath: string,
  ttsConfig: ResolvedTTSConfig,
  speed: number
): Promise<void> {
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;

  if (!apiKey) {
    console.error("Missing GOOGLE_CLOUD_API_KEY in .env");
    process.exit(1);
  }

  const voiceName = resolveGoogleVoiceName(ttsConfig);
  const isGemini = isGeminiTTSModel(ttsConfig.modelId);

  // Build voice params
  const voice: Record<string, unknown> = {
    languageCode: ttsConfig.languageCode || "en-US",
    name: voiceName,
  };

  // Gemini TTS models require model_name in voice params
  if (isGemini) {
    voice.model_name = ttsConfig.modelId;
  }

  // Preprocess: convert [pause] markup to SSML <break> tags before sending to TTS
  const processedText = convertPauseMarkup(text);

  // Build input — Gemini TTS supports style prompts, Chirp 3: HD uses markup or ssml
  const input: Record<string, unknown> = {};
  if (isGemini) {
    input.text = processedText;
    if (ttsConfig.stylePrompt) {
      input.prompt = ttsConfig.stylePrompt;
    }
  } else {
    // Chirp 3: HD — detect SSML content and use appropriate input field
    // Auto-wrap in <speak> if text contains SSML tags (like <break>) but isn't already wrapped
    const hasSSMLTags = /<break\s|<prosody\s|<emphasis\s|<sub\s|<say-as\s/.test(processedText);
    const isSSML = processedText.trimStart().startsWith("<speak>");
    if (isSSML) {
      // Already wrapped in <speak> — send as SSML directly
      input.ssml = processedText;
    } else if (hasSSMLTags) {
      // Contains SSML tags but no <speak> wrapper — auto-wrap
      // Escape XML-unsafe chars in text portions (preserves SSML tags)
      input.ssml = `<speak>${escapeForSSML(processedText)}</speak>`;
    } else {
      // Plain text / basic markup mode
      input.markup = processedText;
    }
  }

  // Audio config — use LINEAR16 (WAV) for lossless quality
  const audioConfig: Record<string, unknown> = {
    audioEncoding: "LINEAR16",
    sampleRateHertz: ttsConfig.sampleRateHertz || 24000,
  };

  // speakingRate is supported by ALL Cloud TTS models (Gemini TTS + Chirp 3: HD)
  // Range: [0.25, 2.0], 1.0 = native speed
  if (speed !== 1.0) {
    audioConfig.speakingRate = speed;
  }

  const requestBody = { input, voice, audioConfig };

  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    console.error(
      `Google Cloud TTS API error: ${response.status} ${response.statusText}`
    );
    const body = await response.text();
    console.error(body);
    return;
  }

  const data = (await response.json()) as { audioContent: string };

  if (!data.audioContent) {
    console.error("Google Cloud TTS returned empty audioContent");
    return;
  }

  // audioContent is base64-encoded audio
  const buffer = Buffer.from(data.audioContent, "base64");
  fs.writeFileSync(outputPath, buffer);
}

async function generateAllGoogleTTS(
  blocks: VoiceoverBlock[],
  audioDir: string,
  ttsConfig: ResolvedTTSConfig,
  speed: number,
  generatedBlocks: AudioBlock[]
): Promise<void> {
  const voiceName = resolveGoogleVoiceName(ttsConfig);
  const isGemini = isGeminiTTSModel(ttsConfig.modelId);

  console.log(
    `Google Cloud TTS voice: ${voiceName}, model: ${ttsConfig.modelId}, language: ${ttsConfig.languageCode}, sampleRate: ${ttsConfig.sampleRateHertz}Hz`
  );
  if (isGemini && ttsConfig.stylePrompt) {
    console.log(`  Style prompt: "${ttsConfig.stylePrompt}"`);
  }
  if (speed !== 1.0) {
    console.log(`  Speaking rate: ${speed}`);
  }

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const words = countSpokenWords(block.text);
    const ext = "wav"; // All Google Cloud TTS with LINEAR16 encoding → WAV
    const fileName = `${block.sectionSlug}--${block.sceneId}.${ext}`;
    const outputPath = path.join(audioDir, fileName);

    console.log(
      `Generating block ${i + 1}/${blocks.length}: ${block.sectionSlug}--${block.sceneId} (${block.text.length} chars, ~${words} words)...`
    );

    await generateGoogleTTSBlock(block.text, outputPath, ttsConfig, speed);

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

// ─── ElevenLabs ──────────────────────────────────────────

async function generateElevenLabsBlock(
  text: string,
  outputPath: string,
  ttsConfig: ResolvedTTSConfig,
  speed: number,
  previousRequestIds: string[]
): Promise<string | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    console.error("Missing ELEVENLABS_API_KEY in .env");
    process.exit(1);
  }

  if (!ttsConfig.voiceId) {
    console.error(
      "Missing voiceId in channel-config.json → tts.voiceId (or video config.json → tts.voiceId)"
    );
    process.exit(1);
  }

  const voiceSettings: Record<string, unknown> = {
    stability: ttsConfig.stability,
    similarity_boost: ttsConfig.similarityBoost,
    speed,
  };

  // style param — only supported on eleven_multilingual_v2 and v1
  if (ttsConfig.style > 0 && ttsConfig.modelId.includes("multilingual_v2")) {
    voiceSettings.style = ttsConfig.style;
  }

  // speaker boost
  if (ttsConfig.useSpeakerBoost) {
    voiceSettings.use_speaker_boost = true;
  }

  const requestBody: Record<string, unknown> = {
    text,
    model_id: ttsConfig.modelId,
    voice_settings: voiceSettings,
  };

  // Request stitching for prosody continuity (v2 models only, not v3)
  if (previousRequestIds.length > 0 && ttsConfig.modelId.includes("v2")) {
    requestBody.previous_request_ids = previousRequestIds.slice(-3);
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${ttsConfig.voiceId}`,
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
  ttsConfig: ResolvedTTSConfig,
  speed: number,
  generatedBlocks: AudioBlock[]
): Promise<void> {
  console.log(
    `ElevenLabs voice: ${ttsConfig.voiceName || ttsConfig.voiceId}, model: ${ttsConfig.modelId}, speed: ${speed}`
  );
  console.log(
    `  Settings: stability=${ttsConfig.stability}, similarity=${ttsConfig.similarityBoost}, style=${ttsConfig.style}, speakerBoost=${ttsConfig.useSpeakerBoost}`
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
      ttsConfig,
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
