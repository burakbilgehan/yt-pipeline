#!/usr/bin/env node
// PostToolUse hook for Write/Edit. Regenerates .claude/ and .opencode/
// whenever a file under .ai/agents/ or .ai/skills/ changes.
// Hook input arrives as JSON on stdin.

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

let input;
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}

const filePath = input?.tool_input?.file_path ?? "";
if (!/\/\.ai\/(agents|skills)\//.test(filePath)) process.exit(0);

const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const result = spawnSync("npx", ["tsx", ".ai/sync.ts"], { cwd, encoding: "utf8" });
if (result.status !== 0) {
  process.stderr.write(`sync-ai failed:\n${result.stderr || result.stdout}\n`);
  process.exit(2);
}
process.exit(0);
