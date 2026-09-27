/**
 * The one mapping from content-timeline seconds to composition frames.
 * Used by MainComposition, the catalog renderer and every script that picks frames
 * (stills, preview-scene), so they always agree on scene boundaries.
 */

/** Seconds of dark padding before the first scene. */
export const START_PADDING_SEC = 0.75;
/** Seconds of dark padding after the last scene. */
export const END_PADDING_SEC = 1.5;

/** Frame of a content-timeline time in seconds. */
export function toFrame(sec: number, fps: number): number {
  return Math.round(sec * fps) + Math.round(START_PADDING_SEC * fps);
}

/** Total frames of a video whose content ends at `endSec`. */
export function totalFrames(endSec: number, fps: number): number {
  return Math.ceil((START_PADDING_SEC + endSec + END_PADDING_SEC) * fps);
}

/**
 * Unit of every catalog duration token (DUR, MOTION, cues): frames at this rate. The catalog
 * reads time through useFrame (catalog/motion.ts), which converts the output frame rate to this
 * unit, so animations run at the same speed at any output fps. Output fps must be a multiple.
 */
export const DESIGN_FPS = 30;

/** Output frames to design frames. */
export function toDesign(frames: number, fps: number): number {
  return (frames * DESIGN_FPS) / fps;
}
