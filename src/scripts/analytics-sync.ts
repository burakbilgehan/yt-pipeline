/**
 * Analytics Sync Script
 *
 * Daily batch job: fetches channel status + analytics for all active videos.
 * Designed to be run once per day (manually or via scheduler).
 *
 * Usage: npm run analytics:sync [--channel <slug>] [--force]
 *
 * What it does:
 * 1. Refreshes channel snapshot + video catalog (channel-status)
 * 2. For each published video < 30 days old: fetch full analytics + daily series
 * 3. For each published video > 30 days old: fetch snapshot only
 * 4. Logs quota usage estimate
 *
 * Estimated quota: ~5-10 units (Data API) + ~5-10 queries (Analytics API) per video
 */

import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  getYouTubeClient,
  getAnalyticsClient,
  resolveChannelId,
  parseDuration,
  toDateString,
} from "../utils/youtube.js";
import {
  getCachePaths,
  getVideoCachePaths,
  writeCache,
  readCache,
  isCacheStale,
  CACHE_TTL,
} from "../utils/cache.js";
import { getVideosDir, loadProjectConfig, ensureProjectDir } from "../utils/project.js";
import type {
  ChannelSnapshot,
  VideoCatalog,
  VideoCatalogEntry,
  AnalyticsSnapshot,
  DailyDataPoint,
  TrafficSourceEntry,
} from "../types/index.js";

interface SyncStats {
  channelRefreshed: boolean;
  videosScanned: number;
  analyticsRefreshed: number;
  errors: string[];
  startedAt: string;
  completedAt?: string;
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const channelIdx = args.indexOf("--channel");
  const channelSlug = channelIdx >= 0 ? args[channelIdx + 1] : undefined;

  const stats: SyncStats = {
    channelRefreshed: false,
    videosScanned: 0,
    analyticsRefreshed: 0,
    errors: [],
    startedAt: new Date().toISOString(),
  };

  console.log("═".repeat(60));
  console.log("  YouTube Analytics Sync");
  console.log("  " + new Date().toISOString());
  console.log("═".repeat(60));

  const youtube = getYouTubeClient();
  const analyticsApi = getAnalyticsClient();
  const cachePaths = getCachePaths(channelSlug);

  // ── Step 1: Channel snapshot ──
  console.log("\n[Step 1] Channel snapshot...");
  if (force || isCacheStale(cachePaths.channelSnapshot, CACHE_TTL.channelSnapshot)) {
    try {
      const channelId = resolveChannelId(channelSlug);
      const channelRes = await youtube.channels.list({
        part: ["snippet", "statistics", "contentDetails"],
        id: [channelId],
      });

      const ch = channelRes.data.items?.[0];
      if (ch) {
        const snapshot: ChannelSnapshot = {
          fetchedAt: new Date().toISOString(),
          channelId,
          title: ch.snippet?.title || "",
          handle: ch.snippet?.customUrl || "",
          subscriberCount: Number(ch.statistics?.subscriberCount) || 0,
          videoCount: Number(ch.statistics?.videoCount) || 0,
          totalViewCount: Number(ch.statistics?.viewCount) || 0,
          publishedAt: ch.snippet?.publishedAt || "",
          uploadsPlaylistId: ch.contentDetails?.relatedPlaylists?.uploads || "",
        };
        writeCache(cachePaths.channelSnapshot, snapshot);
        stats.channelRefreshed = true;
        console.log(`  Subscribers: ${snapshot.subscriberCount} | Videos: ${snapshot.videoCount} | Views: ${snapshot.totalViewCount}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      stats.errors.push(`Channel snapshot: ${msg}`);
      console.error(`  Failed: ${msg}`);
    }
  } else {
    console.log("  Cache fresh, skipping.");
  }

  // ── Step 2: Video catalog ──
  console.log("\n[Step 2] Video catalog...");
  let catalog: VideoCatalog | null = null;

  if (force || isCacheStale(cachePaths.videoCatalog, CACHE_TTL.videoCatalog)) {
    try {
      const channelSnapshot = readCache<ChannelSnapshot>(cachePaths.channelSnapshot);
      if (!channelSnapshot?.uploadsPlaylistId) {
        throw new Error("No uploads playlist — run channel snapshot first");
      }

      const videoIds: string[] = [];
      let nextPageToken: string | undefined;
      do {
        const plRes = await youtube.playlistItems.list({
          part: ["snippet", "contentDetails"],
          playlistId: channelSnapshot.uploadsPlaylistId,
          maxResults: 50,
          pageToken: nextPageToken,
        });
        for (const item of plRes.data.items || []) {
          const vid = item.contentDetails?.videoId;
          if (vid) videoIds.push(vid);
        }
        nextPageToken = plRes.data.nextPageToken || undefined;
      } while (nextPageToken);

      // Get stats in batches
      const videos: VideoCatalogEntry[] = [];
      for (let i = 0; i < videoIds.length; i += 50) {
        const batch = videoIds.slice(i, i + 50);
        const vRes = await youtube.videos.list({
          part: ["snippet", "statistics", "contentDetails", "status"],
          id: batch,
        });
        for (const v of vRes.data.items || []) {
          const duration = v.contentDetails?.duration || "PT0S";
          videos.push({
            videoId: v.id!,
            title: v.snippet?.title || "",
            publishedAt: v.snippet?.publishedAt || "",
            duration,
            durationSeconds: parseDuration(duration),
            privacyStatus: v.status?.privacyStatus || "unknown",
            views: Number(v.statistics?.viewCount) || 0,
            likes: Number(v.statistics?.likeCount) || 0,
            comments: Number(v.statistics?.commentCount) || 0,
            projectSlug: findProjectSlug(v.id!, v.snippet?.title || "", channelSlug),
          });
        }
      }

      videos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
      catalog = { fetchedAt: new Date().toISOString(), channelId: channelSnapshot.channelId, videos };
      writeCache(cachePaths.videoCatalog, catalog);
      console.log(`  ${videos.length} videos cataloged`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      stats.errors.push(`Video catalog: ${msg}`);
      console.error(`  Failed: ${msg}`);
    }
  } else {
    catalog = readCache<VideoCatalog>(cachePaths.videoCatalog);
    console.log("  Cache fresh, skipping.");
  }

  // ── Step 3: Per-video analytics ──
  if (!catalog || catalog.videos.length === 0) {
    console.log("\n[Step 3] No videos to analyze.");
  } else {
    console.log(`\n[Step 3] Per-video analytics (${catalog.videos.length} videos)...`);

    for (const video of catalog.videos) {
      stats.videosScanned++;
      const ageDays = Math.floor(
        (Date.now() - new Date(video.publishedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      const publishDate = video.publishedAt.split("T")[0];
      const today = toDateString(new Date());

      // Skip if no project slug and no way to save to project dir
      const needsDailyDetail = ageDays <= 30;

      console.log(`\n  ${video.title} (${ageDays}d old, ${video.views} views)`);

      try {
        // Core metrics
        const coreRes = await analyticsApi.reports.query({
          ids: "channel==MINE",
          startDate: publishDate,
          endDate: today,
          metrics: "views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,likes,dislikes,comments,shares,subscribersGained,subscribersLost",
          filters: `video==${video.videoId}`,
        });
        const row = coreRes.data.rows?.[0] || [];

        // Impressions + CTR
        let impressions = 0, ctr = 0;
        try {
          const impRes = await analyticsApi.reports.query({
            ids: "channel==MINE",
            startDate: publishDate,
            endDate: today,
            metrics: "views,impressions,impressionClickThroughRate",
            filters: `video==${video.videoId}`,
          });
          const impRow = impRes.data.rows?.[0] || [];
          impressions = Number(impRow[1]) || 0;
          ctr = Number(impRow[2]) || 0;
        } catch { /* impressions may not be available */ }

        // Traffic sources
        const trafficRes = await analyticsApi.reports.query({
          ids: "channel==MINE",
          startDate: publishDate,
          endDate: today,
          metrics: "views,estimatedMinutesWatched",
          dimensions: "insightTrafficSourceType",
          filters: `video==${video.videoId}`,
        });
        const trafficSources: Record<string, TrafficSourceEntry> = {};
        if (trafficRes.data.rows) {
          for (const tRow of trafficRes.data.rows) {
            trafficSources[String(tRow[0])] = {
              views: Number(tRow[1]),
              watchTimeMinutes: Number(tRow[2]) || 0,
            };
          }
        }

        const snapshot: AnalyticsSnapshot = {
          fetchedAt: new Date().toISOString(),
          videoId: video.videoId,
          views: Number(row[0]) || 0,
          watchTimeHours: Number(((Number(row[1]) || 0) / 60).toFixed(2)),
          averageViewDuration: Number(row[2]) || 0,
          averageViewPercentage: Number(row[3]) || 0,
          impressions,
          clickThroughRate: ctr,
          likes: Number(row[4]) || 0,
          dislikes: Number(row[5]) || 0,
          comments: Number(row[6]) || 0,
          shares: Number(row[7]) || 0,
          subscribersGained: Number(row[8]) || 0,
          subscribersLost: Number(row[9]) || 0,
          trafficSources,
        };

        // Save to cache
        const videoCachePaths = getVideoCachePaths(video.videoId);
        writeCache(videoCachePaths.snapshot, snapshot);

        // Save to project dir if we have a project slug
        if (video.projectSlug) {
          const analyticsDir = ensureProjectDir(video.projectSlug, "analytics");
          fs.writeFileSync(
            path.join(analyticsDir, `snapshot-${today}.json`),
            JSON.stringify(snapshot, null, 2)
          );
        }

        console.log(`    Views: ${snapshot.views} | CTR: ${snapshot.clickThroughRate.toFixed(1)}% | Avg: ${snapshot.averageViewDuration.toFixed(0)}s | Imp: ${snapshot.impressions}`);

        // Daily series for recent videos
        if (needsDailyDetail) {
          try {
            const dailyRes = await analyticsApi.reports.query({
              ids: "channel==MINE",
              startDate: publishDate,
              endDate: today,
              dimensions: "day",
              metrics: "views,estimatedMinutesWatched,averageViewDuration,likes,shares,subscribersGained,subscribersLost",
              filters: `video==${video.videoId}`,
              sort: "day",
            });

            const dailyPoints: DailyDataPoint[] = [];
            if (dailyRes.data.rows) {
              for (const r of dailyRes.data.rows) {
                dailyPoints.push({
                  date: String(r[0]),
                  views: Number(r[1]) || 0,
                  watchTimeMinutes: Number(r[2]) || 0,
                  impressions: 0, // would need separate query, skip in batch
                  ctr: 0,
                  likes: Number(r[4]) || 0,
                  shares: Number(r[5]) || 0,
                  subscribersGained: Number(r[6]) || 0,
                  subscribersLost: Number(r[7]) || 0,
                  averageViewDuration: Number(r[3]) || 0,
                });
              }
            }

            const dailyData = { fetchedAt: new Date().toISOString(), videoId: video.videoId, points: dailyPoints };
            writeCache(videoCachePaths.dailySeries, dailyData);

            if (video.projectSlug) {
              const analyticsDir = ensureProjectDir(video.projectSlug, "analytics");
              fs.writeFileSync(
                path.join(analyticsDir, "daily-series.json"),
                JSON.stringify(dailyData, null, 2)
              );
            }

            console.log(`    Daily: ${dailyPoints.length} data points`);
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.warn(`    Daily series failed: ${msg}`);
          }
        }

        stats.analyticsRefreshed++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        stats.errors.push(`${video.title}: ${msg}`);
        console.error(`    Failed: ${msg}`);
      }
    }
  }

  // ── Summary ──
  stats.completedAt = new Date().toISOString();

  console.log(`\n${"═".repeat(60)}`);
  console.log("  Sync Complete");
  console.log(`${"═".repeat(60)}`);
  console.log(`  Channel refreshed:    ${stats.channelRefreshed ? "Yes" : "No (cache fresh)"}`);
  console.log(`  Videos scanned:       ${stats.videosScanned}`);
  console.log(`  Analytics refreshed:  ${stats.analyticsRefreshed}`);
  console.log(`  Errors:               ${stats.errors.length}`);
  if (stats.errors.length > 0) {
    for (const e of stats.errors) {
      console.log(`    - ${e}`);
    }
  }
  console.log(`  Duration:             ${((new Date(stats.completedAt).getTime() - new Date(stats.startedAt).getTime()) / 1000).toFixed(1)}s`);
  console.log(`${"═".repeat(60)}`);

  // Save sync log to cache
  const cachePaths2 = getCachePaths(channelSlug);
  writeCache(
    path.join(path.dirname(cachePaths2.channelSnapshot), "last-sync.json"),
    stats
  );
}

function findProjectSlug(videoId: string, title: string, channelSlug?: string): string | null {
  const videosDir = getVideosDir(channelSlug);
  if (!fs.existsSync(videosDir)) return null;

  const entries = fs.readdirSync(videosDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const configPath = path.join(videosDir, entry.name, "config.json");
    if (!fs.existsSync(configPath)) continue;
    try {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (config.youtube?.videoId === videoId) return entry.name;
      if (config.title === title) return entry.name;
    } catch { /* skip */ }
  }
  return null;
}

main().catch((err) => {
  console.error("Sync failed:", err.message || err);
  process.exit(1);
});
