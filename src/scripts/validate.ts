/**
 * Validate Script
 *
 * Checks version consistency across a video project:
 * - config.json stage versions match actual files on disk
 * - version headers in files match config.json
 * - stale downstream stages (upstream bumped but downstream still references old version)
 * - currentWork is consistent with pipeline statuses
 *
 * Usage:
 *   npm run validate <slug> [--channel <channel-slug>]
 *   npm run validate --all [--channel <channel-slug>]
 *
 * Exit codes:
 *   0 = all checks passed
 *   1 = warnings or errors found
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { ProjectConfig, PipelineStageName } from "../types/index.js";
import { getVideosDir, loadProjectConfig, listProjects } from "../utils/project.js";

// Which file prefix to look for in each stage directory
const STAGE_FILE_MAP: Record<PipelineStageName, { dir: string; prefix: string; ext: string } | null> = {
  research: { dir: "research", prefix: "research", ext: "md" },
  content: { dir: "content", prefix: "script", ext: "md" },
  storyboard: { dir: "storyboard", prefix: "storyboard", ext: "json" },
  production: null, // no single versioned file
  publishing: { dir: "publishing", prefix: "publish-plan", ext: "md" },
  analytics: null, // reports are date-stamped, not versioned
};

// Dependency order: each stage depends on the one(s) before it
const STAGE_ORDER: PipelineStageName[] = ["research", "content", "storyboard", "production", "publishing", "analytics"];

interface ValidationIssue {
  level: "error" | "warning" | "info";
  stage?: PipelineStageName;
  message: string;
}

interface ValidationResult {
  slug: string;
  passed: boolean;
  issues: ValidationIssue[];
}

function fileExistsForVersion(projectDir: string, stage: PipelineStageName, version: number): boolean {
  const mapping = STAGE_FILE_MAP[stage];
  if (!mapping) return true; // no file to check

  const filePath = path.join(projectDir, mapping.dir, `${mapping.prefix}-v${version}.${mapping.ext}`);
  return fs.existsSync(filePath);
}

function getHighestVersionOnDisk(projectDir: string, stage: PipelineStageName): number {
  const mapping = STAGE_FILE_MAP[stage];
  if (!mapping) return 0;

  const dir = path.join(projectDir, mapping.dir);
  if (!fs.existsSync(dir)) return 0;

  const files = fs.readdirSync(dir);
  const pattern = new RegExp(`^${mapping.prefix}-v(\\d+)\\.${mapping.ext}$`);
  let max = 0;
  for (const file of files) {
    const match = file.match(pattern);
    if (match) {
      const v = parseInt(match[1], 10);
      if (v > max) max = v;
    }
  }
  return max;
}

/**
 * Parse the `based_on` field from a markdown version header.
 * Looks for lines like:  based_on: research-v2, content-v3
 * or JSON storyboard files with a `basedOn` property.
 */
function parseBasedOn(projectDir: string, stage: PipelineStageName, version: number): Partial<Record<PipelineStageName, number>> | null {
  const mapping = STAGE_FILE_MAP[stage];
  if (!mapping) return null;

  const filePath = path.join(projectDir, mapping.dir, `${mapping.prefix}-v${version}.${mapping.ext}`);
  if (!fs.existsSync(filePath)) return null;

  const content = fs.readFileSync(filePath, "utf-8");

  // JSON files (storyboard)
  if (mapping.ext === "json") {
    try {
      const parsed = JSON.parse(content);
      if (parsed.basedOn && typeof parsed.basedOn === "object") {
        return parsed.basedOn as Partial<Record<PipelineStageName, number>>;
      }
    } catch {
      return null;
    }
  }

  // Markdown files — look for YAML-like frontmatter or inline based_on line
  const basedOnLine = content.match(/^based_on:\s*(.+)$/m);
  if (!basedOnLine) return null;

  // Format: "research-v2, content-v1" or "research: 2, content: 1"
  const result: Partial<Record<PipelineStageName, number>> = {};
  const raw = basedOnLine[1];

  // Try "stage-vN" format
  const stagePairs = raw.matchAll(/(\w+)-v(\d+)/g);
  for (const [, s, v] of stagePairs) {
    if (STAGE_ORDER.includes(s as PipelineStageName)) {
      result[s as PipelineStageName] = parseInt(v, 10);
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

function validateProject(slug: string, channelSlug?: string): ValidationResult {
  const issues: ValidationIssue[] = [];

  let config: ProjectConfig;
  try {
    config = loadProjectConfig(slug, channelSlug);
  } catch {
    return {
      slug,
      passed: false,
      issues: [{ level: "error", message: "config.json not found or invalid JSON" }],
    };
  }

  const projectDir = path.join(getVideosDir(channelSlug), slug);

  // 1. Check each stage's config version vs files on disk
  for (const stage of STAGE_ORDER) {
    const stageStatus = config.pipeline[stage];
    const configVersion = stageStatus.version;

    if (configVersion === 0) continue; // not started, nothing to check

    // Check that the exact version in config exists on disk
    if (!fileExistsForVersion(projectDir, stage, configVersion)) {
      const mapping = STAGE_FILE_MAP[stage];
      if (mapping) {
        issues.push({
          level: "error",
          stage,
          message: `config.json says ${stage} is at v${configVersion}, but ${mapping.prefix}-v${configVersion}.${mapping.ext} not found`,
        });
      }
    }

    // Check if there are higher versions on disk not reflected in config
    const diskVersion = getHighestVersionOnDisk(projectDir, stage);
    if (diskVersion > configVersion) {
      issues.push({
        level: "warning",
        stage,
        message: `Disk has ${stage}-v${diskVersion} but config.json only tracks v${configVersion} — update config.json`,
      });
    }
  }

  // 2. Check stale downstream dependencies via based_on headers
  for (let i = 1; i < STAGE_ORDER.length; i++) {
    const downstreamStage = STAGE_ORDER[i];
    const downstreamVersion = config.pipeline[downstreamStage].version;

    if (downstreamVersion === 0) continue; // not started

    const basedOn = parseBasedOn(projectDir, downstreamStage, downstreamVersion);
    if (!basedOn) continue; // no header to check

    for (const [upstageKey, referencedVersion] of Object.entries(basedOn)) {
      const upstream = upstageKey as PipelineStageName;
      const currentUpstreamVersion = config.pipeline[upstream]?.version ?? 0;

      if (currentUpstreamVersion > referencedVersion) {
        issues.push({
          level: "warning",
          stage: downstreamStage,
          message: `${downstreamStage}-v${downstreamVersion} is based on ${upstream}-v${referencedVersion}, but ${upstream} is now at v${currentUpstreamVersion} — may be stale`,
        });
      }
    }
  }

  // 3. Check currentWork consistency
  if (config.currentWork) {
    const activeStage = config.pipeline[config.currentWork];
    if (activeStage && activeStage.status === "completed") {
      issues.push({
        level: "warning",
        message: `currentWork is set to "${config.currentWork}" but that stage is already "completed"`,
      });
    }
  }

  // 4. Sanity: completed stages should have a version > 0
  for (const stage of STAGE_ORDER) {
    const stageStatus = config.pipeline[stage];
    if (stageStatus.status === "completed" && stageStatus.version === 0) {
      issues.push({
        level: "error",
        stage,
        message: `Stage "${stage}" is marked completed but version is 0`,
      });
    }
  }

  const hasErrors = issues.some((i) => i.level === "error");
  const hasWarnings = issues.some((i) => i.level === "warning");

  return {
    slug,
    passed: !hasErrors && !hasWarnings,
    issues,
  };
}

function printResult(result: ValidationResult): void {
  const icon = result.passed ? "✅" : result.issues.some((i) => i.level === "error") ? "❌" : "⚠️";
  console.log(`\n${icon} ${result.slug}`);

  if (result.issues.length === 0) {
    console.log("   All checks passed.");
    return;
  }

  for (const issue of result.issues) {
    const prefix = issue.level === "error" ? "  ❌" : issue.level === "warning" ? "  ⚠️" : "  ℹ️";
    const stageTag = issue.stage ? `[${issue.stage}] ` : "";
    console.log(`${prefix} ${stageTag}${issue.message}`);
  }
}

// --- CLI ---

const args = process.argv.slice(2);

const channelFlagIdx = args.indexOf("--channel");
let channelSlug: string | undefined;
if (channelFlagIdx !== -1 && args[channelFlagIdx + 1]) {
  channelSlug = args[channelFlagIdx + 1];
  args.splice(channelFlagIdx, 2);
}

const allFlag = args.includes("--all");

if (!allFlag && args.length === 0) {
  console.log("Usage:");
  console.log("  npm run validate <slug> [--channel <channel-slug>]");
  console.log("  npm run validate --all [--channel <channel-slug>]");
  process.exit(0);
}

let results: ValidationResult[] = [];

if (allFlag) {
  const { listProjects: list } = await import("../utils/project.js");
  const projects = list(channelSlug);
  if (projects.length === 0) {
    console.log("No projects found.");
    process.exit(0);
  }
  for (const p of projects) {
    results.push(validateProject(p.slug, channelSlug));
  }
} else {
  const slug = args[0];
  results.push(validateProject(slug, channelSlug));
}

for (const result of results) {
  printResult(result);
}

const anyFailed = results.some((r) => !r.passed);
console.log("");
if (!anyFailed) {
  console.log("All projects passed validation.");
} else {
  console.log(`${results.filter((r) => !r.passed).length} project(s) have issues.`);
}

process.exit(anyFailed ? 1 : 0);
