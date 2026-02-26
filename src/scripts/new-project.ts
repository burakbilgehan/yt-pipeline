import * as fs from "node:fs";
import * as path from "node:path";
import type { ProjectConfig } from "../types/index.js";
import { loadChannelConfig } from "../utils/project.js";

const PROJECTS_DIR = path.resolve("projects");
const TEMPLATE_PATH = path.resolve("templates/default-config.json");

function main() {
  const slug = process.argv[2];
  const title = process.argv[3] || slug;

  if (!slug) {
    console.error("Usage: npm run new-project <slug> [title]");
    process.exit(1);
  }

  const projectDir = path.join(PROJECTS_DIR, slug);

  if (fs.existsSync(projectDir)) {
    console.error(`Project "${slug}" already exists at ${projectDir}`);
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
  let channelDefaults: { tone: string; targetAudience: string; language: string; targetLength: number } = {
    tone: "",
    targetAudience: "",
    language: "en",
    targetLength: 180,
  };

  try {
    const channelConfig = loadChannelConfig();
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
  const template = JSON.parse(
    fs.readFileSync(TEMPLATE_PATH, "utf-8")
  ) as ProjectConfig;

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
      targetLength: channelDefaults.targetLength || template.metadata.targetLength,
    },
  };

  fs.writeFileSync(
    path.join(projectDir, "config.json"),
    JSON.stringify(config, null, 2)
  );

  console.log(`Project "${slug}" created at ${projectDir}`);
  console.log(`Title: ${title}`);
  console.log(`Tone: ${config.metadata.tone}`);
  console.log(`Audience: ${config.metadata.targetAudience}`);
  console.log(`Language: ${config.metadata.language}`);
  console.log(`Target length: ${config.metadata.targetLength}s`);
  console.log(`Current work: ${config.currentWork ?? "none (ready to start)"}`);
  console.log(`\nNext step: @researcher or /research ${slug} <topic>`);
}

main();
