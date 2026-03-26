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
  /** Optional per-video TTS overrides. Merged on top of channel-config.tts defaults. */
  tts?: Partial<TTSConfig>;
  pipeline: Record<PipelineStageName, StageStatus>;
  history: HistoryEntry[];
  youtube?: {
    videoId: string;
    url: string;
    publishedAt: string;
    analyticsSchedule?: {
      day1?: string | null; // ISO date when snapshot was taken, null if pending
      day7?: string | null;
      day30?: string | null;
    };
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
  /** Background music configuration — multi-track sequential playback */
  backgroundMusic?: {
    tracks: Array<{ src: string; durationSec: number }>;
    volume?: number;
    crossfadeSec?: number;
    fadeInSec?: number;
    fadeOutSec?: number;
  };
}

export interface Scene {
  id: string;
  section: string;
  startTime: number;
  endTime: number;
  voiceover: string | null;
  visual: SceneVisual;
  transition: "fade" | "cut" | "slide" | "zoom";
  notes?: string;
  /** Relative path to the detailed scene file (e.g. "scenes/scene-001.json").
   *  When present, the full visual/notes details live in that file
   *  and the scene in the main storyboard is a lightweight skeleton. */
  sceneFile?: string;
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
  /** Runtime-only fallback: propagated from previous scene during render */
  _fallbackAssetPath?: string;
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

// TTS configuration — used as channel default and video-level override
export interface TTSConfig {
  provider?: "elevenlabs" | "edge-tts" | "google"; // default: "google"
  voiceId?: string; // ElevenLabs voice ID
  voiceName?: string; // human-readable voice name (e.g. "Achernar", "Maisie")
  modelId?: string; // ElevenLabs: "eleven_multilingual_v2", Google: "gemini-2.5-flash-tts" | "chirp3-hd"
  stability?: number; // 0.0-1.0, lower = more dynamic/emotional (ElevenLabs only)
  similarityBoost?: number; // 0.0-1.0, voice fidelity (ElevenLabs only)
  style?: number; // 0.0-1.0, amplifies speaker's natural style (ElevenLabs only)
  useSpeakerBoost?: boolean; // extra fidelity pass, adds latency (ElevenLabs only)
  speed?: number; // All Google Cloud TTS: 0.25-2.0, ElevenLabs: 0.7-1.2, default 1.0
  // Google TTS specific
  languageCode?: string; // BCP-47 code, e.g. "en-US" (Google only)
  stylePrompt?: string; // natural language style prompt (Gemini TTS only, e.g. "Calm, authoritative narrator")
  sampleRateHertz?: number; // output sample rate, e.g. 24000 or 44100 (Google only)
}

// TTS calibration — stores measured WPM per voice/model combo
export interface TTSCalibrationMeasurement {
  wordCount: number;
  predictedDuration: number; // seconds
  actualDuration: number; // seconds
  speed: number; // speed param used (1.0 = normal)
  date: string; // ISO date
}

export interface TTSCalibration {
  measuredWPM: number; // rolling average from actual TTS outputs
  naturalPauseRatio: number; // fraction of speech duration that is natural pauses
  sampleCount: number; // how many measurements this is based on
  lastCalibratedAt: string; // ISO date
  measurements: TTSCalibrationMeasurement[];
}

// Audio manifest — tracks all TTS audio blocks with metadata
export interface AudioBlock {
  id: string; // scene ID, e.g. "scene-001"
  section: string; // section slug, e.g. "hook", "section-global-trade"
  file: string; // filename, e.g. "hook--scene-001.mp3"
  text: string; // the voiceover text that was synthesized
  duration: number; // measured duration in seconds
  wordCount: number; // spoken word count (excluding SSML tags)
  speed: number; // TTS speed parameter used (1.0 = normal)
  startTime?: number; // intended start time in video timeline (seconds)
  endTime?: number; // intended end time (startTime + duration)
}

export interface AudioManifest {
  generatedAt: string; // ISO date
  scriptVersion: number; // which script version this was generated from
  scriptFile: string; // e.g. "script-v2.md"
  provider: string; // "elevenlabs" | "edge-tts"
  modelId?: string; // ElevenLabs model ID
  speed: number; // base speed used
  totalDuration: number; // sum of all block durations
  totalWordCount: number; // sum of all block word counts
  blocks: AudioBlock[];
}

// Analytics snapshot — per-video metrics pulled from YouTube APIs
export interface AnalyticsSnapshot {
  fetchedAt: string;
  videoId: string;
  // Core metrics
  views: number;
  watchTimeHours: number;
  averageViewDuration: number; // seconds
  averageViewPercentage: number; // 0-100
  // Discovery metrics
  impressions: number;
  clickThroughRate: number; // 0-100 percentage
  // Engagement
  likes: number;
  dislikes: number;
  comments: number;
  shares: number;
  subscribersGained: number;
  subscribersLost: number;
  // Traffic sources with watch time (not just views)
  trafficSources: Record<string, TrafficSourceEntry>;
  // Search terms driving traffic (Analytics API insightTrafficSourceDetail)
  searchTerms?: Array<{ term: string; views: number; watchTimeMinutes: number }>;
  // Retention (manual import from YouTube Studio CSV, not available via public API)
  retentionData?: RetentionPoint[];
  // Demographics (Phase 2)
  demographics?: {
    ageGender?: Array<{ ageGroup: string; gender: string; percentage: number }>;
    topCountries?: Array<{ country: string; views: number; watchTimeMinutes: number }>;
  };
}

export interface TrafficSourceEntry {
  views: number;
  watchTimeMinutes: number;
}

export interface RetentionPoint {
  timestamp: number; // seconds
  retentionPercentage: number;
}

// Daily data point for time-series tracking
export interface DailyDataPoint {
  date: string; // YYYY-MM-DD
  views: number;
  watchTimeMinutes: number;
  impressions: number;
  ctr: number; // 0-100
  likes: number;
  shares: number;
  subscribersGained: number;
  subscribersLost: number;
  averageViewDuration: number; // seconds
}

// Channel snapshot — cached channel-level data from YouTube Data API v3
export interface ChannelSnapshot {
  fetchedAt: string;
  channelId: string;
  title: string;
  handle: string;
  subscriberCount: number;
  videoCount: number;
  totalViewCount: number;
  publishedAt: string; // channel creation date
  uploadsPlaylistId: string; // for efficient video listing
}

// Video catalog entry — basic info for each published video
export interface VideoCatalogEntry {
  videoId: string;
  title: string;
  publishedAt: string;
  duration: string; // ISO 8601 duration (PT8M38S)
  durationSeconds: number;
  privacyStatus: string;
  views: number;
  likes: number;
  comments: number;
  // Local project mapping (null if video not in our pipeline)
  projectSlug: string | null;
}

// Video catalog — all channel videos with basic stats
export interface VideoCatalog {
  fetchedAt: string;
  channelId: string;
  videos: VideoCatalogEntry[];
}

// Channel benchmarks — computed averages across all videos
export interface ChannelBenchmarks {
  fetchedAt: string;
  period: string; // "all_time" or "last_90_days"
  videoCount: number;
  averages: {
    viewsPerVideo: number;
    watchTimeHoursPerVideo: number;
    avgViewDuration: number; // seconds
    avgViewPercentage: number; // 0-100
    ctr: number; // 0-100
    likesPerVideo: number;
    sharesPerVideo: number;
    subscribersGainedPerVideo: number;
  };
  medians: {
    viewsPerVideo: number;
    ctr: number;
    avgViewPercentage: number;
  };
  perVideo: Array<{
    videoId: string;
    title: string;
    publishedAt: string;
    views: number;
    watchTimeHours: number;
    ctr: number;
    avgViewPercentage: number;
  }>;
}

// Cache metadata — tracks TTL for cached files
export interface CacheMeta {
  fetchedAt: string; // ISO date
  ttlHours: number; // how long this cache is valid
  source: string; // which script/command produced this
}

// YouTube suggest result — keyword autocomplete
export interface YouTubeSuggestion {
  query: string;
  suggestions: string[];
  fetchedAt: string;
}

// Channel maturity levels - affects how agents behave
export type ChannelMaturity = "seed" | "growing" | "established" | "mature";

// Channel-level configuration (channel-config.json at repo root)
export interface ChannelConfig {
  channel: {
    name: string;
    handle: string; // @handle
    channelId?: string; // YouTube channel ID (UC...)
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
  tts: TTSConfig & {
    /** calibration data — auto-populated from TTS measurements, do not edit manually */
    calibration?: TTSCalibration;
    /** human-readable notes about voice/model choices */
    notes?: string;
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
