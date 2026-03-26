/**
 * Cache utility for YouTube data.
 *
 * All cached data lives in channels/<channel>/cache/.
 * Agents read from cache; only scripts (analytics:sync, channel-status, etc.) write to cache.
 *
 * Cache files include a `fetchedAt` timestamp. TTL is checked by the caller.
 */

import * as fs from "node:fs";
import * as path from "node:path";

const CHANNELS_DIR = path.resolve("channels");

/**
 * Get the cache directory for a channel.
 * Creates it if it doesn't exist.
 */
export function getCacheDir(channelSlug?: string): string {
  let baseDir: string;

  if (channelSlug) {
    baseDir = path.join(CHANNELS_DIR, channelSlug);
  } else {
    // Auto-detect first channel
    if (fs.existsSync(CHANNELS_DIR)) {
      const entries = fs.readdirSync(CHANNELS_DIR, { withFileTypes: true });
      const first = entries.find((e) => e.isDirectory());
      if (first) {
        baseDir = path.join(CHANNELS_DIR, first.name);
      } else {
        throw new Error("No channels found in channels/");
      }
    } else {
      throw new Error("channels/ directory not found");
    }
  }

  const cacheDir = path.join(baseDir, "cache");
  fs.mkdirSync(cacheDir, { recursive: true });
  return cacheDir;
}

/**
 * Get the cache directory for a specific video's analytics.
 */
export function getVideoCacheDir(
  videoId: string,
  channelSlug?: string
): string {
  const dir = path.join(getCacheDir(channelSlug), "videos", videoId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Read a cached JSON file. Returns null if file doesn't exist.
 */
export function readCache<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}

/**
 * Write a JSON object to cache.
 */
export function writeCache<T>(filePath: string, data: T): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * Check if a cache file is stale (older than TTL hours).
 * Returns true if stale or missing.
 */
export function isCacheStale(
  filePath: string,
  ttlHours: number
): boolean {
  if (!fs.existsSync(filePath)) return true;

  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    if (!data.fetchedAt) return true;

    const fetchedAt = new Date(data.fetchedAt).getTime();
    const now = Date.now();
    const ageHours = (now - fetchedAt) / (1000 * 60 * 60);

    return ageHours > ttlHours;
  } catch {
    return true;
  }
}

/**
 * Get standard cache file paths for a channel.
 */
export function getCachePaths(channelSlug?: string) {
  const cacheDir = getCacheDir(channelSlug);
  return {
    channelSnapshot: path.join(cacheDir, "channel-snapshot.json"),
    videoCatalog: path.join(cacheDir, "video-catalog.json"),
    channelBenchmarks: path.join(cacheDir, "channel-benchmarks.json"),
    videosDir: path.join(cacheDir, "videos"),
  };
}

/**
 * Get cache paths for a specific video.
 */
export function getVideoCachePaths(videoId: string, channelSlug?: string) {
  const videoDir = getVideoCacheDir(videoId, channelSlug);
  const today = new Date().toISOString().split("T")[0];
  return {
    snapshot: path.join(videoDir, `snapshot-${today}.json`),
    dailySeries: path.join(videoDir, "daily-series.json"),
    trafficDetail: path.join(videoDir, "traffic-detail.json"),
    searchTerms: path.join(videoDir, "search-terms.json"),
  };
}

/**
 * Default TTL values in hours.
 */
export const CACHE_TTL = {
  channelSnapshot: 24,
  videoCatalog: 24,
  channelBenchmarks: 24,
  videoSnapshot: 24,
  dailySeries: 24,
  trafficDetail: 24,
  searchTerms: 168, // weekly
} as const;
