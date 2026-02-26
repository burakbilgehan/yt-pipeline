/**
 * AI Image Generation Script
 *
 * Generates images using OpenAI's DALL-E API.
 *
 * Usage: npm run generate-image <project-slug> <prompt>
 *
 * Writes: projects/<slug>/production/visuals/
 */

import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { ensureProjectDir, appendAssetLog } from "../utils/project.js";

async function main() {
  const slug = process.argv[2];
  const prompt = process.argv.slice(3).join(" ");

  if (!slug || !prompt) {
    console.error('Usage: npm run generate-image <project-slug> "image description"');
    process.exit(1);
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error("Missing OPENAI_API_KEY in .env");
    process.exit(1);
  }

  const visualsDir = ensureProjectDir(slug, "production/visuals");

  console.log(`Generating image: "${prompt}"...`);

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1792x1024", // Landscape, close to 16:9
      quality: "standard",
      response_format: "b64_json",
    }),
  });

  if (!response.ok) {
    console.error(`OpenAI API error: ${response.status}`);
    const body = await response.text();
    console.error(body);
    process.exit(1);
  }

  const data = (await response.json()) as {
    data: Array<{ b64_json: string; revised_prompt: string }>;
  };

  const image = data.data[0];
  const buffer = Buffer.from(image.b64_json, "base64");

  const sanitizedPrompt = prompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  const filename = `dalle-${Date.now()}-${sanitizedPrompt}.png`;
  const filePath = path.join(visualsDir, filename);

  fs.writeFileSync(filePath, buffer);

  console.log(`Image saved: ${filePath}`);
  console.log(`Revised prompt: ${image.revised_prompt}`);

  // Append to shared asset log
  appendAssetLog(slug, {
    type: "ai-image",
    source: "DALL-E 3",
    file: `visuals/${filename}`,
    license: "Generated",
    query: prompt,
  });
}

main();
