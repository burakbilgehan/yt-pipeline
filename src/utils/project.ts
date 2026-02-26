/**
 * Shared utility functions for yt-pipeline
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { ProjectConfig, PipelineStageName, ChannelConfig } from "../types/index.js";

const PROJECTS_DIR = path.resolve("projects");
const CHANNEL_CONFIG_PATH = path.resolve("channel-config.json");
const CHANNEL_CONFIG_TEMPLATE = path.resolve("templates/channel-config.json");

/**
 * Load a project's config.json
 */
export function loadProjectConfig(slug: string): ProjectConfig {
  const configPath = path.join(PROJECTS_DIR, slug, "config.json");
  if (!fs.existsSync(configPath)) {
    throw new Error(`Project not found: ${slug}`);
  }
  return JSON.parse(fs.readFileSync(configPath, "utf-8"));
}

/**
 * Save a project's config.json
 */
export function saveProjectConfig(slug: string, config: ProjectConfig): void {
  const configPath = path.join(PROJECTS_DIR, slug, "config.json");
  config.updatedAt = new Date().toISOString();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

/**
 * Load the channel-level configuration (channel-config.json at repo root).
 * Falls back to the template if no channel-config.json exists.
 */
export function loadChannelConfig(): ChannelConfig {
  if (fs.existsSync(CHANNEL_CONFIG_PATH)) {
    return JSON.parse(fs.readFileSync(CHANNEL_CONFIG_PATH, "utf-8"));
  }
  if (fs.existsSync(CHANNEL_CONFIG_TEMPLATE)) {
    return JSON.parse(fs.readFileSync(CHANNEL_CONFIG_TEMPLATE, "utf-8"));
  }
  throw new Error(
    "No channel-config.json found. Copy templates/channel-config.json to the repo root and customize it."
  );
}

/**
 * List all projects with their current work and version summary
 */
export function listProjects(): Array<{
  slug: string;
  title: string;
  currentWork: string;
  versions: Record<string, number>;
}> {
  if (!fs.existsSync(PROJECTS_DIR)) {
    return [];
  }

  const entries = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true });
  const projects: Array<{
    slug: string;
    title: string;
    currentWork: string;
    versions: Record<string, number>;
  }> = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const configPath = path.join(PROJECTS_DIR, entry.name, "config.json");
    if (!fs.existsSync(configPath)) continue;

    try {
      const config: ProjectConfig = JSON.parse(
        fs.readFileSync(configPath, "utf-8")
      );
      const versions: Record<string, number> = {};
      for (const [stage, status] of Object.entries(config.pipeline)) {
        versions[stage] = status.version;
      }
      projects.push({
        slug: entry.name,
        title: config.title || entry.name,
        currentWork: config.currentWork || "idle",
        versions,
      });
    } catch {
      projects.push({
        slug: entry.name,
        title: entry.name,
        currentWork: "error",
        versions: {},
      });
    }
  }

  return projects;
}

/**
 * Get the path to a project directory
 */
export function getProjectDir(slug: string): string {
  return path.join(PROJECTS_DIR, slug);
}

/**
 * Ensure a project subdirectory exists
 */
export function ensureProjectDir(slug: string, subdir: string): string {
  const dir = path.join(PROJECTS_DIR, slug, subdir);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Get the current version number for a pipeline stage
 */
export function getStageVersion(slug: string, stage: PipelineStageName): number {
  const config = loadProjectConfig(slug);
  return config.pipeline[stage].version;
}

/**
 * Get the latest versioned filename for a stage.
 * Scans the stage directory for files matching the pattern and returns the highest version.
 * Returns null if no versioned files exist.
 *
 * Returns just the filename (not the full path or stageDir prefix).
 *
 * Example: getLatestVersionedFile("my-video", "content", "script")
 *   → "script-v3.md" (if v1, v2, v3 exist)
 */
export function getLatestVersionedFile(
  slug: string,
  stageDir: string,
  baseName: string
): string | null {
  const dir = path.join(PROJECTS_DIR, slug, stageDir);
  if (!fs.existsSync(dir)) return null;

  const files = fs.readdirSync(dir);
  const versionPattern = new RegExp(`^${baseName}-v(\\d+)\\.[a-z]+$`);

  let maxVersion = 0;
  let latestFile: string | null = null;

  for (const file of files) {
    const match = file.match(versionPattern);
    if (match) {
      const version = parseInt(match[1], 10);
      if (version > maxVersion) {
        maxVersion = version;
        latestFile = file;
      }
    }
  }

  return latestFile;
}

/**
 * Append an entry to the project's asset log (production/asset-log.md).
 * Creates the file with headers if it doesn't exist.
 */
export function appendAssetLog(
  slug: string,
  asset: {
    type: string;
    source: string;
    file: string;
    license: string;
    query: string;
  }
): void {
  const logPath = path.join(PROJECTS_DIR, slug, "production", "asset-log.md");

  if (!fs.existsSync(logPath)) {
    fs.writeFileSync(
      logPath,
      "# Asset Log\n\n| # | Type | Source | File | License | Search Query |\n|---|------|--------|------|---------|-------------|\n"
    );
  }

  const content = fs.readFileSync(logPath, "utf-8");
  const rowCount = content
    .split("\n")
    .filter(
      (l) =>
        l.startsWith("|") &&
        !l.startsWith("| #") &&
        !l.startsWith("|--")
    ).length;
  const newRow = `| ${rowCount + 1} | ${asset.type} | ${asset.source} | ${asset.file} | ${asset.license} | "${asset.query}" |\n`;

  fs.appendFileSync(logPath, newRow);
}
