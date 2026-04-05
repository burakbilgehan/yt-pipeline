/**
 * L4: Surface Treatment Components
 *
 * Each surface treatment is a container component that wraps children with
 * visual styling (glassmorphism, flat, glow, frosted, etc.)
 * Components are registered via registerSurface() in the design-system registry.
 *
 * To add a new surface treatment:
 * 1. Create a new file: surfaces/MySurface.tsx
 * 2. Export a React.FC<SurfaceComponentProps>
 * 3. Register it in this index.ts
 */
import { registerSurface } from '../registry';
import { GlassSurface } from './GlassSurface';
import { FlatSurface } from './FlatSurface';
import { GlowSurface } from './GlowSurface';

// ─── React component exports ────────────────────────────────
export { GlassSurface } from './GlassSurface';
export { FlatSurface } from './FlatSurface';
export { GlowSurface } from './GlowSurface';

// ─── Surface registrations ──────────────────────────────────
registerSurface('glass', GlassSurface);
registerSurface('flat', FlatSurface);
registerSurface('glow', GlowSurface);
