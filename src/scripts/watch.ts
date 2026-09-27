/**
 * "Watch" a rendered video the way a reviewer would, deterministically, and check it against
 * the watch rules (templates/pipeline-defaults.json `watch`). Exits 1 on any violation.
 * Analysis and rules: src/pipeline/watch.ts.
 *
 * Usage: npm run watch -- <video.mp4> [--hold 3] [--out <dir>] [--max <n>] [--ignore <from>-<to>]...
 *        npm run watch -- <video.mp4> --padding       a full MainVideo-style render: skips the dark padding at both ends
 *        npm run watch -- <video.mp4> --slug <slug>   final.mp4 of a project: implies --padding, writes the gate verdict
 *        npm run watch -- <video.mp4> --clean         delete the analysis folder after the review
 * Output: <dir>/report.txt, <dir>/sheet.jpg, <dir>/key/<time>.png (full resolution)
 */
import fs from "node:fs";
import path from "node:path";
import { publishPaths } from "../pipeline/publish.js";
import { sceneSpans, watchDir, watchVideo, writeVerdict, type Range } from "../pipeline/watch.js";

function arg(name: string, def?: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : def;
}

async function main() {
  const video = process.argv[2];
  if (!video || !fs.existsSync(video)) {
    console.error("Usage: npm run watch -- <video.mp4> [--hold 3] [--out <dir>] [--ignore <from>-<to>] [--slug <slug>]");
    process.exit(1);
  }
  const out = path.resolve(arg("--out", watchDir(video))!);
  if (process.argv.includes("--clean")) {
    fs.rmSync(out, { recursive: true, force: true });
    console.log(`removed ${out}`);
    return;
  }
  const slug = arg("--slug");
  if (slug && path.resolve(video) !== path.resolve(publishPaths(slug).video)) {
    console.error(`--slug ${slug}: the video must be ${publishPaths(slug).video}`);
    process.exit(1);
  }
  if (slug && process.argv.includes("--ignore")) {
    console.error("--slug writes the publishing verdict, so nothing may be exempted: drop --ignore (only the user can override the watch gate, at upload)");
    process.exit(1);
  }
  const ignore: Range[] = [];
  process.argv.forEach((a, i) => {
    if (a !== "--ignore") return;
    const m = (process.argv[i + 1] ?? "").match(/^([\d.]+)-([\d.]+|end)$/);
    if (!m) throw new Error(`--ignore needs <from>-<to> in seconds, got "${process.argv[i + 1] ?? ""}"`);
    ignore.push([Number(m[1]), m[2] === "end" ? Infinity : Number(m[2])]);
  });

  const { lines, violations, rules } = await watchVideo(video, {
    out,
    reportHoldSec: Number(arg("--hold", "3")),
    maxKeys: Number(arg("--max", "100000")),
    ignore,
    padding: !!slug || process.argv.includes("--padding"),
    scenes: slug ? (fps) => sceneSpans(slug, fps) : undefined,
  });
  if (slug) writeVerdict(slug, rules, violations);
  console.log(lines.join("\n"));
  if (violations.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
