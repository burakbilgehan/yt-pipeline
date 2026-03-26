/**
 * Fetch YouTube Analytics Script (Enhanced)
 *
 * Pulls detailed analytics data for a video or the entire channel.
 * Stores results in both project analytics dir and channel cache.
 *
 * Usage:
 *   npm run analytics <project-slug>        # Video analytics
 *   npm run analytics channel               # Channel-level summary
 *   npm run analytics <slug> --daily        # Fetch daily time-series
 *   npm run analytics <slug> --search-terms # Fetch search term detail
 *   npm run analytics <slug> --all          # Fetch everything
 *
 * Quota: YouTube Analytics API v2 (separate quota, more generous than Data API v3)
 */

import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  getAnalyticsClient,
  toDateString,
  daysAgo,
} from "../utils/youtube.js";
import {
  getVideoCacheDir,
  getVideoCachePaths,
  getCachePaths,
  writeCache,
} from "../utils/cache.js";
import {
  getProjectDir,
  loadProjectConfig,
  ensureProjectDir,
} from "../utils/project.js";
import type {
  AnalyticsSnapshot,
  DailyDataPoint,
  TrafficSourceEntry,
} from "../types/index.js";

async function main() {
  const args = process.argv.slice(2);
  const target = args.find((a) => !a.startsWith("--"));
  const fetchDaily = args.includes("--daily") || args.includes("--all");
  const fetchSearchTerms = args.includes("--search-terms") || args.includes("--all");
  const fetchAll = args.includes("--all");

  if (!target) {
    console.error("Usage: npm run analytics <project-slug|channel> [--daily] [--search-terms] [--all]");
    process.exit(1);
  }

  const analytics = getAnalyticsClient();

  if (target === "channel") {
    await fetchChannelAnalytics(analytics);
  } else {
    await fetchVideoAnalytics(analytics, target, {
      daily: fetchDaily,
      searchTerms: fetchSearchTerms,
    });
  }
}

async function fetchVideoAnalytics(
  analytics: ReturnType<typeof getAnalyticsClient>,
  slug: string,
  options: { daily: boolean; searchTerms: boolean }
) {
  const config = loadProjectConfig(slug);

  if (!config.youtube?.videoId) {
    console.error(`Video not published yet for project: ${slug}`);
    process.exit(1);
  }

  const videoId = config.youtube.videoId;
  const publishedDate = config.youtube.publishedAt.split("T")[0];
  const today = toDateString(new Date());

  console.log(`Fetching analytics for video: ${videoId} (${slug})`);
  console.log(`Period: ${publishedDate} → ${today}`);

  // ── Query 1: Core metrics ──
  console.log("\n[1/5] Core metrics...");
  const coreRes = await analytics.reports.query({
    ids: "channel==MINE",
    startDate: publishedDate,
    endDate: today,
    metrics:
      "views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,likes,dislikes,comments,shares,subscribersGained,subscribersLost",
    filters: `video==${videoId}`,
  });

  const row = coreRes.data.rows?.[0] || [];

  // ── Query 2: Impressions + CTR (separate query — can't combine with core metrics) ──
  console.log("[2/5] Impressions & CTR...");
  let impressions = 0;
  let ctr = 0;
  try {
    const impRes = await analytics.reports.query({
      ids: "channel==MINE",
      startDate: publishedDate,
      endDate: today,
      metrics: "views,impressions,impressionClickThroughRate",
      filters: `video==${videoId}`,
    });
    const impRow = impRes.data.rows?.[0] || [];
    impressions = Number(impRow[1]) || 0;
    ctr = Number(impRow[2]) || 0;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`  Impressions query failed (may need more data): ${msg}`);
  }

  // ── Query 3: Traffic sources with watch time ──
  console.log("[3/5] Traffic sources...");
  const trafficRes = await analytics.reports.query({
    ids: "channel==MINE",
    startDate: publishedDate,
    endDate: today,
    metrics: "views,estimatedMinutesWatched",
    dimensions: "insightTrafficSourceType",
    filters: `video==${videoId}`,
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

  // Build snapshot
  const snapshot: AnalyticsSnapshot = {
    fetchedAt: new Date().toISOString(),
    videoId,
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

  // Save to project analytics dir
  const analyticsDir = ensureProjectDir(slug, "analytics");
  const snapshotPath = path.join(analyticsDir, `snapshot-${today}.json`);
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));

  // Save to cache
  const videoCachePaths = getVideoCachePaths(videoId);
  writeCache(videoCachePaths.snapshot, snapshot);

  console.log(`\nSnapshot saved: ${snapshotPath}`);
  printVideoSummary(snapshot);

  // ── Query 4: Daily time-series (optional) ──
  if (options.daily) {
    console.log("\n[4/5] Daily time-series...");
    await fetchDailySeries(analytics, videoId, publishedDate, today, slug);
  } else {
    console.log("[4/5] Daily time-series... (skipped, use --daily)");
  }

  // ── Query 5: Search terms (optional) ──
  if (options.searchTerms) {
    console.log("\n[5/5] Search terms...");
    await fetchSearchTerms(analytics, videoId, publishedDate, today, slug);
  } else {
    console.log("[5/5] Search terms... (skipped, use --search-terms)");
  }
}

async function fetchDailySeries(
  analytics: ReturnType<typeof getAnalyticsClient>,
  videoId: string,
  startDate: string,
  endDate: string,
  slug: string
) {
  try {
    // Core daily metrics
    const dailyRes = await analytics.reports.query({
      ids: "channel==MINE",
      startDate,
      endDate,
      dimensions: "day",
      metrics:
        "views,estimatedMinutesWatched,averageViewDuration,likes,shares,subscribersGained,subscribersLost",
      filters: `video==${videoId}`,
      sort: "day",
    });

    // Daily impressions + CTR (separate query)
    let dailyImpMap: Map<string, { impressions: number; ctr: number }> = new Map();
    try {
      const impDailyRes = await analytics.reports.query({
        ids: "channel==MINE",
        startDate,
        endDate,
        dimensions: "day",
        metrics: "impressions,impressionClickThroughRate",
        filters: `video==${videoId}`,
        sort: "day",
      });

      if (impDailyRes.data.rows) {
        for (const r of impDailyRes.data.rows) {
          dailyImpMap.set(String(r[0]), {
            impressions: Number(r[1]) || 0,
            ctr: Number(r[2]) || 0,
          });
        }
      }
    } catch {
      console.warn("  Daily impressions query failed — filling with 0");
    }

    const dailyPoints: DailyDataPoint[] = [];
    if (dailyRes.data.rows) {
      for (const r of dailyRes.data.rows) {
        const date = String(r[0]);
        const imp = dailyImpMap.get(date) || { impressions: 0, ctr: 0 };

        dailyPoints.push({
          date,
          views: Number(r[1]) || 0,
          watchTimeMinutes: Number(r[2]) || 0,
          impressions: imp.impressions,
          ctr: imp.ctr,
          likes: Number(r[4]) || 0,
          shares: Number(r[5]) || 0,
          subscribersGained: Number(r[6]) || 0,
          subscribersLost: Number(r[7]) || 0,
          averageViewDuration: Number(r[3]) || 0,
        });
      }
    }

    // Save
    const dailyData = {
      fetchedAt: new Date().toISOString(),
      videoId,
      startDate,
      endDate,
      points: dailyPoints,
    };

    const analyticsDir = ensureProjectDir(slug, "analytics");
    const dailyPath = path.join(analyticsDir, "daily-series.json");
    fs.writeFileSync(dailyPath, JSON.stringify(dailyData, null, 2));

    const videoCachePaths = getVideoCachePaths(videoId);
    writeCache(videoCachePaths.dailySeries, dailyData);

    console.log(`  ${dailyPoints.length} daily data points saved`);

    // Print mini chart
    if (dailyPoints.length > 0) {
      console.log("\n  Date       | Views | Imp   | CTR   | Avg Duration");
      console.log("  " + "─".repeat(56));
      for (const d of dailyPoints.slice(-14)) {
        // last 14 days
        console.log(
          `  ${d.date} | ${String(d.views).padStart(5)} | ${String(d.impressions).padStart(5)} | ${d.ctr.toFixed(1).padStart(4)}% | ${d.averageViewDuration.toFixed(0)}s`
        );
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  Daily series fetch failed: ${msg}`);
  }
}

async function fetchSearchTerms(
  analytics: ReturnType<typeof getAnalyticsClient>,
  videoId: string,
  startDate: string,
  endDate: string,
  slug: string
) {
  try {
    const res = await analytics.reports.query({
      ids: "channel==MINE",
      startDate,
      endDate,
      dimensions: "insightTrafficSourceDetail",
      metrics: "views,estimatedMinutesWatched",
      filters: `video==${videoId};insightTrafficSourceType==YT_SEARCH`,
      sort: "-views",
      maxResults: 50,
    });

    const terms: Array<{ term: string; views: number; watchTimeMinutes: number }> = [];
    if (res.data.rows) {
      for (const r of res.data.rows) {
        terms.push({
          term: String(r[0]),
          views: Number(r[1]) || 0,
          watchTimeMinutes: Number(r[2]) || 0,
        });
      }
    }

    const termsData = {
      fetchedAt: new Date().toISOString(),
      videoId,
      terms,
    };

    const analyticsDir = ensureProjectDir(slug, "analytics");
    const termsPath = path.join(analyticsDir, "search-terms.json");
    fs.writeFileSync(termsPath, JSON.stringify(termsData, null, 2));

    const videoCachePaths = getVideoCachePaths(videoId);
    writeCache(videoCachePaths.searchTerms, termsData);

    console.log(`  ${terms.length} search terms found`);
    if (terms.length > 0) {
      console.log("\n  Top search terms:");
      for (const t of terms.slice(0, 10)) {
        console.log(`    ${String(t.views).padStart(5)} views | ${t.term}`);
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  Search terms fetch failed: ${msg}`);
  }
}

async function fetchChannelAnalytics(
  analytics: ReturnType<typeof getAnalyticsClient>
) {
  const today = toDateString(new Date());
  const start = daysAgo(30);

  console.log(`Fetching channel analytics (last 30 days)...`);

  try {
    const response = await analytics.reports.query({
      ids: "channel==MINE",
      startDate: start,
      endDate: today,
      metrics:
        "views,estimatedMinutesWatched,averageViewDuration,likes,subscribersGained,subscribersLost,shares,impressions,impressionClickThroughRate",
    });

    const row = response.data.rows?.[0] || [];

    console.log(`\nChannel Analytics (Last 30 Days)`);
    console.log("─".repeat(40));
    console.log(`Views:            ${row[0]}`);
    console.log(`Watch time:       ${((Number(row[1]) || 0) / 60).toFixed(1)} hours`);
    console.log(`Avg view duration: ${row[2]}s`);
    console.log(`Likes:            ${row[3]}`);
    console.log(`Subs gained:      ${row[4]}`);
    console.log(`Subs lost:        ${row[5]}`);
    console.log(`Net subscribers:  ${(Number(row[4]) || 0) - (Number(row[5]) || 0)}`);
    console.log(`Shares:           ${row[6]}`);
    console.log(`Impressions:      ${row[7]}`);
    console.log(`CTR:              ${Number(row[8] || 0).toFixed(1)}%`);
    console.log("─".repeat(40));

    // Save to cache
    const channelAnalytics = {
      fetchedAt: new Date().toISOString(),
      period: "last_30_days",
      views: Number(row[0]) || 0,
      watchTimeHours: Number(((Number(row[1]) || 0) / 60).toFixed(2)),
      avgViewDuration: Number(row[2]) || 0,
      likes: Number(row[3]) || 0,
      subscribersGained: Number(row[4]) || 0,
      subscribersLost: Number(row[5]) || 0,
      shares: Number(row[6]) || 0,
      impressions: Number(row[7]) || 0,
      ctr: Number(row[8]) || 0,
    };

    const cachePaths = getCachePaths();
    writeCache(
      path.join(path.dirname(cachePaths.channelSnapshot), "channel-analytics-30d.json"),
      channelAnalytics
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Failed to fetch channel analytics:", msg);
    process.exit(1);
  }
}

function printVideoSummary(s: AnalyticsSnapshot) {
  console.log(`\n${"═".repeat(50)}`);
  console.log(`  Views:              ${s.views.toLocaleString()}`);
  console.log(`  Watch time:         ${s.watchTimeHours} hours`);
  console.log(`  Avg view duration:  ${s.averageViewDuration.toFixed(0)}s`);
  console.log(`  Avg view %:         ${s.averageViewPercentage.toFixed(1)}%`);
  console.log(`  Impressions:        ${s.impressions.toLocaleString()}`);
  console.log(`  CTR:                ${s.clickThroughRate.toFixed(1)}%`);
  console.log(`  Likes:              ${s.likes}`);
  console.log(`  Comments:           ${s.comments}`);
  console.log(`  Shares:             ${s.shares}`);
  console.log(`  Subs gained:        ${s.subscribersGained}`);
  console.log(`  Subs lost:          ${s.subscribersLost}`);
  console.log(`${"─".repeat(50)}`);

  if (Object.keys(s.trafficSources).length > 0) {
    console.log(`  Traffic Sources:`);
    const sorted = Object.entries(s.trafficSources).sort(
      (a, b) => b[1].views - a[1].views
    );
    for (const [source, data] of sorted) {
      console.log(
        `    ${source.padEnd(25)} ${String(data.views).padStart(6)} views | ${data.watchTimeMinutes.toFixed(0)} min`
      );
    }
  }
  console.log(`${"═".repeat(50)}`);
}

main();
