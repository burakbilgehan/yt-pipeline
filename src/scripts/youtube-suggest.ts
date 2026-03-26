/**
 * YouTube Suggest Script
 *
 * Fetches YouTube autocomplete suggestions for keyword research.
 * Uses the free Google suggest API — no API key required.
 *
 * Usage:
 *   npm run suggest "most expensive"
 *   npm run suggest "world statistics" --expand
 *   npm run suggest "gold price" --save <slug>
 *
 * --expand: Also fetches suggestions with alphabet suffixes (a-z)
 * --save <slug>: Save results to project research dir
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { ensureProjectDir } from "../utils/project.js";
import type { YouTubeSuggestion } from "../types/index.js";

const SUGGEST_URL =
  "https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=";

async function fetchSuggestions(query: string): Promise<string[]> {
  const url = `${SUGGEST_URL}${encodeURIComponent(query)}`;

  const res = await fetch(url);
  const text = await res.text();

  // Response is JSONP-like: window.google.ac.h([...])
  // Extract the JSON array
  const match = text.match(/\[.+\]/s);
  if (!match) return [];

  try {
    const parsed = JSON.parse(match[0]);
    // Structure: [[query, [[suggestion1, 0], [suggestion2, 0], ...]], ...]
    if (Array.isArray(parsed) && parsed.length > 1 && Array.isArray(parsed[1])) {
      return parsed[1].map((item: unknown[]) => String(item[0]));
    }
  } catch {
    // fallback
  }
  return [];
}

async function main() {
  const args = process.argv.slice(2);
  const expand = args.includes("--expand");
  const saveIdx = args.indexOf("--save");
  const saveSlug = saveIdx >= 0 ? args[saveIdx + 1] : null;

  // Get the query (first non-flag argument)
  const query = args.find((a) => !a.startsWith("--") && a !== saveSlug);

  if (!query) {
    console.error("Usage: npm run suggest <query> [--expand] [--save <slug>]");
    console.error('  Example: npm run suggest "most expensive"');
    process.exit(1);
  }

  console.log(`Fetching YouTube suggestions for: "${query}"`);
  console.log("─".repeat(50));

  // Base suggestions
  const baseSuggestions = await fetchSuggestions(query);

  const allResults: YouTubeSuggestion[] = [
    {
      query,
      suggestions: baseSuggestions,
      fetchedAt: new Date().toISOString(),
    },
  ];

  console.log(`\n"${query}" → ${baseSuggestions.length} suggestions:`);
  for (const s of baseSuggestions) {
    console.log(`  • ${s}`);
  }

  // Expanded suggestions (query + a, query + b, ...)
  if (expand) {
    console.log(`\nExpanding with alphabet suffixes...`);
    const alphabet = "abcdefghijklmnopqrstuvwxyz".split("");
    const uniqueSuggestions = new Set(baseSuggestions);

    for (const letter of alphabet) {
      const expandedQuery = `${query} ${letter}`;
      const suggestions = await fetchSuggestions(expandedQuery);
      const newOnes = suggestions.filter((s) => !uniqueSuggestions.has(s));

      if (newOnes.length > 0) {
        console.log(`  "${expandedQuery}" → ${newOnes.length} new:`);
        for (const s of newOnes) {
          console.log(`    • ${s}`);
          uniqueSuggestions.add(s);
        }
      }

      allResults.push({
        query: expandedQuery,
        suggestions,
        fetchedAt: new Date().toISOString(),
      });

      // Small delay to be polite
      await new Promise((r) => setTimeout(r, 100));
    }

    console.log(`\nTotal unique suggestions: ${uniqueSuggestions.size}`);
  }

  // Save to project if requested
  if (saveSlug) {
    const researchDir = ensureProjectDir(saveSlug, "research");
    const filename = `youtube-suggest-${query.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.json`;
    const savePath = path.join(researchDir, filename);

    const saveData = {
      fetchedAt: new Date().toISOString(),
      baseQuery: query,
      expanded: expand,
      results: allResults,
      totalUniqueSuggestions: [
        ...new Set(allResults.flatMap((r) => r.suggestions)),
      ].length,
    };

    fs.writeFileSync(savePath, JSON.stringify(saveData, null, 2));
    console.log(`\nSaved to: ${savePath}`);
  }
}

main().catch((err) => {
  console.error("Failed:", err.message || err);
  process.exit(1);
});
