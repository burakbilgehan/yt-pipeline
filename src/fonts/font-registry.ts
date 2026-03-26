/**
 * Font Registry — Single source of truth for all available fonts.
 *
 * Used by:
 * - Design System tool (font picker dropdown)
 * - Remotion compositions (font loading via @remotion/google-fonts)
 * - Export utilities (DESIGN.md generation)
 *
 * Every font here is free on Google Fonts.
 * Curated for informative/data-driven YouTube video production.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type FontCategory =
  | 'sans-serif'
  | 'display'
  | 'serif'
  | 'handwritten'
  | 'monospace'
  | 'condensed';

export interface FontEntry {
  /** Human-readable display name (e.g. "Inter") */
  name: string;
  /** CSS font-family value (e.g. "Inter, sans-serif") */
  cssFamily: string;
  /** @remotion/google-fonts module name (e.g. "Inter") — used for dynamic import */
  remotionId: string;
  /** Font category */
  category: FontCategory;
  /** Recommended weights to load */
  weights: number[];
  /** Short description of when to use this font */
  useCase: string;
  /** Tags for search/filtering */
  tags: string[];
}

// ─── Category Labels ────────────────────────────────────────────────────────

export const categoryLabels: Record<FontCategory, string> = {
  'sans-serif': 'Sans-Serif (Modern/Clean)',
  'display': 'Display/Impact (Titles)',
  'serif': 'Serif (Editorial/Premium)',
  'handwritten': 'Handwritten (Annotations)',
  'monospace': 'Monospace (Data/Code)',
  'condensed': 'Condensed (Data-Dense)',
};

export const categoryOrder: FontCategory[] = [
  'sans-serif',
  'display',
  'serif',
  'handwritten',
  'monospace',
  'condensed',
];

// ─── Font Registry ──────────────────────────────────────────────────────────

export const fontRegistry: FontEntry[] = [
  // ── Sans-Serif (Modern/Clean) — Body Text & General Use ──────────────
  {
    name: 'Inter',
    cssFamily: 'Inter, sans-serif',
    remotionId: 'Inter',
    category: 'sans-serif',
    weights: [400, 500, 700],
    useCase: 'Screen-optimized with tabular numbers. The default choice.',
    tags: ['body', 'ui', 'data', 'default', 'tabular-numbers'],
  },
  {
    name: 'Plus Jakarta Sans',
    cssFamily: 'Plus Jakarta Sans, sans-serif',
    remotionId: 'PlusJakartaSans',
    category: 'sans-serif',
    weights: [500, 700, 800],
    useCase: 'Geometric with personality. Modern and approachable.',
    tags: ['body', 'modern', 'geometric', 'friendly'],
  },
  {
    name: 'DM Sans',
    cssFamily: 'DM Sans, sans-serif',
    remotionId: 'DMSans',
    category: 'sans-serif',
    weights: [400, 500, 700],
    useCase: 'Low-contrast geometric. Extremely legible, doesn\'t compete with visuals.',
    tags: ['body', 'clean', 'neutral', 'geometric'],
  },
  {
    name: 'Outfit',
    cssFamily: 'Outfit, sans-serif',
    remotionId: 'Outfit',
    category: 'sans-serif',
    weights: [300, 500, 700],
    useCase: 'Wide geometric sans. Feels techy and precise.',
    tags: ['body', 'tech', 'geometric', 'variable'],
  },
  {
    name: 'Sora',
    cssFamily: 'Sora, sans-serif',
    remotionId: 'Sora',
    category: 'sans-serif',
    weights: [400, 600, 700],
    useCase: 'Geometric with distinctive numbers. Great for UI-style overlays.',
    tags: ['body', 'tech', 'geometric', 'numbers'],
  },
  {
    name: 'Nunito Sans',
    cssFamily: 'Nunito Sans, sans-serif',
    remotionId: 'NunitoSans',
    category: 'sans-serif',
    weights: [400, 600, 700, 800],
    useCase: 'Rounded terminals — friendly and educational.',
    tags: ['body', 'friendly', 'educational', 'rounded'],
  },
  {
    name: 'Work Sans',
    cssFamily: 'Work Sans, sans-serif',
    remotionId: 'WorkSans',
    category: 'sans-serif',
    weights: [400, 500, 700],
    useCase: 'Slightly quirky, optimized for screens. Editorial personality.',
    tags: ['body', 'editorial', 'screen-optimized'],
  },

  // ── Display/Impact — Titles, Hooks, Big Numbers ──────────────────────
  {
    name: 'Montserrat',
    cssFamily: 'Montserrat, sans-serif',
    remotionId: 'Montserrat',
    category: 'display',
    weights: [400, 500, 700, 800, 900],
    useCase: 'Classic geometric sans-serif. Heavy weights for impactful titles.',
    tags: ['title', 'geometric', 'impact', 'versatile', 'numbers'],
  },
  {
    name: 'Space Grotesk',
    cssFamily: 'Space Grotesk, sans-serif',
    remotionId: 'SpaceGrotesk',
    category: 'display',
    weights: [500, 700],
    useCase: 'Tech dashboard feel. Distinctive at large sizes.',
    tags: ['title', 'tech', 'numbers', 'dashboard'],
  },
  {
    name: 'Syne',
    cssFamily: 'Syne, sans-serif',
    remotionId: 'Syne',
    category: 'display',
    weights: [700, 800],
    useCase: 'Unconventional letterforms — makes you pause and read.',
    tags: ['title', 'bold', 'unique', 'branding'],
  },
  {
    name: 'Bricolage Grotesque',
    cssFamily: 'Bricolage Grotesque, sans-serif',
    remotionId: 'BricolageGrotesque',
    category: 'display',
    weights: [700, 800],
    useCase: 'Optical-size variable font with elegant ink traps. Premium feel.',
    tags: ['title', 'premium', 'ink-traps', 'variable'],
  },
  {
    name: 'Bebas Neue',
    cssFamily: 'Bebas Neue, sans-serif',
    remotionId: 'BebasNeue',
    category: 'display',
    weights: [400],
    useCase: 'The classic YouTube title font. All-caps, condensed, max impact.',
    tags: ['title', 'thumbnail', 'impact', 'condensed', 'uppercase', 'numbers'],
  },
  {
    name: 'Oswald',
    cssFamily: 'Oswald, sans-serif',
    remotionId: 'Oswald',
    category: 'display',
    weights: [500, 600, 700],
    useCase: 'Condensed and punchy. Great for overlays like "EXPLAINED".',
    tags: ['title', 'thumbnail', 'condensed', 'impact'],
  },
  {
    name: 'Epilogue',
    cssFamily: 'Epilogue, sans-serif',
    remotionId: 'Epilogue',
    category: 'display',
    weights: [700, 800, 900],
    useCase: 'Wide weight range. Black weight is a statement maker.',
    tags: ['title', 'versatile', 'variable', 'bold'],
  },
  {
    name: 'Red Hat Display',
    cssFamily: 'Red Hat Display, sans-serif',
    remotionId: 'RedHatDisplay',
    category: 'display',
    weights: [700, 900],
    useCase: 'Slightly rounded, contemporary. Numbers look fantastic at large sizes.',
    tags: ['title', 'numbers', 'rounded', 'modern'],
  },
  {
    name: 'Urbanist',
    cssFamily: 'Urbanist, sans-serif',
    remotionId: 'Urbanist',
    category: 'display',
    weights: [700, 800, 900],
    useCase: 'Geometric with clean display qualities. ExtraBold/Black for impact.',
    tags: ['title', 'geometric', 'modern', 'clean'],
  },

  // ── Serif (Editorial/Premium) — Documentary-Style Authority ──────────
  {
    name: 'Fraunces',
    cssFamily: 'Fraunces, serif',
    remotionId: 'Fraunces',
    category: 'serif',
    weights: [700, 900],
    useCase: 'Variable with "wonky" axis. Bold and editorial at high weight.',
    tags: ['title', 'editorial', 'variable', 'personality'],
  },
  {
    name: 'Playfair Display',
    cssFamily: 'Playfair Display, serif',
    remotionId: 'PlayfairDisplay',
    category: 'serif',
    weights: [700, 900],
    useCase: 'High-contrast transitional. Go-to premium editorial font.',
    tags: ['title', 'editorial', 'premium', 'numbers', 'authority'],
  },
  {
    name: 'Source Serif 4',
    cssFamily: 'Source Serif 4, serif',
    remotionId: 'SourceSerif4',
    category: 'serif',
    weights: [400, 600, 700],
    useCase: 'Adobe open-source serif. Excellent at body AND display sizes.',
    tags: ['body', 'editorial', 'workhorse', 'tabular-figures'],
  },
  {
    name: 'Libre Baskerville',
    cssFamily: 'Libre Baskerville, serif',
    remotionId: 'LibreBaskerville',
    category: 'serif',
    weights: [400, 700],
    useCase: 'Classic Baskerville for screens. "Serious journalism" energy.',
    tags: ['body', 'classic', 'authority', 'journalism'],
  },
  {
    name: 'DM Serif Display',
    cssFamily: 'DM Serif Display, serif',
    remotionId: 'DMSerifDisplay',
    category: 'serif',
    weights: [400],
    useCase: 'Display-only serif. Fat, confident serifs. Perfect for big stat callouts.',
    tags: ['title', 'numbers', 'impact', 'stats'],
  },
  {
    name: 'Lora',
    cssFamily: 'Lora, serif',
    remotionId: 'Lora',
    category: 'serif',
    weights: [400, 500, 700],
    useCase: 'Calligraphic with moderate contrast. Warm and trustworthy.',
    tags: ['body', 'warm', 'narrative', 'book'],
  },

  // ── Handwritten/Script — Annotations & Informal Highlights ───────────
  {
    name: 'Caveat',
    cssFamily: 'Caveat, cursive',
    remotionId: 'Caveat',
    category: 'handwritten',
    weights: [400, 700],
    useCase: 'Best "quick annotation" font. Bold weight available.',
    tags: ['annotation', 'whiteboard', 'casual', 'bold-available'],
  },
  {
    name: 'Kalam',
    cssFamily: 'Kalam, cursive',
    remotionId: 'Kalam',
    category: 'handwritten',
    weights: [400, 700],
    useCase: 'Structured handwriting — notebook feel, educational.',
    tags: ['annotation', 'educational', 'notebook'],
  },
  {
    name: 'Permanent Marker',
    cssFamily: 'Permanent Marker, cursive',
    remotionId: 'PermanentMarker',
    category: 'handwritten',
    weights: [400],
    useCase: 'Thick marker feel. High visibility for emphasis.',
    tags: ['emphasis', 'marker', 'casual', 'impact'],
  },
  {
    name: 'Architects Daughter',
    cssFamily: 'Architects Daughter, cursive',
    remotionId: 'ArchitectsDaughter',
    category: 'handwritten',
    weights: [400],
    useCase: 'Technical/architectural hand lettering. Engineer\'s notebook.',
    tags: ['annotation', 'technical', 'architectural'],
  },
  {
    name: 'Patrick Hand',
    cssFamily: 'Patrick Hand, cursive',
    remotionId: 'PatrickHand',
    category: 'handwritten',
    weights: [400],
    useCase: 'Clean, consistent handwriting. Legible at small sizes.',
    tags: ['annotation', 'clean', 'legible'],
  },

  // ── Monospace (Data/Code) — Tables, Statistics, Code ─────────────────
  {
    name: 'JetBrains Mono',
    cssFamily: 'JetBrains Mono, monospace',
    remotionId: 'JetBrainsMono',
    category: 'monospace',
    weights: [400, 500, 700],
    useCase: 'Purpose-built for code. Increased x-height, ligatures.',
    tags: ['code', 'developer', 'ligatures', 'default-mono'],
  },
  {
    name: 'Space Mono',
    cssFamily: 'Space Mono, monospace',
    remotionId: 'SpaceMono',
    category: 'monospace',
    weights: [400, 700],
    useCase: 'Geometric monospace. "Mission control dashboard" vibe.',
    tags: ['data', 'dashboard', 'geometric', 'stylized'],
  },
  {
    name: 'IBM Plex Mono',
    cssFamily: 'IBM Plex Mono, monospace',
    remotionId: 'IBMPlexMono',
    category: 'monospace',
    weights: [400, 500, 700],
    useCase: 'Corporate precision. Neutral and professional.',
    tags: ['data', 'corporate', 'neutral', 'professional'],
  },
  {
    name: 'Fira Mono',
    cssFamily: 'Fira Mono, monospace',
    remotionId: 'FiraMono',
    category: 'monospace',
    weights: [400, 500, 700],
    useCase: 'Mozilla\'s monospace. Wide and open. Great for data tables.',
    tags: ['data', 'tables', 'wide', 'mozilla'],
  },
  {
    name: 'Source Code Pro',
    cssFamily: 'Source Code Pro, monospace',
    remotionId: 'SourceCodePro',
    category: 'monospace',
    weights: [400, 500, 700],
    useCase: 'Adobe\'s monospace. Clean and neutral — data speaks for itself.',
    tags: ['data', 'neutral', 'clean', 'adobe'],
  },

  // ── Condensed — Data-Dense Layouts, Small Labels ─────────────────────
  {
    name: 'Barlow Condensed',
    cssFamily: 'Barlow Condensed, sans-serif',
    remotionId: 'BarlowCondensed',
    category: 'condensed',
    weights: [400, 500, 600, 700],
    useCase: 'Slightly rounded grotesk. Best "axis label" font.',
    tags: ['labels', 'charts', 'axis', 'dense-data'],
  },
  {
    name: 'Roboto Condensed',
    cssFamily: 'Roboto Condensed, sans-serif',
    remotionId: 'RobotoCondensed',
    category: 'condensed',
    weights: [400, 500, 700],
    useCase: 'Google ecosystem standard. Ubiquitous for a reason.',
    tags: ['labels', 'general', 'google', 'versatile'],
  },
  {
    name: 'PT Sans Narrow',
    cssFamily: 'PT Sans Narrow, sans-serif',
    remotionId: 'PTSansNarrow',
    category: 'condensed',
    weights: [400, 700],
    useCase: 'Humanist condensed. Good for subtitles/captions.',
    tags: ['subtitles', 'captions', 'humanist'],
  },
  {
    name: 'Saira Condensed',
    cssFamily: 'Saira Condensed, sans-serif',
    remotionId: 'SairaCondensed',
    category: 'condensed',
    weights: [400, 500, 700],
    useCase: 'Geometric condensed. Numbers have wide counters despite narrow width.',
    tags: ['data', 'infographic', 'geometric', 'numbers'],
  },
  {
    name: 'Archivo Narrow',
    cssFamily: 'Archivo Narrow, sans-serif',
    remotionId: 'ArchivoNarrow',
    category: 'condensed',
    weights: [400, 500, 600, 700],
    useCase: 'Grotesque condensed for small sizes. High readability at chart-label scale.',
    tags: ['labels', 'footnotes', 'small-text', 'dense'],
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Get fonts by category */
export function getFontsByCategory(category: FontCategory): FontEntry[] {
  return fontRegistry.filter((f) => f.category === category);
}

/** Find a font by its CSS family string */
export function findFontByCssFamily(cssFamily: string): FontEntry | undefined {
  return fontRegistry.find((f) => f.cssFamily === cssFamily);
}

/** Find a font by name */
export function findFontByName(name: string): FontEntry | undefined {
  return fontRegistry.find((f) => f.name === name);
}

/** Get all font options grouped by category (for UI dropdowns) */
export function getFontOptionsGrouped(): { category: FontCategory; label: string; fonts: FontEntry[] }[] {
  return categoryOrder.map((cat) => ({
    category: cat,
    label: categoryLabels[cat],
    fonts: getFontsByCategory(cat),
  }));
}

/** Get all monospace font options (for mono font picker) */
export function getMonoFontOptions(): FontEntry[] {
  return fontRegistry.filter((f) => f.category === 'monospace');
}
