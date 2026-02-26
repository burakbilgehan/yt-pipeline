/**
 * YT Pipeline Storyboard Sync - Figma Plugin
 *
 * Imports storyboard JSON from yt-pipeline and creates/updates
 * Figma frames for each scene. Supports incremental sync.
 *
 * Flow:
 * 1. User opens plugin in Figma
 * 2. Pastes or loads storyboard JSON content
 * 3. Plugin creates/updates scene frames on the canvas
 * 4. On re-sync, existing frames are updated (matched by scene id), new ones added
 */

// ─── Types ────────────────────────────────────────────────────

interface StoryboardScene {
  id: string;
  section: string;
  startTime: number;
  endTime: number;
  voiceover: string;
  visual: {
    type: string;
    description: string;
    searchQuery?: string;
    textOverlay?: string;
    dataChart?: {
      type: string;
      title?: string;
      items?: Array<{ label: string; value: number }>;
      counterValue?: number;
      counterPrefix?: string;
      counterSuffix?: string;
    };
  };
  transition: string;
  notes?: string;
}

interface StoryboardData {
  title: string;
  version: number;
  totalDuration: number;
  scenes: StoryboardScene[];
}

// ─── Constants ────────────────────────────────────────────────

const FRAME_WIDTH = 800;
const FRAME_HEIGHT = 500;
const FRAME_GAP = 60;
const VISUAL_PLACEHOLDER_WIDTH = 360;
const VISUAL_PLACEHOLDER_HEIGHT = 220;

// Color mapping for visual types
const VISUAL_TYPE_COLORS: Record<string, RGB> = {
  "stock-image": { r: 0.2, g: 0.5, b: 0.8 },    // Blue
  "stock-video": { r: 0.2, g: 0.4, b: 0.7 },    // Dark blue
  "ai-image": { r: 0.5, g: 0.2, b: 0.7 },        // Purple
  "text-overlay": { r: 0.8, g: 0.5, b: 0.1 },    // Orange
  "data-chart": { r: 0.1, g: 0.7, b: 0.4 },      // Green
  "map": { r: 0.1, g: 0.6, b: 0.6 },             // Teal
  "composite": { r: 0.6, g: 0.6, b: 0.2 },       // Yellow-green
};

// ─── Message Handler ──────────────────────────────────────────

figma.showUI(__html__, { width: 480, height: 520 });

figma.ui.onmessage = async (msg: { type: string; data?: string }) => {
  if (msg.type === "sync-storyboard") {
    try {
      const storyboard: StoryboardData = JSON.parse(msg.data || "{}");

      if (!storyboard.scenes || storyboard.scenes.length === 0) {
        figma.notify("No scenes found in storyboard JSON.", { error: true });
        return;
      }

      await syncStoryboard(storyboard);
      figma.notify(
        `Synced ${storyboard.scenes.length} scenes (v${storyboard.version})`
      );
    } catch (err) {
      figma.notify(`Error: ${(err as Error).message}`, { error: true });
    }
  }

  if (msg.type === "cancel") {
    figma.closePlugin();
  }
};

// ─── Core Sync Logic ──────────────────────────────────────────

async function syncStoryboard(storyboard: StoryboardData) {
  // Load fonts we'll use
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  await figma.loadFontAsync({ family: "Inter", style: "Bold" });
  await figma.loadFontAsync({ family: "Inter", style: "Medium" });

  // Find or create the storyboard page
  let page = figma.root.children.find(
    (p) => p.name === "Storyboard"
  ) as PageNode | undefined;

  if (!page) {
    page = figma.createPage();
    page.name = "Storyboard";
  }

  figma.currentPage = page;

  // Create title frame
  createOrUpdateTitleFrame(page, storyboard);

  // Create/update scene frames
  for (let i = 0; i < storyboard.scenes.length; i++) {
    const scene = storyboard.scenes[i];
    const x = 0;
    const y = 120 + i * (FRAME_HEIGHT + FRAME_GAP);

    createOrUpdateSceneFrame(page, scene, i, x, y);
  }

  // Clean up scenes that no longer exist
  const sceneIds = new Set(storyboard.scenes.map((s) => s.id));
  for (const child of page.children) {
    if (
      child.name.startsWith("scene-") &&
      !sceneIds.has(child.getPluginData("sceneId"))
    ) {
      child.remove();
    }
  }

  // Zoom to fit
  figma.viewport.scrollAndZoomIntoView(page.children);
}

// ─── Title Frame ──────────────────────────────────────────────

function createOrUpdateTitleFrame(page: PageNode, storyboard: StoryboardData) {
  let titleFrame = page.children.find(
    (c) => c.name === "storyboard-title"
  ) as FrameNode | undefined;

  if (!titleFrame) {
    titleFrame = figma.createFrame();
    titleFrame.name = "storyboard-title";
    page.appendChild(titleFrame);
  }

  titleFrame.resize(FRAME_WIDTH, 80);
  titleFrame.x = 0;
  titleFrame.y = 0;
  titleFrame.fills = [{ type: "SOLID", color: { r: 0.1, g: 0.1, b: 0.15 } }];
  titleFrame.cornerRadius = 12;
  titleFrame.layoutMode = "VERTICAL";
  titleFrame.paddingLeft = 24;
  titleFrame.paddingRight = 24;
  titleFrame.paddingTop = 16;
  titleFrame.paddingBottom = 16;
  titleFrame.itemSpacing = 4;

  // Clear existing children
  while (titleFrame.children.length > 0) {
    titleFrame.children[0].remove();
  }

  // Title text
  const titleText = figma.createText();
  titleText.characters = storyboard.title || "Untitled Storyboard";
  titleText.fontSize = 24;
  titleText.fontName = { family: "Inter", style: "Bold" };
  titleText.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
  titleFrame.appendChild(titleText);

  // Subtitle
  const subtitle = figma.createText();
  subtitle.characters = `Version ${storyboard.version} • ${storyboard.scenes.length} scenes • ${formatDuration(storyboard.totalDuration)}`;
  subtitle.fontSize = 14;
  subtitle.fontName = { family: "Inter", style: "Regular" };
  subtitle.fills = [{ type: "SOLID", color: { r: 0.6, g: 0.6, b: 0.7 } }];
  titleFrame.appendChild(subtitle);
}

// ─── Scene Frame ──────────────────────────────────────────────

function createOrUpdateSceneFrame(
  page: PageNode,
  scene: StoryboardScene,
  index: number,
  x: number,
  y: number
) {
  // Find existing frame by scene id
  let frame = page.children.find(
    (c) => c.getPluginData("sceneId") === scene.id
  ) as FrameNode | undefined;

  const isNew = !frame;

  if (!frame) {
    frame = figma.createFrame();
    frame.setPluginData("sceneId", scene.id);
    page.appendChild(frame);
  }

  frame.name = `scene-${index + 1}-${scene.id}`;
  frame.resize(FRAME_WIDTH, FRAME_HEIGHT);
  frame.x = x;
  frame.y = y;
  frame.fills = [{ type: "SOLID", color: { r: 0.12, g: 0.12, b: 0.16 } }];
  frame.cornerRadius = 12;
  frame.clipsContent = true;

  // Clear children for re-render
  while (frame.children.length > 0) {
    frame.children[0].remove();
  }

  // ── Scene number badge ──
  const badge = figma.createFrame();
  badge.name = "badge";
  badge.resize(40, 40);
  badge.x = 16;
  badge.y = 16;
  badge.cornerRadius = 20;
  badge.fills = [{ type: "SOLID", color: { r: 0.42, g: 0.39, b: 1 } }];
  frame.appendChild(badge);

  const badgeText = figma.createText();
  badgeText.characters = String(index + 1);
  badgeText.fontSize = 18;
  badgeText.fontName = { family: "Inter", style: "Bold" };
  badgeText.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
  badgeText.x = 14;
  badgeText.y = 10;
  badge.appendChild(badgeText);

  // ── Section title ──
  const sectionTitle = figma.createText();
  sectionTitle.characters = scene.section;
  sectionTitle.fontSize = 20;
  sectionTitle.fontName = { family: "Inter", style: "Bold" };
  sectionTitle.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
  sectionTitle.x = 68;
  sectionTitle.y = 22;
  frame.appendChild(sectionTitle);

  // ── Timing ──
  const timing = figma.createText();
  timing.characters = `${formatDuration(scene.startTime)} - ${formatDuration(scene.endTime)} (${scene.transition})`;
  timing.fontSize = 12;
  timing.fontName = { family: "Inter", style: "Regular" };
  timing.fills = [{ type: "SOLID", color: { r: 0.5, g: 0.5, b: 0.6 } }];
  timing.x = 68;
  timing.y = 48;
  frame.appendChild(timing);

  // ── Visual placeholder (left side) ──
  const visualColor = VISUAL_TYPE_COLORS[scene.visual.type] || { r: 0.3, g: 0.3, b: 0.3 };
  const visualFrame = figma.createFrame();
  visualFrame.name = "visual-placeholder";
  visualFrame.resize(VISUAL_PLACEHOLDER_WIDTH, VISUAL_PLACEHOLDER_HEIGHT);
  visualFrame.x = 16;
  visualFrame.y = 76;
  visualFrame.cornerRadius = 8;
  visualFrame.fills = [{ type: "SOLID", color: visualColor, opacity: 0.15 }];
  visualFrame.strokes = [{ type: "SOLID", color: visualColor, opacity: 0.5 }];
  visualFrame.strokeWeight = 2;
  frame.appendChild(visualFrame);

  // Visual type label
  const typeLabel = figma.createText();
  typeLabel.characters = scene.visual.type.toUpperCase().replace("-", " ");
  typeLabel.fontSize = 10;
  typeLabel.fontName = { family: "Inter", style: "Bold" };
  typeLabel.fills = [{ type: "SOLID", color: visualColor }];
  typeLabel.x = 12;
  typeLabel.y = 10;
  visualFrame.appendChild(typeLabel);

  // Visual description
  const descText = figma.createText();
  descText.characters = scene.visual.description;
  descText.fontSize = 13;
  descText.fontName = { family: "Inter", style: "Medium" };
  descText.fills = [{ type: "SOLID", color: { r: 0.85, g: 0.85, b: 0.9 } }];
  descText.x = 12;
  descText.y = 30;
  descText.resize(VISUAL_PLACEHOLDER_WIDTH - 24, VISUAL_PLACEHOLDER_HEIGHT - 60);
  descText.textAutoResize = "HEIGHT";
  visualFrame.appendChild(descText);

  // Search query
  if (scene.visual.searchQuery) {
    const searchText = figma.createText();
    searchText.characters = `Search: "${scene.visual.searchQuery}"`;
    searchText.fontSize = 11;
    searchText.fontName = { family: "Inter", style: "Regular" };
    searchText.fills = [{ type: "SOLID", color: { r: 0.5, g: 0.5, b: 0.6 } }];
    searchText.x = 12;
    searchText.y = VISUAL_PLACEHOLDER_HEIGHT - 24;
    visualFrame.appendChild(searchText);
  }

  // ── Right side: voiceover + details ──
  const rightX = VISUAL_PLACEHOLDER_WIDTH + 40;
  const rightWidth = FRAME_WIDTH - rightX - 16;

  // Voiceover header
  const voHeader = figma.createText();
  voHeader.characters = "VOICEOVER";
  voHeader.fontSize = 10;
  voHeader.fontName = { family: "Inter", style: "Bold" };
  voHeader.fills = [{ type: "SOLID", color: { r: 0.42, g: 0.39, b: 1 } }];
  voHeader.x = rightX;
  voHeader.y = 76;
  frame.appendChild(voHeader);

  // Voiceover text
  const voText = figma.createText();
  const truncatedVO = scene.voiceover.length > 300
    ? scene.voiceover.substring(0, 300) + "..."
    : scene.voiceover;
  voText.characters = `"${truncatedVO}"`;
  voText.fontSize = 13;
  voText.fontName = { family: "Inter", style: "Regular" };
  voText.fills = [{ type: "SOLID", color: { r: 0.8, g: 0.8, b: 0.85 } }];
  voText.x = rightX;
  voText.y = 94;
  voText.resize(rightWidth, 140);
  voText.textAutoResize = "HEIGHT";
  frame.appendChild(voText);

  // ── Notes (if any) ──
  if (scene.notes) {
    const notesText = figma.createText();
    notesText.characters = `Notes: ${scene.notes}`;
    notesText.fontSize = 11;
    notesText.fontName = { family: "Inter", style: "Regular" };
    notesText.fills = [{ type: "SOLID", color: { r: 0.6, g: 0.55, b: 0.3 } }];
    notesText.x = rightX;
    notesText.y = FRAME_HEIGHT - 40;
    notesText.resize(rightWidth, 30);
    frame.appendChild(notesText);
  }

  // ── Data chart indicator (if applicable) ──
  if (scene.visual.type === "data-chart" && scene.visual.dataChart) {
    const dc = scene.visual.dataChart;
    const chartInfo = figma.createText();
    chartInfo.characters = `Chart: ${dc.type}${dc.title ? ` - "${dc.title}"` : ""}`;
    chartInfo.fontSize = 11;
    chartInfo.fontName = { family: "Inter", style: "Medium" };
    chartInfo.fills = [{ type: "SOLID", color: { r: 0.1, g: 0.7, b: 0.4 } }];
    chartInfo.x = 16;
    chartInfo.y = VISUAL_PLACEHOLDER_HEIGHT + 84;
    frame.appendChild(chartInfo);
  }

  // ── Text overlay indicator ──
  if (scene.visual.textOverlay) {
    const overlayText = figma.createText();
    overlayText.characters = `Text: "${scene.visual.textOverlay}"`;
    overlayText.fontSize = 11;
    overlayText.fontName = { family: "Inter", style: "Medium" };
    overlayText.fills = [{ type: "SOLID", color: { r: 0.8, g: 0.5, b: 0.1 } }];
    overlayText.x = 16;
    overlayText.y = VISUAL_PLACEHOLDER_HEIGHT + 84;
    frame.appendChild(overlayText);
  }

  // ── Transition indicator at bottom ──
  const transText = figma.createText();
  transText.characters = `→ ${scene.transition.toUpperCase()}`;
  transText.fontSize = 11;
  transText.fontName = { family: "Inter", style: "Bold" };
  transText.fills = [{ type: "SOLID", color: { r: 0.4, g: 0.4, b: 0.5 } }];
  transText.x = FRAME_WIDTH - 100;
  transText.y = FRAME_HEIGHT - 28;
  frame.appendChild(transText);
}

// ─── Helpers ──────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}
