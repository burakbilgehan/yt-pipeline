#!/usr/bin/env tsx
/**
 * Fetches Natural Earth 110m GeoJSON and converts to simplified SVG path data.
 * Output: overwrites world-map-data.ts with country paths.
 *
 * Usage: npx tsx src/scripts/generate-world-map-data.ts
 */

import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const GEOJSON_URL =
  "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson";
// Fallback: Natural Earth 110m from jsdelivr
const FALLBACK_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const NE_GEOJSON_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson";

const MAP_W = 1000;
const MAP_H = 500;
const OUTPUT = join(__dirname, "../remotion/templates/data-charts/world-map-data.ts");

// Equirectangular projection: lon/lat → x/y
function projectLon(lon: number): number {
  return ((lon + 180) / 360) * MAP_W;
}
function projectLat(lat: number): number {
  return ((90 - lat) / 180) * MAP_H;
}

// Simplify a ring by dropping points (Ramer-Douglas-Peucker would be better but this works)
function simplifyRing(ring: number[][], tolerance: number): number[][] {
  if (ring.length <= 4) return ring;
  const result: number[][] = [ring[0]];
  for (let i = 1; i < ring.length; i++) {
    const prev = result[result.length - 1];
    const dx = ring[i][0] - prev[0];
    const dy = ring[i][1] - prev[1];
    if (Math.sqrt(dx * dx + dy * dy) >= tolerance) {
      result.push(ring[i]);
    }
  }
  // Ensure ring is closed
  if (result.length > 1) {
    const first = result[0];
    const last = result[result.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      result.push([...first]);
    }
  }
  return result;
}

// Convert a polygon ring to SVG path segment
function ringToPath(ring: number[][]): string {
  if (ring.length < 3) return "";
  const simplified = ring; // no simplification — use Natural Earth raw points
  if (simplified.length < 3) return "";

  const parts: string[] = [];
  for (let i = 0; i < simplified.length; i++) {
    const x = projectLon(simplified[i][0]).toFixed(1);
    const y = projectLat(simplified[i][1]).toFixed(1);
    parts.push(`${i === 0 ? "M" : "L"}${x},${y}`);
  }
  parts.push("Z");
  return parts.join("");
}

// Convert GeoJSON geometry to SVG path — filter out far-away territories
// (e.g. French Guiana for France) so the path stays in one rendered region.
function geometryToPath(geometry: any, iso3?: string): string {
  if (!geometry) return "";
  const paths: string[] = [];

  const addRing = (ring: number[][]) => {
    // Skip rings whose centroid is far from the "primary" area for known overseas territories
    if (iso3 === "FRA" && ring.length > 0) {
      const avgLon = ring.reduce((s, p) => s + p[0], 0) / ring.length;
      if (avgLon < -20) return; // French Guiana, Reunion skipped on main FRA entry
    }
    if (iso3 === "NLD" && ring.length > 0) {
      const avgLon = ring.reduce((s, p) => s + p[0], 0) / ring.length;
      if (avgLon < -20) return;
    }
    const p = ringToPath(ring);
    if (p) paths.push(p);
  };

  if (geometry.type === "Polygon") {
    for (const ring of geometry.coordinates) addRing(ring);
  } else if (geometry.type === "MultiPolygon") {
    for (const polygon of geometry.coordinates) {
      for (const ring of polygon) addRing(ring);
    }
  }

  return paths.join("");
}

async function main() {
  console.log("Fetching Natural Earth 110m GeoJSON...");

  let geojson: any;
  try {
    const res = await fetch(NE_GEOJSON_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    geojson = await res.json();
    console.log(`Fetched ${geojson.features?.length || 0} features from Natural Earth.`);
  } catch (e) {
    console.log(`Natural Earth failed (${e}), trying fallback...`);
    const res = await fetch(GEOJSON_URL);
    if (!res.ok) throw new Error(`Fallback also failed: HTTP ${res.status}`);
    geojson = await res.json();
    console.log(`Fetched ${geojson.features?.length || 0} features from fallback.`);
  }

  const countries: Array<{ iso3: string; name: string; path: string }> = [];

  for (const feature of geojson.features) {
    const props = feature.properties || {};
    // Natural Earth has a known bug: France, Norway and a few others have ISO_A3 = "-99".
    // Fall back to ISO_A3_EH / ADM0_A3_US / ADM0_A3 which carry the correct code.
    const rawCandidates = [
      props.ISO_A3,
      props.ISO_A3_EH,
      props.ADM0_A3_US,
      props.ADM0_A3,
      props.SOV_A3,
      props.ISO3,
    ];
    const iso3 = rawCandidates.find((c) => c && c !== "-99") || "";
    const name = props.NAME || props.ADMIN || props.name || "";
    if (!iso3) continue;

    const path = geometryToPath(feature.geometry, iso3);
    if (!path) continue;

    countries.push({ iso3, name, path });
  }

  console.log(`Processed ${countries.length} countries.`);

  // Generate TypeScript output
  const lines: string[] = [
    '/**',
    ' * Simplified world map country SVG path data.',
    ' * Auto-generated from Natural Earth 110m — equirectangular projection.',
    ` * Coordinate space: 0-${MAP_W} (x) × 0-${MAP_H} (y).`,
    ` * Generated: ${new Date().toISOString()}`,
    ' */',
    '',
    'export interface CountryPath {',
    '  iso3: string;',
    '  name: string;',
    '  path: string;',
    '}',
    '',
    'export const COUNTRY_PATHS: CountryPath[] = [',
  ];

  for (const c of countries) {
    const escapedName = c.name.replace(/"/g, '\\"');
    lines.push(`  { iso3: "${c.iso3}", name: "${escapedName}", path: "${c.path}" },`);
  }

  lines.push('];');
  lines.push('');

  writeFileSync(OUTPUT, lines.join('\n'), 'utf-8');
  console.log(`Written to ${OUTPUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
