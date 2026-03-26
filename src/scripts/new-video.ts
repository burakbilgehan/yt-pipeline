/**
 * New Video Script
 *
 * Creates a new video project under a channel directory.
 *
 * Usage: npm run new-video <slug> [title] [--channel <channel-slug>] [--format short|long] [--short]
 *
 * Creates: channels/<channel>/videos/<slug>/
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { ProjectConfig } from "../types/index.js";
import { getVideosDir, loadChannelConfig } from "../utils/project.js";

const TEMPLATE_PATH = path.resolve("templates/project/config.json");

function main() {
  const args = process.argv.slice(2);

  // Parse --channel flag
  const channelFlagIndex = args.indexOf("--channel");
  let channelSlug: string | undefined;
  if (channelFlagIndex !== -1 && args[channelFlagIndex + 1]) {
    channelSlug = args[channelFlagIndex + 1];
    args.splice(channelFlagIndex, 2);
  }

  // Parse --format flag
  const formatFlagIndex = args.indexOf("--format");
  let format: "long" | "short" = "long";
  if (formatFlagIndex !== -1 && args[formatFlagIndex + 1]) {
    format = args[formatFlagIndex + 1] as "long" | "short";
    args.splice(formatFlagIndex, 2);
  }
  // Also support --short shorthand
  const shortFlagIndex = args.indexOf("--short");
  if (shortFlagIndex !== -1) {
    format = "short";
    args.splice(shortFlagIndex, 1);
  }

  const slug = args[0];
  const title = args[1] || slug;

  if (!slug) {
    console.error("Usage: npm run new-video <slug> [title] [--channel <channel-slug>] [--format short|long] [--short]");
    process.exit(1);
  }

  const videosDir = getVideosDir(channelSlug);
  const projectDir = path.join(videosDir, slug);

  if (!fs.existsSync(videosDir)) {
    console.error(`Channel directory not found: ${videosDir}`);
    console.error("Create a channel first: npm run new-channel <channel-slug>");
    process.exit(1);
  }

  if (fs.existsSync(projectDir)) {
    console.error(`Video "${slug}" already exists at ${projectDir}`);
    process.exit(1);
  }

  // Create directory structure
  const dirs = [
    "",
    "research",
    "content",
    "storyboard",
    "production",
    "production/audio",
    "production/visuals",
    "production/output",
    "publishing",
    "analytics",
  ];

  for (const dir of dirs) {
    fs.mkdirSync(path.join(projectDir, dir), { recursive: true });
  }

  // Load channel config for defaults
  let channelDefaults = {
    tone: "",
    targetAudience: "",
    language: "en",
    targetLength: 180,
  };

  try {
    const channelConfig = loadChannelConfig(channelSlug);
    channelDefaults = {
      tone: channelConfig.content.defaultTone,
      targetAudience: channelConfig.content.targetAudience,
      language: channelConfig.channel.language,
      targetLength: channelConfig.content.defaultLength,
    };
  } catch {
    console.log("Note: No channel-config.json found, using template defaults.");
  }

  // Create config.json from template
  const template = JSON.parse(fs.readFileSync(TEMPLATE_PATH, "utf-8")) as ProjectConfig;

  let targetLength = channelDefaults.targetLength || template.metadata.targetLength;
  if (format === "short") {
    try {
      const channelConfig = loadChannelConfig(channelSlug);
      targetLength = (channelConfig as any).shorts?.defaultLength || 45;
    } catch {
      targetLength = 45;
    }
  }

  const config: ProjectConfig = {
    ...template,
    slug,
    title,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: {
      ...template.metadata,
      tone: channelDefaults.tone || template.metadata.tone,
      targetAudience: channelDefaults.targetAudience || template.metadata.targetAudience,
      language: channelDefaults.language || template.metadata.language,
      targetLength,
      format,
    },
  };

  fs.writeFileSync(path.join(projectDir, "config.json"), JSON.stringify(config, null, 2));

  console.log(`\nVideo "${slug}" created at ${projectDir}`);
  console.log(`Title:          ${title}`);
  console.log(`Channel:        ${channelSlug || "(auto-detected)"}`);
  console.log(`Format:         ${config.metadata.format}`);
  console.log(`Target length:  ${config.metadata.targetLength}s`);
  console.log(`Tone:           ${config.metadata.tone}`);
  console.log(`Audience:       ${config.metadata.targetAudience}`);
  console.log(`\nNext step: /research ${slug} <topic>`);
}

main();
