/**
 * YouTube Video Update Script
 *
 * Updates an already-uploaded video's metadata (title, description, tags, schedule).
 *
 * Usage: npx tsx src/scripts/youtube-update.ts <project-slug>
 *
 * Reads: channels/<channel>/videos/<slug>/publishing/metadata-v<latest>.json
 *        channels/<channel>/videos/<slug>/config.json (for videoId)
 */

import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { google } from "googleapis";
import type { YouTubeMetadata } from "../types/index.js";
import {
  getProjectDir,
  getLatestVersionedFile,
  loadProjectConfig,
} from "../utils/project.js";
import { isLayout2 } from "../pipeline/v2.js";
import { buildMetadata, publishPaths, videoResource } from "../pipeline/publish.js";
import { youtubeClient } from "../pipeline/youtube-client.js";

/** Layout 2: pushes publishing/metadata.json (chapters from the current timeline) to the uploaded video. */
async function updateLayout2(slug: string) {
  const videoId = (loadProjectConfig(slug) as any).youtube?.videoId;
  if (!videoId) throw new Error("No youtube.videoId in config.json. Upload the video first.");
  const built = buildMetadata(slug);
  if (built.errors.length) throw new Error(`metadata invalid: ${built.errors.join("; ")}`);
  // Status is sent only while a schedule is still ahead: metadata.json keeps saying "private" after a
  // scheduled video went public, and sending it then would take the live video down.
  const { snippet, status } = videoResource(slug, built);
  const reschedule = !!built.metadata.scheduledAt && Date.parse(built.metadata.scheduledAt) > Date.now();
  await youtubeClient().videos.update({
    part: reschedule ? ["snippet", "status"] : ["snippet"],
    requestBody: reschedule ? { id: videoId, snippet, status } : { id: videoId, snippet },
  });
  fs.appendFileSync(publishPaths(slug).uploadLog, `\n## ${new Date().toISOString()}\n\n- Metadata updated: "${built.metadata.title}"${reschedule ? `, scheduled ${built.metadata.scheduledAt}` : " (snippet only, visibility untouched)"}\n`);
  console.log(`Updated https://www.youtube.com/watch?v=${videoId}`);
}

async function main() {
  const slug = process.argv[2];

  if (!slug) {
    console.error("Usage: npx tsx src/scripts/youtube-update.ts <project-slug>");
    process.exit(1);
  }

  if (isLayout2(slug)) return updateLayout2(slug);

  const projectDir = getProjectDir(slug);
  const config = loadProjectConfig(slug);
  const videoId = config.youtube?.videoId;

  if (!videoId) {
    console.error("No videoId found in config.json. Upload the video first.");
    process.exit(1);
  }

  const metadataFile = getLatestVersionedFile(slug, "publishing", "metadata");
  if (!metadataFile) {
    console.error("No versioned metadata found in publishing/ directory.");
    process.exit(1);
  }

  const metadataPath = path.join(projectDir, "publishing", metadataFile);
  const metadata: YouTubeMetadata = JSON.parse(
    fs.readFileSync(metadataPath, "utf-8")
  );

  console.log(`Updating video ${videoId}...`);
  console.log(`  Title: ${metadata.title}`);
  console.log(`  ScheduledAt: ${metadata.scheduledAt || "(none)"}`);

  // Auth
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.error("Missing YouTube API credentials in .env");
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const youtube = google.youtube({ version: "v3", auth: oauth2Client });

  // Build tags
  const cleanTags = (metadata.tags || [])
    .map((t: string) => t.trim())
    .filter((t: string) => t.length > 0 && t.length <= 100);
  const finalTags: string[] = [];
  let charCount = 0;
  for (const tag of cleanTags) {
    const cost = tag.includes(" ") ? tag.length + 2 : tag.length;
    if (charCount + cost > 500) break;
    finalTags.push(tag);
    charCount += cost;
  }

  try {
    const response = await youtube.videos.update({
      part: ["snippet", "status"],
      requestBody: {
        id: videoId,
        snippet: {
          title: metadata.title,
          description: metadata.description,
          tags: [finalTags.join(", ")],
          categoryId: getCategoryId(metadata.category),
          defaultLanguage: metadata.language || "en",
        },
        status: {
          privacyStatus: metadata.scheduledAt ? "private" : (metadata.visibility || "private"),
          publishAt: metadata.scheduledAt || undefined,
          selfDeclaredMadeForKids: false,
        },
      },
    });

    console.log(`\nUpdate successful!`);
    console.log(`  Video: https://www.youtube.com/watch?v=${videoId}`);
    if (metadata.scheduledAt) {
      console.log(`  Scheduled for: ${metadata.scheduledAt}`);
    }
  } catch (error) {
    console.error("Update failed:", error);
    process.exit(1);
  }
}

function getCategoryId(category: string): string {
  const categories: Record<string, string> = {
    Education: "27",
    "Science & Technology": "28",
    Entertainment: "24",
    "News & Politics": "25",
    "People & Blogs": "22",
    "Howto & Style": "26",
  };
  return categories[category] || "27";
}

main();
