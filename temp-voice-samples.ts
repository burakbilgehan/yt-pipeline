import { EdgeTTS } from "@andresaya/edge-tts";
import * as fs from "node:fs";
import * as path from "node:path";

const testText =
  "The Dow Jones has gained twenty-six thousand percent since 1925. Sounds like the greatest investment in history, right? But what if I told you — when you price the Dow in gold — it has only doubled.";

const voices = [
  "en-US-AndrewNeural",
  "en-US-BrianNeural",
  "en-GB-RyanNeural",
  "en-AU-WilliamMultilingualNeural",
  "en-US-GuyNeural",
  "en-US-ChristopherNeural",
];

const outDir = path.join(
  "projects",
  "gold-vs-commodities-100-years",
  "production",
  "audio",
  "voice-samples"
);
fs.mkdirSync(outDir, { recursive: true });

async function main() {
  for (const voice of voices) {
    console.log(`Generating sample for ${voice}...`);
    const tts = new EdgeTTS();
    await tts.synthesize(testText, voice);
    const outPath = path.join(outDir, `sample-${voice}.mp3`);
    await tts.toFile(outPath);
    console.log(`  Saved: ${outPath}`);
  }
  console.log("\nDone! Listen to the samples and pick your favorite.");
}

main();
