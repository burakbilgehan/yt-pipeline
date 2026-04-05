/**
 * L2: Atmosphere Components
 *
 * Each atmosphere is a full-screen background layer (dot-grid, particles, aurora, etc.)
 * Components are registered via registerAtmosphere() in the design-system registry.
 *
 * To add a new atmosphere:
 * 1. Create a new file: atmospheres/MyAtmosphere.tsx
 * 2. Export a React.FC<AtmosphereComponentProps>
 * 3. Register it in this index.ts
 */
import { registerAtmosphere } from '../registry';
import { DotGrid } from './DotGrid';
import { FilmGrain } from './FilmGrain';

// ─── Exports ─────────────────────────────────────────────────
export { DotGrid } from './DotGrid';
export { FilmGrain } from './FilmGrain';

// ─── Registry registrations ──────────────────────────────────
registerAtmosphere('dot-grid', DotGrid);
registerAtmosphere('film-grain', FilmGrain);
