/**
 * Remotion CLI Configuration
 *
 * This config applies ONLY to CLI commands (npx remotion studio, benchmark, render).
 * It does NOT affect the SSR render script (src/scripts/remotion-render.ts) which uses
 * @remotion/renderer API directly with its own programmatic settings.
 *
 * See: https://www.remotion.dev/docs/config
 */
import { Config } from "@remotion/cli/config";

// ── Entry point ──
Config.setEntryPoint("./src/remotion/index.ts");

// ── Performance ──
// Default concurrency for CLI renders. Use --concurrency=N to override.
Config.setConcurrency(8);

// JPEG is faster than PNG for non-transparent frames
Config.setVideoImageFormat("jpeg");

// x264 preset: 'fast' trades ~5% quality for ~40% faster encoding
// Options: ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow
Config.setX264Preset("fast");

// Use hardware acceleration when available (GPU encoding)
Config.setHardwareAcceleration("if-possible");

// ── Codec defaults ──
Config.setCodec("h264");
Config.setCrf(18);

// ── Benchmark ──
// Test these concurrency values when running `npx remotion benchmark`
// Use --concurrencies=1,2,4,8,12,16 on CLI (setBenchmarkConcurrencies needs v4.0.430+)
Config.setBenchmarkRuns(3);

// ── Studio ──
Config.setMaxTimelineTracks(20);
