#!/usr/bin/env node
// PreToolUse hook for file writes. Confines pipeline subagents to their write scope:
//   researcher      only <project>/research/
//   claim-verifier  nothing (it returns JSON; the research skill records it)
// The main session and other agents are not affected. Exit code 2 blocks the call.

import { readFileSync } from "node:fs";

const SCOPES = {
  researcher: /\/channels\/[^/]+\/videos\/[^/]+\/research\/[^/]/,
  "claim-verifier": null,
};

let input;
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}

const agent = input?.agent_type;
if (!agent || !(agent in SCOPES)) process.exit(0);

const file = input?.tool_input?.file_path ?? input?.tool_input?.notebook_path ?? "";
const scope = SCOPES[agent];
if (scope && scope.test(file) && !file.includes("..")) process.exit(0);

process.stderr.write(`Blocked by .ai/hooks/guard-agent-scope.mjs: ${agent} may not write ${file || "files"}.${scope ? " Its scope is the project's research/ directory." : ""}\n`);
process.exit(2);
