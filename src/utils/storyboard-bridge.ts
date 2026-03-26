/**
 * Storyboard → Remotion Bridge
 *
 * Transforms storyboard scene data (dataVisualization format) into
 * Remotion-compatible props (dataChart format).
 *
 * Used by:
 *  - remotion-render.ts (full render)
 *  - Root.tsx calculateMetadata (Studio preview)
 *  - preview-frames.ts (still frame generation)
 */

/**
 * Optional dataset that can be loaded from storyboard config.
 * Previously this was hardcoded with 34 OECD countries — now the data
 * must come from the storyboard scene files (cfg.allDots or cfg.dots).
 * The bridge no longer embeds video-specific research data.
 */

interface DotInput {
  code?: string;
  label?: string;
  x: number;
  y: number;
  [key: string]: unknown;
}

/**
 * Normalize closing sequence keys from storyboard format (step1_, step2_...) 
 * to component format (phase1_, phase2_...).
 * Also handles both naming conventions transparently.
 */
function normalizeClosingSequence(raw: any): any | undefined {
  if (!raw) return undefined;
  // If already in component format (phase1_...), pass through
  if (raw.phase1_allVisible || raw.phase2_fadeToSpotlight) return raw;
  // Convert step→phase naming
  const result: any = {};
  if (raw.step1_allVisible) result.phase1_allVisible = raw.step1_allVisible;
  if (raw.step2_fadeToSpotlight) result.phase2_fadeToSpotlight = raw.step2_fadeToSpotlight;
  if (raw.step3_spotlightPulse) result.phase3_spotlightPulse = raw.step3_spotlightPulse;
  if (raw.step4_chartFadeOut) {
    // Bridge step4 (chartFadeOut) → phase4 (dotsFade)
    result.phase4_dotsFade = {
      duration: raw.step4_chartFadeOut.duration || "2s",
      fadeAllDots: raw.step4_chartFadeOut.fadeAll ?? true,
      keepAxes: false,
      keepGrid: false,
    };
  }
  // step5/step6 if present
  if (raw.step5_closingText) result.phase5_closingText = raw.step5_closingText;
  if (raw.step6_fadeToBlack) result.phase6_fadeToBlack = raw.step6_fadeToBlack;
  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Apply the dataVisualization → dataChart bridge to a single scene's visual.
 * Mutates the visual object in place (adds `visual.dataChart`).
 */
export function bridgeSceneVisual(visual: any): void {
  // ── Composite scenes with phases (e.g., scene-003: grocery → title → bar chart) ──
  if (visual?.phases && Array.isArray(visual.phases)) {
    // ── Closing scene detection: phases contain stock-video or end-screen types ──
    const hasStockVideo = visual.phases.some((p: any) => p.type === "stock-video");
    const hasEndScreen = visual.phases.some((p: any) => p.type === "end-screen");

    if (hasStockVideo || hasEndScreen) {
      // This is a closing scene — extract phase configs
      const chartPhase = visual.phases.find((p: any) => p.type === "data-chart");
      const videoPhase = visual.phases.find((p: any) => p.type === "stock-video");
      const endPhase = visual.phases.find((p: any) => p.type === "end-screen");

      // Bridge the chart phase through QuadrantScatter logic to get proper dataChart config
      let chartConfig: any = {};
      if (chartPhase?.dataVisualization) {
        const tempVisual = { dataVisualization: chartPhase.dataVisualization };
        bridgeSceneVisual(tempVisual);
        // Extract the bridged config (minus the "type" field — ClosingScene adds its own)
        const { type: _type, ...rest } = (tempVisual as any).dataChart || {};
        chartConfig = rest;
      }

      const endCardCfg = endPhase?.endCard?.config || {};

      visual.dataChart = {
        type: "closing-scene",
        chartConfig,
        chartEndSec: chartPhase?.endOffset ?? 17,
        videoSrc: videoPhase?.video?.staticPath || "",
        videoStartSec: videoPhase?.startOffset ?? 17,
        videoEndSec: videoPhase?.endOffset ?? 34,
        videoOverlayTint: videoPhase?.overlay?.tint || "rgba(26, 27, 34, 0.3)",
        endScreenStartSec: endPhase?.startOffset ?? 34,
        endCardConfig: {
          fadeToBlack: endCardCfg.fadeToBlack ?? true,
          fadeToBlackDuration: endCardCfg.fadeToBlackDuration,
          backgroundColor: endCardCfg.backgroundColor || "#1A1B22",
          watermark: endCardCfg.watermark ?? true,
          youtubeEndScreen: endCardCfg.youtubeEndScreen,
        },
      };
      return;
    }

    // ── Standard composite phases (e.g., scene-003: grocery → title → bar chart) ──
    visual.dataChart = {
      type: "composite-phases",
      phases: visual.phases.map((phase: any) => {
        const phaseDuration = parseFloat(phase.duration) || 10; // seconds
        if (phase.component === "SplitComparison") {
          return { type: "split-comparison", durationSec: phaseDuration, ...phase.config };
        } else if (phase.component === "TitleCard") {
          return { type: "title-card", durationSec: phaseDuration, ...phase.config };
        } else if (phase.component === "HorizontalBarChart") {
          return { type: "horizontal-bar-chart", durationSec: phaseDuration, ...phase.config };
        }
        return { type: "unknown", durationSec: phaseDuration };
      }),
    };
    return;
  }

  // ── Composite scenes with components array or hookConfig (e.g., scene-001 hook) ──
  if ((visual?.components && Array.isArray(visual.components) && !visual?.dataVisualization) || visual?.hookConfig) {
    const hc = visual.hookConfig || {};
    visual.dataChart = {
      type: "hook-scene",
      questionText: hc.questionText || visual.textOverlay?.text || "What is one hour of your life worth?",
      slug: hc.slug,
      videos: hc.videos,
      phaseTimes: hc.phaseTimes,
    };
    return;
  }

  const dv = visual?.dataVisualization;
  if (!dv) return;

  const component: string = dv.component;
  const cfg = dv.config || {};

  if (component === "HorizontalBarChart") {
    visual.dataChart = {
      type: "horizontal-bar-chart",
      title: cfg.title,
      bars: cfg.bars,
      barColor: cfg.barColor,
      barHeight: cfg.barHeight,
      barGap: cfg.barGap,
      labelColor: cfg.labelColor,
      valueColor: cfg.valueColor,
      gradientColors: cfg.gradientColors,
      animationStyle: cfg.animationStyle,
      staggerDelay: cfg.staggerDelay,
      animation: cfg.animation,
    };
  } else if (component === "BarChart") {
    visual.dataChart = {
      type: "bar-chart",
      title: cfg.title,
      subtitle: cfg.source,
      items: (cfg.bars || []).map((b: any) => ({
        label: b.label,
        value: b.value,
        color: b.color,
      })),
      unit: cfg.unit,
      orientation: cfg.type === "vertical" ? "vertical" : "horizontal",
    };
  } else if (component === "QuadrantScatter") {
    // ── Check for composite sub-components that override the scatter ──
    // Scene-009: CalendarGrid embedded in QuadrantScatter
    if (cfg.calendarGrid?.component === "CalendarGrid") {
      const calCfg = cfg.calendarGrid;
      visual.dataChart = {
        type: "calendar-grid",
        months: calCfg.months || 12,
        highlightedDays: calCfg.highlightedDays || 55,
        highlightColor: calCfg.highlightColor || "#E06070",
        labels: calCfg.labels || [],
        comparisonCard: cfg.comparisonCard,
        connectorLabel: cfg.connectorLine?.midpointLabel,
      };
      return;
    }
    // Scene-010: DivisionComparison embedded in QuadrantScatter
    // IMPORTANT: Don't override QuadrantScatter entirely — render CHILL dots first,
    // pass DivisionComparison data as overlay info for the component to show both.
    // Previously this overrode to DivisionComparison-only, hiding CHILL quadrant dots.
    if (cfg.divisionComparison?.component === "DivisionComparison") {
      // Fall through to normal QuadrantScatter rendering below,
      // but attach divisionComparison as extra data for overlay
    }
    // Scene-015: EndCardScene — check visual.endCard
    if (visual.endCard?.component === "EndCardScene") {
      const endCfg = visual.endCard.config || {};
      visual.dataChart = {
        type: "end-card",
        fadeToBlack: endCfg.fadeToBlack ?? true,
        fadeToBlackDuration: endCfg.fadeToBlackDuration,
        backgroundColor: endCfg.backgroundColor || "#1A1B22",
        watermark: endCfg.watermark ?? true,
        silenceHold: endCfg.silenceHold,
        finalQuestion: visual.textOverlay?.finalQuestion || "What is an hour of your life worth?",
        finalQuestionColor: visual.textOverlay?.finalQuestionColor || "#EAE0D5",
        gapLabel: visual.textOverlay?.gapLabel,
        youtubeEndScreen: endCfg.youtubeEndScreen,
      };
      return;
    }

    const origin = cfg.origin || { x: 1633, y: 59200 };
    const xAxis = cfg.xAxis
      ? { ...cfg.xAxis, origin: origin.x }
      : { label: "Annual Hours Worked", min: 1150, max: 2350, origin: origin.x };
    const yAxis = cfg.yAxis
      ? { ...cfg.yAxis, origin: origin.y }
      : { label: "PPP-Adjusted Annual Salary ($)", min: 15000, max: 100000, origin: origin.y };

    // Collect dots from various storyboard fields
    // allDots: complete dataset provided by the storyboard (replaces old hardcoded data)
    const allDotsPool: DotInput[] = cfg.allDots || [];
    let rawDots: DotInput[] = [
      ...(cfg.dots || []),
      ...(cfg.clusterDots || []),
    ];

    // For scenes that need all dots (showAllDots, visibleDots, or connector lines referencing dots)
    if ((cfg.showAllDots || cfg.visibleDots || cfg.connectorLine || cfg.connectorLines) && rawDots.length === 0) {
      rawDots = allDotsPool;
    }

    // Auto-add missing connector endpoint countries from the storyboard's allDots pool
    const allConnectors = cfg.connectorLines || (cfg.connectorLine ? [cfg.connectorLine] : []);
    if (allConnectors.length > 0 && rawDots.length > 0) {
      const existingCodes = new Set(rawDots.map((d: DotInput) => d.code || d.label));
      for (const cl of allConnectors) {
        for (const code of [cl.from, cl.to]) {
          if (code && !existingCodes.has(code)) {
            const found = allDotsPool.find((d: DotInput) => d.code === code);
            if (found) {
              rawDots.push(found);
              existingCodes.add(code);
            }
          }
        }
      }
    }

    // Convert dots → points with quadrant assignment
    const explicitHighlights = cfg.highlightedCountries || cfg.labeledCountries || [];
    const highlightSet = new Set<string>(explicitHighlights);

    // Auto-spotlight: if few dots (≤5) and no explicit highlights, spotlight all
    const autoSpotlight = highlightSet.size === 0 && rawDots.length > 0 && rawDots.length <= 5;

    const points = rawDots.map((d: DotInput) => {
      const isRight = d.x >= origin.x;
      const isTop = d.y > origin.y;
      const quadrant = isTop ? (isRight ? "grind" : "dream") : (isRight ? "trap" : "chill");
      const code = d.code || d.label || "?";
      // Auto-assign labelDir based on position relative to chart center
      // Countries on the left side of the chart → label right, and vice versa
      // Countries near the top → label below, near bottom → label above
      const xMid = (xAxis.min + xAxis.max) / 2;
      const yMid = (yAxis.min + yAxis.max) / 2;
      let labelDir: string | undefined = d.labelDir as string | undefined;
      if (!labelDir) {
        const isLeftHalf = d.x < xMid;
        const isTopHalf = d.y > yMid;
        if (isLeftHalf && isTopHalf) labelDir = "right";
        else if (isLeftHalf && !isTopHalf) labelDir = "top-right";
        else if (!isLeftHalf && isTopHalf) labelDir = "left";
        else labelDir = "top-left";
      }
      return {
        label: code,
        x: d.x,
        y: d.y,
        quadrant,
        highlight: autoSpotlight || highlightSet.has(code),
        labelDir,
      };
    });

    visual.dataChart = {
      type: "quadrant-scatter",
      title: cfg.title,
      points,
      xAxis,
      yAxis,
      quadrantLabels: cfg.quadrantLabels,
      spotlights: autoSpotlight
        ? rawDots.map((d: DotInput) => d.code || d.label || "?")
        : [...highlightSet],
      // Camera zoom — normalize storyboard format to component format
      cameraZoom: cfg.cameraZoom ? {
        target: cfg.cameraZoom.target,
        startScale: cfg.cameraZoom.startScale ?? 1.0,
        endScale: cfg.cameraZoom.endScale ?? cfg.cameraZoom.scale ?? 1.5,
        startAt: cfg.cameraZoom.startAt ?? 0,
        duration: cfg.cameraZoom.duration ?? undefined,
        startFrom: cfg.cameraZoom.startFrom ?? undefined,
        transitionDuration: cfg.cameraZoom.transitionDuration ?? undefined,
      } : undefined,
      // Pass through DivisionComparison overlay data if present
      divisionOverlay: cfg.divisionComparison?.component === "DivisionComparison"
        ? {
            left: { ...cfg.divisionComparison.left },
            right: { ...cfg.divisionComparison.right },
            operator: cfg.divisionComparison.operator || ">",
            conclusion: cfg.divisionComparison.conclusion || "",
          }
        : undefined,
      // Connector lines between countries (e.g. Greece → Germany)
      connectorLines: (() => {
        const lines = cfg.connectorLines || (cfg.connectorLine ? [cfg.connectorLine] : undefined);
        if (!lines) return undefined;
        // Normalize: singular "label" string → "labels" array
        // Also pass through showAt and duration for timed connector lines
        return lines.map((cl: any) => {
          const normalized = { ...cl };
          if (normalized.label && !normalized.labels) {
            normalized.labels = [normalized.label];
          }
          return normalized;
        });
      })(),
      // Spotlight card (detailed callout for a single country)
      spotlightCard: cfg.spotlightCard,
      // Counter label ("16 of 33 countries")
      counterLabel: cfg.counterLabel,
      // Active quadrant for dimming
      activeQuadrant: cfg.activeQuadrant,
      // ─── v5 fields ───
      showLabelsFor: cfg.showLabelsFor === "all"
        ? rawDots.map((d: DotInput) => d.code || d.label || "?")
          .concat((cfg.uglyTruthDots || []).map((d: any) => d.code || "?"))
        : cfg.showLabelsFor,
      activeQuadrantDots: cfg.activeQuadrantDots,
      tooltips: cfg.tooltips,
      annotations: cfg.annotations,
      uglyTruthDots: cfg.uglyTruthDots,
      closingSequence: normalizeClosingSequence(cfg.closingSequence || cfg.closingChartSequence),
      quadrantGlow: cfg.quadrantGlow,
      dotColorActive: cfg.dotColorActive,
      dotColorInactive: cfg.dotColorInactive,
      showQuadrantFills: cfg.showQuadrantFills,
      showQuadrantLabels: cfg.showQuadrantLabels,
      skipEntrance: cfg.skipEntrance,
      highlightDots: cfg.highlightDots,
    };
  }
  // ── SalaryShuffleScene ──────────────────────────────────────
  else if (component === "SalaryShuffleScene") {
    visual.dataChart = {
      type: "salary-shuffle",
      countries: cfg.countries || [],
      initialSort: cfg.initialSort || "salary",
      resortTo: cfg.resortTo || "hourlyRate",
      resortLabel: cfg.resortLabel || "Value per Hour",
      resortTriggerFrame: cfg.resortTriggerFrame ?? 60,
    };
  }
  // ── RankingResortScene ──────────────────────────────────────
  else if (component === "RankingResortScene") {
    visual.dataChart = {
      type: "ranking-resort",
      leftColumn: cfg.leftColumn,
      rightColumn: cfg.rightColumn,
      spotlightDelay: cfg.spotlightDelay,
    };
  }
  // ── CalendarGrid ────────────────────────────────────────────
  else if (component === "CalendarGrid" || cfg.calendarGrid?.component === "CalendarGrid") {
    // CalendarGrid can be embedded inside a QuadrantScatter composite scene
    // or standalone — handle both cases
    const calCfg = cfg.calendarGrid || cfg;
    visual.dataChart = {
      type: "calendar-grid",
      months: calCfg.months || 12,
      highlightedDays: calCfg.highlightedDays || 55,
      highlightColor: calCfg.highlightColor || "#E06070",
      labels: calCfg.labels || [],
      comparisonCard: cfg.comparisonCard,
      connectorLabel: cfg.connectorLine?.midpointLabel,
    };
  }
  // ── DivisionComparison ──────────────────────────────────────
  else if (component === "DivisionComparison" || cfg.divisionComparison?.component === "DivisionComparison") {
    const divCfg = cfg.divisionComparison || cfg;
    visual.dataChart = {
      type: "division-comparison",
      left: divCfg.left,
      right: divCfg.right,
      operator: divCfg.operator || ">",
      conclusion: divCfg.conclusion || "",
    };
  }
  // ── EndCardScene ────────────────────────────────────────────
  else if (component === "EndCardScene" || visual.endCard?.component === "EndCardScene") {
    const endCfg = visual.endCard?.config || cfg;
    visual.dataChart = {
      type: "end-card",
      fadeToBlack: endCfg.fadeToBlack ?? true,
      fadeToBlackDuration: endCfg.fadeToBlackDuration,
      backgroundColor: endCfg.backgroundColor || "#1A1B22",
      watermark: endCfg.watermark ?? true,
      silenceHold: endCfg.silenceHold,
      finalQuestion: visual.textOverlay?.finalQuestion || "",
      finalQuestionColor: visual.textOverlay?.finalQuestionColor || "#EAE0D5",
      gapLabel: visual.textOverlay?.gapLabel,
      youtubeEndScreen: endCfg.youtubeEndScreen,
    };
  }
  // Unknown component — skip
}

/**
 * Apply the bridge to all scenes in an array.
 * Also propagates fallback images for scenes without visuals.
 * Mutates scenes in place.
 */
export function bridgeAllScenes(scenes: any[]): void {
  // Bridge dataVisualization → dataChart
  for (const scene of scenes) {
    if (scene.visual) {
      bridgeSceneVisual(scene.visual);
    }
  }

  // Propagate fallback images
  let lastAssetPath: string | undefined;
  for (const scene of scenes) {
    if (scene.visual?.assetPath) {
      lastAssetPath = scene.visual.assetPath;
    } else if (lastAssetPath && scene.visual && scene.visual.type !== "text-overlay") {
      scene.visual._fallbackAssetPath = lastAssetPath;
    }
  }
}
