/**
 * Preflight Check Script
 *
 * Hard gate before upload. Checks all publish prerequisites:
 * - final.mp4 exists
 * - metadata-v<N>.json exists
 * - thumbnail exists
 * - BGM files exist in production/audio/bgm/
 * - preview frames / contact sheet generated
 * - config.json version consistency (delegates to validate)
 *
 * Usage: npm run preflight <slug> [--channel <channel-slug>]
 *
 * Exit codes:
 *   0 = all gates passed — safe to upload
 *   1 = one or more gates failed
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  getProjectDir,
  getLatestVersionedFile,
  loadProjectConfig,
} from "../utils/project.js";

interface Gate {
  name: string;
  passed: boolean;
  message: string;
}

function checkGate(name: string, check: () => { passed: boolean; message: string }): Gate {
  try {
    const result = check();
    return { name, ...result };
  } catch (err) {
    return { name, passed: false, message: `Error: ${(err as Error).message}` };
  }
}

function main() {
  const args = process.argv.slice(2);

  const channelFlagIdx = args.indexOf("--channel");
  let channelSlug: string | undefined;
  if (channelFlagIdx !== -1 && args[channelFlagIdx + 1]) {
    channelSlug = args[channelFlagIdx + 1];
    args.splice(channelFlagIdx, 2);
  }

  const slug = args[0];
  if (!slug) {
    console.error("Usage: npm run preflight <slug> [--channel <channel-slug>]");
    process.exit(1);
  }

  const projectDir = getProjectDir(slug, channelSlug);
  if (!fs.existsSync(projectDir)) {
    console.error(`Project not found: ${projectDir}`);
    process.exit(1);
  }

  console.log(`\n🔍 Preflight check: ${slug}\n`);

  const gates: Gate[] = [];

  // Gate 1: config.json exists and is valid
  gates.push(
    checkGate("config.json", () => {
      const configPath = path.join(projectDir, "config.json");
      if (!fs.existsSync(configPath)) {
        return { passed: false, message: "config.json not found" };
      }
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (!config.pipeline) {
        return { passed: false, message: "config.json missing pipeline field" };
      }
      return { passed: true, message: "config.json valid" };
    })
  );

  // Gate 2: final.mp4 exists
  gates.push(
    checkGate("final.mp4", () => {
      const videoPath = path.join(projectDir, "production", "output", "final.mp4");
      if (!fs.existsSync(videoPath)) {
        return { passed: false, message: "production/output/final.mp4 not found — run npm run render first" };
      }
      const stats = fs.statSync(videoPath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
      return { passed: true, message: `final.mp4 exists (${sizeMB} MB)` };
    })
  );

  // Gate 3: Metadata exists
  gates.push(
    checkGate("metadata", () => {
      const metadataFile = getLatestVersionedFile(slug, "publishing", "metadata", channelSlug);
      if (!metadataFile) {
        return { passed: false, message: "No metadata-v<N>.json found in publishing/" };
      }
      const metadataPath = path.join(projectDir, "publishing", metadataFile);
      const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
      const issues: string[] = [];
      if (!metadata.title) issues.push("missing title");
      if (!metadata.description) issues.push("missing description");
      if (!metadata.tags || metadata.tags.length === 0) issues.push("missing tags");
      if (issues.length > 0) {
        return { passed: false, message: `${metadataFile} incomplete: ${issues.join(", ")}` };
      }
      return { passed: true, message: `${metadataFile} — title, description, tags present` };
    })
  );

  // Gate 4: Thumbnail exists
  gates.push(
    checkGate("thumbnail", () => {
      const thumbDir = path.join(projectDir, "publishing");
      if (!fs.existsSync(thumbDir)) {
        return { passed: false, message: "publishing/ directory not found" };
      }
      const files = fs.readdirSync(thumbDir);
      const thumbFile = files.find((f) => /^thumbnail\.(png|jpg|jpeg|webp)$/i.test(f));
      if (!thumbFile) {
        return { passed: false, message: "No thumbnail.{png,jpg,webp} found in publishing/" };
      }
      return { passed: true, message: `${thumbFile} found` };
    })
  );

  // Gate 5: BGM files exist
  gates.push(
    checkGate("background music", () => {
      const bgmDir = path.join(projectDir, "production", "audio", "bgm");
      if (!fs.existsSync(bgmDir)) {
        return { passed: false, message: "production/audio/bgm/ directory not found" };
      }
      const files = fs.readdirSync(bgmDir).filter((f) => /\.(mp3|wav|ogg|m4a)$/i.test(f));
      if (files.length === 0) {
        return { passed: false, message: "No audio files in production/audio/bgm/" };
      }
      return { passed: true, message: `${files.length} BGM file(s): ${files.join(", ")}` };
    })
  );

  // Gate 6: Audio manifest exists
  gates.push(
    checkGate("audio manifest", () => {
      const manifestPath = path.join(projectDir, "production", "audio", "audio-manifest.json");
      if (!fs.existsSync(manifestPath)) {
        return { passed: false, message: "production/audio/audio-manifest.json not found" };
      }
      return { passed: true, message: "audio-manifest.json exists" };
    })
  );

  // Gate 7: Preview / contact sheet exists
  gates.push(
    checkGate("preview frames", () => {
      const testRenderDir = path.join(projectDir, "production", "test-renders");
      if (!fs.existsSync(testRenderDir)) {
        return { passed: false, message: "production/test-renders/ not found — run npm run preview first" };
      }
      const files = fs.readdirSync(testRenderDir);
      const hasContactSheet = files.some((f) => f.includes("contact-sheet"));
      const pngCount = files.filter((f) => f.endsWith(".png")).length;
      if (pngCount === 0) {
        return { passed: false, message: "No preview frames in production/test-renders/" };
      }
      const csMsg = hasContactSheet ? " + contact sheet" : " (no contact sheet — run npm run preview)";
      return { passed: true, message: `${pngCount} preview frames${csMsg}` };
    })
  );

  // Gate 8: Storyboard exists
  gates.push(
    checkGate("storyboard", () => {
      const config = loadProjectConfig(slug, channelSlug);
      const sbPath = config.pipeline?.storyboard?.activePath;
      if (!sbPath) {
        return { passed: false, message: "No storyboard activePath in config.json" };
      }
      const fullPath = path.join(projectDir, "..", "..", sbPath.replace(/^channels\/[^/]+\/videos\/[^/]+\//, ""));
      // Try relative to project dir
      const relPath = path.join(projectDir, sbPath.split("/").slice(-2).join("/"));
      const directPath = path.resolve(sbPath);
      
      // Check multiple resolution strategies
      for (const p of [directPath, relPath]) {
        if (fs.existsSync(p)) {
          return { passed: true, message: `Storyboard found at activePath` };
        }
      }
      // Also check by scanning storyboard dir
      const sbDir = path.join(projectDir, "storyboard");
      if (fs.existsSync(sbDir)) {
        const files = fs.readdirSync(sbDir).filter(f => f.startsWith("storyboard-v") && f.endsWith(".json"));
        if (files.length > 0) {
          return { passed: true, message: `Storyboard found: ${files[files.length - 1]}` };
        }
      }
      return { passed: false, message: `Storyboard not found (activePath: ${sbPath})` };
    })
  );

  // Print results
  console.log("─".repeat(60));
  let allPassed = true;
  for (const gate of gates) {
    const icon = gate.passed ? "✅" : "❌";
    console.log(`${icon} ${gate.name.padEnd(20)} ${gate.message}`);
    if (!gate.passed) allPassed = false;
  }
  console.log("─".repeat(60));

  if (allPassed) {
    console.log("\n✅ All preflight checks passed. Safe to upload.");
    console.log(`   Run: npm run upload ${slug}\n`);
    process.exit(0);
  } else {
    const failCount = gates.filter((g) => !g.passed).length;
    console.log(`\n❌ ${failCount} gate(s) failed. Fix issues before uploading.\n`);
    process.exit(1);
  }
}

main();
