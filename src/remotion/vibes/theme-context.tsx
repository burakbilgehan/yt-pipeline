/**
 * VibeTheme React Context
 *
 * Provides theme values to all vibe scene components.
 * Wraps the composition in a provider so components can useVibeTheme()
 * instead of prop-drilling brandColor/fontFamily/backgroundColor everywhere.
 */

import React, { createContext, useContext, useMemo } from 'react';
import type { VibeId, VibeTheme, VibeAnimationConfig, VibeLayoutConfig, VibeColorConfig, VibeTypographyConfig } from './types';
import { isDarkColor, PALETTE_CINEMATIC, PALETTE_DASHBOARD, PALETTE_EDITORIAL, SPRING_PRESETS } from './shared/utils';
import {
  TEXT, TEXT_MUTED, SURFACE, SURFACE_BORDER, POSITIVE, NEGATIVE,
} from '../palette';

// ─── Default Vibe Configs ─────────────────────────────────────

const ANIMATION_DEFAULTS: Record<VibeId, VibeAnimationConfig> = {
  cinematic: {
    springDamping: SPRING_PRESETS.cinematic.damping,
    springStiffness: SPRING_PRESETS.cinematic.stiffness,
    staggerDelayFrames: 8,
    preferredTransition: 'fade',
    transitionDurationFrames: 20,
  },
  dashboard: {
    springDamping: SPRING_PRESETS.dashboard.damping,
    springStiffness: SPRING_PRESETS.dashboard.stiffness,
    staggerDelayFrames: 3,
    preferredTransition: 'cut',
    transitionDurationFrames: 6,
  },
  editorial: {
    springDamping: SPRING_PRESETS.editorial.damping,
    springStiffness: SPRING_PRESETS.editorial.stiffness,
    staggerDelayFrames: 5,
    preferredTransition: 'slide',
    transitionDurationFrames: 12,
  },
};

const LAYOUT_DEFAULTS: Record<VibeId, VibeLayoutConfig> = {
  cinematic: {
    screenUtilization: 0.75,
    padding: 60,
    cornerRadius: 8,
    borderWidth: 0,
    letterbox: true,
    alignment: 'center',
  },
  dashboard: {
    screenUtilization: 0.92,
    padding: 24,
    cornerRadius: 6,
    borderWidth: 1,
    letterbox: false,
    alignment: 'left',
  },
  editorial: {
    screenUtilization: 0.82,
    padding: 48,
    cornerRadius: 12,
    borderWidth: 0,
    letterbox: false,
    alignment: 'left',
  },
};

const TYPOGRAPHY_DEFAULTS: Record<VibeId, VibeTypographyConfig> = {
  cinematic: {
    heroSize: 200,
    titleSize: 48,
    bodySize: 28,
    labelSize: 20,
    headingWeight: 700,
    bodyWeight: 400,
  },
  dashboard: {
    heroSize: 140,
    titleSize: 36,
    bodySize: 22,
    labelSize: 14,
    headingWeight: 800,
    bodyWeight: 500,
  },
  editorial: {
    heroSize: 160,
    titleSize: 42,
    bodySize: 26,
    labelSize: 18,
    headingWeight: 600,
    bodyWeight: 400,
  },
};

/**
 * Build VibeColorConfig from vibe defaults + runtime backgroundColor.
 */
function buildColorConfig(vibeId: VibeId, backgroundColor: string): VibeColorConfig {
  const dark = isDarkColor(backgroundColor);

  const palettes: Record<VibeId, string[]> = {
    cinematic: PALETTE_CINEMATIC,
    dashboard: PALETTE_DASHBOARD,
    editorial: PALETTE_EDITORIAL,
  };

  return {
    isDark: dark,
    textPrimary: dark ? TEXT : '#1a1a1a',
    textMuted: dark ? TEXT_MUTED : 'rgba(26,26,26,0.55)',
    surface: dark ? SURFACE : 'rgba(0,0,0,0.04)',
    surfaceBorder: dark ? SURFACE_BORDER : 'rgba(0,0,0,0.1)',
    positive: POSITIVE,
    negative: NEGATIVE,
    dataPalette: palettes[vibeId],
  };
}

// ─── Context ──────────────────────────────────────────────────

const VibeThemeContext = createContext<VibeTheme | null>(null);

/**
 * Hook to access the current VibeTheme.
 * Throws if used outside a VibeThemeProvider.
 */
export function useVibeTheme(): VibeTheme {
  const ctx = useContext(VibeThemeContext);
  if (!ctx) {
    throw new Error('useVibeTheme must be used within a VibeThemeProvider');
  }
  return ctx;
}

// ─── Provider Props ───────────────────────────────────────────

interface VibeThemeProviderProps {
  vibeId: VibeId;
  brandColor: string;
  backgroundColor: string;
  fontFamily: string;
  monoFont?: string;
  children: React.ReactNode;
}

/**
 * Wrap your composition with this provider to make VibeTheme available
 * to all scene components via useVibeTheme().
 *
 * Usage in CustomVideoComposition:
 *   <VibeThemeProvider vibeId="cinematic" brandColor="#FFD700" ...>
 *     {scenes.map(scene => <SceneRenderer scene={scene} />)}
 *   </VibeThemeProvider>
 */
export const VibeThemeProvider: React.FC<VibeThemeProviderProps> = ({
  vibeId,
  brandColor,
  backgroundColor,
  fontFamily,
  monoFont,
  children,
}) => {
  const theme = useMemo<VibeTheme>(
    () => ({
      vibeId,
      brandColor,
      backgroundColor,
      fontFamily,
      monoFont: monoFont ?? 'JetBrains Mono, monospace',
      animation: ANIMATION_DEFAULTS[vibeId],
      layout: LAYOUT_DEFAULTS[vibeId],
      colors: buildColorConfig(vibeId, backgroundColor),
      typography: TYPOGRAPHY_DEFAULTS[vibeId],
    }),
    [vibeId, brandColor, backgroundColor, fontFamily, monoFont],
  );

  return (
    <VibeThemeContext.Provider value={theme}>
      {children}
    </VibeThemeContext.Provider>
  );
};
