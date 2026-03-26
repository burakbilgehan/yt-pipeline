/**
 * Video Status Script
 *
 * Fetches current metrics for a single video from YouTube Data API v3.
 * Fast and near-realtime — use for quick checks.
 *
 * Usage: npm run video-status <video-id-or-slug>
 *
 * Quota cost: 1 unit
 */

import "dotenv/config";
import * as path from "node:path";
import { getYouTubeClient, parseDuration } from "../utils/youtube.js";
import {
  getVideoCacheDir,
  writeCache,
} from "../utils/cache.js";
import {
  loadProjectConfig,
  getVideosDir,
} from "../utils/project.js";
import * as fs from "node:fs";

async function main() {
  const target = process.argv[2];

  if (!target) {
    console.error("Usage: npm run video-status <video-id-or-slug>");
    console.error("  video-id: YouTube video ID (e.g., WeVrejS9Wf8)");
    console.error("  slug: project slug (e.g., my-video-project)");
    process.exit(1);
  }

  // Resolve video ID — if it looks like a slug, load from config
  let videoId: string;
  let projectSlug: string | null = null;

  if (target.length === 11 && /^[a-zA-Z0-9_-]+$/.test(target)) {
    // Looks like a YouTube video ID
    videoId = target;
    // Try to find matching project
    projectSlug = findProjectByVideoId(videoId);
  } else {
    // Treat as project slug
    projectSlug = target;
    try {
      const config = loadProjectConfig(target);
      if (!config.youtube?.videoId) {
        console.error(`Project "${target}" has no videoId. Video not published yet?`);
        process.exit(1);
      }
      videoId = config.youtube.videoId;
    } catch {
      console.error(`Project not found: ${target}`);
      process.exit(1);
    }
  }

  const youtube = getYouTubeClient();

  console.log(`Fetching video status for ${videoId}...`);

  const res = await youtube.videos.list({
    part: ["snippet", "statistics", "contentDetails", "status"],
    id: [videoId],
  });

  const video = res.data.items?.[0];
  if (!video) {
    console.error("Video not found:", videoId);
    process.exit(1);
  }

  const stats = video.statistics!;
  const snippet = video.snippet!;
  const duration = video.contentDetails?.duration || "PT0S";
  const durationSec = parseDuration(duration);

  const status = {
    fetchedAt: new Date().toISOString(),
    videoId,
    title: snippet.title,
    publishedAt: snippet.publishedAt,
    privacyStatus: video.status?.privacyStatus,
    duration,
    durationSeconds: durationSec,
    views: Number(stats.viewCount) || 0,
    likes: Number(stats.likeCount) || 0,
    dislikes: Number(stats.dislikeCount) || 0,
    comments: Number(stats.commentCount) || 0,
    favorites: Number(stats.favoriteCount) || 0,
    tags: snippet.tags || [],
    categoryId: snippet.categoryId,
    projectSlug,
  };

  // Calculate age
  const publishedDate = new Date(status.publishedAt!);
  const ageMs = Date.now() - publishedDate.getTime();
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
  const ageHours = Math.floor(ageMs / (1000 * 60 * 60));

  // Cache the snapshot
  const videoDir = getVideoCacheDir(videoId);
  const today = new Date().toISOString().split("T")[0];
  writeCache(path.join(videoDir, `status-${today}.json`), status);

  // Print summary
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${status.title}`);
  console.log(`${"═".repeat(60)}`);
  console.log(`  Video ID:    ${videoId}`);
  console.log(`  Published:   ${status.publishedAt?.split("T")[0]} (${ageDays > 0 ? ageDays + " days" : ageHours + " hours"} ago)`);
  console.log(`  Duration:    ${formatDuration(durationSec)}`);
  console.log(`  Status:      ${status.privacyStatus}`);
  if (projectSlug) {
    console.log(`  Project:     ${projectSlug}`);
  }
  console.log(`${"─".repeat(60)}`);
  console.log(`  Views:       ${status.views.toLocaleString()}`);
  console.log(`  Likes:       ${status.likes.toLocaleString()}`);
  console.log(`  Comments:    ${status.comments.toLocaleString()}`);
  console.log(`  Like ratio:  ${status.views > 0 ? ((status.likes / status.views) * 100).toFixed(1) : 0}%`);
  console.log(`${"─".repeat(60)}`);
  if (status.tags.length > 0) {
    console.log(`  Tags:        ${status.tags.slice(0, 5).join(", ")}${status.tags.length > 5 ? ` (+${status.tags.length - 5} more)` : ""}`);
  }
  console.log(`${"═".repeat(60)}`);
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function findProjectByVideoId(videoId: string): string | null {
  const videosDir = getVideosDir();
  if (!fs.existsSync(videosDir)) return null;

  const entries = fs.readdirSync(videosDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const configPath = path.join(videosDir, entry.name, "config.json");
    if (!fs.existsSync(configPath)) continue;
    try {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (config.youtube?.videoId === videoId) {
        return entry.name;
      }
    } catch {
      // skip
    }
  }
  return null;
}

main().catch((err) => {
  console.error("Failed:", err.message || err);
  process.exit(1);
});
