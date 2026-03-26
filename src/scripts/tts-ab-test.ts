/**
 * TTS Customization Showcase
 *
 * Generates the same narration with different Chirp 3: HD customization
 * techniques applied, so you can hear the difference side by side.
 *
 * Usage: npm run tts-ab-test
 *
 * Techniques tested:
 *   1. Plain text (baseline — no customization)
 *   2. Markup with [pause] tags for dramatic beats
 *   3. SSML with <break>, <prosody> for fine-grained control
 *   4. Slow pace (speaking_rate: 0.85) — gravitas
 *   5. Combined: markup pauses + slower pace + punctuation tricks
 */

import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";

const API_URL = "https://texttospeech.googleapis.com/v1/text:synthesize";

const VOICE = {
  languageCode: "en-US",
  name: "en-US-Chirp3-HD-Achernar",
};

// ── Test Samples ──────────────────────────────────────────────
// Using the sleep deprivation hook — same content, different delivery

interface Sample {
  label: string;
  fileName: string;
  input: Record<string, unknown>;
  audioConfig: Record<string, unknown>;
}

const SAMPLES: Sample[] = [
  // 1. BASELINE — plain text, no tricks
  {
    label: "① Baseline — plain text, no customization",
    fileName: "01-baseline.mp3",
    input: {
      text: `After just 17 hours without sleep, that's waking up at 7am and staying up until midnight, your brain is performing at the level of someone who is legally drunk. Not a little foggy. Not a bit slow. Legally drunk. And here's the part that should terrify every employer, every policy maker, and every person driving home tonight: we have built our entire economy around this state of impairment.`,
    },
    audioConfig: { audioEncoding: "MP3" },
  },

  // 2. MARKUP with [pause] tags — dramatic beats
  {
    label: "② Markup — [pause] tags for dramatic beats",
    fileName: "02-markup-pauses.mp3",
    input: {
      markup: `After just 17 hours without sleep [pause long] that's waking up at 7am and staying up until midnight [pause] your brain is performing at the level of someone who is legally drunk. [pause long] Not a little foggy. Not a bit slow. [pause] Legally drunk. [pause long] And here's the part that should terrify every employer, every policy maker, and every person driving home tonight: [pause long] we have built our entire economy [pause] around this state of impairment.`,
    },
    audioConfig: { audioEncoding: "MP3" },
  },

  // 3. SSML — <break> and <prosody> for fine control
  {
    label: "③ SSML — <break>, <prosody rate/pitch>",
    fileName: "03-ssml.mp3",
    input: {
      ssml: `<speak>
        <p>
          <s>After just 17 hours without sleep<break time="800ms"/> — that's waking up at 7am and staying up until midnight —<break time="500ms"/> your brain is performing at the level of someone who is <prosody rate="slow" pitch="-1st">legally drunk.</prosody></s>
        </p>
        <break time="1200ms"/>
        <p>
          <s><prosody rate="medium">Not a little foggy.</prosody><break time="400ms"/> <prosody rate="medium">Not a bit slow.</prosody></s>
          <break time="600ms"/>
          <s><prosody rate="x-slow" pitch="-2st">Legally. Drunk.</prosody></s>
        </p>
        <break time="1500ms"/>
        <p>
          <s>And here's the part that should terrify every employer,<break time="300ms"/> every policy maker,<break time="300ms"/> and every person driving home tonight:</s>
          <break time="1000ms"/>
          <s><prosody rate="slow">we have built our entire economy<break time="500ms"/> around this state of impairment.</prosody></s>
        </p>
      </speak>`,
    },
    audioConfig: { audioEncoding: "MP3" },
  },

  // 4. SLOW PACE — speaking_rate 0.85 for gravitas
  {
    label: "④ Slower pace (0.85x) — gravitas feel",
    fileName: "04-slow-pace.mp3",
    input: {
      text: `After just 17 hours without sleep, that's waking up at 7am and staying up until midnight, your brain is performing at the level of someone who is legally drunk. Not a little foggy. Not a bit slow. Legally drunk. And here's the part that should terrify every employer, every policy maker, and every person driving home tonight: we have built our entire economy around this state of impairment.`,
    },
    audioConfig: { audioEncoding: "MP3", speaking_rate: 0.85 },
  },

  // 5. PUNCTUATION TRICKS — ellipses, dashes, short sentences
  {
    label: "⑤ Punctuation tricks — ellipses, dashes, fragments",
    fileName: "05-punctuation.mp3",
    input: {
      text: `After just 17 hours without sleep... that's waking up at 7am — and staying up until midnight — your brain is performing at the level of someone who is legally drunk. Not "a little foggy." Not "a bit slow." Legally... drunk. And here's the part that should terrify every employer. Every policy maker. And every person driving home tonight: we have built our entire economy... around this state of impairment.`,
    },
    audioConfig: { audioEncoding: "MP3" },
  },

  // 6. COMBINED — markup pauses + slow pace + punctuation
  {
    label: "⑥ Combined — markup + slow pace + punctuation",
    fileName: "06-combined.mp3",
    input: {
      markup: `After just 17 hours without sleep... [pause long] that's waking up at 7am — and staying up until midnight — [pause] your brain is performing at the level of someone who is legally drunk. [pause long] Not "a little foggy." Not "a bit slow." [pause] Legally... drunk. [pause long] And here's the part that should terrify every employer. Every policy maker. And every person driving home tonight: [pause long] we have built our entire economy... [pause] around this state of impairment.`,
    },
    audioConfig: { audioEncoding: "MP3", speaking_rate: 0.85 },
  },

  // 7. FAST + URGENT — speaking_rate 1.15 for urgency sections
  {
    label: "⑦ Faster pace (1.15x) — urgent, alarming tone",
    fileName: "07-fast-urgent.mp3",
    input: {
      markup: `After just 17 hours without sleep — that's waking up at 7am and staying up until midnight — your brain is performing at the level of someone who is legally drunk. [pause] Not a little foggy. Not a bit slow. Legally drunk. [pause long] And here's the part that should terrify every employer, every policy maker, and every person driving home tonight — we have built our entire economy around this state of impairment.`,
    },
    audioConfig: { audioEncoding: "MP3", speaking_rate: 1.15 },
  },
];

async function generateSample(
  sample: Sample,
  outputPath: string,
  apiKey: string
): Promise<{ sizeKB: string; latencyS: string }> {
  const requestBody = {
    input: sample.input,
    voice: VOICE,
    audioConfig: sample.audioConfig,
  };

  const start = Date.now();
  const response = await fetch(`${API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API ${response.status}: ${body}`);
  }

  const data = (await response.json()) as { audioContent: string };
  if (!data.audioContent) throw new Error("Empty audioContent");

  const buffer = Buffer.from(data.audioContent, "base64");
  fs.writeFileSync(outputPath, buffer);

  const latencyS = ((Date.now() - start) / 1000).toFixed(1);
  const sizeKB = (buffer.length / 1024).toFixed(1);
  return { sizeKB, latencyS };
}

async function main() {
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
  if (!apiKey) {
    console.error("Missing GOOGLE_CLOUD_API_KEY in .env");
    process.exit(1);
  }

  const outDir = path.resolve("ab-test");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log("══════════════════════════════════════════════════");
  console.log("  TTS Customization Showcase — Chirp 3: HD");
  console.log("  Voice: Achernar (female)");
  console.log(`  Samples: ${SAMPLES.length}`);
  console.log("══════════════════════════════════════════════════\n");

  const results: { label: string; file: string; size: string; latency: string; status: string }[] = [];

  for (const sample of SAMPLES) {
    const outputPath = path.join(outDir, sample.fileName);
    process.stdout.write(`  ${sample.label}...`);

    try {
      const { sizeKB, latencyS } = await generateSample(sample, outputPath, apiKey);
      console.log(` ✓ (${sizeKB} KB, ${latencyS}s)`);
      results.push({ label: sample.label, file: sample.fileName, size: sizeKB, latency: latencyS, status: "OK" });
    } catch (err: any) {
      console.log(` ✗ FAILED`);
      console.error(`    ${err.message}\n`);
      results.push({ label: sample.label, file: sample.fileName, size: "-", latency: "-", status: "FAIL" });
    }
  }

  // Summary table
  console.log("\n══════════════════════════════════════════════════");
  console.log("  Summary");
  console.log("══════════════════════════════════════════════════");
  console.log(`  ${"File".padEnd(26)} ${"Size".padStart(8)} ${"Latency".padStart(8)}  Status`);
  console.log(`  ${"─".repeat(26)} ${"─".repeat(8)} ${"─".repeat(8)}  ──────`);
  for (const r of results) {
    console.log(`  ${r.file.padEnd(26)} ${(r.size + " KB").padStart(8)} ${(r.latency + "s").padStart(8)}  ${r.status}`);
  }

  console.log(`\n  Files → ${outDir}/`);
  console.log("\n  Listen to each and compare:");
  console.log("  - Baseline vs Pauses: does [pause] add drama?");
  console.log("  - SSML vs Markup: which gives better control?");
  console.log("  - Pace 0.85 vs 1.0 vs 1.15: which fits the channel?");
  console.log("  - Combined: is the kitchen sink approach better?\n");
}

main();
