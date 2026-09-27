#!/usr/bin/env node
// UserPromptSubmit hook. Detects frustration (profanity, "saçma", "yine mi")
// in the user's prompt and injects a reminder to run the lesson protocol
// defined in AGENTS.md > "Learning from the user". The rule text lives there;
// this hook only points at it.

import { readFileSync } from "node:fs";

const SIGNALS = [
  /(?<![\p{L}\p{N}])(amk|aq|amq|amına|amina|siktir|sikeyim|sikim|sktr|orospu|piç|pic|yarrak|yarak|göt|lan|ulan|mk)(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}\p{N}])(saçma|sacma|saçmalık|sacmalik|salak|aptal|gerizekalı|gerizekali|rezalet|berbat)(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}\p{N}])(yine mi|kaç kere|kac kere|kaçıncı|kacinci|ne yapıyorsun|ne yapiyorsun|bunu istemedim|demedim mi|dedim ya)(?![\p{L}\p{N}])/iu,
];

let input;
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}

const prompt = String(input?.prompt ?? "");
if (!SIGNALS.some((re) => re.test(prompt))) process.exit(0);

const context =
  "HIGH SIGNAL: the user is frustrated. Follow AGENTS.md > \"Learning from the user\" " +
  "in this turn: name the inefficiency or error, fix it, and turn it into a rule in its single owner file.";

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: context },
  }),
);
process.exit(0);
