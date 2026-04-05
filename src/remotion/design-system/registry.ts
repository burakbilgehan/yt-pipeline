/**
 * Design System Runtime Registries
 *
 * Maps layer IDs → React components / hook functions at runtime.
 * Starts empty — each layer's index.ts registers its implementations.
 *
 * Usage:
 *   import { getAtmosphere, getSurface, getMotion } from './registry';
 *   const DotGrid = getAtmosphere('dot-grid');
 */

import type React from 'react';
import type {
  AtmosphereComponentProps,
  MotionConfig,
  MotionResult,
  SurfaceComponentProps,
} from './types';

// ─── Atmosphere Registry (L2) ─────────────────────────────────

const atmosphereRegistry: Record<string, React.FC<AtmosphereComponentProps>> = {};

/** Register an atmosphere component by ID */
export function registerAtmosphere(
  id: string,
  component: React.FC<AtmosphereComponentProps>,
): void {
  atmosphereRegistry[id] = component;
}

/** Look up an atmosphere component. Returns undefined if not registered. */
export function getAtmosphere(
  id: string,
): React.FC<AtmosphereComponentProps> | undefined {
  return atmosphereRegistry[id];
}

// ─── Motion Registry (L3) ─────────────────────────────────────

type MotionFn = (frame: number, config: MotionConfig) => MotionResult;

const motionRegistry: Record<string, MotionFn> = {};

/** Register a motion primitive function by ID */
export function registerMotion(id: string, fn: MotionFn): void {
  motionRegistry[id] = fn;
}

/** Look up a motion primitive. Returns undefined if not registered. */
export function getMotion(id: string): MotionFn | undefined {
  return motionRegistry[id];
}

// ─── Surface Registry (L4) ────────────────────────────────────

const surfaceRegistry: Record<string, React.FC<SurfaceComponentProps>> = {};

/** Register a surface treatment component by ID */
export function registerSurface(
  id: string,
  component: React.FC<SurfaceComponentProps>,
): void {
  surfaceRegistry[id] = component;
}

/** Look up a surface treatment component. Returns undefined if not registered. */
export function getSurface(
  id: string,
): React.FC<SurfaceComponentProps> | undefined {
  return surfaceRegistry[id];
}
