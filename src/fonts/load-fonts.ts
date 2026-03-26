/**
 * Remotion Font Loader — Loads Google Fonts for Remotion renders.
 *
 * Uses @remotion/google-fonts to dynamically load fonts at render time.
 * Only loads fonts that are actually needed (by CSS family string).
 *
 * Usage in a Remotion composition:
 *   import { ensureFontsLoaded } from '../../fonts/load-fonts';
 *   ensureFontsLoaded('Inter, sans-serif', 'JetBrains Mono, monospace');
 *
 * Usage in calculateMetadata:
 *   import { ensureFontsLoaded } from '../../fonts/load-fonts';
 *   export const calculateMetadata = async ({ props }) => {
 *     await ensureFontsLoaded(props.fontFamily);
 *     return {};
 *   };
 */

import { fontRegistry } from './font-registry';

// Track which fonts have already been loaded to avoid duplicate loads
const loadedFonts = new Set<string>();

/**
 * Map from remotionId → dynamic import of the @remotion/google-fonts module.
 * We use a static map instead of dynamic string interpolation
 * because bundlers (webpack/esbuild) need to know the import paths at build time.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FontModule = { loadFont: (...args: any[]) => { fontFamily: string; fonts: unknown } };
const fontImportMap: Record<string, () => Promise<FontModule>> = {
  // Sans-Serif
  Inter: () => import('@remotion/google-fonts/Inter'),
  PlusJakartaSans: () => import('@remotion/google-fonts/PlusJakartaSans'),
  DMSans: () => import('@remotion/google-fonts/DMSans'),
  Outfit: () => import('@remotion/google-fonts/Outfit'),
  Sora: () => import('@remotion/google-fonts/Sora'),
  NunitoSans: () => import('@remotion/google-fonts/NunitoSans'),
  WorkSans: () => import('@remotion/google-fonts/WorkSans'),

  // Display
  Montserrat: () => import('@remotion/google-fonts/Montserrat'),
  SpaceGrotesk: () => import('@remotion/google-fonts/SpaceGrotesk'),
  Syne: () => import('@remotion/google-fonts/Syne'),
  BricolageGrotesque: () => import('@remotion/google-fonts/BricolageGrotesque'),
  BebasNeue: () => import('@remotion/google-fonts/BebasNeue'),
  Oswald: () => import('@remotion/google-fonts/Oswald'),
  Epilogue: () => import('@remotion/google-fonts/Epilogue'),
  RedHatDisplay: () => import('@remotion/google-fonts/RedHatDisplay'),
  Urbanist: () => import('@remotion/google-fonts/Urbanist'),

  // Serif
  Fraunces: () => import('@remotion/google-fonts/Fraunces'),
  PlayfairDisplay: () => import('@remotion/google-fonts/PlayfairDisplay'),
  SourceSerif4: () => import('@remotion/google-fonts/SourceSerif4'),
  LibreBaskerville: () => import('@remotion/google-fonts/LibreBaskerville'),
  DMSerifDisplay: () => import('@remotion/google-fonts/DMSerifDisplay'),
  Lora: () => import('@remotion/google-fonts/Lora'),

  // Handwritten
  Caveat: () => import('@remotion/google-fonts/Caveat'),
  Kalam: () => import('@remotion/google-fonts/Kalam'),
  PermanentMarker: () => import('@remotion/google-fonts/PermanentMarker'),
  ArchitectsDaughter: () => import('@remotion/google-fonts/ArchitectsDaughter'),
  PatrickHand: () => import('@remotion/google-fonts/PatrickHand'),

  // Monospace
  JetBrainsMono: () => import('@remotion/google-fonts/JetBrainsMono'),
  SpaceMono: () => import('@remotion/google-fonts/SpaceMono'),
  IBMPlexMono: () => import('@remotion/google-fonts/IBMPlexMono'),
  FiraMono: () => import('@remotion/google-fonts/FiraMono'),
  SourceCodePro: () => import('@remotion/google-fonts/SourceCodePro'),

  // Condensed
  BarlowCondensed: () => import('@remotion/google-fonts/BarlowCondensed'),
  RobotoCondensed: () => import('@remotion/google-fonts/RobotoCondensed'),
  PTSansNarrow: () => import('@remotion/google-fonts/PTSansNarrow'),
  SairaCondensed: () => import('@remotion/google-fonts/SairaCondensed'),
  ArchivoNarrow: () => import('@remotion/google-fonts/ArchivoNarrow'),
};

/**
 * Load a single font by its remotionId.
 * Only loads the 'normal' style with weights specified in the registry.
 */
async function loadSingleFont(remotionId: string): Promise<void> {
  if (loadedFonts.has(remotionId)) return;

  const importer = fontImportMap[remotionId];
  if (!importer) {
    console.warn(`[font-loader] No import mapping for font: ${remotionId}`);
    return;
  }

  const registryEntry = fontRegistry.find((f) => f.remotionId === remotionId);
  const weights = registryEntry?.weights ?? [400, 700];

  try {
    const mod = await importer();
    mod.loadFont('normal', {
      weights: weights as never[],
      subsets: ['latin'],
    });
    loadedFonts.add(remotionId);
  } catch (err) {
    console.warn(`[font-loader] Failed to load font ${remotionId}:`, err);
  }
}

/**
 * Resolve a CSS font-family string to a remotionId.
 * e.g. "Inter, sans-serif" → "Inter"
 * e.g. "Plus Jakarta Sans, sans-serif" → "PlusJakartaSans"
 */
export function cssToRemotionId(cssFamily: string): string | undefined {
  // First try exact match in registry
  const entry = fontRegistry.find((f) => f.cssFamily === cssFamily);
  if (entry) return entry.remotionId;

  // Try matching just the first font name (before the comma)
  const firstName = cssFamily.split(',')[0].trim().replace(/['"]/g, '');
  const byName = fontRegistry.find((f) => f.name === firstName);
  if (byName) return byName.remotionId;

  return undefined;
}

/**
 * Ensure one or more fonts are loaded.
 * Accepts CSS font-family strings (e.g. "Inter, sans-serif").
 * Call this at the top of your composition or in calculateMetadata.
 *
 * @example
 * ensureFontsLoaded('Inter, sans-serif');
 * ensureFontsLoaded('Inter, sans-serif', 'JetBrains Mono, monospace');
 */
export async function ensureFontsLoaded(...cssFamilies: (string | undefined)[]): Promise<void> {
  const promises: Promise<void>[] = [];

  for (const css of cssFamilies) {
    if (!css) continue;

    // A CSS family string might contain multiple font names: "Inter, Space Grotesk, sans-serif"
    // We try to load each one that exists in our registry
    const parts = css.split(',').map((p) => p.trim().replace(/['"]/g, ''));

    for (const part of parts) {
      // Skip generic families
      if (['sans-serif', 'serif', 'monospace', 'cursive', 'system-ui'].includes(part)) continue;

      const byName = fontRegistry.find((f) => f.name === part);
      if (byName) {
        promises.push(loadSingleFont(byName.remotionId));
      }
    }
  }

  await Promise.all(promises);
}

/**
 * Synchronous version that fires-and-forgets.
 * Use this if you don't want to await — font will load asynchronously.
 */
export function loadFontsSync(...cssFamilies: (string | undefined)[]): void {
  void ensureFontsLoaded(...cssFamilies);
}

/**
 * Load ALL registered fonts. Useful for the design system preview tool.
 */
export async function loadAllFonts(): Promise<void> {
  await Promise.all(fontRegistry.map((f) => loadSingleFont(f.remotionId)));
}
