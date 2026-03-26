/**
 * Audio Probe
 *
 * Measures actual audio file duration in seconds.
 * Pure TypeScript — no ffmpeg dependency.
 * Parses MP3 frame headers to calculate duration for both CBR and VBR files.
 *
 * Used by:
 *   - tts-generate.ts (post-TTS validation)
 *   - tts-calibrate.ts (calibration measurement)
 *   - remotion-render.ts (audio-scene alignment check)
 */

import * as fs from "node:fs";
import * as path from "node:path";

// ─── MP3 Frame Parsing ──────────────────────────────────

const MPEG_VERSIONS: Record<number, number> = { 0: 2.5, 2: 2, 3: 1 };
const LAYER_INDICES: Record<number, number> = { 1: 3, 2: 2, 3: 1 };

// Bitrate table: [mpegVersion][layer][bitrateIndex] → kbps
const BITRATE_TABLE: Record<number, Record<number, number[]>> = {
  // MPEG1
  1: {
    1: [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
    2: [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
    3: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  },
  // MPEG2 & MPEG2.5
  2: {
    1: [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256],
    2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
    3: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
  },
};

// Sample rate table: [mpegVersion][sampleRateIndex] → Hz
const SAMPLE_RATE_TABLE: Record<number, number[]> = {
  1: [44100, 48000, 32000],
  2: [22050, 24000, 16000],
  2.5: [11025, 12000, 8000],
};

// Samples per frame: [mpegVersion][layer]
const SAMPLES_PER_FRAME: Record<number, Record<number, number>> = {
  1: { 1: 384, 2: 1152, 3: 1152 },
  2: { 1: 384, 2: 1152, 3: 576 },
  2.5: { 1: 384, 2: 1152, 3: 576 },
};

interface MP3FrameInfo {
  mpegVersion: number;
  layer: number;
  bitrate: number; // kbps
  sampleRate: number; // Hz
  frameSize: number; // bytes
  samplesPerFrame: number;
  duration: number; // seconds per frame
}

/**
 * Parse an MP3 frame header at the given offset.
 * Returns null if not a valid frame sync.
 */
function parseFrameHeader(
  buffer: Buffer,
  offset: number
): MP3FrameInfo | null {
  if (offset + 4 > buffer.length) return null;

  // Frame sync: 11 bits set
  if (buffer[offset] !== 0xff || (buffer[offset + 1] & 0xe0) !== 0xe0) {
    return null;
  }

  const b1 = buffer[offset + 1];
  const b2 = buffer[offset + 2];

  const versionBits = (b1 >> 3) & 0x03;
  const layerBits = (b1 >> 1) & 0x03;
  const bitrateIndex = (b2 >> 4) & 0x0f;
  const sampleRateIndex = (b2 >> 2) & 0x03;
  const padding = (b2 >> 1) & 0x01;

  const mpegVersion = MPEG_VERSIONS[versionBits];
  const layer = LAYER_INDICES[layerBits];

  if (!mpegVersion || !layer) return null;
  if (bitrateIndex === 0 || bitrateIndex === 15) return null;
  if (sampleRateIndex === 3) return null;

  const bitrateKey = mpegVersion === 1 ? 1 : 2;
  const bitrate = BITRATE_TABLE[bitrateKey]?.[layer]?.[bitrateIndex];
  const sampleRate = SAMPLE_RATE_TABLE[mpegVersion]?.[sampleRateIndex];
  const samplesPerFrame = SAMPLES_PER_FRAME[mpegVersion]?.[layer];

  if (!bitrate || !sampleRate || !samplesPerFrame) return null;

  let frameSize: number;
  if (layer === 1) {
    frameSize = Math.floor((12 * bitrate * 1000) / sampleRate + padding) * 4;
  } else {
    const slotSize = mpegVersion === 1 ? 1 : 1;
    frameSize =
      Math.floor((samplesPerFrame * bitrate * 1000) / (8 * sampleRate)) +
      padding * slotSize;
  }

  if (frameSize < 1) return null;

  const duration = samplesPerFrame / sampleRate;

  return {
    mpegVersion,
    layer,
    bitrate,
    sampleRate,
    frameSize,
    samplesPerFrame,
    duration,
  };
}

/**
 * Skip ID3v2 tag at the beginning of the file.
 * Returns the offset after the tag (0 if no tag).
 */
function skipID3v2(buffer: Buffer): number {
  if (
    buffer.length >= 10 &&
    buffer[0] === 0x49 && // 'I'
    buffer[1] === 0x44 && // 'D'
    buffer[2] === 0x33 // '3'
  ) {
    // ID3v2 size is stored as synchsafe integer (4 bytes, 7 bits each)
    const size =
      ((buffer[6] & 0x7f) << 21) |
      ((buffer[7] & 0x7f) << 14) |
      ((buffer[8] & 0x7f) << 7) |
      (buffer[9] & 0x7f);
    return 10 + size;
  }
  return 0;
}

// ─── Public API ──────────────────────────────────────────

/**
 * Get audio file duration in seconds.
 * Supports MP3 (frame header parsing) and WAV (RIFF header parsing).
 */
export async function getAudioDuration(filePath: string): Promise<number> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".wav") {
    return getWavDuration(filePath);
  }
  return getMp3Duration(filePath);
}

/**
 * Get WAV file duration by parsing RIFF/WAVE header.
 * Reads the data chunk size + sample rate + bits per sample + channels.
 */
function getWavDuration(filePath: string): number {
  const buffer = fs.readFileSync(filePath);

  // RIFF header validation
  if (buffer.length < 44) {
    throw new Error(`WAV file too small: ${filePath}`);
  }

  const riff = buffer.toString("ascii", 0, 4);
  const wave = buffer.toString("ascii", 8, 12);
  if (riff !== "RIFF" || wave !== "WAVE") {
    throw new Error(`Not a valid WAV file: ${filePath}`);
  }

  // Find "fmt " chunk
  let offset = 12;
  let sampleRate = 0;
  let bitsPerSample = 0;
  let numChannels = 0;
  let byteRate = 0;
  let dataSize = 0;

  while (offset < buffer.length - 8) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);

    if (chunkId === "fmt ") {
      numChannels = buffer.readUInt16LE(offset + 10);
      sampleRate = buffer.readUInt32LE(offset + 12);
      byteRate = buffer.readUInt32LE(offset + 16);
      bitsPerSample = buffer.readUInt16LE(offset + 22);
    } else if (chunkId === "data") {
      dataSize = chunkSize;
      break; // data chunk found, we have everything we need
    }

    offset += 8 + chunkSize;
    // Chunks are word-aligned (pad to even)
    if (chunkSize % 2 !== 0) offset++;
  }

  if (sampleRate === 0 || dataSize === 0) {
    throw new Error(`Could not parse WAV header: ${filePath}`);
  }

  // Duration = data size / byte rate
  // byteRate = sampleRate * numChannels * bitsPerSample / 8
  if (byteRate > 0) {
    return dataSize / byteRate;
  }

  // Fallback calculation
  const blockAlign = numChannels * (bitsPerSample / 8);
  const totalSamples = dataSize / blockAlign;
  return totalSamples / sampleRate;
}

/**
 * Get MP3 file duration in seconds by parsing frame headers.
 * Works with both CBR and VBR files.
 */
function getMp3Duration(filePath: string): number {
  const buffer = fs.readFileSync(filePath);
  let offset = skipID3v2(buffer);
  let totalDuration = 0;
  let framesFound = 0;

  while (offset < buffer.length - 4) {
    const frame = parseFrameHeader(buffer, offset);
    if (frame) {
      totalDuration += frame.duration;
      offset += frame.frameSize;
      framesFound++;
    } else {
      // Not a valid frame — scan forward for next sync
      offset++;
    }
  }

  if (framesFound === 0) {
    throw new Error(`No valid MP3 frames found in: ${filePath}`);
  }

  return totalDuration;
}

/**
 * Get durations for all audio files in a directory.
 * Returns sorted by filename.
 */
export async function getAudioDurations(
  audioDir: string
): Promise<Array<{ file: string; duration: number }>> {
  if (!fs.existsSync(audioDir)) {
    return [];
  }

  const files = fs
    .readdirSync(audioDir)
    .filter((f) => f.endsWith(".mp3") || f.endsWith(".wav"))
    .sort();

  const results: Array<{ file: string; duration: number }> = [];
  for (const file of files) {
    try {
      const duration = await getAudioDuration(path.join(audioDir, file));
      results.push({ file, duration });
    } catch (err) {
      console.warn(`  Warning: Could not read duration for ${file}: ${err}`);
      results.push({ file, duration: 0 });
    }
  }
  return results;
}

/**
 * Get total duration of all MP3 files in a directory.
 */
export async function getTotalAudioDuration(
  audioDir: string
): Promise<number> {
  const durations = await getAudioDurations(audioDir);
  return durations.reduce((sum, d) => sum + d.duration, 0);
}
