/**
 * Core types for yt-pipeline
 */

// Pipeline stage names
export type PipelineStageName =
  | "research"
  | "content"
  | "storyboard"
  | "production"
  | "publishing"
  | "analytics";

// Project configuration stored in config.json
export interface ProjectConfig {
  slug: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  currentWork: PipelineStageName | null; // what's actively being worked on, null if idle
  tags: string[];
  metadata: {
    targetLength: number; // seconds
    tone: string;
    targetAudience: string;
    language: string;
    format: "long" | "short";
  };
  pipeline: Record<PipelineStageName, StageStatus>;
  history: HistoryEntry[];
  youtube?: {
    videoId: string;
    url: string;
    publishedAt: string;
  };
}

export interface StageStatus {
  status: "pending" | "in_progress" | "review" | "approved" | "completed";
  version: number; // 0 = not started, 1+ = iteration count
  startedAt?: string;
  completedAt?: string;
  notes?: string;
}

// History tracks every state transition in the pipeline
export interface HistoryEntry {
  action:
    | `${PipelineStageName}.started`
    | `${PipelineStageName}.completed`
    | `${PipelineStageName}.reopened`
    | `${PipelineStageName}.restarted`;
  version: number;
  at: string; // ISO date
  reason?: string; // why this action happened (especially for reopened/restarted)
  skipped?: PipelineStageName[]; // stages intentionally skipped during a jump
}

// Version header embedded at the top of versioned files (research, content, storyboard, etc.)
export interface VersionHeader {
  version: number;
  basedOn: Partial<Record<PipelineStageName, number>>; // which version of upstream stages this was based on
  changesFromPrev?: string; // description of what changed from the previous version
  date: string; // ISO date
}

// Storyboard types
export interface Storyboard {
  title: string;
  version: number;
  basedOn: Partial<Record<PipelineStageName, number>>;
  changesFromPrev?: string;
  date: string;
  totalDuration: number; // seconds
  scenes: Scene[];
}

export interface Scene {
  id: string;
  section: string;
  startTime: number;
  endTime: number;
  voiceover: string;
  visual: SceneVisual;
  transition: "fade" | "cut" | "slide" | "zoom";
  notes?: string;
}

export interface SceneVisual {
  type:
    | "stock-video"
    | "stock-image"
    | "ai-image"
    | "text-overlay"
    | "data-chart"
    | "map"
    | "composite";
  description: string;
  searchQuery?: string;
  textOverlay?: string;
  dataVisualization?: DataVisualization;
  assetPath?: string; // path to the actual asset file
}

export interface DataVisualization {
  type: "bar-chart" | "line-chart" | "pie-chart" | "map" | "counter" | "comparison" | "timeline" | "scale-comparison" | "progress-bar";
  title?: string;
  data: Record<string, unknown>;
}

// YouTube metadata for publishing
export interface YouTubeMetadata {
  title: string;
  description: string;
  tags: string[];
  category: string;
  language: string;
  visibility: "public" | "unlisted" | "private" | "scheduled";
  scheduledAt?: string;
  thumbnailPath?: string;
}

// Asset tracking
export interface Asset {
  id: number;
  type: "stock-image" | "stock-video" | "ai-image" | "ai-video" | "audio";
  source: string;
  filePath: string;
  license: string;
  searchQuery: string;
  sceneId?: string;
}

// TTS configuration
export interface TTSConfig {
  voiceId: string;
  modelId: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
}

// Analytics snapshot
export interface AnalyticsSnapshot {
  fetchedAt: string;
  videoId: string;
  views: number;
  watchTimeHours: number;
  averageViewDuration: number;
  averageViewPercentage: number;
  clickThroughRate: number;
  likes: number;
  dislikes: number;
  comments: number;
  subscribersGained: number;
  trafficSources: Record<string, number>;
  retentionData?: RetentionPoint[];
}

export interface RetentionPoint {
  timestamp: number; // seconds
  retentionPercentage: number;
}

// Channel maturity levels - affects how agents behave
export type ChannelMaturity = "seed" | "growing" | "established" | "mature";

// Channel-level configuration (channel-config.json at repo root)
export interface ChannelConfig {
  channel: {
    name: string;
    handle: string; // @handle
    language: string; // e.g. "en"
    niche: string; // e.g. "educational facts", "science explainers"
    description: string;
    maturity: ChannelMaturity; // seed → growing → established → mature
    videoCount: number; // total published videos
    launchDate: string | null; // ISO date of first published video, null if not launched
  };
  content: {
    defaultTone: string; // e.g. "informative, slightly dramatic, curiosity-driven"
    targetAudience: string; // e.g. "18-35, curious learners, English-speaking"
    defaultLength: number; // seconds, e.g. 180 for 3 minutes
    avoidTopics: string[]; // topics to never cover
    brandKeywords: string[]; // words/phrases that define the brand voice
  };
  tts: {
    provider: "elevenlabs"; // currently only ElevenLabs supported
    voiceId: string; // ElevenLabs voice ID
    modelId: string; // e.g. "eleven_monolingual_v1"
    stability: number; // 0-1
    similarityBoost: number; // 0-1
    style: number; // 0-1, ElevenLabs style setting
  };
  visuals: {
    defaultTemplate: "voiceover-visuals" | "data-charts";
    brandColor: string; // hex, e.g. "#6C63FF"
    accentColor: string; // hex
    fontFamily: string; // e.g. "Inter, sans-serif"
    resolution: { width: number; height: number }; // e.g. 1920x1080
    fps: number; // e.g. 30
    preferredStockSource: "pexels" | "unsplash";
    imageProvider: "gemini" | "dalle" | "pexels";
    aiImageStyle: string; // default style guidance
    aiImageStyleOverrides?: Partial<Record<"gemini" | "dalle", string>>; // per-provider style overrides
  };
  shorts: {
    defaultLength: number; // 30-60
    resolution: { width: 1080; height: 1920 };
    fps: number;
  };
  youtube: {
    defaultCategory: string; // e.g. "Education"
    defaultVisibility: "public" | "unlisted" | "private";
    defaultLanguage: string; // e.g. "en"
    channelTrailer: string; // CTA text appended to all descriptions
    defaultTags: string[]; // tags added to every video
    endScreenTemplate: string; // description of end screen pattern
  };
}
