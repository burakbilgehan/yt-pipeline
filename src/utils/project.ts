/**
 * Shared utility functions for yt-pipeline
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { ProjectConfig, PipelineStageName, ChannelConfig, Storyboard, Scene } from "../types/index.js";

const CHANNELS_DIR = path.resolve("channels");
const CHANNEL_CONFIG_TEMPLATE = path.resolve("templates/channel-config.json");

/**
 * Resolve the videos directory for a given channel slug.
 * Looks up channels/<channelSlug>/videos/
 * Auto-detects the first channel if no slug is given.
 * Falls back to legacy projects/ if channels/ doesn't exist.
 */
export function getVideosDir(channelSlug?: string): string {
  if (channelSlug) {
    return path.join(CHANNELS_DIR, channelSlug, "videos");
  }
  if (fs.existsSync(CHANNELS_DIR)) {
    const entries = fs.readdirSync(CHANNELS_DIR, { withFileTypes: true });
    const first = entries.find((e) => e.isDirectory());
    if (first) {
      return path.join(CHANNELS_DIR, first.name, "videos");
    }
  }
  // Legacy fallback
  return path.resolve("projects");
}

/**
 * Resolve the channel config path for a given channel slug.
 * Auto-detects the first channel if no slug is given.
 * Falls back to legacy channel-config.json at repo root.
 */
export function getChannelConfigPath(channelSlug?: string): string {
  if (channelSlug) {
    return path.join(CHANNELS_DIR, channelSlug, "channel-config.json");
  }
  if (fs.existsSync(CHANNELS_DIR)) {
    const entries = fs.readdirSync(CHANNELS_DIR, { withFileTypes: true });
    const first = entries.find((e) => e.isDirectory());
    if (first) {
      return path.join(CHANNELS_DIR, first.name, "channel-config.json");
    }
  }
  // Legacy fallback
  return path.resolve("channel-config.json");
}

/**
 * Load a project's config.json
 */
export function loadProjectConfig(slug: string, channelSlug?: string): ProjectConfig {
  const configPath = path.join(getVideosDir(channelSlug), slug, "config.json");
  if (!fs.existsSync(configPath)) {
    throw new Error(`Project not found: ${slug}`);
  }
  return JSON.parse(fs.readFileSync(configPath, "utf-8"));
}

/**
 * Save a project's config.json
 */
export function saveProjectConfig(slug: string, config: ProjectConfig, channelSlug?: string): void {
  const configPath = path.join(getVideosDir(channelSlug), slug, "config.json");
  config.updatedAt = new Date().toISOString();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

/**
 * Load the channel-level configuration.
 * Looks in channels/<channelSlug>/channel-config.json.
 * Falls back to template if not found.
 */
export function loadChannelConfig(channelSlug?: string): ChannelConfig {
  const configPath = getChannelConfigPath(channelSlug);
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, "utf-8"));
  }
  if (fs.existsSync(CHANNEL_CONFIG_TEMPLATE)) {
    return JSON.parse(fs.readFileSync(CHANNEL_CONFIG_TEMPLATE, "utf-8"));
  }
  throw new Error(
    "No channel-config.json found. Run: npm run new-channel <slug> to create one."
  );
}

/**
 * List all videos for a given channel (or auto-detected channel).
 */
export function listProjects(channelSlug?: string): Array<{
  slug: string;
  title: string;
  currentWork: string;
  versions: Record<string, number>;
}> {
  const videosDir = getVideosDir(channelSlug);
  if (!fs.existsSync(videosDir)) {
    return [];
  }

  const entries = fs.readdirSync(videosDir, { withFileTypes: true });
  const projects: Array<{
    slug: string;
    title: string;
    currentWork: string;
    versions: Record<string, number>;
  }> = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const configPath = path.join(videosDir, entry.name, "config.json");
    if (!fs.existsSync(configPath)) continue;

    try {
      const config: ProjectConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
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
 * Get the path to a project (video) directory
 */
export function getProjectDir(slug: string, channelSlug?: string): string {
  return path.join(getVideosDir(channelSlug), slug);
}

/**
 * Ensure a project subdirectory exists
 */
export function ensureProjectDir(slug: string, subdir: string, channelSlug?: string): string {
  const dir = path.join(getVideosDir(channelSlug), slug, subdir);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Get the current version number for a pipeline stage
 */
export function getStageVersion(slug: string, stage: PipelineStageName, channelSlug?: string): number {
  const config = loadProjectConfig(slug, channelSlug);
  return config.pipeline[stage].version;
}

/**
 * Get the latest versioned filename for a stage.
 * Returns just the filename (not the full path).
 *
 * Example: getLatestVersionedFile("my-video", "content", "script")
 *   → "script-v3.md" (if v1, v2, v3 exist)
 */
export function getLatestVersionedFile(
  slug: string,
  stageDir: string,
  baseName: string,
  channelSlug?: string
): string | null {
  const dir = path.join(getVideosDir(channelSlug), slug, stageDir);
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
  },
  channelSlug?: string
): void {
  const logPath = path.join(getVideosDir(channelSlug), slug, "production", "asset-log.md");

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

/**
 * Load a storyboard and resolve scene detail files.
 *
 * The storyboard can be in two formats:
 * 1. **Monolithic**: All scene data inline in `storyboard-v<N>.json`
 * 2. **Skeleton + detail files**: Each scene has a `sceneFile` reference
 *    pointing to a detail JSON (e.g. `scenes/scene-001.json`). The loader
 *    merges the skeleton fields with the detail file, where detail fields
 *    override skeleton fields (except `id`, `section`, `startTime`, `endTime`,
 *    `voiceover` which always come from the skeleton).
 *
 * Returns a fully resolved Storyboard with all scene details populated.
 * Returns null if no storyboard file is found.
 */
export function loadStoryboardResolved(slug: string, channelSlug?: string): Storyboard | null {
  const storyboardFile = getLatestVersionedFile(slug, "storyboard", "storyboard", channelSlug);
  if (!storyboardFile) return null;

  const projectDir = getProjectDir(slug, channelSlug);
  const storyboardPath = path.join(projectDir, "storyboard", storyboardFile);

  if (!storyboardFile.endsWith(".json")) return null;

  let storyboard: Storyboard;
  try {
    storyboard = JSON.parse(fs.readFileSync(storyboardPath, "utf-8"));
  } catch {
    return null;
  }

  if (!storyboard.scenes || storyboard.scenes.length === 0) return storyboard;

  // Resolve scene detail files
  const storyboardDir = path.join(projectDir, "storyboard");
  const resolvedScenes: Scene[] = [];

  for (const scene of storyboard.scenes) {
    if (scene.sceneFile) {
      const detailPath = path.join(storyboardDir, scene.sceneFile);
      if (fs.existsSync(detailPath)) {
        try {
          const detail = JSON.parse(fs.readFileSync(detailPath, "utf-8"));
          // Merge: skeleton timing/voiceover fields are authoritative,
          // detail file provides visual, notes, and other rich data
          resolvedScenes.push({
            ...detail,
            // Skeleton fields always win — these are the "index" truth
            id: scene.id,
            section: scene.section,
            startTime: scene.startTime,
            endTime: scene.endTime,
            voiceover: scene.voiceover,
            transition: scene.transition ?? detail.transition ?? "cut",
          });
        } catch {
          // If detail file is broken, use skeleton as-is
          resolvedScenes.push(scene);
        }
      } else {
        // Detail file missing — use skeleton as-is
        resolvedScenes.push(scene);
      }
    } else {
      // No sceneFile reference — this is a monolithic storyboard, use as-is
      resolvedScenes.push(scene);
    }
  }

  return { ...storyboard, scenes: resolvedScenes };
}
