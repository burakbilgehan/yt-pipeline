/**
 * Core types for yt-pipeline
 */

// Pipeline stages in order
export type PipelineStage =
  | "idea"
  | "research"
  | "content"
  | "storyboard"
  | "production"
  | "publishing"
  | "published"
  | "analytics";

// Project configuration stored in config.json
export interface ProjectConfig {
  slug: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  stage: PipelineStage;
  tags: string[];
  metadata: {
    targetLength: number; // seconds
    tone: string;
    targetAudience: string;
    language: string;
  };
  pipeline: {
    research: StageStatus;
    content: StageStatus;
    storyboard: StageStatus;
    production: StageStatus;
    publishing: StageStatus;
    analytics: StageStatus;
  };
  youtube?: {
    videoId: string;
    url: string;
    publishedAt: string;
  };
}

export interface StageStatus {
  status: "pending" | "in_progress" | "review" | "approved" | "completed";
  startedAt?: string;
  completedAt?: string;
  notes?: string;
}

// Storyboard types
export interface Storyboard {
  title: string;
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
  type: "bar-chart" | "line-chart" | "pie-chart" | "map" | "counter" | "comparison";
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
