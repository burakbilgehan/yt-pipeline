/**
 * .ai/ → .claude/ + .opencode/ sync script
 *
 * Single source of truth: .ai/agents/ and .ai/commands/
 * Generated (read-only): .claude/agents/, .claude/commands/, .opencode/agents/, .opencode/commands/, opencode.json
 *
 * Usage: npx tsx .ai/sync.ts
 */

import fs from "fs";
import path from "path";

const ROOT = path.resolve(import.meta.dirname, "..");
const AI_DIR = path.join(ROOT, ".ai");
const CLAUDE_DIR = path.join(ROOT, ".claude");
const OPENCODE_DIR = path.join(ROOT, ".opencode");

const AUTO_GENERATED_HEADER = `<!-- AUTO-GENERATED from .ai/ — DO NOT EDIT. Run "npm run sync-ai" to regenerate. -->`;

// ── Frontmatter parsing ──────────────────────────────────────────────

interface ParsedFile {
  frontmatter: Record<string, unknown>;
  body: string;
}

function parseFrontmatter(content: string): ParsedFile {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const fm: Record<string, unknown> = {};
  const lines = match[1].split("\n");
  for (const line of lines) {
    const kvMatch = line.match(/^(\w+):\s*(.+)$/);
    if (kvMatch) {
      const [, key, value] = kvMatch;
      // Parse arrays like [Read, Write, Edit]
      if (value.startsWith("[") && value.endsWith("]")) {
        fm[key] = value
          .slice(1, -1)
          .split(",")
          .map((s) => s.trim());
      } else {
        fm[key] = value.replace(/^["']|["']$/g, "");
      }
    }
  }
  return { frontmatter: fm, body: match[2] };
}

// ── Claude format ────────────────────────────────────────────────────

function toClaudeAgent(parsed: ParsedFile, filename: string): string {
  const name = filename.replace(".md", "");
  const desc = parsed.frontmatter.description || "";
  const tools = Array.isArray(parsed.frontmatter.tools)
    ? (parsed.frontmatter.tools as string[]).join(", ")
    : "";

  return `---
name: ${name}
description: ${desc}
tools: ${tools}
---
${AUTO_GENERATED_HEADER}
${parsed.body}`;
}

function toClaudeCommand(parsed: ParsedFile): string {
  const desc = parsed.frontmatter.description || "";
  // Claude commands don't use agent field, they use @agent-name in body
  // We strip the agent field and add @subagent invocation prefix if agent is specified
  const agent = parsed.frontmatter.agent as string | undefined;
  let body = parsed.body;

  // If the body doesn't already reference the agent with @, we don't force it
  // The body is the canonical source

  return `---
description: ${desc}
---
${AUTO_GENERATED_HEADER}
${body}`;
}

// ── OpenCode format ──────────────────────────────────────────────────

function toOpenCodeAgent(parsed: ParsedFile): string {
  const desc = parsed.frontmatter.description || "";
  const tools = Array.isArray(parsed.frontmatter.tools)
    ? (parsed.frontmatter.tools as string[])
    : [];

  // Respect mode from frontmatter (default: subagent)
  const mode = (parsed.frontmatter.mode as string) || "subagent";

  // OpenCode uses a subset of tools as boolean flags
  const toolMap: Record<string, string> = {
    Read: "read",
    Write: "write",
    Edit: "edit",
    Bash: "bash",
    WebFetch: "webfetch",
    WebSearch: "websearch",
  };

  const toolLines = tools
    .map((t) => toolMap[t])
    .filter(Boolean)
    .map((t) => `  ${t}: true`)
    .join("\n");

  return `---
description: "${desc}"
mode: ${mode}
tools:
${toolLines}
---
${AUTO_GENERATED_HEADER}
${parsed.body}`;
}

function toOpenCodeCommand(parsed: ParsedFile): string {
  const desc = parsed.frontmatter.description || "";
  const agent = parsed.frontmatter.agent || "";

  let header = `---\ndescription: ${desc}`;
  if (agent) {
    header += `\nagent: ${agent}`;
  }
  header += `\n---\n${AUTO_GENERATED_HEADER}\n`;

  return header + parsed.body;
}

// ── OpenCode config (opencode.json) ──────────────────────────────────

function generateOpenCodeJson(
  agentFiles: { filename: string; parsed: ParsedFile }[]
): string {
  const SYNC_RULE = `CRITICAL: After editing any file under .ai/agents/ or .ai/commands/, you MUST run "npx tsx .ai/sync.ts" to regenerate .claude/ and .opencode/ directories. Never edit files in .claude/ or .opencode/ directly — they are auto-generated and will be overwritten.`;

  const agents: Record<string, unknown> = {
    build: {
      mode: "primary",
      prompt: `You are part of the yt-pipeline YouTube channel factory framework. You help build and implement the video production pipeline. All conversation is in Turkish, but YouTube content is in English. Use TypeScript everywhere. Follow the architecture defined in agents-plan.md.\n\n${SYNC_RULE}`,
    },
    plan: {
      mode: "primary",
      prompt: `You are part of the yt-pipeline YouTube channel factory framework. Analyze, plan, and suggest without making changes. All conversation is in Turkish. Follow the architecture defined in agents-plan.md.\n\n${SYNC_RULE}`,
    },
  };

  for (const { filename, parsed } of agentFiles) {
    const name = filename.replace(".md", "");
    const declaredMode = (parsed.frontmatter.mode as string) || "subagent";

    if (declaredMode === "primary") {
      // Primary agents get their full prompt loaded inline
      agents[name] = {
        description: parsed.frontmatter.description,
        mode: "primary",
        prompt: `{file:.opencode/agents/${filename}}\n\n${SYNC_RULE}`,
      };
    } else {
      agents[name] = {
        description: parsed.frontmatter.description,
        mode: "subagent",
        prompt: `{file:.opencode/agents/${filename}}`,
      };
    }
  }

  const config = {
    $schema: "https://opencode.ai/config.json",
    agent: agents,
  };

  return JSON.stringify(config, null, 2) + "\n";
}

// ── Main sync ────────────────────────────────────────────────────────

function syncDir(subdir: "agents" | "commands") {
  const sourceDir = path.join(AI_DIR, subdir);
  const claudeDir = path.join(CLAUDE_DIR, subdir);
  const opencodeDir = path.join(OPENCODE_DIR, subdir);

  // Ensure target dirs exist
  fs.mkdirSync(claudeDir, { recursive: true });
  fs.mkdirSync(opencodeDir, { recursive: true });

  const files = fs
    .readdirSync(sourceDir)
    .filter((f) => f.endsWith(".md"));

  const results: { filename: string; parsed: ParsedFile }[] = [];

  for (const filename of files) {
    const content = fs.readFileSync(path.join(sourceDir, filename), "utf-8");
    const parsed = parseFrontmatter(content);
    results.push({ filename, parsed });

    let claudeContent: string;
    let opencodeContent: string;

    if (subdir === "agents") {
      claudeContent = toClaudeAgent(parsed, filename);
      opencodeContent = toOpenCodeAgent(parsed);
    } else {
      claudeContent = toClaudeCommand(parsed);
      opencodeContent = toOpenCodeCommand(parsed);
    }

    fs.writeFileSync(path.join(claudeDir, filename), claudeContent);
    fs.writeFileSync(path.join(opencodeDir, filename), opencodeContent);
  }

  // Clean up files in targets that don't exist in source
  for (const dir of [claudeDir, opencodeDir]) {
    const existing = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
    for (const f of existing) {
      if (!files.includes(f)) {
        fs.unlinkSync(path.join(dir, f));
        console.log(`  Removed orphan: ${path.relative(ROOT, path.join(dir, f))}`);
      }
    }
  }

  return results;
}

function main() {
  console.log("Syncing .ai/ → .claude/ + .opencode/\n");

  console.log("Agents:");
  const agentResults = syncDir("agents");
  for (const { filename } of agentResults) {
    console.log(`  ✓ ${filename}`);
  }

  console.log("\nCommands:");
  const commandResults = syncDir("commands");
  for (const { filename } of commandResults) {
    console.log(`  ✓ ${filename}`);
  }

  // Generate opencode.json
  const opencodeJson = generateOpenCodeJson(agentResults);
  fs.writeFileSync(path.join(ROOT, "opencode.json"), opencodeJson);
  console.log("\n✓ opencode.json");

  console.log("\nSync complete.");
}

main();
