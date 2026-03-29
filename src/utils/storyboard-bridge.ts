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
  // ── Text-overlay with multi-phase pivot (scene-020: lens switch) ──
  if (visual?.type === "text-overlay" && visual?.textOverlay?.phase1) {
    visual.dataChart = {
      type: "lens-switch-pivot",
      summaryText: visual.textOverlay.summaryText,
      pivotQuestion: visual.textOverlay.phase1.text,
      rulerQuestion: visual.textOverlay.phase2?.text,
      deflators: visual.textOverlay.deflators,
    };
    visual.type = "data-chart";
    return;
  }

  // ── Text-overlay with sequence array (scene-027: closing sequence) ──
  if (visual?.type === "text-overlay" && visual?.textOverlay?.sequence) {
    visual.dataChart = {
      type: "closing-sequence",
      textSequence: visual.textOverlay.sequence,
      channelName: "The World With Numbers",
      showSubscribe: visual.textOverlay.subscribePrompt ?? false,
      endScreenSafe: visual.textOverlay.endScreenSafe ?? true,
    };
    visual.type = "data-chart";
    return;
  }

  // ── ShrinkflationCards: splitCards array with no dataVisualization (scene-014) ──
  if (visual?.splitCards && Array.isArray(visual.splitCards) && !visual?.dataVisualization) {
    visual.dataChart = {
      type: "shrinkflation-cards",
      cards: visual.splitCards,
      blsStat: visual.blsStat,
    };
    visual.type = "data-chart";
    return;
  }

  // ── SkimpflationCard: textOverlay with SKIMPFLATION title, no dataVisualization (scene-015) ──
  if (
    visual?.textOverlay?.title === "SKIMPFLATION" &&
    !visual?.dataVisualization &&
    !visual?.phases &&
    !visual?.hookConfig &&
    !visual?.splitCards
  ) {
    visual.dataChart = {
      type: "skimpflation-card",
      title: visual.textOverlay?.title,
      subtitle: visual.textOverlay?.subtitle,
    };
    visual.type = "data-chart";
    return;
  }

  // ── BLS Shrinkflation Explainer (scene-005) ──
  if (visual?.type === "remotion-component" && !visual?.dataVisualization) {
    const desc = (visual.description || "").toLowerCase();
    if (desc.includes("shrinkflation") || desc.includes("coffee can")) {
      visual.dataChart = {
        type: "bls-shrink-explainer",
        startSize: "16 oz",
        endSize: "10 oz",
        stickerPrice: "$4.99",
        startPerUnit: "$4.99/lb",
        endPerUnit: "$7.99/lb",
        blsAttribution: "BLS tracks per-unit price",
      };
      visual.type = "data-chart";
      return;
    }
  }

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
          backgroundColor: endCardCfg.backgroundColor || "#2A2A32",
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

  // ── Comparison-then-formula (MetricScene) ───────────────────
  // Storyboard uses type="comparison-then-formula" for two-phase scenes:
  //   Phase 1: split comparison card (year vs year)
  //   Phase 2: animated formula build
  // Bridge normalizes the storyboard shape into MetricScene props.
  if (dv.type === "comparison-then-formula") {
    const p1 = dv.phase1 || {};
    const p2 = dv.phase2 || {};

    // Normalize phase1 — storyboard may use product-specific keys ("eggs")
    // while the component expects generic { product, price } fields.
    const normalizePanel = (raw: any): any => {
      if (!raw) return { year: 0, wage: "$0", product: "Item", price: "$0" };
      // Find a product key (anything that's not "year" or "wage")
      let product = raw.product || "";
      let price = raw.price || "";
      if (!product || !price) {
        for (const key of Object.keys(raw)) {
          if (key !== "year" && key !== "wage") {
            product = key.charAt(0).toUpperCase() + key.slice(1);
            price = String(raw[key]);
            break;
          }
        }
      }
      return {
        year: raw.year ?? 0,
        wage: raw.wage || "$0",
        product,
        price,
      };
    };

    // Normalize phase2 — formula string → parts array
    let formulaParts: string[] = [];
    if (p2.formulaParts && Array.isArray(p2.formulaParts)) {
      formulaParts = p2.formulaParts;
    } else if (p2.formula && typeof p2.formula === "string") {
      // Split "Price Growth ÷ Wage Growth = RUPI" into parts
      formulaParts = p2.formula
        .split(/\s+/)
        .reduce((acc: string[], token: string) => {
          // Operators stay as single tokens
          if (token === "÷" || token === "=" || token === "×" || token === "+" || token === "-" || token === "/") {
            acc.push(token);
          } else {
            // Merge consecutive non-operator tokens (e.g. "Price" + "Growth" → "Price Growth")
            const last = acc[acc.length - 1];
            if (last && last !== "÷" && last !== "=" && last !== "×" && last !== "+" && last !== "-" && last !== "/") {
              acc[acc.length - 1] = `${last} ${token}`;
            } else {
              acc.push(token);
            }
          }
          return acc;
        }, []);
    }

    visual.dataChart = {
      type: "metric-scene",
      phase1: {
        left: normalizePanel(p1.left),
        right: normalizePanel(p1.right),
      },
      phase2: {
        formulaParts: formulaParts.length > 0
          ? formulaParts
          : ["Price Growth", "÷", "Wage Growth", "=", "RUPI"],
      },
      phaseSplitSec: dv.phaseSplitSec,
      blsLogoSrc: dv.blsLogoSrc,
    };
    visual.type = "data-chart";
    return;
  }

  // ── Race-line-chart (HorseRaceChart) ────────────────────────
  // Storyboard uses chartType="race-line-chart" with per-scene config.
  // Bridge produces dataChart.type="horse-race" so DataChartScene routes correctly.
  // Full series data is injected later by Root.tsx from rupi-data.json.
  const chartType: string = dv.chartType || "";

  // ── Baseline Reference (scene-004: RUPI legend diagram) ───
  if (chartType === "baseline-reference") {
    visual.dataChart = {
      type: "baseline-reference",
      baselineValue: dv.baselineValue ?? 1,
      zones: dv.zones,
    };
    visual.type = "data-chart";
    return;
  }

  // ── Special case: Shrinkflation Hook (scene-001) ──────────
  // When state="initial" and allAtBaseline=true, this is the hook scene
  // that shows shrinking products then product icons at RUPI=1.0 baseline.
  if (chartType === "race-line-chart" && dv.state === "initial" && dv.allAtBaseline === true) {
    visual.dataChart = {
      type: "shrinkflation-hook",
      title: visual.textOverlay?.title || "Shrinkflation Decoded",
      products: dv.products,
      productColors: dv.productColors,
      showLineup: dv.showLineup !== false, // default true for backward compat
      baselinePulse: dv.baselinePulse !== false, // default true
    };
    visual.type = "data-chart";
    return;
  }

  // ── Special case: Hook Punchline (scene-002) ──────────────
  // When state="2025-preview-blur", show blurred bar preview + question text.
  if (chartType === "race-line-chart" && dv.state === "2025-preview-blur") {
    visual.dataChart = {
      type: "hook-punchline",
      questionText: visual.textOverlay?.text,
      aboveLine: dv.aboveLine,
      belowLine: dv.belowLine,
    };
    visual.type = "data-chart";
    return;
  }

  if (chartType === "race-line-chart") {
    visual.dataChart = {
      type: "horse-race",
      yearRange: dv.yearRange,
      highlightProduct: dv.highlightProduct,
      keyDataPoints: dv.keyDataPoints,
      howToReadOverlay: dv.howToReadOverlay,
      state: dv.state,
      allProducts: dv.allProducts,
      finalPositions: dv.finalPositions,
      labels: dv.labels,
      greenRedZones: dv.greenRedZones,
      peanutButterHighlight: dv.peanutButterHighlight,
      // Deflator switch fields (scenes 021–025)
      deflator: dv.deflator,
      previousDeflator: dv.previousDeflator,
      morphAnimation: dv.morphAnimation,
      finalPositionsCPI: dv.finalPositionsCPI,
      finalPositionsMinWage: dv.finalPositionsMinWage,
      finalPositionsGold: dv.finalPositionsGold,
      crossings: dv.crossings,
      sideStat: dv.sideStat,
      // Preview/starting states
      showGreenRedZones: dv.showGreenRedZones,
      aboveLine: dv.aboveLine,
      belowLine: dv.belowLine,
      allAtBaseline: dv.allAtBaseline,
      baselineValue: dv.baselineValue,
      baselinePulse: dv.baselinePulse,
      startGlow: dv.startGlow,
      products: dv.products,
      lineStyles: dv.lineStyles,
      // Summary chart (scene 026)
      layout: dv.layout,
      charts: dv.charts,
      // Annotation / event marker fields (for Root.tsx annotation extraction)
      eventMarker: dv.eventMarker,
      annotation: dv.annotation,
      annotations: dv.annotations,
      highlightProducts: dv.highlightProducts,
      dimProducts: dv.dimProducts,
      overlays: dv.overlays,
    };
    // Normalize visual.type so MainComposition picks it up
    visual.type = "data-chart";
    return;
  }

  // ── Grouped-bar-summary (scene 026) ─────────────────────────
  if (chartType === "grouped-bar-summary") {
    visual.dataChart = {
      type: "deflator-summary-grid",
      title: visual.textOverlay?.title || "Same Data. Different Ruler.",
      charts: dv.charts.map((c: any) => {
        if (c.above && c.below) return c; // already in correct format
        const above: Array<string | { name: string; value: number }> = [];
        const below: Array<string | { name: string; value: number }> = [];
        if (c.products) {
          for (const [name, info] of Object.entries(c.products)) {
            const val = (info as any).value ?? (info as any).rupi;
            const item = val != null ? { name, value: Number(val) } : name;
            if ((info as any).above) above.push(item);
            else below.push(item);
          }
        }
        return { deflator: c.deflator, above, below };
      }),
      source: "BLS, FRED, DOL, LBMA",
    };
    visual.type = "data-chart";
    return;
  }

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
        backgroundColor: endCfg.backgroundColor || "#2A2A32",
        watermark: endCfg.watermark ?? true,
        silenceHold: endCfg.silenceHold,
        finalQuestion: visual.textOverlay?.finalQuestion || "What is an hour of your life worth?",
        finalQuestionColor: visual.textOverlay?.finalQuestionColor || "#F0EDE8",
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
      backgroundColor: endCfg.backgroundColor || "#2A2A32",
      watermark: endCfg.watermark ?? true,
      silenceHold: endCfg.silenceHold,
      finalQuestion: visual.textOverlay?.finalQuestion || "",
      finalQuestionColor: visual.textOverlay?.finalQuestionColor || "#F0EDE8",
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
