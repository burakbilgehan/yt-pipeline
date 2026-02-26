/**
 * TTS Generation Script
 *
 * Generates voiceover audio using ElevenLabs API from the video script.
 *
 * Usage: npm run tts <project-slug>
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
} from "../utils/project.js";

async function main() {
  const slug = process.argv[2];

  if (!slug) {
    console.error("Usage: npm run tts <project-slug>");
    process.exit(1);
  }

  const projectDir = getProjectDir(slug);
  const config = loadProjectConfig(slug);

  // Find latest versioned script
  const scriptFile = getLatestVersionedFile(slug, "content", "script");

  if (!scriptFile) {
    console.error("No versioned script found in content/ directory.");
    console.error("Expected files like: script-v1.md, script-v2.md, etc.");
    console.error("Run the content-writer agent first.");
    process.exit(1);
  }

  const scriptPath = path.join(projectDir, "content", scriptFile);
  console.log(`Using script: ${scriptFile}`);

  const audioDir = ensureProjectDir(slug, "production/audio");

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  const modelId = process.env.ELEVENLABS_MODEL_ID || "eleven_monolingual_v1";

  if (!apiKey || !voiceId) {
    console.error("Missing ELEVENLABS_API_KEY or ELEVENLABS_VOICE_ID in .env");
    process.exit(1);
  }

  // Read script and extract voiceover sections
  const script = fs.readFileSync(scriptPath, "utf-8");
  const voiceoverBlocks = extractVoiceover(script);

  console.log(`Found ${voiceoverBlocks.length} voiceover blocks`);

  for (let i = 0; i < voiceoverBlocks.length; i++) {
    const block = voiceoverBlocks[i];
    console.log(`Generating TTS for block ${i + 1}/${voiceoverBlocks.length}...`);

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
            stability: 0.5,
            similarity_boost: 0.75,
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
    const outputPath = path.join(audioDir, `voiceover-${String(i + 1).padStart(3, "0")}.mp3`);
    fs.writeFileSync(outputPath, buffer);
    console.log(`  Saved: ${outputPath}`);
  }

  // Update config
  const version = config.pipeline.production.version || 1;
  config.pipeline.production.status = "in_progress";
  config.pipeline.production.startedAt = new Date().toISOString();
  config.history.push({
    action: "production.started",
    version,
    at: new Date().toISOString(),
    reason: `Generated TTS audio from ${scriptFile} (${voiceoverBlocks.length} blocks)`,
  });
  saveProjectConfig(slug, config);

  console.log("\nTTS generation complete!");
  console.log("Config updated.");
}

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
