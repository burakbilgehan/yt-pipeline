/**
 * Duration Predictor
 *
 * Predicts TTS audio duration from script text before generation.
 * Multi-layer estimation with increasing accuracy:
 *   - Layer 1 (raw): word count / WPM — ±20%
 *   - Layer 2 (ssml-aware): + break tags + punctuation pauses — ±10%
 *   - Layer 3 (calibrated): voice-specific WPM from measurements — ±5%
 *
 * Also provides:
 *   - Word budget calculator (target duration → max words)
 *   - Post-TTS comparison (predicted vs actual → recalibration data)
 *   - Speed recommendation (if actual duration misses target)
 */

import type { TTSCalibration } from "../types/index.js";

// ─── Types ───────────────────────────────────────────────

export type ConfidenceLevel = "raw" | "ssml-aware" | "calibrated";

export interface DurationEstimate {
  /** Spoken word count (excludes non-voiced content like visual notes, tags, headers) */
  spokenWords: number;
  /** Total explicit <break time="Xs" /> duration in seconds */
  explicitPauseDuration: number;
  /** Estimated natural pause duration from punctuation (seconds) */
  naturalPauseDuration: number;
  /** Raw speech-only duration in seconds (no pauses) */
  rawSpeechDuration: number;
  /** Total estimated duration in seconds (speech + all pauses) */
  totalEstimate: number;
  /** Estimation confidence level */
  confidence: ConfidenceLevel;
  /** WPM value used for this estimate */
  wpmUsed: number;
}

export interface DurationComparison {
  /** Difference: actual - predicted (positive = ran longer than expected) */
  difference: number;
  /** Absolute percentage error */
  percentError: number;
  /** Back-calculated WPM from actual audio duration */
  impliedWPM: number;
  /** Back-calculated natural pause ratio */
  impliedPauseRatio: number;
}

export interface WordBudget {
  /** Maximum spoken words to fit target duration */
  maxWords: number;
  /** WPM used for calculation */
  wpmUsed: number;
  /** Pause budget assumed (seconds) */
  pauseBudget: number;
}

export interface SpeedRecommendation {
  /** Recommended speed parameter for ElevenLabs (0.7-1.2) */
  speed: number;
  /** Whether this is within ElevenLabs speed range */
  feasible: boolean;
  /** If not feasible, how many words to add/remove */
  wordAdjustment: number;
  /** Human-readable explanation */
  reason: string;
}

// ─── Constants ───────────────────────────────────────────

export const DEFAULT_WPM = 150;
export const ELEVENLABS_MIN_SPEED = 0.7;
export const ELEVENLABS_MAX_SPEED = 1.2;

/** Natural pause estimates (seconds) — empirical from ElevenLabs output */
const NATURAL_PAUSE: Record<string, number> = {
  period: 0.35,
  comma: 0.15,
  ellipsis: 0.4,
  emDash: 0.25,
  paragraphBreak: 0.5,
  questionMark: 0.3,
  exclamation: 0.25,
  colon: 0.2,
  semicolon: 0.2,
};

/** Default natural pause ratio (fraction of speech duration) when no calibration */
const DEFAULT_PAUSE_RATIO = 0.08;

// ─── Text Processing ─────────────────────────────────────

/**
 * Extract only spoken text from voiceover content.
 * Strips SSML tags, audio tags, visual notes, data points — keeps only words TTS will speak.
 */
export function extractSpokenText(text: string): string {
  return (
    text
      // Remove [audio tags] like [curious], [thoughtful], [sighs], etc.
      .replace(
        /\[(?:curious|thoughtful|sighs|exhales|excited|laughing|shouting|mischievously|whispers|sarcastic|short pause|long pause)\]/gi,
        ""
      )
      // Remove <break time="Xs" /> SSML tags
      .replace(/<break\s+time="[\d.]+s"\s*\/>/gi, "")
      // Remove [VOICEOVER], [VISUAL NOTE], [DATA POINT] section markers
      .replace(/\[(VOICEOVER|VISUAL NOTE|DATA POINT)\]/gi, "")
      // Remove entire [VISUAL NOTE] blocks (marker + content until next marker or blank line)
      .replace(/\[VISUAL NOTE\][^\[]*(?=\[|$)/gi, "")
      // Remove markdown headers
      .replace(/^#{1,6}\s+.*$/gm, "")
      // Remove markdown bold/italic
      .replace(/\*{1,3}(.*?)\*{1,3}/g, "$1")
      // Remove YAML-style frontmatter
      .replace(/^---[\s\S]*?---\n?/, "")
      // Remove version headers (> version: X, > based_on: ...)
      .replace(/^>\s+\w+:.*$/gm, "")
      // Collapse whitespace
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Count spoken words (only words that TTS will actually pronounce).
 */
export function countSpokenWords(text: string): number {
  const spoken = extractSpokenText(text);
  if (!spoken) return 0;
  return spoken.split(/\s+/).filter((w) => w.length > 0).length;
}

/**
 * Sum all explicit <break time="Xs" /> durations in seconds.
 */
export function sumExplicitBreaks(text: string): number {
  const breakRegex = /<break\s+time="([\d.]+)s"\s*\/>/gi;
  let total = 0;
  let match: RegExpExecArray | null;
  while ((match = breakRegex.exec(text)) !== null) {
    total += parseFloat(match[1]);
  }
  return total;
}

/**
 * Estimate natural pause duration from punctuation patterns.
 * These are pauses TTS engines insert naturally at sentence boundaries, commas, etc.
 */
export function estimateNaturalPauses(text: string): number {
  // Work on spoken text but preserve punctuation
  const cleaned = text.replace(/<break\s+time="[\d.]+s"\s*\/>/gi, "");

  let total = 0;

  // Periods (sentence-ending, not abbreviations/decimals)
  const periods = (cleaned.match(/(?<!\d)\.\s/g) || []).length;
  total += periods * NATURAL_PAUSE.period;

  // Commas
  const commas = (cleaned.match(/,\s/g) || []).length;
  total += commas * NATURAL_PAUSE.comma;

  // Ellipses (... or …)
  const ellipses = (cleaned.match(/\.{3}|…/g) || []).length;
  total += ellipses * NATURAL_PAUSE.ellipsis;

  // Em dashes
  const emDashes = (cleaned.match(/—/g) || []).length;
  total += emDashes * NATURAL_PAUSE.emDash;

  // Paragraph breaks (double newlines)
  const paragraphBreaks = (cleaned.match(/\n\s*\n/g) || []).length;
  total += paragraphBreaks * NATURAL_PAUSE.paragraphBreak;

  // Question marks
  const questions = (cleaned.match(/\?\s/g) || []).length;
  total += questions * NATURAL_PAUSE.questionMark;

  // Exclamation marks
  const exclamations = (cleaned.match(/!\s/g) || []).length;
  total += exclamations * NATURAL_PAUSE.exclamation;

  // Colons
  const colons = (cleaned.match(/:\s/g) || []).length;
  total += colons * NATURAL_PAUSE.colon;

  // Semicolons
  const semicolons = (cleaned.match(/;\s/g) || []).length;
  total += semicolons * NATURAL_PAUSE.semicolon;

  return total;
}

// ─── Prediction ──────────────────────────────────────────

/**
 * Predict TTS audio duration from voiceover text.
 *
 * @param text - Raw voiceover text (may contain SSML, audio tags, visual notes)
 * @param calibration - Optional voice calibration data for higher accuracy
 * @returns Duration estimate with confidence level
 */
export function predictDuration(
  text: string,
  calibration?: TTSCalibration | null
): DurationEstimate {
  const spokenWords = countSpokenWords(text);
  const explicitPauseDuration = sumExplicitBreaks(text);

  const wpm = calibration?.measuredWPM || DEFAULT_WPM;
  const rawSpeechDuration = (spokenWords / wpm) * 60;

  // For natural pauses: use calibration ratio if available, else punctuation estimate
  let naturalPauseDuration: number;
  let confidence: ConfidenceLevel;

  if (calibration && calibration.sampleCount >= 3) {
    // Calibrated: use measured pause ratio
    naturalPauseDuration = rawSpeechDuration * calibration.naturalPauseRatio;
    confidence = "calibrated";
  } else if (explicitPauseDuration > 0) {
    // SSML-aware: we have explicit breaks + punctuation estimate
    naturalPauseDuration = estimateNaturalPauses(text);
    confidence = "ssml-aware";
  } else {
    // Raw: just word count based with default pause ratio
    naturalPauseDuration = rawSpeechDuration * DEFAULT_PAUSE_RATIO;
    confidence = "raw";
  }

  const totalEstimate =
    rawSpeechDuration + explicitPauseDuration + naturalPauseDuration;

  return {
    spokenWords,
    explicitPauseDuration,
    naturalPauseDuration,
    rawSpeechDuration,
    totalEstimate,
    confidence,
    wpmUsed: wpm,
  };
}

/**
 * Predict duration for a single voiceover block (convenience wrapper).
 * Assumes input is already a [VOICEOVER] block (not full script).
 */
export function predictBlockDuration(
  block: string,
  calibration?: TTSCalibration | null
): DurationEstimate {
  return predictDuration(block, calibration);
}

// ─── Word Budget ─────────────────────────────────────────

/**
 * Calculate maximum spoken word count for a target duration.
 * Use this to give content-writer a budget BEFORE writing.
 *
 * @param targetDurationSec - Target video duration in seconds
 * @param calibration - Optional voice calibration data
 * @param pauseBudgetRatio - Fraction of duration reserved for pauses (default 0.12 = 12%)
 */
export function wordBudgetForDuration(
  targetDurationSec: number,
  calibration?: TTSCalibration | null,
  pauseBudgetRatio: number = 0.12
): WordBudget {
  const wpm = calibration?.measuredWPM || DEFAULT_WPM;
  const pauseRatio = calibration?.naturalPauseRatio ?? pauseBudgetRatio;
  const pauseBudget = targetDurationSec * pauseRatio;
  const speechTime = targetDurationSec - pauseBudget;
  const maxWords = Math.floor((speechTime / 60) * wpm);

  return { maxWords, wpmUsed: wpm, pauseBudget };
}

// ─── Post-TTS Comparison ─────────────────────────────────

/**
 * Compare predicted duration against actual measured duration.
 * Returns metrics for recalibration.
 */
export function comparePredictionToActual(
  predicted: DurationEstimate,
  actualDurationSec: number
): DurationComparison {
  const difference = actualDurationSec - predicted.totalEstimate;
  const percentError =
    actualDurationSec > 0
      ? Math.abs(difference / actualDurationSec) * 100
      : 0;

  // Back-calculate actual WPM (speech time = total - explicit pauses)
  const actualSpeechTime =
    actualDurationSec - predicted.explicitPauseDuration;
  const impliedWPM =
    actualSpeechTime > 0
      ? (predicted.spokenWords / actualSpeechTime) * 60
      : DEFAULT_WPM;

  // Back-calculate natural pause ratio
  const pureWords = (predicted.spokenWords / impliedWPM) * 60;
  const remainingPause =
    actualDurationSec - pureWords - predicted.explicitPauseDuration;
  const impliedPauseRatio = pureWords > 0 ? Math.max(0, remainingPause / pureWords) : DEFAULT_PAUSE_RATIO;

  return { difference, percentError, impliedWPM, impliedPauseRatio };
}

// ─── Speed Recommendation ────────────────────────────────

/**
 * Given a predicted duration and target duration, recommend TTS speed adjustment.
 * Uses the hybrid approach:
 *   - ≤10% difference → ffmpeg atempo post-processing (no re-generation)
 *   - >10% difference → ElevenLabs speed parameter (re-generation needed)
 *   - Outside ElevenLabs range (0.7-1.2) → script word count adjustment needed
 *
 * @param predictedDurationSec - Estimated duration from predictDuration()
 * @param targetDurationSec - Desired duration
 * @param currentSpeed - Current speed setting (default 1.0)
 */
export function recommendSpeed(
  predictedDurationSec: number,
  targetDurationSec: number,
  currentSpeed: number = 1.0
): SpeedRecommendation {
  if (targetDurationSec <= 0 || predictedDurationSec <= 0) {
    return {
      speed: currentSpeed,
      feasible: true,
      wordAdjustment: 0,
      reason: "No valid target duration to compare against.",
    };
  }

  const ratio = predictedDurationSec / targetDurationSec;
  const percentDiff = Math.abs(ratio - 1) * 100;

  // Within 3% — no adjustment needed
  if (percentDiff <= 3) {
    return {
      speed: currentSpeed,
      feasible: true,
      wordAdjustment: 0,
      reason: `Duration is within ±3% of target (${percentDiff.toFixed(1)}%). No adjustment needed.`,
    };
  }

  // Calculate required speed: if predicted is 110% of target, we need 1.1x speed
  const requiredSpeed = currentSpeed * ratio;
  const clampedSpeed = Math.round(
    Math.min(ELEVENLABS_MAX_SPEED, Math.max(ELEVENLABS_MIN_SPEED, requiredSpeed)) * 100
  ) / 100;

  // Check if speed alone can fix it
  if (requiredSpeed >= ELEVENLABS_MIN_SPEED && requiredSpeed <= ELEVENLABS_MAX_SPEED) {
    // ≤10% → recommend ffmpeg atempo (cheaper)
    if (percentDiff <= 10) {
      return {
        speed: currentSpeed,
        feasible: true,
        wordAdjustment: 0,
        reason: `Duration off by ${percentDiff.toFixed(1)}%. Use ffmpeg atempo=${ratio.toFixed(3)} for post-processing (no re-generation needed).`,
      };
    }

    // >10% → recommend ElevenLabs speed parameter
    return {
      speed: clampedSpeed,
      feasible: true,
      wordAdjustment: 0,
      reason: `Duration off by ${percentDiff.toFixed(1)}%. Re-generate with speed=${clampedSpeed} (ElevenLabs range: ${ELEVENLABS_MIN_SPEED}-${ELEVENLABS_MAX_SPEED}).`,
    };
  }

  // Outside speed range — need script adjustment
  // Calculate how many words to add/remove
  const maxAdjustedDuration = predictedDurationSec / (ratio > 1 ? ELEVENLABS_MAX_SPEED : ELEVENLABS_MIN_SPEED);
  const remainingGap = maxAdjustedDuration - targetDurationSec;
  const wpm = DEFAULT_WPM;
  const wordAdjustment = Math.round((remainingGap / 60) * wpm);

  return {
    speed: clampedSpeed,
    feasible: false,
    wordAdjustment: ratio > 1 ? -Math.abs(wordAdjustment) : Math.abs(wordAdjustment),
    reason:
      ratio > 1
        ? `Duration ${percentDiff.toFixed(1)}% too long. Even at max speed (${ELEVENLABS_MAX_SPEED}x), still ~${Math.abs(wordAdjustment)} words over budget. Remove ${Math.abs(wordAdjustment)} words from script.`
        : `Duration ${percentDiff.toFixed(1)}% too short. Even at min speed (${ELEVENLABS_MIN_SPEED}x), still ~${Math.abs(wordAdjustment)} words under budget. Add ${Math.abs(wordAdjustment)} words to script.`,
  };
}

// ─── Formatting Helpers ──────────────────────────────────

/** Format seconds as mm:ss */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Pretty-print a DurationEstimate for console output */
export function formatEstimate(est: DurationEstimate): string {
  const lines = [
    `  Spoken words:    ${est.spokenWords}`,
    `  WPM used:        ${est.wpmUsed} (${est.confidence})`,
    `  Speech duration: ${est.rawSpeechDuration.toFixed(1)}s`,
    `  Explicit pauses: ${est.explicitPauseDuration.toFixed(1)}s`,
    `  Natural pauses:  ${est.naturalPauseDuration.toFixed(1)}s`,
    `  ─────────────────────────`,
    `  Total estimate:  ${est.totalEstimate.toFixed(1)}s (${formatDuration(est.totalEstimate)})`,
  ];
  return lines.join("\n");
}
