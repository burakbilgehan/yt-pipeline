import React from "react";
import { useCurrentFrame, useVideoConfig, spring } from "remotion";

// ─── Public Interface ─────────────────────────────────────────

export interface TiltCardProps {
  children: React.ReactNode;
  /** Max tilt angle in degrees (default 8) */
  maxTilt?: number;
  /** Tilt speed multiplier (default 1) */
  speed?: number;
  /** Perspective distance in px (default 1000) */
  perspective?: number;
  /** Optional style for the outer perspective container */
  style?: React.CSSProperties;
}

// ─── Virtual Cursor Path ──────────────────────────────────────

/**
 * Compute a virtual cursor position in [-1, 1] using layered sines.
 *
 * Multiple incommensurate frequencies create a non-repeating, organic
 * wandering path — like someone slowly exploring the card with their
 * mouse. Base frequencies are tuned so the dominant wave completes
 * roughly 1–2 full cycles over 300 frames (10 s @ 30 fps).
 */
function virtualCursorX(frame: number, speed: number): number {
  const f = frame * speed;
  return (
    Math.sin(f * 0.013) * 0.6 +
    Math.sin(f * 0.031) * 0.25 +
    Math.sin(f * 0.007) * 0.15
  );
}

function virtualCursorY(frame: number, speed: number): number {
  const f = frame * speed;
  return (
    Math.cos(f * 0.017) * 0.5 +
    Math.cos(f * 0.029) * 0.35 +
    Math.cos(f * 0.009) * 0.15
  );
}

// ─── Component ────────────────────────────────────────────────

/**
 * TiltCard — L3 Motion Wrapper
 *
 * Emulates the LocationMap's spring-driven 3D tilt by simulating a
 * "virtual cursor" that wanders organically over the card surface.
 *
 * Instead of a simple Lissajous sin/cos, the cursor path is built from
 * three layered sine waves at incommensurate frequencies, producing a
 * smooth, non-repeating trajectory that feels like real mouse movement.
 *
 * Axis mapping matches the original:
 *   cursorY → rotateX  (mouse up = tilt toward viewer)
 *   cursorX → rotateY  (mouse right = tilt right)
 *
 * An entrance spring (stiffness 300, damping 30) ramps from flat to
 * full tilt over the first ~20 frames — fast and snappy with minimal
 * overshoot, matching the original's spring config.
 *
 * Usage:
 *   <TiltCard maxTilt={8} speed={1}>
 *     <MyCard ... />
 *   </TiltCard>
 */
export const TiltCard: React.FC<TiltCardProps> = ({
  children,
  maxTilt = 8,
  speed = 1,
  perspective = 1000,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Virtual cursor position in [-1, 1] — organic, wandering path
  const cursorX = virtualCursorX(frame, speed);
  const cursorY = virtualCursorY(frame, speed);

  // Map cursor → rotation with inverted axes (matching original LocationMap)
  // cursorY → rotateX: positive cursorY (mouse down) → negative rotateX (tilt away)
  // cursorX → rotateY: positive cursorX (mouse right) → negative rotateY (tilt right)
  const rotateX = -cursorY * maxTilt;
  const rotateY = -cursorX * maxTilt;

  // Entrance spring — fast & snappy, matching original's stiffness:300/damping:30
  // Ramps from 0 → 1 over first ~20 frames with very slight overshoot
  const entrance = spring({
    fps,
    frame,
    config: { stiffness: 300, damping: 30 },
  });

  const currentRotateX = rotateX * entrance;
  const currentRotateY = rotateY * entrance;

  return (
    <div style={{ perspective, ...style }}>
      <div
        style={{
          transformStyle: "preserve-3d" as const,
          transform: `rotateX(${currentRotateX}deg) rotateY(${currentRotateY}deg)`,
        }}
      >
        {children}
      </div>
    </div>
  );
};
