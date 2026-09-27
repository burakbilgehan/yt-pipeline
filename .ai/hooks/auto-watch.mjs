#!/usr/bin/env node
// PostToolUse hook for Bash. After a render that does not watch itself (npm run showcase, or a
// direct `remotion render ... <file>.mp4`), runs `npm run watch` on the output and hands the
// report to the model, so no rendered clip is shown to the user unreviewed. `npm run render` and
// `npm run preview-scene` run the watch gate themselves (src/pipeline/watch.ts) and print the report.
// Every analysis folder is registered in .cache/watch-dirs.txt for clean-watch.mjs.

import { readFileSync, existsSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

let input;
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}
const cmd = String(input?.tool_input?.command ?? "");
const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const cwd = input?.cwd || root;

// [video, extra watch args]; the showcase is a padded CatalogVideo like MainVideo.
const targets = [];
let m;
if ((m = cmd.match(/remotion\s+render\b[^|;&\n]*?\s(\S+\.mp4)\b/))) targets.push([path.resolve(cwd, m[1]), []]);
if (/npm\s+run\s+showcase\b/.test(cmd) && !/--stills/.test(cmd)) {
  const out = cmd.match(/--out\s+(\S+\.mp4)/);
  targets.push([out ? path.resolve(cwd, out[1]) : path.resolve(root, "..", "work", "catalog-showcase.mp4"), ["--padding"]]);
}
if (targets.length === 0) process.exit(0);

const started = Date.now() - 15 * 60 * 1000;
const reports = [];
for (const [video, extra] of targets) {
  if (!existsSync(video) || statSync(video).mtimeMs < started) continue;
  const r = spawnSync("npx", ["tsx", "src/scripts/watch.ts", video, ...extra], { cwd: root, encoding: "utf8", timeout: 15 * 60 * 1000 });
  const text = (r.stdout || r.stderr || "").trim().split("\n").filter((l) => !l.startsWith(">")).join("\n");
  reports.push(`Auto-watch of ${video}:\n${text}`);
}
if (reports.length === 0) process.exit(0);

const note =
  "\n\nReview the report and the key frames at full resolution before showing this clip to the user " +
  "(design-system skill). Every violation listed above must be fixed.";
process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: reports.join("\n\n") + note } }));
process.exit(0);
