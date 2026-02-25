/**
 * Shared utility functions for yt-pipeline
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { ProjectConfig } from "../types/index.js";

const PROJECTS_DIR = path.resolve("projects");

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
 * List all projects and their current stages
 */
export function listProjects(): Array<{ slug: string; title: string; stage: string }> {
  if (!fs.existsSync(PROJECTS_DIR)) {
    return [];
  }

  const entries = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true });
  const projects: Array<{ slug: string; title: string; stage: string }> = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const configPath = path.join(PROJECTS_DIR, entry.name, "config.json");
    if (!fs.existsSync(configPath)) continue;

    try {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      projects.push({
        slug: entry.name,
        title: config.title || entry.name,
        stage: config.stage || "unknown",
      });
    } catch {
      projects.push({
        slug: entry.name,
        title: entry.name,
        stage: "error",
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
