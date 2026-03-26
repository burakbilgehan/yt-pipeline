/**
 * Shared YouTube API utility — centralizes auth and common API calls.
 *
 * All YouTube API access should go through this module.
 * Scripts call these functions; agents read from cache (never call API directly).
 */

import "dotenv/config";
import { google, type youtube_v3 } from "googleapis";
import { loadChannelConfig } from "./project.js";

let _youtubeClient: youtube_v3.Youtube | null = null;
let _analyticsClient: ReturnType<typeof google.youtubeAnalytics> | null = null;

/**
 * Get an authenticated YouTube Data API v3 client (singleton).
 */
export function getYouTubeClient(): youtube_v3.Youtube {
  if (_youtubeClient) return _youtubeClient;

  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Missing YouTube API credentials. Set YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN in .env"
    );
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  _youtubeClient = google.youtube({ version: "v3", auth: oauth2Client });
  return _youtubeClient;
}

/**
 * Get an authenticated YouTube Analytics API v2 client (singleton).
 */
export function getAnalyticsClient() {
  if (_analyticsClient) return _analyticsClient;

  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing YouTube API credentials in .env");
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  _analyticsClient = google.youtubeAnalytics({
    version: "v2",
    auth: oauth2Client,
  });
  return _analyticsClient;
}

/**
 * Resolve the channel ID — from channel-config.json or .env fallback.
 */
export function resolveChannelId(channelSlug?: string): string {
  // Try channel-config.json first
  try {
    const config = loadChannelConfig(channelSlug);
    if ((config.channel as Record<string, unknown>).channelId) {
      return (config.channel as Record<string, unknown>).channelId as string;
    }
  } catch {
    // fall through
  }

  // .env fallback
  if (process.env.YOUTUBE_CHANNEL_ID) {
    return process.env.YOUTUBE_CHANNEL_ID;
  }

  throw new Error(
    "No channel ID found. Set channelId in channel-config.json or YOUTUBE_CHANNEL_ID in .env"
  );
}

/**
 * Parse ISO 8601 duration (PT8M38S) to seconds.
 */
export function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Format date as YYYY-MM-DD.
 */
export function toDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Get a date N days ago as YYYY-MM-DD.
 */
export function daysAgo(n: number): string {
  return toDateString(new Date(Date.now() - n * 24 * 60 * 60 * 1000));
}
