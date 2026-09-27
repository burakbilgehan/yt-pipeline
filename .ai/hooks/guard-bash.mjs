#!/usr/bin/env node
// PreToolUse hook for Bash. Blocks irreversible or outward-facing commands
// even when they are invoked indirectly (npx tsx, node, bun), which the
// permission deny rules cannot catch on their own. Only execution is blocked;
// reading these files (cat, grep, git diff) is allowed.
// Exit code 2 blocks the tool call and shows stderr to the model.

import { readFileSync } from "node:fs";

// An interpreter or runner followed (anywhere later in the same command) by the script.
const RUN = String.raw`\b(?:tsx|node|bun|deno|ts-node|npx)\b[^|;&\n]*`;

const RULES = [
  { re: new RegExp(RUN + String.raw`youtube-upload(?:\.ts)?\b`), why: "YouTube upload is user-only. Print the command for the user instead." },
  { re: /\bnpm\s+run\s+upload\b/, why: "YouTube upload is user-only. Print the command for the user instead." },
  { re: new RegExp(RUN + String.raw`youtube-update(?:\.ts)?\b`), why: "Changing live YouTube metadata is user-only." },
  { re: /\bnpm\s+run\s+youtube-update\b/, why: "Changing live YouTube metadata is user-only." },
  { re: /\bgit\s+reset\s+--hard\b|\bgit\s+clean\b|\bgit\s+checkout\s+--\s|\bgit\s+restore\b/, why: "Discarding work is user-only." },
  { re: /\brm\s+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r)\b/, why: "rm -rf is blocked. Delete specific files, or ask the user." },
];

// Allowed only after the user confirms in the permission prompt.
const ASK = [
];

let input;
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}

const command = input?.tool_input?.command ?? "";
for (const { re, why } of RULES) {
  if (re.test(command)) {
    process.stderr.write(`Blocked by .ai/hooks/guard-bash.mjs: ${why}\n`);
    process.exit(2);
  }
}
for (const { re, why } of ASK) {
  if (re.test(command)) {
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "ask", permissionDecisionReason: why } }));
    process.exit(0);
  }
}
process.exit(0);
