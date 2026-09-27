/**
 * Consistency check for the AI harness. Run after every harness change.
 *
 * Scope: AGENTS.md, CLAUDE.md, .ai/agents, .ai/skills (vendored remotion-best-practices excluded), .ai/hooks.
 *   1. No em dash (user rule).
 *   2. Every `npm run <x>` exists in package.json.
 *   3. Every referenced repo path (src/, templates/, .ai/, .claude/) exists.
 *   4. Every skill named in an agent's `skills:` and every `<name>` skill reference exists.
 *   5. Skill frontmatter: name equals directory, description present.
 *   6. No rule sentence (60+ chars) repeated in two files: a rule has one owner.
 *   7. .claude/ and .opencode/ skills are in sync with .ai/skills (run npm run sync-ai).
 *
 * Usage: npm run lint-harness
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const VENDORED = new Set(["remotion-best-practices"]);
const problems: string[] = [];
const rel = (f: string) => path.relative(ROOT, f);

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const skillDirs = fs.readdirSync(path.join(ROOT, ".ai/skills"), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
const files = [
  path.join(ROOT, "AGENTS.md"),
  path.join(ROOT, "CLAUDE.md"),
  ...walk(path.join(ROOT, ".ai/agents")),
  ...skillDirs.filter((s) => !VENDORED.has(s)).flatMap((s) => walk(path.join(ROOT, ".ai/skills", s))),
  ...walk(path.join(ROOT, ".ai/hooks")),
].filter((f) => /\.(md|mjs|ts|json)$/.test(f));

const npmScripts = new Set(Object.keys(JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).scripts));
const sentencesSeen = new Map<string, string>();

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split("\n");

  lines.forEach((line, i) => {
    if (line.includes("—")) problems.push(`${rel(file)}:${i + 1} em dash`);
  });

  for (const m of text.matchAll(/npm run ([a-z0-9:-]+)/g)) {
    if (!npmScripts.has(m[1])) problems.push(`${rel(file)}: unknown npm script "${m[1]}"`);
  }

  for (const m of text.matchAll(/`((?:src|templates|\.ai|\.claude)\/[^`\s*<>]+)`/g)) {
    const target = m[1].replace(/[),.:;]+$/, "");
    if (!fs.existsSync(path.join(ROOT, target))) problems.push(`${rel(file)}: missing path ${target}`);
  }

  for (const m of text.matchAll(/`([a-z0-9-]+)` skill/g)) {
    if (!skillDirs.includes(m[1])) problems.push(`${rel(file)}: unknown skill "${m[1]}"`);
  }
  const fm = text.match(/^---\n([\s\S]*?)\n---/);
  const skillsLine = fm?.[1].match(/^skills:\s*\[(.*)\]/m);
  for (const s of skillsLine?.[1].split(",").map((x) => x.trim()).filter(Boolean) ?? []) {
    if (!skillDirs.includes(s)) problems.push(`${rel(file)}: agent lists unknown skill "${s}"`);
  }

  if (file.endsWith("SKILL.md")) {
    const dir = path.basename(path.dirname(file));
    const name = fm?.[1].match(/^name:\s*(.+)$/m)?.[1].trim();
    const desc = fm?.[1].match(/^description:\s*(.+)$/m)?.[1].trim();
    if (name !== dir) problems.push(`${rel(file)}: frontmatter name "${name}" != directory "${dir}"`);
    if (!desc) problems.push(`${rel(file)}: missing description`);
  }

  if (file.endsWith(".md")) {
    const body = text.replace(/^---\n[\s\S]*?\n---/, "").replace(/```[\s\S]*?```/g, "");
    for (const raw of body.split(/(?<=[.!?])\s+|\n/)) {
      const s = raw.replace(/[*_`>#|-]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
      if (s.length < 60) continue;
      const prev = sentencesSeen.get(s);
      if (prev && prev !== file) problems.push(`duplicate rule in ${rel(prev)} and ${rel(file)}: "${s.slice(0, 80)}..."`);
      else sentencesSeen.set(s, file);
    }
  }
}

for (const s of skillDirs) {
  const src = fs.readFileSync(path.join(ROOT, ".ai/skills", s, "SKILL.md"), "utf8").replace(/^---\n[\s\S]*?\n---\n/, "").trim();
  for (const target of [".claude", ".opencode"]) {
    const gen = path.join(ROOT, target, "skills", s, "SKILL.md");
    if (!fs.existsSync(gen) || !fs.readFileSync(gen, "utf8").includes(src.slice(0, 200))) problems.push(`${target}/skills/${s} out of sync (npm run sync-ai)`);
  }
}
for (const target of [".claude", ".opencode"]) {
  const dir = path.join(ROOT, target, "skills");
  for (const s of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    if (!skillDirs.includes(s)) problems.push(`${target}/skills/${s} has no source in .ai/skills`);
  }
}

if (problems.length === 0) {
  console.log(`lint-harness: OK (${files.length} files)`);
} else {
  for (const p of problems) console.log(p);
  console.log(`lint-harness: ${problems.length} problem(s)`);
  process.exit(1);
}
