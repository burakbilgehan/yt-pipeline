/**
 * Shared Webpack override for Remotion.
 *
 * Used by both:
 *   - remotion.config.ts (CLI: studio, benchmark, render)
 *   - src/scripts/remotion-render.ts (Node.js API: bundle())
 *
 * Enables Tailwind CSS v4 via @remotion/tailwind-v4.
 */
import { enableTailwind } from "@remotion/tailwind-v4";
import type { WebpackOverrideFn } from "@remotion/bundler";

export const webpackOverride: WebpackOverrideFn = (currentConfiguration) => {
  return enableTailwind(currentConfiguration);
};
