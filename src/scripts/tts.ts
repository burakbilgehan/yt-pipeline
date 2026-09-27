/**
 * Incremental TTS for layout-2 projects.
 *
 * For each block, the audio hash covers text + every voice setting. Only blocks
 * whose hash has no wav yet are synthesized. Any synthesis failure exits 1 and
 * leaves the manifest entry of that block untouched (no silent partial success).
 * Wavs no longer referenced by the manifest are deleted.
 * This script never writes channel-config.json.
 *
 * Usage: npm run tts -- <slug> [--dry-run]
 */

import fs from "node:fs";
import path from "node:path";
import "dotenv/config";
import { getAudioDuration } from "../utils/audio-probe.js";
import {
  assertLayout2,
  audioFileName,
  audioHash,
  loadManifest,
  loadNarration,
  loadTTSSettings,
  orderedBlocks,
  paths,
  writeJson,
  type TTSSettings,
} from "../pipeline/v2.js";

const SSML_TAG = /(<break\s[^>]*\/>|<\/?speak>|<prosody[^>]*>|<\/prosody>|<emphasis[^>]*>|<\/emphasis>|<sub[^>]*>|<\/sub>|<say-as[^>]*>|<\/say-as>)/;

function toRequestInput(text: string, tts: TTSSettings): Record<string, string> {
  const converted = text
    .replace(/\[pause long\]/gi, '<break time="1000ms"/>')
    .replace(/\[pause short\]/gi, '<break time="300ms"/>')
    .replace(/\[pause\]/gi, '<break time="500ms"/>');
  if (tts.modelId.startsWith("gemini-")) {
    return tts.stylePrompt ? { text: converted, prompt: tts.stylePrompt } : { text: converted };
  }
  if (!SSML_TAG.test(converted)) return { markup: converted };
  const escaped = converted
    .split(SSML_TAG)
    .map((part) => (SSML_TAG.test(part) ? part : part.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")))
    .join("");
  return { ssml: escaped.trimStart().startsWith("<speak>") ? escaped : `<speak>${escaped}</speak>` };
}

async function synthesizeGoogle(text: string, tts: TTSSettings): Promise<Buffer> {
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_CLOUD_API_KEY missing in .env");
  const isGemini = tts.modelId.startsWith("gemini-");
  const voice: Record<string, string> = {
    languageCode: tts.languageCode,
    name: isGemini ? tts.voiceName : `${tts.languageCode}-Chirp3-HD-${tts.voiceName}`,
  };
  if (isGemini) voice.model_name = tts.modelId;
  const audioConfig: Record<string, unknown> = { audioEncoding: "LINEAR16", sampleRateHertz: tts.sampleRateHertz };
  if (tts.speed !== 1) audioConfig.speakingRate = tts.speed;

  const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input: toRequestInput(text, tts), voice, audioConfig }),
  });
  if (!res.ok) throw new Error(`Google TTS ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { audioContent?: string };
  if (!data.audioContent) throw new Error("Google TTS returned empty audioContent");
  return Buffer.from(data.audioContent, "base64");
}

async function main() {
  const slug = process.argv[2];
  const dryRun = process.argv.includes("--dry-run");
  if (!slug || slug.startsWith("--")) {
    console.error("Usage: npm run tts -- <slug> [--dry-run]");
    process.exit(1);
  }
  assertLayout2(slug);
  const p = paths(slug);
  const tts = loadTTSSettings(slug);
  const manifest = loadManifest(slug);
  const blocks = orderedBlocks(slug);

  const todo = blocks
    .map(({ id }) => ({ id, text: loadNarration(slug, id) }))
    .map((b) => ({ ...b, hash: audioHash(b.text, tts) }))
    .filter((b) => manifest.blocks[b.id]?.hash !== b.hash);

  console.log(`${blocks.length} blocks, ${todo.length} to synthesize${todo.length ? ": " + todo.map((b) => b.id).join(", ") : ""}`);
  if (dryRun || todo.length === 0) return finish();

  fs.mkdirSync(p.audioDir, { recursive: true });
  const failures: string[] = [];
  for (const b of todo) {
    const file = audioFileName(b.id, b.hash);
    const out = path.join(p.audioDir, file);
    try {
      fs.writeFileSync(out, await synthesizeGoogle(b.text, tts));
      const before = manifest.blocks[b.id]?.duration;
      const duration = await getAudioDuration(out);
      manifest.blocks[b.id] = { hash: b.hash, file, duration };
      writeJson(p.manifest, manifest);
      const delta = before === undefined ? "" : ` (${duration - before >= 0 ? "+" : ""}${(duration - before).toFixed(2)}s)`;
      console.log(`  ${b.id}: ${duration.toFixed(2)}s${delta}`);
    } catch (err) {
      failures.push(b.id);
      if (fs.existsSync(out)) fs.unlinkSync(out);
      console.error(`  ${b.id}: FAILED ${(err as Error).message}`);
    }
  }
  if (failures.length > 0) {
    console.error(`${failures.length} block(s) failed: ${failures.join(", ")}. Manifest kept their previous audio.`);
    process.exit(1);
  }
  finish();

  function finish() {
    if (dryRun) return;
    // Drop manifest entries of removed blocks, then delete unreferenced wavs.
    const live = new Set(blocks.map((b) => b.id));
    for (const id of Object.keys(manifest.blocks)) if (!live.has(id)) delete manifest.blocks[id];
    writeJson(p.manifest, manifest);
    const referenced = new Set(Object.values(manifest.blocks).map((b) => b.file));
    for (const f of fs.existsSync(p.audioDir) ? fs.readdirSync(p.audioDir) : []) {
      if (f.endsWith(".wav") && !referenced.has(f)) fs.unlinkSync(path.join(p.audioDir, f));
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
