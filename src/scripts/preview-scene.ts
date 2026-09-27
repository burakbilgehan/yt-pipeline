/**
 * Render one scene of a layout-2 project as a short mp4 clip with narration,
 * plus 1 second of the neighbouring scenes on each side, and open it.
 *
 * Output: production/previews/<scene-id>.mp4 (overwritten each run)
 *
 * Usage: npm run preview-scene -- <slug> <scene-id> [--no-open]
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { toFrame } from "../remotion/timing.js";
import { assemble } from "./assemble.js";
import { paths } from "../pipeline/v2.js";
import { paddingRanges, sceneSpans, watchDir, watchVideo } from "../pipeline/watch.js";

const HANDLE_SEC = 1;

async function main() {
  const [slug, sceneId] = process.argv.slice(2);
  if (!slug || !sceneId || sceneId.startsWith("--")) {
    console.error("Usage: npm run preview-scene -- <slug> <scene-id> [--no-open]");
    process.exit(1);
  }
  const { timeline, stale } = assemble(slug);
  if (stale.length > 0) {
    console.error(`Audio is missing or out of date for: ${stale.join(", ")}. Run npm run tts -- ${slug}`);
    process.exit(1);
  }
  const scene = timeline.scenes.find((s) => s.id === sceneId);
  if (!scene) {
    console.error(`Unknown scene "${sceneId}". Scenes: ${timeline.scenes.map((s) => s.id).join(", ")}`);
    process.exit(1);
  }

  const p = paths(slug);
  const serveUrl = await bundle({ entryPoint: path.resolve("src/remotion/index.ts"), publicDir: p.root });
  const composition = await selectComposition({ serveUrl, id: "MainVideo", inputProps: {} });
  const fps = composition.fps;
  const from = Math.max(0, toFrame(scene.startTime - HANDLE_SEC, fps));
  const to = Math.min(composition.durationInFrames - 1, toFrame(scene.endTime + HANDLE_SEC, fps));

  const outDir = path.join(p.root, "production", "previews");
  fs.mkdirSync(outDir, { recursive: true });
  const output = path.join(outDir, `${sceneId}.mp4`);
  const started = Date.now();
  await renderMedia({ composition, serveUrl, codec: "h264", outputLocation: output, frameRange: [from, to] });
  console.log(`${sceneId}: ${((to - from + 1) / fps).toFixed(1)}s clip rendered in ${((Date.now() - started) / 1000).toFixed(0)}s -> ${output}`);

  // Watch gate: the designed empty frames of the full video, shifted into clip time, are exempt.
  const offset = from / fps;
  const { lines, violations } = await watchVideo(output, {
    out: watchDir(output),
    ignore: paddingRanges(composition.durationInFrames / fps, fps).map(([s, e]) => [s - offset, e - offset]),
    scenes: (f) => sceneSpans(slug, f, offset),
  });
  console.log(`\nWatch:\n${lines.join("\n")}`);
  if (violations.length) {
    console.error(`\n${sceneId}: the clip breaks the watch rules; not opened. Fix the scene, then preview again.`);
    process.exit(1);
  }
  if (!process.argv.includes("--no-open")) spawnSync("open", [output]);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
