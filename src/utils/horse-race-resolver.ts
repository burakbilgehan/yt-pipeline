/**
 * Horse-race chart data resolver.
 *
 * Extracted from Root.tsx — injects RUPI series data, per-scene time ranges,
 * annotations, and shrinkflation markers into horse-race scenes.
 *
 * Mutates scenes in-place (same behavior as original inline code).
 */

// ── Deflator name → rupi-data.json key mapping ──
const deflatorKeyMap: Record<string, string> = {
  "Median Wage": "wage",
  "median wage": "wage",
  "wage": "wage",
  "CPI": "cpi",
  "cpi": "cpi",
  "Federal Minimum Wage": "minWage",
  "Minimum Wage": "minWage",
  "minWage": "minWage",
  "Gold": "gold",
  "gold": "gold",
};

// ── Y-axis labels per data key ──
const yLabels: Record<string, string> = {
  wage: "RUPI (Wage-Deflated)",
  cpi: "RUPI (CPI-Deflated)",
  minWage: "RUPI (Min Wage-Deflated)",
  gold: "RUPI (Gold-Deflated)",
};

export function resolveHorseRaceScenes(
  resolvedScenes: any[],
  rupiData: Record<string, any[]>,
): void {
  // ── Pass 1: Inject series data + per-scene defaults ──
  const horseRaceScenes: Array<{ scene: any; dc: any }> = [];

  for (const scene of resolvedScenes) {
    const dc = scene.visual?.dataChart;
    if (!dc || dc.type !== "horse-race") continue;

    horseRaceScenes.push({ scene, dc });

    // Determine which deflator's series to use
    const deflatorName: string = dc.deflator || "Median Wage";
    const dataKey = deflatorKeyMap[deflatorName] || "wage";
    const series = rupiData[dataKey];
    if (series && Array.isArray(series)) {
      dc.series = series;
    }

    // Set time range from scene's yearRange or full range
    const yr = dc.yearRange;
    dc.timeRange = {
      start: yr?.[0] ?? 2000,
      end: yr?.[1] ?? 2025,
    };

    // Defaults for camera/annotations (per-scene overrides can be added later)
    if (!dc.cameraKeyframes) {
      dc.cameraKeyframes = [{ year: dc.timeRange.start, zoom: 1.0, speed: 1.0 }];
    }

    // Use transparent background so SceneVisual layer shows through
    dc.backgroundColor = "transparent";

    // Linear scale for RUPI (0–3.5 range) — log scale not appropriate here
    if (dc.logScale === undefined) {
      dc.logScale = false;
    }

    // Y-axis label based on deflator
    if (!dc.yAxisLabel) {
      dc.yAxisLabel = yLabels[dataKey] || "RUPI";
    }
  }

  if (horseRaceScenes.length === 0) return;

  // ── Pass 2: Build per-scene sceneYearRanges ──
  // MainComposition renders each scene inside its own <Sequence from={startFrame}>,
  // so useCurrentFrame() in HorseRaceChart returns scene-local frames (0..sceneDuration).
  // Each scene therefore needs a single-entry sceneYearRanges covering 0..sceneDurationSec
  // mapped to the appropriate yearStart..yearEnd for that scene.
  {
    let lastYearEnd = 2000;

    for (const { scene, dc } of horseRaceScenes) {
      const sceneDurationSec = (scene.endTime || 0) - (scene.startTime || 0);
      const yr = dc.yearRange;
      const state: string = dc.state || "";

      let yearStart: number;
      let yearEnd: number;

      if (state === "start-position") {
        // Use explicit yearRange if provided (e.g. [1999,2003] for wider chart window),
        // otherwise default to frozen at year 2000.
        if (yr && Array.isArray(yr) && yr.length === 2) {
          yearStart = yr[0];
          yearEnd = yr[1];
        } else {
          yearStart = 2000;
          yearEnd = 2000;
        }
      } else if (state.startsWith("frozen") || state.startsWith("paused")) {
        const frozenYear = parseInt(state.replace(/\D/g, "")) || lastYearEnd;
        yearStart = frozenYear;
        yearEnd = frozenYear;
      } else if (dc.deflator && dc.deflator !== "Median Wage" && dc.deflator !== "median wage" && dc.deflator !== "wage") {
        // Deflator switch scenes: chart at full extent, lines morph
        yearStart = 2025;
        yearEnd = 2025;
      } else if (yr && Array.isArray(yr) && yr.length === 2) {
        yearStart = yr[0];
        yearEnd = yr[1];
      } else {
        yearStart = lastYearEnd;
        yearEnd = lastYearEnd;
      }

      // Single-entry range: scene-local time 0 → sceneDuration maps to yearStart → yearEnd
      dc.sceneYearRanges = [{
        sceneStartSec: 0,
        sceneEndSec: sceneDurationSec,
        yearStart,
        yearEnd,
      }];
      lastYearEnd = yearEnd;
    }
  }

  // ── Pass 3: Build annotations + markers from storyboard data ──
  const allAnnotations: Array<{
    year: number;
    text: string;
    style: string;
    asset?: string;
    duration?: number;
    icon?: string;
  }> = [];

  // Separate collection for shrinkflation markers (vertical dashed lines)
  const shrinkMarkers: Array<{ year: number; label: string; color?: string }> = [];
  const seenMarkers = new Set<string>();

  for (const { dc } of horseRaceScenes) {
    // eventMarker → annotation
    if (dc.eventMarker) {
      const em = dc.eventMarker;
      const textStr: string = (em.title || em.text || "").toLowerCase();
      const isMajor = textStr.includes("avian") ||
                      textStr.includes("covid") ||
                      (em.type || "") === "covid-annotation";
      allAnnotations.push({
        year: em.year,
        text: em.title || em.text,
        style: isMajor ? "major-crisis-flash" : "crisis-flash",
        duration: 2,
      });
    }

    // annotation (singular object, e.g. scene-008)
    if (dc.annotation && typeof dc.annotation === "object" && !Array.isArray(dc.annotation)) {
      allAnnotations.push({
        year: dc.annotation.year,
        text: dc.annotation.text,
        style: "milestone-flash",
        asset: dc.annotation.product,
        duration: 2,
      });
    }

    // annotations (array from storyboard)
    if (dc.annotations && Array.isArray(dc.annotations)) {
      for (const a of dc.annotations) {
        if (a.year && a.text) {
          if (a.type === "shrinkflation") {
            const markerKey = `${a.year}-${a.text}`;
            if (!seenMarkers.has(markerKey)) {
              seenMarkers.add(markerKey);
              shrinkMarkers.push({
                year: a.year,
                label: a.text,
              });
            }
            allAnnotations.push({
              year: a.year,
              text: a.text,
              style: "shrinkflation-callout",
              asset: a.product,
              duration: 2,
            });
          } else if (a.near || a.product) {
            // Regular product annotations (with near or product field)
            allAnnotations.push({
              year: a.year,
              text: a.text,
              style: "leader-callout",
              asset: a.near || a.product,
              duration: 2,
            });
          } else {
            // Event-type annotations (no product/near)
            allAnnotations.push({
              year: a.year,
              text: a.text,
              style: "event-flash",
              duration: 2,
            });
          }
        }
      }
    }

    // crossings (from deflator switch scenes)
    if (dc.crossings && Array.isArray(dc.crossings)) {
      for (const c of dc.crossings) {
        allAnnotations.push({
          year: 2025,
          text: `${c.product} crosses 1.0`,
          style: "crossing-alert",
          asset: c.product,
          duration: 2,
        });
      }
    }

    // overlays with type "shrinkflation" (from overlays array)
    if (dc.overlays && Array.isArray(dc.overlays)) {
      for (const o of dc.overlays) {
        if (o.type === "shrinkflation" && o.year && o.text) {
          const markerKey = `${o.year}-${o.text}`;
          if (!seenMarkers.has(markerKey)) {
            seenMarkers.add(markerKey);
            shrinkMarkers.push({
              year: o.year,
              label: o.text,
            });
          }
        }
      }
    }
  }

  // Deduplicate annotations by year+text
  const seen = new Set<string>();
  const uniqueAnnotations = allAnnotations.filter((a) => {
    const key = `${a.year}-${a.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Inject annotations + shrinkflation markers into all horse-race scenes
  for (const { dc } of horseRaceScenes) {
    dc.annotations = uniqueAnnotations;
    if (shrinkMarkers.length > 0) {
      dc.shrinkflationMarkers = shrinkMarkers;
    }
  }
}
