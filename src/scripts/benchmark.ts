/**
 * Remotion Benchmark Script
 *
 * Tests render performance across different concurrency levels and compositions.
 * Runs each composition separately to avoid interactive prompt.
 *
 * Usage:
 *   npm run benchmark                              # Key compositions, default concurrencies
 *   npm run benchmark -- --concurrency 4,8,12      # Custom concurrency values
 *   npm run benchmark -- --comp MainVideo          # Single composition only
 *   npm run benchmark -- --runs 5                  # More runs for accuracy
 *   npm run benchmark -- --comp MainVideo --concurrency 4,8,12,16 --runs 5
 */

import { execSync } from "node:child_process";
import * as os from "node:os";

// ── All compositions registered in Root.tsx ──
const ALL_COMPOSITIONS = [
  "MainVideo",
  "DataChartPreview",
  "ShortsVideo",
  "HorseRacePreview",
  "QuadrantScatterPreview",
];

// ── Parse CLI args ──
const args = process.argv.slice(2);

function getArg(name: string): string | undefined {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === `--${name}` && args[i + 1]) return args[i + 1];
    if (args[i].startsWith(`--${name}=`)) return args[i].split("=")[1];
  }
  return undefined;
}

const compFilter = getArg("comp");
const concurrencies = getArg("concurrency") || "4,8,10,12,16";
const runs = getArg("runs") || "3";
const compositions = compFilter ? compFilter.split(",") : ALL_COMPOSITIONS;

// ── System info ──
const cpuModel = os.cpus()[0]?.model || "Unknown";
const cpuCount = os.cpus().length;
const totalMemGB = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);
const freeMemGB = (os.freemem() / 1024 / 1024 / 1024).toFixed(1);

console.log("");
console.log("╔══════════════════════════════════════════════════════════════╗");
console.log("║             Remotion Render Performance Benchmark           ║");
console.log("╠══════════════════════════════════════════════════════════════╣");
console.log(`║ CPU: ${cpuModel.substring(0, 54).padEnd(54)} ║`);
console.log(`║ Cores: ${String(cpuCount).padEnd(52)} ║`);
console.log(`║ RAM: ${totalMemGB}GB total, ${freeMemGB}GB free${" ".repeat(Math.max(0, 42 - totalMemGB.length - freeMemGB.length))} ║`);
console.log(`║ Concurrencies: ${concurrencies.padEnd(44)} ║`);
console.log(`║ Runs per test: ${runs.padEnd(44)} ║`);
console.log(`║ Compositions: ${compositions.join(", ").substring(0, 45).padEnd(45)} ║`);
console.log("╚══════════════════════════════════════════════════════════════╝");
console.log("");

const concList = concurrencies.split(",").map((c) => parseInt(c.trim(), 10));
const totalTests = compositions.length * concList.length * parseInt(runs, 10);
console.log(`Total test runs: ${totalTests} (${compositions.length} comps x ${concList.length} concurrencies x ${runs} runs)\n`);

// ── Run benchmark — composition IDs passed as positional args after entry point ──
// Syntax: npx remotion benchmark <entry> CompositionA,CompositionB --concurrencies=...
const compIds = compositions.join(",");
const cmd = [
  "npx remotion benchmark",
  "src/remotion/index.ts",
  compIds,
  `--concurrencies=${concurrencies}`,
  `--runs=${runs}`,
  "--codec=h264",
].join(" ");

console.log(`Command: ${cmd}\n`);
console.log("─".repeat(62));

try {
  execSync(cmd, {
    stdio: "inherit",
    env: { ...process.env },
    // Generous timeout: up to 20 min for full benchmark suite
    timeout: 1_200_000,
  });
} catch (err: any) {
  if (err.signal === "SIGTERM" || err.code === "ETIMEDOUT") {
    console.error("\n  Benchmark timed out (20 min). Try fewer compositions or concurrency levels.\n");
    process.exit(1);
  }
  if (err.status) {
    console.error(`\nBenchmark exited with code ${err.status}`);
    process.exit(err.status);
  }
  throw err;
}

console.log(`\n${"─".repeat(62)}`);
console.log("\nBenchmark Complete!\n");
console.log("Tips:");
console.log(`  - Your CPU has ${cpuCount} logical cores (${Math.ceil(cpuCount / 2)} physical)`);
console.log(`  - RAM: ${totalMemGB}GB total — each concurrency slot uses ~300-500MB`);
console.log(`  - Sweet spot is usually around ${Math.min(Math.ceil(cpuCount * 0.6), 16)} for this CPU`);
console.log("  - Watch for diminishing returns — higher isn't always faster");
console.log("  - Set optimal value: REMOTION_CONCURRENCY=N in .env");
console.log("  - Or per-render: npm run render <slug> -- --concurrency=N\n");
