import * as fs from "node:fs";
import * as path from "node:path";
import type { ProjectConfig } from "../types/index.js";

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
  };

  fs.writeFileSync(
    path.join(projectDir, "config.json"),
    JSON.stringify(config, null, 2)
  );

  console.log(`Project "${slug}" created at ${projectDir}`);
  console.log(`Title: ${title}`);
  console.log(`Stage: ${config.stage}`);
  console.log(`\nNext step: /research ${slug} <topic>`);
}

main();
