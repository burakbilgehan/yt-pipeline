/**
 * TTS Calibration Script
 *
 * Sends a known calibration text to the configured TTS provider,
 * measures actual duration, and stores voice-specific WPM baseline
 * in channel-config.json.
 *
 * Supports: Google Cloud TTS (Gemini TTS + Chirp 3: HD), ElevenLabs, Edge TTS
 *
 * Run once per voice/model combination to establish baseline.
 * After that, tts-generate.ts auto-calibrates with every production run.
 *
 * Usage: npm run tts-calibrate [-- --channel <slug>] [-- --provider google|elevenlabs]
 *
 * Cost: ~500 characters per run
 *   - Google Cloud TTS: free (well within 1M chars/month free tier)
 *   - ElevenLabs: ~$0.015 at scale tier
 */

import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  loadChannelConfig,
  getChannelConfigPath,
} from "../utils/project.js";
import {
  predictDuration,
  comparePredictionToActual,
  countSpokenWords,
  formatEstimate,
  formatDuration,
} from "../utils/duration-predictor.js";
import { getAudioDuration } from "../utils/audio-probe.js";
import type { TTSCalibration, TTSCalibrationMeasurement } from "../types/index.js";

/**
 * Calibration text — carefully chosen:
 * - ~95 spoken words (enough for reliable measurement)
 * - Includes numbers written in spoken form
 * - Includes natural punctuation variety
 * - Representative of typical narration content
 *
 * Note: <break> tags removed — they are ElevenLabs-specific.
 * Google Gemini TTS uses punctuation/ellipses for pauses.
 * Chirp 3: HD uses [pause short] / [pause long] markup tags.
 */
const CALIBRATION_TEXT = `The global economy grew by three point two percent last year. That might sound modest, but it represents nearly three trillion dollars in new output... To put that in perspective, it's roughly the entire GDP of France — created in just twelve months. Meanwhile, inflation fell to its lowest level in four years, averaging two point one percent across developed nations... Not everyone benefited equally, though. Emerging markets saw growth rates nearly double those of wealthy countries, while real wages in the United States barely kept pace with rising costs. The gap between the richest and poorest nations continued to widen, raising questions about whether current policies are sustainable.`;

const CALIBRATION_SPOKEN_WORDS = countSpokenWords(CALIBRATION_TEXT);

type Provider = "google" | "elevenlabs" | "edge-tts";

async function main() {
  // Parse flags
  const args = process.argv.slice(2);
  const channelArgIdx = args.findIndex((a) => a === "--channel");
  const channelSlug =
    channelArgIdx !== -1 ? args[channelArgIdx + 1] : undefined;

  const providerArgIdx = args.findIndex((a) => a === "--provider");
  const providerFlag =
    providerArgIdx !== -1 ? (args[providerArgIdx + 1] as Provider) : undefined;

  const channelConfig = loadChannelConfig(channelSlug);
  const configPath = getChannelConfigPath(channelSlug);

  const provider: Provider =
    providerFlag ?? (channelConfig.tts?.provider as Provider) ?? "google";

  console.log("── TTS Calibration ──\n");
  console.log(`Channel config: ${configPath}`);
  console.log(`Provider: ${provider}`);
  console.log(`Calibration text: ${CALIBRATION_SPOKEN_WORDS} spoken words\n`);

  // Show pre-calibration prediction
  const prePrediction = predictDuration(
    CALIBRATION_TEXT,
    (channelConfig.tts as any)?.calibration ?? null
  );
  console.log("Pre-calibration prediction:");
  console.log(formatEstimate(prePrediction));
  console.log("");

  // Generate calibration audio based on provider
  const tempPath = path.resolve("calibration-temp.mp3");

  if (provider === "google") {
    await generateGoogleCalibration(channelConfig, tempPath);
  } else if (provider === "elevenlabs") {
    await generateElevenLabsCalibration(channelConfig, tempPath);
  } else {
    console.error(`Calibration not supported for provider: ${provider}`);
    process.exit(1);
  }

  // Measure actual duration
  const actualDuration = await getAudioDuration(tempPath);
  console.log(
    `  Actual duration: ${actualDuration.toFixed(1)}s (${formatDuration(actualDuration)})`
  );

  // Clean up temp file
  fs.unlinkSync(tempPath);

  // Compare prediction to actual
  const comparison = comparePredictionToActual(prePrediction, actualDuration);

  console.log(`\n── Results ──`);
  console.log(`  Predicted:      ${prePrediction.totalEstimate.toFixed(1)}s`);
  console.log(`  Actual:         ${actualDuration.toFixed(1)}s`);
  console.log(`  Error:          ${comparison.percentError.toFixed(1)}%`);
  console.log(`  Implied WPM:    ${comparison.impliedWPM.toFixed(1)}`);
  console.log(
    `  Pause ratio:    ${(comparison.impliedPauseRatio * 100).toFixed(1)}%`
  );

  // Update channel config with calibration data
  if (!channelConfig.tts) (channelConfig as any).tts = {};
  const tts = channelConfig.tts as any;

  const measurement: TTSCalibrationMeasurement = {
    wordCount: CALIBRATION_SPOKEN_WORDS,
    predictedDuration:
      Math.round(prePrediction.totalEstimate * 10) / 10,
    actualDuration: Math.round(actualDuration * 10) / 10,
    speed: 1.0,
    date: new Date().toISOString().split("T")[0],
  };

  if (!tts.calibration) {
    tts.calibration = {
      measuredWPM: Math.round(comparison.impliedWPM * 10) / 10,
      naturalPauseRatio:
        Math.round(comparison.impliedPauseRatio * 1000) / 1000,
      sampleCount: 1,
      lastCalibratedAt: new Date().toISOString(),
      measurements: [measurement],
    } satisfies TTSCalibration;
  } else {
    const cal = tts.calibration as TTSCalibration;
    cal.measurements.push(measurement);
    cal.sampleCount = cal.measurements.length;

    // Recalculate rolling averages
    const wpmValues = cal.measurements.map((m) => {
      const speechTime = m.actualDuration * m.speed;
      return speechTime > 0 ? (m.wordCount / speechTime) * 60 : 150;
    });
    cal.measuredWPM =
      Math.round(
        (wpmValues.reduce((a, b) => a + b, 0) / wpmValues.length) * 10
      ) / 10;

    cal.naturalPauseRatio =
      Math.round(comparison.impliedPauseRatio * 1000) / 1000;
    cal.lastCalibratedAt = new Date().toISOString();
  }

  // Save
  fs.writeFileSync(configPath, JSON.stringify(channelConfig, null, 2));

  console.log(`\n── Calibration Saved ──`);
  console.log(`  WPM:          ${tts.calibration.measuredWPM}`);
  console.log(
    `  Pause ratio:  ${(tts.calibration.naturalPauseRatio * 100).toFixed(1)}%`
  );
  console.log(`  Samples:      ${tts.calibration.sampleCount}`);
  console.log(`  Config:       ${configPath}`);
  console.log(
    `\n✓ Calibration complete! Future predictions will use ${tts.calibration.measuredWPM} WPM.`
  );
}

// ─── Google Cloud TTS Calibration ────────────────────────

async function generateGoogleCalibration(
  channelConfig: any,
  outputPath: string
): Promise<void> {
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
  if (!apiKey) {
    console.error("Missing GOOGLE_CLOUD_API_KEY in .env");
    process.exit(1);
  }

  const tts = channelConfig.tts ?? {};
  const modelId = tts.modelId ?? "gemini-2.5-flash-tts";
  const voiceName = tts.voiceName ?? "Achernar";
  const languageCode = tts.languageCode ?? "en-US";
  const stylePrompt = tts.stylePrompt ?? "Say the following";
  const isGemini = modelId.startsWith("gemini-");

  // Resolve voice name for API
  const resolvedVoiceName = isGemini
    ? voiceName
    : `${languageCode}-Chirp3-HD-${voiceName}`;

  console.log(`Voice: ${resolvedVoiceName}`);
  console.log(`Model: ${modelId}`);
  if (isGemini && stylePrompt) {
    console.log(`Style prompt: "${stylePrompt}"`);
  }
  console.log(`Generating calibration audio...\n`);

  // Build request
  const voice: Record<string, unknown> = {
    languageCode,
    name: resolvedVoiceName,
  };
  if (isGemini) {
    voice.model_name = modelId;
  }

  const input: Record<string, unknown> = {};
  if (isGemini) {
    input.text = CALIBRATION_TEXT;
    if (stylePrompt) input.prompt = stylePrompt;
  } else {
    input.markup = CALIBRATION_TEXT;
  }

  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input,
        voice,
        audioConfig: { audioEncoding: "MP3" },
      }),
    }
  );

  if (!response.ok) {
    console.error(
      `Google Cloud TTS API error: ${response.status} ${response.statusText}`
    );
    const body = await response.text();
    console.error(body);
    process.exit(1);
  }

  const data = (await response.json()) as { audioContent: string };
  const buffer = Buffer.from(data.audioContent, "base64");
  fs.writeFileSync(outputPath, buffer);

  console.log(`  Audio generated: ${(buffer.length / 1024).toFixed(1)} KB`);
}

// ─── ElevenLabs Calibration ─────────────────────────────

async function generateElevenLabsCalibration(
  channelConfig: any,
  outputPath: string
): Promise<void> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error("Missing ELEVENLABS_API_KEY in .env");
    process.exit(1);
  }

  const tts = channelConfig.tts ?? {};
  const voiceId = tts.voiceId;
  const modelId = tts.modelId ?? "eleven_multilingual_v2";
  const stability = tts.stability ?? 0.35;
  const similarityBoost = tts.similarityBoost ?? 0.75;
  const style = tts.style ?? 0;
  const useSpeakerBoost = tts.useSpeakerBoost ?? false;

  if (!voiceId) {
    console.error("Missing tts.voiceId in channel-config.json");
    process.exit(1);
  }

  console.log(`Voice: ${tts.voiceName || voiceId}`);
  console.log(`Model: ${modelId}`);
  console.log(
    `Settings: stability=${stability}, similarity=${similarityBoost}, style=${style}, speakerBoost=${useSpeakerBoost}`
  );
  console.log(`Generating calibration audio...\n`);

  const voiceSettings: Record<string, unknown> = {
    stability,
    similarity_boost: similarityBoost,
    speed: 1.0,
  };
  if (style > 0 && modelId.includes("multilingual_v2")) {
    voiceSettings.style = style;
  }
  if (useSpeakerBoost) {
    voiceSettings.use_speaker_boost = true;
  }

  // Use calibration text with break tags for ElevenLabs
  const elevenLabsCalibrationText = CALIBRATION_TEXT
    .replace("output...", `output. <break time="0.8s" />`)
    .replace("nations...", `nations. <break time="0.5s" />`);

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: elevenLabsCalibrationText,
        model_id: modelId,
        voice_settings: voiceSettings,
      }),
    }
  );

  if (!response.ok) {
    console.error(
      `ElevenLabs API error: ${response.status} ${response.statusText}`
    );
    const body = await response.text();
    console.error(body);
    process.exit(1);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);

  console.log(`  Audio generated: ${(buffer.length / 1024).toFixed(1)} KB`);
}

main();
