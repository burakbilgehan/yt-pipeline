/**
 * New Channel Script
 *
 * Creates a new channel directory with a channel-config.json.
 *
 * Usage: npm run new-channel <channel-slug> [channel-name]
 *
 * Creates: channels/<channel-slug>/
 *          channels/<channel-slug>/channel-config.json
 *          channels/<channel-slug>/videos/
 *          channels/<channel-slug>/channel-assets/
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { ChannelConfig } from "../types/index.js";

const CHANNELS_DIR = path.resolve("channels");
const TEMPLATE_PATH = path.resolve("templates/channel-config.json");

function main() {
  const args = process.argv.slice(2);
  const slug = args[0];
  const name = args.slice(1).join(" ") || slug;

  if (!slug) {
    console.error("Usage: npm run new-channel <channel-slug> [channel-name]");
    process.exit(1);
  }

  const channelDir = path.join(CHANNELS_DIR, slug);

  if (fs.existsSync(channelDir)) {
    console.error(`Channel "${slug}" already exists at ${channelDir}`);
    process.exit(1);
  }

  if (!fs.existsSync(TEMPLATE_PATH)) {
    console.error("Template not found: templates/channel-config.json");
    process.exit(1);
  }

  // Create directory structure
  fs.mkdirSync(path.join(channelDir, "videos"), { recursive: true });
  fs.mkdirSync(path.join(channelDir, "channel-assets"), { recursive: true });

  // Create channel-config.json from template
  const template = JSON.parse(fs.readFileSync(TEMPLATE_PATH, "utf-8")) as ChannelConfig;

  const config: ChannelConfig = {
    ...template,
    channel: {
      ...template.channel,
      name,
      handle: `@${slug}`,
      launchDate: new Date().toISOString().split("T")[0],
    },
  };

  fs.writeFileSync(
    path.join(channelDir, "channel-config.json"),
    JSON.stringify(config, null, 2)
  );

  // Add .gitkeep to videos/ so the folder is trackable if needed
  fs.writeFileSync(path.join(channelDir, "videos", ".gitkeep"), "");
  fs.writeFileSync(path.join(channelDir, "channel-assets", ".gitkeep"), "");

  console.log(`\nChannel "${name}" created at ${channelDir}`);
  console.log(`Slug:    ${slug}`);
  console.log(`Handle:  @${slug}`);
  console.log(`\nEdit ${channelDir}/channel-config.json to customize your channel.`);
  console.log(`Then create your first video: npm run new-video <video-slug> --channel ${slug}`);
}

main();
