#!/usr/bin/env node
// Stop hook. Deletes analysis folders made by auto-watch.mjs once they are older than one hour,
// so review frames never pile up. Registry: .cache/watch-dirs.txt.

import { readFileSync, writeFileSync, existsSync, statSync, rmSync } from "node:fs";
import path from "node:path";

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const reg = path.join(root, ".cache", "watch-dirs.txt");
if (!existsSync(reg)) process.exit(0);

const maxAge = 60 * 60 * 1000;
const keep = [];
for (const dir of new Set(readFileSync(reg, "utf8").split("\n").filter(Boolean))) {
  if (!existsSync(dir)) continue;
  if (!dir.endsWith(".watch")) continue;
  if (Date.now() - statSync(dir).mtimeMs > maxAge) rmSync(dir, { recursive: true, force: true });
  else keep.push(dir);
}
writeFileSync(reg, keep.length ? keep.join("\n") + "\n" : "");
process.exit(0);
