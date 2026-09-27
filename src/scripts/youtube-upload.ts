/**
 * YouTube Upload Script
 *
 * Uploads a rendered video to YouTube with prepared metadata.
 *
 * Usage: npm run upload <project-slug>
 *
 * Reads: channels/<channel>/videos/<slug>/publishing/metadata-v<latest>.json
 *        channels/<channel>/videos/<slug>/production/output/final.mp4
 * Writes: channels/<channel>/videos/<slug>/publishing/upload-log.md
 *
 * Layout-2 projects: see uploadLayout2 (publishing/metadata.json, gates from src/pipeline/gates.ts).
 *   npm run upload -- <slug> [--override <gate>="<reason>" ...]   overrides are logged before the upload
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
  saveProjectConfig,
} from "../utils/project.js";
import { isLayout2 } from "../pipeline/v2.js";
import { applyOverrides, parseOverrides, runGates, type Override } from "../pipeline/gates.js";
import { buildMetadata, publishPaths, videoResource } from "../pipeline/publish.js";
import { youtubeClient } from "../pipeline/youtube-client.js";

async function main() {
  const slug = process.argv[2];

  if (!slug) {
    console.error("Usage: npm run upload <project-slug>");
    process.exit(1);
  }

  if (isLayout2(slug)) return uploadLayout2(slug, parseOverrides(process.argv.slice(3)));

  const projectDir = getProjectDir(slug);
  const config = loadProjectConfig(slug);

  // Find latest versioned metadata
  const metadataFile = getLatestVersionedFile(slug, "publishing", "metadata");

  if (!metadataFile) {
    console.error("No versioned metadata found in publishing/ directory.");
    console.error("Expected files like: metadata-v1.json, metadata-v2.json, etc.");
    console.error("Run metadata generation first (Director handles this via youtube-metadata skill).");
    process.exit(1);
  }

  const metadataPath = path.join(projectDir, "publishing", metadataFile);
  console.log(`Using metadata: ${metadataFile}`);

  const videoPath = path.join(projectDir, "production", "output", "final.mp4");
  const logPath = path.join(projectDir, "publishing", "upload-log.md");

  if (!fs.existsSync(videoPath)) {
    console.error(`Video not found: ${videoPath}`);
    console.error("Run the video production pipeline first.");
    process.exit(1);
  }

  // ── Hard gate: Background music is REQUIRED for publishing ──
  const bgmDir = path.join(projectDir, "production", "audio", "bgm");
  const hasBgmFiles = fs.existsSync(bgmDir) && fs.readdirSync(bgmDir).some(f => /\.(mp3|wav|ogg|m4a)$/i.test(f));
  if (!hasBgmFiles) {
    console.error("❌ BLOCKED: No background music found in production/audio/bgm/");
    console.error("Background music is a hard requirement for publishing.");
    console.error("Add BGM tracks to the storyboard and re-render before uploading.");
    process.exit(1);
  }
  console.log("✓ Background music check passed");

  const metadata: YouTubeMetadata = JSON.parse(
    fs.readFileSync(metadataPath, "utf-8")
  );

  // Debug: log tags being sent
  console.log(`Tags (${metadata.tags?.length}):`, JSON.stringify(metadata.tags));

  // Validate tags: trim whitespace, remove empty, enforce 500 char total limit
  const cleanTags = (metadata.tags || [])
    .map((t: string) => t.trim())
    .filter((t: string) => t.length > 0 && t.length <= 100);
  
  // Enforce 500 character total limit
  const finalTags: string[] = [];
  let charCount = 0;
  for (const tag of cleanTags) {
    const cost = tag.includes(" ") ? tag.length + 2 : tag.length;
    if (charCount + cost > 500) break;
    finalTags.push(tag);
    charCount += cost;
  }
  console.log(`Final tags (${finalTags.length}, ${charCount} chars):`, JSON.stringify(finalTags));

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
          tags: [finalTags.join(", ")],
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

    // Update project config via shared utils
    config.youtube = {
      videoId: videoId!,
      url: videoUrl,
      publishedAt: new Date().toISOString(),
    };
    config.currentWork = null;
    config.pipeline.publishing.status = "completed";
    config.pipeline.publishing.completedAt = new Date().toISOString();
    config.history.push({
      action: "publishing.completed",
      version: config.pipeline.publishing.version || 1,
      at: new Date().toISOString(),
      reason: `Uploaded to YouTube as ${videoId}`,
    });
    saveProjectConfig(slug, config);

    // Write upload log
    const log = `# Upload Log: ${metadata.title}\n\n- **Date:** ${new Date().toISOString()}\n- **Video ID:** ${videoId}\n- **URL:** ${videoUrl}\n- **Visibility:** ${metadata.visibility}\n- **Metadata file:** ${metadataFile}\n- **Status:** SUCCESS\n`;
    fs.writeFileSync(logPath, log);
  } catch (error) {
    console.error("Upload failed:", error);

    const log = `# Upload Log: ${metadata.title}\n\n- **Date:** ${new Date().toISOString()}\n- **Status:** FAILED\n- **Error:** ${error}\n`;
    fs.writeFileSync(logPath, log);
    process.exit(1);
  }
}

/**
 * Layout 2: every publishing gate must pass or be overridden by the user (logged), the request comes from src/pipeline/publish.ts,
 * and the log is written the moment the API answers, before anything else can fail.
 */
async function uploadLayout2(slug: string, overrides: Override[]) {
  const results = runGates(slug);
  const { blocking, used } = applyOverrides(results, overrides);
  if (blocking.length) {
    for (const r of blocking) console.error(`FAIL ${r.name}: ${r.message}`);
    console.error(`\nUpload blocked. Run npm run preflight -- ${slug} for the full list.`);
    process.exit(1);
  }
  const p = publishPaths(slug);
  const built = buildMetadata(slug);
  const resource = videoResource(slug, built);
  const youtube = youtubeClient();
  const log = (lines: string[]) => fs.appendFileSync(p.uploadLog, `\n## ${new Date().toISOString()}\n\n${lines.map((l) => `- ${l}`).join("\n")}\n`);
  // Read before the upload: after the API answers, nothing may throw before the log is written.
  const renderedAt = fs.existsSync(p.renderStamp) ? JSON.parse(fs.readFileSync(p.renderStamp, "utf8")).renderedAt : "no render stamp (overridden)";
  const thumb = fs.readdirSync(p.thumbnailDir).find((f) => /^thumbnail\.(png|jpe?g)$/i.test(f));
  if (used.length) {
    log(used.map((o) => `OVERRIDE ${o.gate}: ${o.reason} (gate said: ${results.find((r) => r.name === o.gate)!.message})`));
    for (const o of used) console.log(`Override: ${o.gate} (${o.reason})`);
  }

  console.log(`Uploading "${built.metadata.title}" (${built.metadata.visibility}${built.metadata.scheduledAt ? `, scheduled ${built.metadata.scheduledAt}` : ""})...`);
  let videoId: string;
  try {
    const res = await youtube.videos.insert({ part: ["snippet", "status"], requestBody: resource, media: { body: fs.createReadStream(p.video) } });
    videoId = res.data.id!;
  } catch (error) {
    log(["Status: FAILED", `Error: ${String(error).split("\n")[0]}`, "A failed or timed-out upload may still have been processed: check YouTube Studio before retrying (quota is spent either way)."]);
    console.error("Upload failed:", error);
    console.error("Check YouTube Studio before retrying.");
    process.exit(1);
  }
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  log(["Status: SUCCESS", `Video ID: ${videoId}`, `URL: ${url}`, `Visibility: ${built.metadata.visibility}`, `Render: ${renderedAt}`]);
  console.log(`Uploaded: ${url}`);

  const configFile = path.join(getProjectDir(slug), "config.json");
  const config = JSON.parse(fs.readFileSync(configFile, "utf8"));
  config.youtube = { videoId, url, publishedAt: new Date().toISOString() };
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2) + "\n");

  if (!thumb) {
    log(["Thumbnail: none (overridden); set it in YouTube Studio"]);
    return;
  }
  try {
    await youtube.thumbnails.set({ videoId, media: { body: fs.createReadStream(path.join(p.thumbnailDir, thumb)) } });
    log([`Thumbnail: ${thumb} set`]);
    console.log(`Thumbnail set: ${thumb}`);
  } catch (error) {
    log([`Thumbnail: FAILED (${String(error).split("\n")[0]}); set it in YouTube Studio`]);
    console.error(`Thumbnail upload failed; set it in YouTube Studio. ${error}`);
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
