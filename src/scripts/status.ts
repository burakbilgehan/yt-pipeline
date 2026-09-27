/**
 * Status of a layout-2 project: one line per block, totals against the target length,
 * stale audio, open feedback. Read-only.
 *
 * Duration column: measured audio duration when the block's audio is current,
 * otherwise a prediction (marked "~") from the calibrated WPM in channel-config.
 *
 * Usage: npm run status -- <slug> [--block <id>]
 */

import fs from "node:fs";
import path from "node:path";
import { loadChannelConfig, loadProjectConfig } from "../utils/project.js";
import { countSpokenWords, predictDuration } from "../utils/duration-predictor.js";
import {
  assertLayout2,
  audioHash,
  loadManifest,
  loadNarration,
  loadTTSSettings,
  loadVisual,
  orderedBlocks,
  paths,
} from "../pipeline/v2.js";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

function main() {
  const slug = process.argv[2];
  const only = process.argv.includes("--block") ? process.argv[process.argv.indexOf("--block") + 1] : undefined;
  if (!slug) {
    console.error("Usage: npm run status -- <slug> [--block <id>]");
    process.exit(1);
  }
  assertLayout2(slug);
  const p = paths(slug);
  const config = loadProjectConfig(slug) as any;
  const calibration = (loadChannelConfig() as any).tts?.calibration ?? null;
  const tts = loadTTSSettings(slug);
  const manifest = loadManifest(slug);
  const feedbackFile = path.join(p.root, "feedback", "feedback.json");
  const feedback: any[] = fs.existsSync(feedbackFile) ? JSON.parse(fs.readFileSync(feedbackFile, "utf8")).items : [];
  const openByBlock = new Map<string, number>();
  for (const f of feedback.filter((f) => f.status === "open")) openByBlock.set(f.block, (openByBlock.get(f.block) ?? 0) + 1);

  if (!fs.existsSync(p.order)) {
    console.log(`${slug}: no script yet (script/order.json missing).`);
    return;
  }
  const blocks = orderedBlocks(slug);
  let total = 0;
  const stale: string[] = [];
  blocks.forEach(({ id, section }, i) => {
    const text = fs.existsSync(p.block(id)) ? loadNarration(slug, id) : "";
    const current = text && manifest.blocks[id]?.hash === audioHash(text, tts);
    if (!current) stale.push(id);
    const hold = fs.existsSync(p.visual(id)) ? loadVisual(slug, id).holdSec : 0;
    const speech = current ? manifest.blocks[id].duration : predictDuration(text, calibration).totalEstimate;
    const dur = speech + hold;
    total += dur;
    if (only && only !== id) return;
    const visual = fs.existsSync(p.visual(id)) ? "" : "  NO VISUAL";
    const fb = openByBlock.get(id) ? `  feedback:${openByBlock.get(id)}` : "";
    console.log(
      `${String(i + 1).padStart(2, "0")} ${id.padEnd(28)} ${String(countSpokenWords(text)).padStart(4)}w ${(current ? " " : "~") + dur.toFixed(1).padStart(6)}s  ${section}${visual}${fb}`,
    );
    if (only) console.log(`\n${text}\n`);
  });
  const target = config.metadata?.targetLength ?? 0;
  const delta = target ? ` (target ${fmt(target)}, ${total >= target ? "+" : ""}${(((total - target) / target) * 100).toFixed(0)}%)` : "";
  console.log(`\n${blocks.length} blocks, ${fmt(total)}${delta}`);
  if (stale.length) console.log(`audio missing or out of date: ${stale.join(", ")}`);
  if (openByBlock.size) console.log(`open feedback: ${[...openByBlock.values()].reduce((a, b) => a + b, 0)} (npm run feedback -- ${slug} list)`);
}

main();
