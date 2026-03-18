/**
 * TTS Calibration Script
 *
 * Sends a known calibration text to ElevenLabs, measures actual duration,
 * and stores voice-specific WPM baseline in channel-config.json.
 *
 * Run once per voice/model combination to establish baseline.
 * After that, tts-generate.ts auto-calibrates with every production run.
 *
 * Usage: npm run tts-calibrate [-- --channel <slug>]
 *
 * Cost: ~500 characters per run (~$0.015 at ElevenLabs scale tier)
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
 * - Includes explicit <break> tags (for models that support them)
 * - Includes natural punctuation variety
 * - Representative of typical narration content
 */
const CALIBRATION_TEXT = `The global economy grew by three point two percent last year. That might sound modest, but it represents nearly three trillion dollars in new output. <break time="0.8s" /> To put that in perspective, it's roughly the entire GDP of France — created in just twelve months. Meanwhile, inflation fell to its lowest level in four years, averaging two point one percent across developed nations. <break time="0.5s" /> Not everyone benefited equally, though. Emerging markets saw growth rates nearly double those of wealthy countries, while real wages in the United States barely kept pace with rising costs. The gap between the richest and poorest nations continued to widen, raising questions about whether current policies are sustainable.`;

const CALIBRATION_SPOKEN_WORDS = countSpokenWords(CALIBRATION_TEXT);

async function main() {
  // Parse channel flag
  const channelArgIdx = process.argv.findIndex((a) => a === "--channel");
  const channelSlug =
    channelArgIdx !== -1 ? process.argv[channelArgIdx + 1] : undefined;

  const channelConfig = loadChannelConfig(channelSlug);
  const configPath = getChannelConfigPath(channelSlug);

  console.log("── TTS Calibration ──\n");
  console.log(`Channel config: ${configPath}`);
  console.log(`Calibration text: ${CALIBRATION_SPOKEN_WORDS} spoken words\n`);

  // Show pre-calibration prediction
  const prePrediction = predictDuration(
    CALIBRATION_TEXT,
    channelConfig.tts?.calibration ?? null
  );
  console.log("Pre-calibration prediction:");
  console.log(formatEstimate(prePrediction));
  console.log("");

  // Determine TTS settings
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId =
    process.env.ELEVENLABS_VOICE_ID ||
    channelConfig.tts?.voiceId;
  const modelId =
    process.env.ELEVENLABS_MODEL_ID ||
    channelConfig.tts?.modelId ||
    "eleven_multilingual_v2";
  const stability = channelConfig.tts?.stability ?? 0.5;
  const similarityBoost = channelConfig.tts?.similarityBoost ?? 0.75;

  if (!apiKey) {
    console.error("Missing ELEVENLABS_API_KEY in .env");
    console.error("Set it and try again.");
    process.exit(1);
  }

  if (!voiceId) {
    console.error(
      "Missing ELEVENLABS_VOICE_ID in .env or tts.voiceId in channel-config.json"
    );
    process.exit(1);
  }

  console.log(`Voice: ${voiceId}`);
  console.log(`Model: ${modelId}`);
  console.log(`Generating calibration audio...\n`);

  // Generate TTS at speed=1.0
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: CALIBRATION_TEXT,
        model_id: modelId,
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
          speed: 1.0,
        },
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

  // Save to temp file for measurement
  const buffer = Buffer.from(await response.arrayBuffer());
  const tempPath = path.resolve("calibration-temp.mp3");
  fs.writeFileSync(tempPath, buffer);

  console.log(`  Audio generated: ${(buffer.length / 1024).toFixed(1)} KB`);

  // Measure actual duration
  const actualDuration = await getAudioDuration(tempPath);
  console.log(`  Actual duration: ${actualDuration.toFixed(1)}s (${formatDuration(actualDuration)})`);

  // Clean up temp file
  fs.unlinkSync(tempPath);

  // Compare prediction to actual
  const comparison = comparePredictionToActual(prePrediction, actualDuration);

  console.log(`\n── Results ──`);
  console.log(`  Predicted:      ${prePrediction.totalEstimate.toFixed(1)}s`);
  console.log(`  Actual:         ${actualDuration.toFixed(1)}s`);
  console.log(`  Error:          ${comparison.percentError.toFixed(1)}%`);
  console.log(`  Implied WPM:    ${comparison.impliedWPM.toFixed(1)}`);
  console.log(`  Pause ratio:    ${(comparison.impliedPauseRatio * 100).toFixed(1)}%`);

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
  console.log(`  Pause ratio:  ${(tts.calibration.naturalPauseRatio * 100).toFixed(1)}%`);
  console.log(`  Samples:      ${tts.calibration.sampleCount}`);
  console.log(`  Config:       ${configPath}`);
  console.log(
    `\n✓ Calibration complete! Future predictions will use ${tts.calibration.measuredWPM} WPM.`
  );
}

main();
