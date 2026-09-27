/**
 * Validates publishing/metadata.json of a layout-2 project and writes the copy-paste files
 * publishing/description.txt (chapters filled in from the timeline) and publishing/tags.txt.
 *
 * Usage: npm run metadata -- <slug>
 */

import fs from "node:fs";
import { assertLayout2 } from "../pipeline/v2.js";
import { buildMetadata, chapterLines, publishPaths, tagChars } from "../pipeline/publish.js";

function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Usage: npm run metadata -- <slug>");
    process.exit(1);
  }
  assertLayout2(slug);
  const built = buildMetadata(slug);
  const p = publishPaths(slug);

  console.log(`title    ${built.metadata.title} (${built.metadata.title.length}/100)`);
  console.log(`tags     ${built.metadata.tags.length}, ${tagChars(built.metadata.tags)} chars (API count)`);
  if (built.chapters.length) console.log(`chapters\n${chapterLines(built.chapters).replace(/^/gm, "  ")}`);
  for (const w of built.warnings) console.log(`warn  ${w}`);
  for (const e of built.errors) console.log(`ERROR ${e}`);
  if (built.errors.length) process.exit(1);

  fs.writeFileSync(p.description, built.description.trimEnd() + "\n");
  fs.writeFileSync(p.tags, built.metadata.tags.join(", ") + "\n");
  console.log(`wrote ${p.description}\nwrote ${p.tags}`);
}

main();
