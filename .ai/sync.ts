/**
 * .ai/ → .claude/ + .opencode/ sync script
 *
 * Single source of truth: .ai/agents/, .ai/commands/, .ai/skills/
 * Generated (read-only): .claude/agents/, .claude/commands/, .claude/skills/, .opencode/agents/, .opencode/commands/, opencode.json
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

// ── Skill content loading ────────────────────────────────────────────

function loadSkillContent(skillName: string): string | null {
  const skillPath = path.join(AI_DIR, "skills", skillName, "SKILL.md");
  if (!fs.existsSync(skillPath)) {
    console.warn(`  ⚠ Skill "${skillName}" not found at ${skillPath}`);
    return null;
  }
  return fs.readFileSync(skillPath, "utf-8");
}

function buildSkillsSection(skillNames: string[]): string {
  const sections: string[] = [];
  for (const name of skillNames) {
    const content = loadSkillContent(name);
    if (content) {
      sections.push(`<skill name="${name}">\n${content}\n</skill>`);
    }
  }
  if (sections.length === 0) return "";
  return `\n\n---\n\n## Preloaded Skills\n\n${sections.join("\n\n")}`;
}

// ── Claude format ────────────────────────────────────────────────────

function toClaudeAgent(parsed: ParsedFile, filename: string): string {
  const name = filename.replace(".md", "");
  const desc = parsed.frontmatter.description || "";
  const tools = Array.isArray(parsed.frontmatter.tools)
    ? (parsed.frontmatter.tools as string[]).join(", ")
    : "";
  const skills = Array.isArray(parsed.frontmatter.skills)
    ? (parsed.frontmatter.skills as string[])
    : [];

  const skillsSection = buildSkillsSection(skills);

  return `---
name: ${name}
description: ${desc}
tools: ${tools}
---
${AUTO_GENERATED_HEADER}
${parsed.body}${skillsSection}`;
}

function toClaudeCommand(parsed: ParsedFile): string {
  const desc = parsed.frontmatter.description || "";
  const body = parsed.body;

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
  const skills = Array.isArray(parsed.frontmatter.skills)
    ? (parsed.frontmatter.skills as string[])
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

  const skillsSection = buildSkillsSection(skills);

  return `---
description: "${desc}"
mode: ${mode}
tools:
${toolLines}
---
${AUTO_GENERATED_HEADER}
${parsed.body}${skillsSection}`;
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
      prompt: `You are part of the yt-pipeline YouTube channel factory framework. You help build and implement the video production pipeline. All conversation is in Turkish, but YouTube content is in English. Use TypeScript everywhere. Follow the architecture defined in AGENTS.md.\n\n${SYNC_RULE}`,
    },
    plan: {
      mode: "primary",
      prompt: `You are part of the yt-pipeline YouTube channel factory framework. Analyze, plan, and suggest without making changes. All conversation is in Turkish. Follow the architecture defined in AGENTS.md.\n\n${SYNC_RULE}`,
    },
  };

  for (const { filename, parsed } of agentFiles) {
    const name = filename.replace(".md", "");
    const declaredMode = (parsed.frontmatter.mode as string) || "subagent";

    if (declaredMode === "primary") {
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

// ── Skills sync ──────────────────────────────────────────────────────

function syncSkills() {
  const sourceDir = path.join(AI_DIR, "skills");
  const claudeSkillsDir = path.join(CLAUDE_DIR, "skills");

  if (!fs.existsSync(sourceDir)) {
    console.log("Skills: no .ai/skills/ directory, skipping");
    return;
  }

  // Ensure target dir exists
  fs.mkdirSync(claudeSkillsDir, { recursive: true });

  const skillDirs = fs
    .readdirSync(sourceDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const synced: string[] = [];

  for (const skillName of skillDirs) {
    const srcSkillDir = path.join(sourceDir, skillName);
    const destSkillDir = path.join(claudeSkillsDir, skillName);

    // Check for SKILL.md
    const skillFile = path.join(srcSkillDir, "SKILL.md");
    if (!fs.existsSync(skillFile)) {
      console.warn(`  ⚠ Skipping ${skillName} — no SKILL.md`);
      continue;
    }

    // Ensure dest dir exists
    fs.mkdirSync(destSkillDir, { recursive: true });

    // Copy all files in the skill directory
    const files = fs.readdirSync(srcSkillDir);
    for (const file of files) {
      const srcFile = path.join(srcSkillDir, file);
      const destFile = path.join(destSkillDir, file);
      const stat = fs.statSync(srcFile);
      if (stat.isFile()) {
        const content = fs.readFileSync(srcFile, "utf-8");
        // Add auto-generated header to SKILL.md only
        if (file === "SKILL.md") {
          fs.writeFileSync(
            destFile,
            `${AUTO_GENERATED_HEADER}\n\n${content}`
          );
        } else {
          fs.writeFileSync(destFile, content);
        }
      }
    }

    synced.push(skillName);
  }

  // Clean up skill dirs in claude that don't exist in source
  // But skip skills that aren't from .ai/ (like remotion-best-practices which lives directly in .claude/)
  const existingClaudeSkills = fs.existsSync(claudeSkillsDir)
    ? fs
        .readdirSync(claudeSkillsDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
    : [];

  for (const existing of existingClaudeSkills) {
    if (!skillDirs.includes(existing)) {
      // Check if this skill has the auto-generated header — only remove if it was synced by us
      const existingSkillFile = path.join(
        claudeSkillsDir,
        existing,
        "SKILL.md"
      );
      if (fs.existsSync(existingSkillFile)) {
        const content = fs.readFileSync(existingSkillFile, "utf-8");
        if (content.startsWith(AUTO_GENERATED_HEADER)) {
          fs.rmSync(path.join(claudeSkillsDir, existing), { recursive: true });
          console.log(`  Removed orphan skill: ${existing}`);
        }
      }
    }
  }

  for (const s of synced) {
    console.log(`  ✓ ${s}`);
  }
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

  console.log("\nSkills:");
  syncSkills();

  // Generate opencode.json
  const opencodeJson = generateOpenCodeJson(agentResults);
  fs.writeFileSync(path.join(ROOT, "opencode.json"), opencodeJson);
  console.log("\n✓ opencode.json");

  console.log("\nSync complete.");
}

main();
