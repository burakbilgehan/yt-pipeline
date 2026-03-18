/**
 * Text Utilities
 *
 * Utility functions for analyzing voiceover scripts and markdown content.
 * Enhanced with duration prediction from the duration-predictor utility.
 *
 * Usage:
 *   npx tsx src/scripts/text-utils.ts wordcount <file>
 *   npx tsx src/scripts/text-utils.ts stats <file>
 *   npx tsx src/scripts/text-utils.ts duration <file> [wpm]
 *   npx tsx src/scripts/text-utils.ts estimate <file>          ← NEW: full prediction with calibration
 *   npx tsx src/scripts/text-utils.ts budget <target-seconds>  ← NEW: word budget for target duration
 *
 * Commands:
 *   wordcount  Print just the word count (all text, markdown stripped)
 *   stats      Print word count, sentence count, estimated duration
 *   duration   Simple voiceover duration in seconds (default wpm: 150)
 *   estimate   Full duration prediction using duration-predictor (SSML-aware, calibrated if available)
 *   budget     Calculate max spoken words for a target duration
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  predictDuration,
  formatEstimate,
  formatDuration,
  wordBudgetForDuration,
  countSpokenWords,
  recommendSpeed,
} from "../utils/duration-predictor.js";
import { loadChannelConfig } from "../utils/project.js";

const DEFAULT_WPM = 150; // average narration pace

/**
 * Strip markdown syntax, version headers and YAML-style frontmatter
 * to get clean voiceover text.
 */
function stripMarkdown(raw: string): string {
  return (
    raw
      // Remove YAML-style frontmatter blocks (--- ... ---)
      .replace(/^---[\s\S]*?---\n?/, "")
      // Remove markdown headings
      .replace(/^#{1,6}\s+.*$/gm, "")
      // Remove bold/italic markers
      .replace(/\*{1,3}(.*?)\*{1,3}/g, "$1")
      .replace(/_{1,3}(.*?)_{1,3}/g, "$1")
      // Remove inline code
      .replace(/`[^`]*`/g, "")
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, "")
      // Remove links: [text](url) → text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Remove images: ![alt](url)
      .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
      // Remove horizontal rules
      .replace(/^[-*_]{3,}\s*$/gm, "")
      // Remove table rows
      .replace(/^\|.*\|$/gm, "")
      // Collapse multiple blank lines
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

/**
 * Count words in a string.
 */
function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Count sentences in a string.
 */
function countSentences(text: string): number {
  const matches = text.match(/[.!?]+/g);
  return matches ? matches.length : 0;
}

/**
 * Estimate voiceover duration in seconds (simple WPM calculation).
 */
function estimateDuration(
  wordCount: number,
  wpm: number = DEFAULT_WPM
): number {
  return Math.round((wordCount / wpm) * 60);
}

function readFile(filePath: string): string {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    console.error(`File not found: ${resolved}`);
    process.exit(1);
  }
  return fs.readFileSync(resolved, "utf-8");
}

// --- CLI ---

const [, , command, arg1, arg2] = process.argv;

if (!command) {
  console.log(`Usage:
  npx tsx src/scripts/text-utils.ts wordcount <file>
  npx tsx src/scripts/text-utils.ts stats <file>
  npx tsx src/scripts/text-utils.ts duration <file> [wpm]
  npx tsx src/scripts/text-utils.ts estimate <file>
  npx tsx src/scripts/text-utils.ts budget <target-seconds>`);
  process.exit(0);
}

switch (command) {
  case "wordcount": {
    if (!arg1) {
      console.error("Usage: text-utils wordcount <file>");
      process.exit(1);
    }
    const raw = readFile(arg1);
    const clean = stripMarkdown(raw);
    console.log(countWords(clean));
    break;
  }

  case "stats": {
    if (!arg1) {
      console.error("Usage: text-utils stats <file>");
      process.exit(1);
    }
    const raw = readFile(arg1);
    const clean = stripMarkdown(raw);
    const words = countWords(clean);
    const sentences = countSentences(clean);
    const durationSec = estimateDuration(words);
    console.log(`File:      ${path.basename(arg1)}`);
    console.log(`Words:     ${words}`);
    console.log(`Sentences: ${sentences}`);
    console.log(
      `Duration:  ~${formatDuration(durationSec)} (@ ${DEFAULT_WPM} wpm)`
    );
    break;
  }

  case "duration": {
    if (!arg1) {
      console.error("Usage: text-utils duration <file> [wpm]");
      process.exit(1);
    }
    const wpm = arg2 ? parseInt(arg2, 10) : DEFAULT_WPM;
    if (isNaN(wpm) || wpm <= 0) {
      console.error(`Invalid wpm: ${arg2}`);
      process.exit(1);
    }
    const raw = readFile(arg1);
    const clean = stripMarkdown(raw);
    const words = countWords(clean);
    const durationSec = estimateDuration(words, wpm);
    console.log(durationSec);
    break;
  }

  case "estimate": {
    if (!arg1) {
      console.error("Usage: text-utils estimate <file>");
      process.exit(1);
    }
    const raw = readFile(arg1);

    // Try to load calibration from channel config
    let calibration = null;
    try {
      const channelConfig = loadChannelConfig();
      calibration = channelConfig.tts?.calibration ?? null;
    } catch {
      // No channel config available — use defaults
    }

    // Predict using full duration predictor
    const prediction = predictDuration(raw, calibration);
    const spokenWords = countSpokenWords(raw);

    console.log(`\n── Duration Estimate: ${path.basename(arg1)} ──\n`);
    console.log(formatEstimate(prediction));

    if (calibration && calibration.sampleCount >= 3) {
      console.log(
        `\n  Calibrated from ${calibration.sampleCount} TTS samples (last: ${calibration.lastCalibratedAt?.split("T")[0]})`
      );
    } else if (calibration) {
      console.log(
        `\n  Partially calibrated (${calibration.sampleCount}/3 samples). Run more TTS to improve accuracy.`
      );
    } else {
      console.log(
        `\n  Using default estimates. Run 'npm run tts' to auto-calibrate.`
      );
    }

    // If there's a target in arg2, compare
    if (arg2) {
      const target = parseInt(arg2, 10);
      if (!isNaN(target) && target > 0) {
        const rec = recommendSpeed(prediction.totalEstimate, target);
        console.log(
          `\n  Target: ${formatDuration(target)} → ${rec.reason}`
        );
      }
    }

    console.log("");
    break;
  }

  case "budget": {
    if (!arg1) {
      console.error("Usage: text-utils budget <target-seconds>");
      process.exit(1);
    }
    const targetSec = parseInt(arg1, 10);
    if (isNaN(targetSec) || targetSec <= 0) {
      console.error(`Invalid target duration: ${arg1}`);
      process.exit(1);
    }

    // Try to load calibration
    let calibration = null;
    try {
      const channelConfig = loadChannelConfig();
      calibration = channelConfig.tts?.calibration ?? null;
    } catch {
      // No channel config — use defaults
    }

    const budget = wordBudgetForDuration(targetSec, calibration);

    console.log(`\n── Word Budget for ${formatDuration(targetSec)} ──\n`);
    console.log(`  Target duration:  ${formatDuration(targetSec)} (${targetSec}s)`);
    console.log(`  WPM:              ${budget.wpmUsed}${calibration ? " (calibrated)" : " (default)"}`);
    console.log(`  Pause budget:     ${budget.pauseBudget.toFixed(1)}s`);
    console.log(`  ─────────────────────────`);
    console.log(`  Max spoken words: ${budget.maxWords}`);
    console.log("");
    break;
  }

  default: {
    console.error(`Unknown command: ${command}`);
    console.error(
      "Valid commands: wordcount, stats, duration, estimate, budget"
    );
    process.exit(1);
  }
}
