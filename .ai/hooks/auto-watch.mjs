#!/usr/bin/env node
// PostToolUse hook for Bash. After any render (npm run render / preview-scene / showcase,
// or a direct `remotion render ... <file>.mp4`), runs `npm run watch` on the output and
// hands the report to the model, so no rendered clip is shown to the user unreviewed.
// Every analysis folder is registered in .cache/watch-dirs.txt for clean-watch.mjs.

import { readFileSync, existsSync, readdirSync, mkdirSync, appendFileSync, statSync } from "node:fs";
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

function videosDir() {
  const ch = path.join(root, "channels");
  if (!existsSync(ch)) return null;
  const c = readdirSync(ch, { withFileTypes: true }).find((d) => d.isDirectory() && !d.name.startsWith("."));
  return c ? path.join(ch, c.name, "videos") : null;
}

const targets = [];
let m;
if ((m = cmd.match(/remotion\s+render\b[^|;&\n]*?\s(\S+\.mp4)\b/))) targets.push(path.resolve(cwd, m[1]));
if ((m = cmd.match(/npm\s+run\s+render\s+(?:--\s+)?([a-z0-9-]+)/)) && videosDir()) targets.push(path.join(videosDir(), m[1], "production", "output", "final.mp4"));
if ((m = cmd.match(/npm\s+run\s+preview-scene\s+(?:--\s+)?([a-z0-9-]+)\s+([a-z0-9-]+)/)) && videosDir()) targets.push(path.join(videosDir(), m[1], "production", "previews", `${m[2]}.mp4`));
if (/npm\s+run\s+showcase\b/.test(cmd) && !/--stills/.test(cmd)) {
  const out = cmd.match(/--out\s+(\S+\.mp4)/);
  targets.push(out ? path.resolve(cwd, out[1]) : path.resolve(root, "..", "work", "catalog-showcase.mp4"));
}
if (targets.length === 0) process.exit(0);

const started = Date.now() - 15 * 60 * 1000;
const reports = [];
for (const video of targets) {
  if (!existsSync(video) || statSync(video).mtimeMs < started) continue;
  const r = spawnSync("npx", ["tsx", "src/scripts/watch.ts", video], { cwd: root, encoding: "utf8", timeout: 15 * 60 * 1000 });
  const dir = video.replace(/\.[^.]+$/, "") + ".watch";
  mkdirSync(path.join(root, ".cache"), { recursive: true });
  appendFileSync(path.join(root, ".cache", "watch-dirs.txt"), `${dir}\n`);
  const text = (r.stdout || r.stderr || "").trim().split("\n").filter((l) => !l.startsWith(">")).join("\n");
  reports.push(`Auto-watch of ${video}:\n${text}`);
}
if (reports.length === 0) process.exit(0);

const note =
  "\n\nReview the report and the key frames at full resolution before showing this clip to the user " +
  "(design-system skill). Any periodic motion, hold or near-blank frame listed above must be fixed or explained.";
process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: reports.join("\n\n") + note } }));
process.exit(0);
