/**
 * Fetch YouTube Analytics Script
 *
 * Pulls analytics data for a video or the entire channel.
 *
 * Usage: npm run analytics <project-slug|channel>
 *
 * Writes: projects/<slug>/analytics/snapshot-YYYY-MM-DD.json
 */

import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { google } from "googleapis";
import type { AnalyticsSnapshot } from "../types/index.js";
import {
  getProjectDir,
  loadProjectConfig,
  ensureProjectDir,
} from "../utils/project.js";

async function main() {
  const target = process.argv[2];

  if (!target) {
    console.error("Usage: npm run analytics <project-slug|channel>");
    process.exit(1);
  }

  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.error("Missing YouTube API credentials in .env");
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const youtubeAnalytics = google.youtubeAnalytics({
    version: "v2",
    auth: oauth2Client,
  });

  if (target === "channel") {
    await fetchChannelAnalytics(youtubeAnalytics);
  } else {
    await fetchVideoAnalytics(youtubeAnalytics, target);
  }
}

async function fetchVideoAnalytics(
  analytics: ReturnType<typeof google.youtubeAnalytics>,
  slug: string
) {
  const config = loadProjectConfig(slug);

  if (!config.youtube?.videoId) {
    console.error(`Video not published yet for project: ${slug}`);
    process.exit(1);
  }

  const videoId = config.youtube.videoId;
  const publishedDate = config.youtube.publishedAt.split("T")[0];
  const today = new Date().toISOString().split("T")[0];

  console.log(`Fetching analytics for video: ${videoId}`);

  try {
    const response = await analytics.reports.query({
      ids: "channel==MINE",
      startDate: publishedDate,
      endDate: today,
      metrics:
        "views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,likes,dislikes,comments,subscribersGained",
      filters: `video==${videoId}`,
    });

    const row = response.data.rows?.[0] || [];

    const snapshot: AnalyticsSnapshot = {
      fetchedAt: new Date().toISOString(),
      videoId,
      views: Number(row[0]) || 0,
      watchTimeHours: Number(((Number(row[1]) || 0) / 60).toFixed(2)),
      averageViewDuration: Number(row[2]) || 0,
      averageViewPercentage: Number(row[3]) || 0,
      clickThroughRate: 0, // CTR requires separate query
      likes: Number(row[4]) || 0,
      dislikes: Number(row[5]) || 0,
      comments: Number(row[6]) || 0,
      subscribersGained: Number(row[7]) || 0,
      trafficSources: {},
    };

    // Fetch traffic sources
    const trafficResponse = await analytics.reports.query({
      ids: "channel==MINE",
      startDate: publishedDate,
      endDate: today,
      metrics: "views",
      dimensions: "insightTrafficSourceType",
      filters: `video==${videoId}`,
    });

    if (trafficResponse.data.rows) {
      for (const tRow of trafficResponse.data.rows) {
        snapshot.trafficSources[String(tRow[0])] = Number(tRow[1]);
      }
    }

    // Save snapshot
    const analyticsDir = ensureProjectDir(slug, "analytics");
    const snapshotPath = path.join(analyticsDir, `snapshot-${today}.json`);
    fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));

    console.log(`\nAnalytics snapshot saved: ${snapshotPath}`);
    console.log(`Views: ${snapshot.views}`);
    console.log(`Watch time: ${snapshot.watchTimeHours} hours`);
    console.log(`Avg view duration: ${snapshot.averageViewDuration}s`);
    console.log(`Likes: ${snapshot.likes}`);
    console.log(`Subscribers gained: ${snapshot.subscribersGained}`);
  } catch (error) {
    console.error("Failed to fetch analytics:", error);
    process.exit(1);
  }
}

async function fetchChannelAnalytics(
  analytics: ReturnType<typeof google.youtubeAnalytics>
) {
  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  console.log(`Fetching channel analytics (last 30 days)...`);

  try {
    const response = await analytics.reports.query({
      ids: "channel==MINE",
      startDate: thirtyDaysAgo,
      endDate: today,
      metrics:
        "views,estimatedMinutesWatched,averageViewDuration,likes,subscribersGained,subscribersLost",
    });

    const row = response.data.rows?.[0] || [];

    console.log(`\nChannel Analytics (Last 30 Days)`);
    console.log(`Views: ${row[0]}`);
    console.log(`Watch time: ${((Number(row[1]) || 0) / 60).toFixed(1)} hours`);
    console.log(`Avg view duration: ${row[2]}s`);
    console.log(`Likes: ${row[3]}`);
    console.log(`Subscribers gained: ${row[4]}`);
    console.log(`Subscribers lost: ${row[5]}`);
    console.log(
      `Net subscribers: ${(Number(row[4]) || 0) - (Number(row[5]) || 0)}`
    );
  } catch (error) {
    console.error("Failed to fetch channel analytics:", error);
    process.exit(1);
  }
}

main();
