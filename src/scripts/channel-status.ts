/**
 * Channel Status Script
 *
 * Fetches channel snapshot + full video catalog from YouTube Data API v3.
 * Writes to cache: channel-snapshot.json, video-catalog.json
 *
 * Usage: npm run channel-status [--channel <slug>] [--force]
 *
 * Quota cost: ~3-5 units (channels.list + playlistItems.list + videos.list batch)
 */

import "dotenv/config";
import * as path from "node:path";
import {
  getYouTubeClient,
  resolveChannelId,
  parseDuration,
} from "../utils/youtube.js";
import {
  getCachePaths,
  writeCache,
  readCache,
  isCacheStale,
  CACHE_TTL,
} from "../utils/cache.js";
import { listProjects } from "../utils/project.js";
import type {
  ChannelSnapshot,
  VideoCatalog,
  VideoCatalogEntry,
} from "../types/index.js";

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const channelIdx = args.indexOf("--channel");
  const channelSlug =
    channelIdx >= 0 ? args[channelIdx + 1] : undefined;

  const cachePaths = getCachePaths(channelSlug);

  // Check TTL unless --force
  if (
    !force &&
    !isCacheStale(cachePaths.channelSnapshot, CACHE_TTL.channelSnapshot) &&
    !isCacheStale(cachePaths.videoCatalog, CACHE_TTL.videoCatalog)
  ) {
    console.log("Cache is fresh (< 24h). Use --force to refresh.");
    printCachedSummary(cachePaths);
    return;
  }

  const youtube = getYouTubeClient();
  const channelId = resolveChannelId(channelSlug);

  console.log(`Fetching channel status for ${channelId}...`);

  // 1. Channel info
  const channelRes = await youtube.channels.list({
    part: ["snippet", "statistics", "contentDetails"],
    id: [channelId],
  });

  const ch = channelRes.data.items?.[0];
  if (!ch) {
    console.error("Channel not found:", channelId);
    process.exit(1);
  }

  const uploadsPlaylistId =
    ch.contentDetails?.relatedPlaylists?.uploads || "";

  const channelSnapshot: ChannelSnapshot = {
    fetchedAt: new Date().toISOString(),
    channelId,
    title: ch.snippet?.title || "",
    handle: ch.snippet?.customUrl || "",
    subscriberCount: Number(ch.statistics?.subscriberCount) || 0,
    videoCount: Number(ch.statistics?.videoCount) || 0,
    totalViewCount: Number(ch.statistics?.viewCount) || 0,
    publishedAt: ch.snippet?.publishedAt || "",
    uploadsPlaylistId,
  };

  writeCache(cachePaths.channelSnapshot, channelSnapshot);
  console.log(
    `\nChannel: ${channelSnapshot.title} (${channelSnapshot.handle})`
  );
  console.log(`Subscribers: ${channelSnapshot.subscriberCount}`);
  console.log(`Videos: ${channelSnapshot.videoCount}`);
  console.log(`Total views: ${channelSnapshot.totalViewCount}`);

  // 2. Video list via uploads playlist (1 unit vs 100 for search.list)
  if (!uploadsPlaylistId) {
    console.error("No uploads playlist found");
    process.exit(1);
  }

  const videoIds: string[] = [];
  const videoSnippets: Map<
    string,
    { title: string; publishedAt: string }
  > = new Map();

  let nextPageToken: string | undefined;
  do {
    const plRes = await youtube.playlistItems.list({
      part: ["snippet", "contentDetails"],
      playlistId: uploadsPlaylistId,
      maxResults: 50,
      pageToken: nextPageToken,
    });

    for (const item of plRes.data.items || []) {
      const videoId = item.contentDetails?.videoId;
      if (videoId) {
        videoIds.push(videoId);
        videoSnippets.set(videoId, {
          title: item.snippet?.title || "",
          publishedAt: item.snippet?.publishedAt || "",
        });
      }
    }
    nextPageToken = plRes.data.nextPageToken || undefined;
  } while (nextPageToken);

  // 3. Get detailed stats for all videos (batch in groups of 50)
  const projects = listProjects(channelSlug);
  const projectsByTitle = new Map(
    projects.map((p) => [p.title, p.slug])
  );

  const videos: VideoCatalogEntry[] = [];

  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const vRes = await youtube.videos.list({
      part: ["snippet", "statistics", "contentDetails", "status"],
      id: batch,
    });

    for (const v of vRes.data.items || []) {
      const id = v.id!;
      const duration = v.contentDetails?.duration || "PT0S";
      const title = v.snippet?.title || "";

      // Try to match to local project by title
      let projectSlug = projectsByTitle.get(title) || null;
      // Also try matching by videoId in project configs
      if (!projectSlug) {
        for (const p of projects) {
          try {
            // Load config to check youtube.videoId
            const { loadProjectConfig } = await import(
              "../utils/project.js"
            );
            const config = loadProjectConfig(p.slug, channelSlug);
            if (config.youtube?.videoId === id) {
              projectSlug = p.slug;
              break;
            }
          } catch {
            // skip
          }
        }
      }

      videos.push({
        videoId: id,
        title,
        publishedAt:
          videoSnippets.get(id)?.publishedAt ||
          v.snippet?.publishedAt ||
          "",
        duration,
        durationSeconds: parseDuration(duration),
        privacyStatus: v.status?.privacyStatus || "unknown",
        views: Number(v.statistics?.viewCount) || 0,
        likes: Number(v.statistics?.likeCount) || 0,
        comments: Number(v.statistics?.commentCount) || 0,
        projectSlug,
      });
    }
  }

  // Sort by publish date (newest first)
  videos.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  const videoCatalog: VideoCatalog = {
    fetchedAt: new Date().toISOString(),
    channelId,
    videos,
  };

  writeCache(cachePaths.videoCatalog, videoCatalog);

  console.log(`\nVideo Catalog (${videos.length} videos):`);
  console.log("─".repeat(80));
  for (const v of videos) {
    const slug = v.projectSlug ? ` [${v.projectSlug}]` : "";
    console.log(
      `  ${v.publishedAt.split("T")[0]} | ${v.views.toLocaleString().padStart(8)} views | ${v.likes} likes | ${v.title}${slug}`
    );
  }
  console.log("─".repeat(80));
}

function printCachedSummary(cachePaths: ReturnType<typeof getCachePaths>) {
  const snapshot = readCache<ChannelSnapshot>(cachePaths.channelSnapshot);
  const catalog = readCache<VideoCatalog>(cachePaths.videoCatalog);

  if (snapshot) {
    console.log(
      `\nChannel: ${snapshot.title} (${snapshot.handle})`
    );
    console.log(`Subscribers: ${snapshot.subscriberCount}`);
    console.log(`Videos: ${snapshot.videoCount}`);
    console.log(`Total views: ${snapshot.totalViewCount}`);
    console.log(
      `Last fetched: ${snapshot.fetchedAt}`
    );
  }

  if (catalog && catalog.videos.length > 0) {
    console.log(`\nVideo Catalog (${catalog.videos.length} videos):`);
    console.log("─".repeat(80));
    for (const v of catalog.videos) {
      const slug = v.projectSlug ? ` [${v.projectSlug}]` : "";
      console.log(
        `  ${v.publishedAt.split("T")[0]} | ${v.views.toLocaleString().padStart(8)} views | ${v.likes} likes | ${v.title}${slug}`
      );
    }
    console.log("─".repeat(80));
  }
}

main().catch((err) => {
  console.error("Failed:", err.message || err);
  process.exit(1);
});
