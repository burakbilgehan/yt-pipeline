/**
 * Remotion Video Render Script
 *
 * Renders the final video using Remotion.
 *
 * Usage: npm run render <project-slug>
 *
 * Reads: projects/<slug>/production/composition.tsx
 * Writes: projects/<slug>/production/output/final.mp4
 */

import * as fs from "node:fs";
import * as path from "node:path";

const PROJECTS_DIR = path.resolve("projects");

async function main() {
  const slug = process.argv[2];

  if (!slug) {
    console.error("Usage: npm run render <project-slug>");
    process.exit(1);
  }

  const projectDir = path.join(PROJECTS_DIR, slug);
  const outputDir = path.join(projectDir, "production", "output");
  fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, "final.mp4");

  console.log(`Rendering video for project: ${slug}`);
  console.log(`Output: ${outputPath}`);

  // TODO: Implement Remotion rendering
  // This will use @remotion/renderer to:
  // 1. Bundle the composition
  // 2. Render to MP4
  //
  // const { bundle } = await import("@remotion/bundler");
  // const { renderMedia, selectComposition } = await import("@remotion/renderer");
  //
  // const bundleLocation = await bundle({
  //   entryPoint: path.join(projectDir, "production", "composition.tsx"),
  // });
  //
  // const composition = await selectComposition({
  //   serveUrl: bundleLocation,
  //   id: "main",
  // });
  //
  // await renderMedia({
  //   composition,
  //   serveUrl: bundleLocation,
  //   codec: "h264",
  //   outputLocation: outputPath,
  // });

  console.log(
    "\nReminder: Remotion rendering is not yet implemented."
  );
  console.log(
    "This script will be completed when the Remotion template is set up."
  );
}

main();
