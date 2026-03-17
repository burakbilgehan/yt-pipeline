/**
 * Text Utilities
 *
 * Utility functions for analyzing voiceover scripts and markdown content.
 *
 * Usage:
 *   npx tsx src/scripts/text-utils.ts wordcount <file>
 *   npx tsx src/scripts/text-utils.ts stats <file>
 *   npx tsx src/scripts/text-utils.ts duration <file> [wpm]
 *
 * Commands:
 *   wordcount  Print just the word count
 *   stats      Print word count, sentence count, estimated duration
 *   duration   Estimate voiceover duration in seconds (default wpm: 150)
 */

import * as fs from "node:fs";
import * as path from "node:path";

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
 * Estimate voiceover duration in seconds.
 */
function estimateDuration(wordCount: number, wpm: number = DEFAULT_WPM): number {
  return Math.round((wordCount / wpm) * 60);
}

/**
 * Format seconds as mm:ss
 */
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
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

const [, , command, filePath, wpmArg] = process.argv;

if (!command || !filePath) {
  console.log(`Usage:
  npx tsx src/scripts/text-utils.ts wordcount <file>
  npx tsx src/scripts/text-utils.ts stats <file>
  npx tsx src/scripts/text-utils.ts duration <file> [wpm]`);
  process.exit(0);
}

const raw = readFile(filePath);
const clean = stripMarkdown(raw);
const words = countWords(clean);

switch (command) {
  case "wordcount": {
    console.log(words);
    break;
  }

  case "stats": {
    const sentences = countSentences(clean);
    const durationSec = estimateDuration(words);
    console.log(`File:      ${path.basename(filePath)}`);
    console.log(`Words:     ${words}`);
    console.log(`Sentences: ${sentences}`);
    console.log(`Duration:  ~${formatDuration(durationSec)} (@ ${DEFAULT_WPM} wpm)`);
    break;
  }

  case "duration": {
    const wpm = wpmArg ? parseInt(wpmArg, 10) : DEFAULT_WPM;
    if (isNaN(wpm) || wpm <= 0) {
      console.error(`Invalid wpm: ${wpmArg}`);
      process.exit(1);
    }
    const durationSec = estimateDuration(words, wpm);
    console.log(durationSec);
    break;
  }

  default: {
    console.error(`Unknown command: ${command}`);
    console.error("Valid commands: wordcount, stats, duration");
    process.exit(1);
  }
}
