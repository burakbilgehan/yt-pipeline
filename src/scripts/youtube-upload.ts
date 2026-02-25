/**
 * YouTube Upload Script
 *
 * Uploads a rendered video to YouTube with prepared metadata.
 *
 * Usage: npm run upload <project-slug>
 *
 * Reads: projects/<slug>/publishing/metadata.json
 *        projects/<slug>/production/output/final.mp4
 * Writes: projects/<slug>/publishing/upload-log.md
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { google } from "googleapis";
import type { YouTubeMetadata } from "../types/index.js";

const PROJECTS_DIR = path.resolve("projects");

async function main() {
  const slug = process.argv[2];

  if (!slug) {
    console.error("Usage: npm run upload <project-slug>");
    process.exit(1);
  }

  const projectDir = path.join(PROJECTS_DIR, slug);
  const metadataPath = path.join(projectDir, "publishing", "metadata.json");
  const videoPath = path.join(projectDir, "production", "output", "final.mp4");
  const logPath = path.join(projectDir, "publishing", "upload-log.md");

  // Validate files exist
  if (!fs.existsSync(metadataPath)) {
    console.error(`Metadata not found: ${metadataPath}`);
    console.error("Run the publisher agent first.");
    process.exit(1);
  }

  if (!fs.existsSync(videoPath)) {
    console.error(`Video not found: ${videoPath}`);
    console.error("Run the video production pipeline first.");
    process.exit(1);
  }

  const metadata: YouTubeMetadata = JSON.parse(
    fs.readFileSync(metadataPath, "utf-8")
  );

  // Set up YouTube API auth
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.error(
      "Missing YouTube API credentials. Set YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN in .env"
    );
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const youtube = google.youtube({ version: "v3", auth: oauth2Client });

  console.log(`Uploading "${metadata.title}"...`);
  console.log(`Video file: ${videoPath}`);
  console.log(`Visibility: ${metadata.visibility}`);

  try {
    const response = await youtube.videos.insert({
      part: ["snippet", "status"],
      requestBody: {
        snippet: {
          title: metadata.title,
          description: metadata.description,
          tags: metadata.tags,
          categoryId: getCategoryId(metadata.category),
          defaultLanguage: metadata.language || "en",
        },
        status: {
          privacyStatus: metadata.visibility || "private",
          publishAt: metadata.scheduledAt,
          selfDeclaredMadeForKids: false,
        },
      },
      media: {
        body: fs.createReadStream(videoPath),
      },
    });

    const videoId = response.data.id;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    console.log(`\nUpload successful!`);
    console.log(`Video ID: ${videoId}`);
    console.log(`URL: ${videoUrl}`);

    // Update project config
    const configPath = path.join(projectDir, "config.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    config.youtube = {
      videoId,
      url: videoUrl,
      publishedAt: new Date().toISOString(),
    };
    config.stage = "published";
    config.pipeline.publishing = {
      status: "completed",
      completedAt: new Date().toISOString(),
    };
    config.updatedAt = new Date().toISOString();
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    // Write upload log
    const log = `# Upload Log: ${metadata.title}\n\n- **Date:** ${new Date().toISOString()}\n- **Video ID:** ${videoId}\n- **URL:** ${videoUrl}\n- **Visibility:** ${metadata.visibility}\n- **Status:** SUCCESS\n`;
    fs.writeFileSync(logPath, log);
  } catch (error) {
    console.error("Upload failed:", error);

    const log = `# Upload Log: ${metadata.title}\n\n- **Date:** ${new Date().toISOString()}\n- **Status:** FAILED\n- **Error:** ${error}\n`;
    fs.writeFileSync(logPath, log);
    process.exit(1);
  }
}

function getCategoryId(category: string): string {
  const categories: Record<string, string> = {
    "Education": "27",
    "Science & Technology": "28",
    "Entertainment": "24",
    "News & Politics": "25",
    "People & Blogs": "22",
    "Howto & Style": "26",
  };
  return categories[category] || "27"; // Default to Education
}

main();
