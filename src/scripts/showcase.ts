/**
 * Render the CatalogShowcase composition (catalog look review) to an mp4 and open it.
 * Usage: npm run showcase -- [--out <file>] [--stills]
 */
import path from "node:path";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";

async function main() {
  const i = process.argv.indexOf("--out");
  const out = path.resolve(i >= 0 ? process.argv[i + 1] : "../work/catalog-showcase.mp4");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const serveUrl = await bundle({ entryPoint: path.resolve("src/remotion/index.ts") });
  const composition = await selectComposition({ serveUrl, id: "CatalogShowcase", inputProps: {} });
  if (process.argv.includes("--stills")) {
    const frames = String(process.env.FRAMES ?? "60,250,440,560,730,850").split(",").map(Number);
    for (const f of frames) {
      const file = out.replace(/\.mp4$/, `-${f}.png`);
      await renderStill({ composition, serveUrl, output: file, frame: f, imageFormat: "png" });
      console.log(file);
    }
    return;
  }
  const started = Date.now();
  await renderMedia({ composition, serveUrl, codec: "h264", outputLocation: out });
  console.log(`${(composition.durationInFrames / composition.fps).toFixed(1)}s showcase rendered in ${((Date.now() - started) / 1000).toFixed(0)}s -> ${out}`);
  if (!process.argv.includes("--no-open")) spawnSync("open", [out]);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
