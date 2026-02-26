/**
 * Stock Media Collection Script
 *
 * Searches and downloads stock images/videos from Pexels and Unsplash.
 *
 * Usage: npm run collect <project-slug> <type> <query>
 *   type: image | video
 *   query: search terms
 *
 * Writes: projects/<slug>/production/visuals/
 */

import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { ensureProjectDir, appendAssetLog } from "../utils/project.js";

interface PexelsPhoto {
  id: number;
  src: { original: string; large2x: string };
  photographer: string;
  alt: string;
}

interface PexelsVideo {
  id: number;
  video_files: Array<{ link: string; quality: string; width: number }>;
  user: { name: string };
}

async function main() {
  const slug = process.argv[2];
  const type = process.argv[3] as "image" | "video";
  const query = process.argv.slice(4).join(" ");

  if (!slug || !type || !query) {
    console.error("Usage: npm run collect <project-slug> <image|video> <search query>");
    process.exit(1);
  }

  const visualsDir = ensureProjectDir(slug, "production/visuals");

  const pexelsKey = process.env.PEXELS_API_KEY;

  if (!pexelsKey) {
    console.error("Missing PEXELS_API_KEY in .env");
    process.exit(1);
  }

  if (type === "image") {
    await searchPexelsImages(pexelsKey, query, visualsDir, slug);
  } else if (type === "video") {
    await searchPexelsVideos(pexelsKey, query, visualsDir, slug);
  } else {
    console.error(`Unknown type: ${type}. Use "image" or "video".`);
    process.exit(1);
  }
}

async function searchPexelsImages(
  apiKey: string,
  query: string,
  outputDir: string,
  slug: string
) {
  console.log(`Searching Pexels for images: "${query}"...`);

  const response = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`,
    {
      headers: { Authorization: apiKey },
    }
  );

  if (!response.ok) {
    console.error(`Pexels API error: ${response.status}`);
    process.exit(1);
  }

  const data = (await response.json()) as { photos: PexelsPhoto[] };

  if (!data.photos?.length) {
    console.log("No images found.");
    return;
  }

  console.log(`Found ${data.photos.length} images. Downloading...`);

  for (let i = 0; i < data.photos.length; i++) {
    const photo = data.photos[i];
    const ext = "jpg";
    const filename = `pexels-${photo.id}-${sanitize(query)}.${ext}`;
    const filePath = path.join(outputDir, filename);

    const imgResponse = await fetch(photo.src.large2x);
    const buffer = Buffer.from(await imgResponse.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    console.log(`  [${i + 1}] ${filename} (by ${photo.photographer})`);

    appendAssetLog(slug, {
      type: "stock-image",
      source: `Pexels (${photo.id})`,
      file: `visuals/${filename}`,
      license: "Pexels License",
      query,
    });
  }

  console.log("\nDone!");
}

async function searchPexelsVideos(
  apiKey: string,
  query: string,
  outputDir: string,
  slug: string
) {
  console.log(`Searching Pexels for videos: "${query}"...`);

  const response = await fetch(
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`,
    {
      headers: { Authorization: apiKey },
    }
  );

  if (!response.ok) {
    console.error(`Pexels API error: ${response.status}`);
    process.exit(1);
  }

  const data = (await response.json()) as { videos: PexelsVideo[] };

  if (!data.videos?.length) {
    console.log("No videos found.");
    return;
  }

  console.log(`Found ${data.videos.length} videos. Downloading...`);

  for (let i = 0; i < data.videos.length; i++) {
    const video = data.videos[i];
    // Pick the highest quality HD file
    const file = video.video_files
      .filter((f) => f.width >= 1920)
      .sort((a, b) => b.width - a.width)[0] || video.video_files[0];

    const filename = `pexels-${video.id}-${sanitize(query)}.mp4`;
    const filePath = path.join(outputDir, filename);

    const vidResponse = await fetch(file.link);
    const buffer = Buffer.from(await vidResponse.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    console.log(`  [${i + 1}] ${filename} (by ${video.user.name})`);

    appendAssetLog(slug, {
      type: "stock-video",
      source: `Pexels (${video.id})`,
      file: `visuals/${filename}`,
      license: "Pexels License",
      query,
    });
  }

  console.log("\nDone!");
}

function sanitize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
}

main();
