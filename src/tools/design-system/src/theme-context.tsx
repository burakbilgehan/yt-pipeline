import { createContext, useContext, useState, type ReactNode } from 'react';
import type { ColorPalette, DesignSystem } from './types';
import { defaultColorPreset, defaultVibePreset } from './presets';

/** Rendering vibe IDs — matches src/remotion/vibes/types.ts */
type RenderVibeId = 'cinematic' | 'dashboard' | 'editorial';

interface ThemeContextValue {
  theme: DesignSystem;
  setTheme: (theme: DesignSystem) => void;
  updateColors: (key: string, value: string) => void;
  updateGeometry: (key: string, value: number | string) => void;
  updateEffects: (key: string, value: number | string) => void;
  updateTypography: (key: string, value: string | number) => void;
  updateAnimation: (key: string, value: string | number) => void;
  /** Apply a color palette, keeping current vibe settings */
  applyColorPreset: (id: string, colors: ColorPalette) => void;
  /** Apply a vibe preset, keeping current colors */
  applyVibePreset: (id: string, vibe: Omit<DesignSystem, 'name' | 'version' | 'colors' | 'promptInput'>) => void;
  /** Currently active color preset id (null if manually tweaked) */
  activeColorId: string | null;
  /** Currently active vibe preset id (null if manually tweaked) */
  activeVibeId: string | null;
  /** Selected rendering vibe for video production */
  renderVibe: RenderVibeId;
  setRenderVibe: (vibe: RenderVibeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Build initial DesignSystem from default color + vibe presets */
function buildInitialTheme(): DesignSystem {
  return {
    name: `${defaultColorPreset.name} × ${defaultVibePreset.name}`,
    version: 1,
    colors: { ...defaultColorPreset.colors },
    typography: { ...defaultVibePreset.typography },
    geometry: { ...defaultVibePreset.geometry },
    effects: { ...defaultVibePreset.effects },
    animation: { ...defaultVibePreset.animation },
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<DesignSystem>(buildInitialTheme);
  const [activeColorId, setActiveColorId] = useState<string | null>(defaultColorPreset.id);
  const [activeVibeId, setActiveVibeId] = useState<string | null>(defaultVibePreset.id);
  const [renderVibe, setRenderVibe] = useState<RenderVibeId>('cinematic');

  const updateColors = (key: string, value: string) => {
    setActiveColorId(null); // manual tweak clears preset tracking
    setTheme((prev) => ({
      ...prev,
      colors: { ...prev.colors, [key]: value },
    }));
  };

  const updateGeometry = (key: string, value: number | string) => {
    setActiveVibeId(null);
    setTheme((prev) => ({
      ...prev,
      geometry: { ...prev.geometry, [key]: value },
    }));
  };

  const updateEffects = (key: string, value: number | string) => {
    setActiveVibeId(null);
    setTheme((prev) => ({
      ...prev,
      effects: { ...prev.effects, [key]: value },
    }));
  };

  const updateTypography = (key: string, value: string | number) => {
    setActiveVibeId(null);
    setTheme((prev) => ({
      ...prev,
      typography: { ...prev.typography, [key]: value },
    }));
  };

  const updateAnimation = (key: string, value: string | number) => {
    setActiveVibeId(null);
    setTheme((prev) => ({
      ...prev,
      animation: { ...prev.animation, [key]: value },
    }));
  };

  const applyColorPreset = (id: string, colors: ColorPalette) => {
    setActiveColorId(id);
    setTheme((prev) => ({
      ...prev,
      colors: { ...colors },
      name: buildName(id, activeVibeId),
    }));
  };

  const applyVibePreset = (id: string, vibe: Omit<DesignSystem, 'name' | 'version' | 'colors' | 'promptInput'>) => {
    setActiveVibeId(id);
    setTheme((prev) => ({
      ...prev,
      typography: { ...vibe.typography },
      geometry: { ...vibe.geometry },
      effects: { ...vibe.effects },
      animation: { ...vibe.animation },
      name: buildName(activeColorId, id),
    }));
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        updateColors,
        updateGeometry,
        updateEffects,
        updateTypography,
        updateAnimation,
        applyColorPreset,
        applyVibePreset,
        activeColorId,
        activeVibeId,
        renderVibe,
        setRenderVibe,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider');
  return ctx;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildName(colorId: string | null, vibeId: string | null): string {
  const c = colorId ?? 'Custom';
  const v = vibeId ?? 'Custom';
  return `${c} × ${v}`;
}
