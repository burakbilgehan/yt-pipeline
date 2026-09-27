/**
 * Render reference stills of MainVideo for a video project.
 *
 * Data comes only from Root.tsx calculateMetadata (the same path Studio and
 * render use), so legacy and layout-2 projects are compared on equal terms.
 *
 * For every scene it renders two frames at fixed offsets from the scene start
 * (after the entrance fade): +20 frames and +90 frames (clamped inside the scene).
 *
 * Usage: npm run stills -- <slug> --out <dir> [--scenes id1,id2] [--repeat-first]
 *   --repeat-first  also renders the first frame twice to check determinism
 */

import path from "node:path";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { getProjectDir } from "../utils/project.js";
import { toFrame } from "../remotion/timing.js";

const REMOTION_ENTRY = path.resolve("src/remotion/index.ts");
const OFFSETS = [20, 90];

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const slug = process.argv[2];
  const outDir = arg("--out");
  if (!slug || slug.startsWith("--") || !outDir) {
    console.error("Usage: npm run stills -- <slug> --out <dir> [--scenes id1,id2] [--repeat-first]");
    process.exit(1);
  }
  const only = arg("--scenes")?.split(",");
  const projectDir = getProjectDir(slug);
  fs.mkdirSync(outDir, { recursive: true });

  const serveUrl = await bundle({ entryPoint: REMOTION_ENTRY, publicDir: projectDir });
  const composition = await selectComposition({ serveUrl, id: "MainVideo", inputProps: {} });
  const props = composition.props as { scenes: Array<{ id: string; startTime: number; endTime: number }> };
  const fps = composition.fps;
  console.log(`MainVideo: ${props.scenes.length} scenes, ${composition.durationInFrames} frames @ ${fps}fps`);

  const jobs: Array<{ file: string; frame: number }> = [];
  for (const scene of props.scenes) {
    if (only && !only.includes(scene.id)) continue;
    const start = toFrame(scene.startTime, fps);
    const end = toFrame(scene.endTime, fps) - 1;
    for (const off of OFFSETS) {
      jobs.push({ file: `${scene.id}_+${off}.png`, frame: Math.min(start + off, end) });
    }
  }
  if (process.argv.includes("--repeat-first") && jobs.length > 0) {
    jobs.push({ file: `_repeat_${jobs[0].file}`, frame: jobs[0].frame });
  }

  const index: Record<string, { frame: number; sha256?: string; error?: string }> = {};
  for (const job of jobs) {
    const output = path.join(outDir, job.file);
    try {
      await renderStill({ composition, serveUrl, output, frame: job.frame, imageFormat: "png" });
      index[job.file] = { frame: job.frame, sha256: createHash("sha256").update(fs.readFileSync(output)).digest("hex") };
    } catch (err) {
      index[job.file] = { frame: job.frame, error: String((err as Error).message ?? err).split("\n")[0] };
    }
    process.stdout.write(`\r  ${Object.keys(index).length}/${jobs.length}`);
  }
  const errors = Object.entries(index).filter(([, v]) => v.error);
  if (errors.length > 0) console.log(`\n${errors.length} frames failed: ${errors.map(([k]) => k).join(", ")}`);
  fs.writeFileSync(path.join(outDir, "index.json"), JSON.stringify(index, null, 2));
  console.log(`\nWrote ${jobs.length} stills to ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
