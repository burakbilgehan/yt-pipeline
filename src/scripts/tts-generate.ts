/**
 * TTS Generation Script
 *
 * Generates voiceover audio using ElevenLabs API from the video script.
 *
 * Usage: npm run tts <project-slug>
 *
 * Reads: projects/<slug>/content/script.md
 * Writes: projects/<slug>/production/audio/
 */

import * as fs from "node:fs";
import * as path from "node:path";

const PROJECTS_DIR = path.resolve("projects");

async function main() {
  const slug = process.argv[2];

  if (!slug) {
    console.error("Usage: npm run tts <project-slug>");
    process.exit(1);
  }

  const projectDir = path.join(PROJECTS_DIR, slug);
  const scriptPath = path.join(projectDir, "content", "script.md");
  const audioDir = path.join(projectDir, "production", "audio");

  if (!fs.existsSync(scriptPath)) {
    console.error(`Script not found: ${scriptPath}`);
    console.error("Run the content-writer agent first.");
    process.exit(1);
  }

  fs.mkdirSync(audioDir, { recursive: true });

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

  console.log("\nTTS generation complete!");
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
