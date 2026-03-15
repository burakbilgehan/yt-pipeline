/**
 * AI Image Generation Script — Gemini Imagen
 *
 * Generates images using Google's Gemini API with image generation capabilities.
 *
 * Usage: npm run generate-image:gemini <project-slug> <prompt> [--format short|long]
 *
 * Writes: projects/<slug>/production/visuals/
 */

import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { ensureProjectDir, appendAssetLog } from "../utils/project.js";

async function main() {
  const args = process.argv.slice(2);
  const slug = args[0];

  // Parse --format flag
  const formatFlagIndex = args.indexOf("--format");
  let format: "long" | "short" = "long";
  if (formatFlagIndex !== -1 && args[formatFlagIndex + 1]) {
    format = args[formatFlagIndex + 1] as "long" | "short";
  }

  // Collect prompt (everything except slug and --format flag)
  const promptParts = args.slice(1).filter((_, i) => {
    const argIndex = i + 1; // offset since we sliced from index 1
    return argIndex !== formatFlagIndex && argIndex !== formatFlagIndex + 1;
  });
  // Re-filter: remove --format and its value from prompt parts
  const prompt = args
    .slice(1)
    .filter((arg, i) => {
      const absIndex = i + 1;
      if (absIndex === formatFlagIndex) return false;
      if (formatFlagIndex !== -1 && absIndex === formatFlagIndex + 1) return false;
      return true;
    })
    .join(" ");

  if (!slug || !prompt) {
    console.error('Usage: npm run generate-image:gemini <project-slug> "image description" [--format short|long]');
    process.exit(1);
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    console.error("Missing GOOGLE_AI_API_KEY in .env");
    process.exit(1);
  }

  const visualsDir = ensureProjectDir(slug, "production/visuals");

  // Determine image dimensions based on format
  const aspectRatio = format === "short" ? "9:16" : "16:9";

  console.log(`Generating image with Gemini (${aspectRatio}): "${prompt}"...`);

  // Use Gemini's image generation via the REST API
  // Model: gemini-2.0-flash-exp with image generation
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Generate a high-quality image: ${prompt}. Style: photorealistic, cinematic lighting, ultra detailed.`,
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
        },
      }),
    }
  );

  if (!response.ok) {
    console.error(`Gemini API error: ${response.status}`);
    const body = await response.text();
    console.error(body);
    process.exit(1);
  }

  const data = (await response.json()) as {
    candidates: Array<{
      content: {
        parts: Array<{
          text?: string;
          inlineData?: { mimeType: string; data: string };
        }>;
      };
    }>;
  };

  // Find the image part in the response
  const candidate = data.candidates?.[0];
  if (!candidate) {
    console.error("No candidates returned from Gemini API");
    process.exit(1);
  }

  const imagePart = candidate.content.parts.find((p) => p.inlineData);
  if (!imagePart?.inlineData) {
    console.error("No image generated. Gemini response:");
    const textPart = candidate.content.parts.find((p) => p.text);
    if (textPart) console.error(textPart.text);
    process.exit(1);
  }

  const buffer = Buffer.from(imagePart.inlineData.data, "base64");

  // Determine file extension from mime type
  const mimeType = imagePart.inlineData.mimeType;
  const ext = mimeType.includes("png") ? "png" : "jpg";

  const sanitizedPrompt = prompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  const filename = `gemini-${Date.now()}-${sanitizedPrompt}.${ext}`;
  const filePath = path.join(visualsDir, filename);

  fs.writeFileSync(filePath, buffer);

  console.log(`Image saved: ${filePath}`);

  // Log any text response (revised description, etc.)
  const textPart = candidate.content.parts.find((p) => p.text);
  if (textPart?.text) {
    console.log(`Gemini notes: ${textPart.text}`);
  }

  // Append to shared asset log
  appendAssetLog(slug, {
    type: "ai-image",
    source: "Gemini Imagen",
    file: `visuals/${filename}`,
    license: "Generated",
    query: prompt,
  });
}

main().catch((err) => {
  console.error("Gemini image generation failed:", err);
  process.exit(1);
});
