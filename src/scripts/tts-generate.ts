/**
 * TTS Generation Script
 *
 * Generates voiceover audio from the video script.
 * Supports both ElevenLabs and Edge TTS providers.
 *
 * Usage: npm run tts <project-slug>
 *
 * Provider selection:
 *   1. --provider flag (e.g., npm run tts <slug> -- --provider edge-tts)
 *   2. channel-config.json → tts.provider
 *   3. Falls back to "edge-tts"
 *
 * Reads: projects/<slug>/content/script-v<latest>.md
 * Writes: projects/<slug>/production/audio/
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
} from "../utils/project.js";

type TTSProvider = "elevenlabs" | "edge-tts";

async function main() {
  const slug = process.argv[2];

  if (!slug) {
    console.error("Usage: npm run tts <project-slug> [-- --provider edge-tts|elevenlabs]");
    process.exit(1);
  }

  const config = loadProjectConfig(slug);
  const channelConfig = loadChannelConfig();

  // Determine provider: CLI flag > channel-config > default
  const providerArg = process.argv.find((a) => a.startsWith("--provider"));
  const providerFlag = providerArg
    ? (process.argv[process.argv.indexOf(providerArg) + 1] as TTSProvider)
    : undefined;
  const provider: TTSProvider =
    providerFlag || (channelConfig.tts?.provider as TTSProvider) || "edge-tts";

  console.log(`TTS Provider: ${provider}`);

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

  // Read script and extract voiceover sections
  const script = fs.readFileSync(scriptPath, "utf-8");
  const voiceoverBlocks = extractVoiceover(script);

  console.log(`Found ${voiceoverBlocks.length} voiceover blocks`);

  if (provider === "edge-tts") {
    await generateEdgeTTS(voiceoverBlocks, audioDir, channelConfig);
  } else {
    await generateElevenLabs(voiceoverBlocks, audioDir, channelConfig);
  }

  // Update config
  const version = config.pipeline.production.version || 1;
  config.pipeline.production.status = "in_progress";
  config.pipeline.production.startedAt = new Date().toISOString();
  config.history.push({
    action: "production.started",
    version,
    at: new Date().toISOString(),
    reason: `Generated TTS audio (${provider}) from ${scriptFile} (${voiceoverBlocks.length} blocks)`,
  });
  saveProjectConfig(slug, config);

  console.log("\nTTS generation complete!");
  console.log("Config updated.");
}

// ─── Edge TTS ────────────────────────────────────────────

async function generateEdgeTTS(
  blocks: string[],
  audioDir: string,
  channelConfig: any
) {
  const { EdgeTTS } = await import("@andresaya/edge-tts");

  // Voice: env var > channel-config > default
  const voice =
    process.env.EDGE_TTS_VOICE ||
    channelConfig.tts?.voiceId ||
    "en-US-AndrewNeural";

  console.log(`Edge TTS voice: ${voice}`);

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    console.log(
      `Generating TTS for block ${i + 1}/${blocks.length} (${block.length} chars)...`
    );

    const tts = new EdgeTTS();
    await tts.synthesize(block, voice);

    // Edge TTS toFile() appends .mp3 automatically, so don't include extension
    const baseName = `voiceover-${String(i + 1).padStart(3, "0")}`;
    const outputBase = path.join(audioDir, baseName);
    await tts.toFile(outputBase);

    // Determine actual output path (toFile adds .mp3)
    const outputPath = fs.existsSync(outputBase + ".mp3")
      ? outputBase + ".mp3"
      : outputBase;
    const stat = fs.statSync(outputPath);
    console.log(
      `  Saved: ${outputPath} (${(stat.size / 1024).toFixed(1)} KB)`
    );
  }
}

// ─── ElevenLabs ──────────────────────────────────────────

async function generateElevenLabs(
  blocks: string[],
  audioDir: string,
  channelConfig: any
) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId =
    process.env.ELEVENLABS_VOICE_ID ||
    channelConfig.tts?.elevenlabs?.voiceId ||
    channelConfig.tts?.voiceId;
  const modelId =
    process.env.ELEVENLABS_MODEL_ID ||
    channelConfig.tts?.elevenlabs?.modelId ||
    "eleven_multilingual_v2";
  const stability = channelConfig.tts?.elevenlabs?.stability ?? 0.5;
  const similarityBoost = channelConfig.tts?.elevenlabs?.similarityBoost ?? 0.75;

  if (!apiKey) {
    console.error("Missing ELEVENLABS_API_KEY in .env");
    process.exit(1);
  }

  if (!voiceId) {
    console.error(
      "Missing ELEVENLABS_VOICE_ID in .env or tts.elevenlabs.voiceId in channel-config.json"
    );
    process.exit(1);
  }

  console.log(`ElevenLabs voice: ${voiceId}, model: ${modelId}`);

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    console.log(
      `Generating TTS for block ${i + 1}/${blocks.length} (${block.length} chars)...`
    );

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: block,
          model_id: modelId,
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error(
        `ElevenLabs API error (block ${i + 1}): ${response.status} ${response.statusText}`
      );
      const body = await response.text();
      console.error(body);
      continue;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const outputPath = path.join(
      audioDir,
      `voiceover-${String(i + 1).padStart(3, "0")}.mp3`
    );
    fs.writeFileSync(outputPath, buffer);
    console.log(`  Saved: ${outputPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
  }
}

// ─── Voiceover Extraction ────────────────────────────────

function extractVoiceover(script: string): string[] {
  const blocks: string[] = [];
  const lines = script.split("\n");
  let inVoiceover = false;
  let currentBlock = "";

  for (const line of lines) {
    if (line.trim() === "[VOICEOVER]") {
      inVoiceover = true;
      currentBlock = "";
      continue;
    }

    if (inVoiceover) {
      // Stop at the next marker or section header
      if (line.startsWith("[") || line.startsWith("## ")) {
        if (currentBlock.trim()) {
          blocks.push(currentBlock.trim());
        }
        inVoiceover = false;
        continue;
      }
      currentBlock += line + "\n";
    }
  }

  // Don't forget the last block
  if (inVoiceover && currentBlock.trim()) {
    blocks.push(currentBlock.trim());
  }

  return blocks;
}

main();
