import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";

interface HookRevealProps {
  /** The big "before" number (e.g. "26,000%") */
  bigNumber: string;
  /** The small "after" number (e.g. "132%") */
  smallNumber: string;
  /** Subtitle text below the small number */
  subtitle?: string;
  /** Sub-label below the small number (e.g. "in gold terms") */
  subLabel?: string;
  /** Context line shown before the big number (e.g. "The Dow Jones · Since 1925") */
  contextLine?: string;
  /** Seconds to show context line before big number appears (default 1.5) */
  contextDuration?: number;
  /** Color for the big number */
  bigColor?: string;
  /** Color for the small number */
  smallColor?: string;
  /** Background color */
  backgroundColor?: string;
  /** Font family */
  fontFamily?: string;
  /** Seconds to hold the big number before deflation (default 5) */
  bigHoldDuration?: number;
  /** Seconds for the deflation transition (default 2.5) */
  deflationDuration?: number;
  /** Seconds after deflation before subtitle appears (default 0.5) */
  subtitleDelay?: number;
}

/**
 * HookReveal — Text-driven dramatic number deflation.
 *
 * Editorial / light-theme design. Clean typography, no glow effects.
 *
 * Phase 0 (0 → contextDuration): Context line fades in (e.g. "The Dow Jones · Since 1925")
 * Phase 1 (contextDuration → +bigHoldDuration): Big number scales up, holds. Context moves up.
 * Phase 2 (+bigHoldDuration → +deflationDuration): Deflation — big shrinks, small appears
 * Phase 3 (+subtitleDelay → +1.5s): Subtitle + subLabel fade in
 */
export const HookReveal: React.FC<HookRevealProps> = ({
  bigNumber,
  smallNumber,
  subtitle,
  subLabel,
  contextLine,
  contextDuration = 1.5,
  bigColor = "#2D8B4E",
  smallColor = "#C8A94E",
  backgroundColor = "#F5F0E8",
  fontFamily = "Inter, sans-serif",
  bigHoldDuration = 5,
  deflationDuration = 2.5,
  subtitleDelay = 0.5,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isDarkBg = backgroundColor.startsWith("#0") || backgroundColor.startsWith("#1");
  const mutedColor = isDarkBg ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.35)";
  const subtitleColor = isDarkBg ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.5)";
  const contextColor = isDarkBg ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)";

  // ── Phase 0: Context line ──
  const contextFrames = fps * contextDuration;
  const hasContext = Boolean(contextLine);

  // Context fades in from 0, fades out before big number fully appears
  const contextOpacity = hasContext
    ? interpolate(
        frame,
        [0, fps * 0.4, contextFrames * 0.5, contextFrames * 0.9],
        [0, 1, 1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      )
    : 0;

  // Context line moves up when big number appears
  const contextY = hasContext
    ? interpolate(
        frame,
        [contextFrames * 0.4, contextFrames * 0.9],
        [0, -120],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.quad) }
      )
    : 0;

  // ── Phase 1: Big number entrance (offset by context duration) ──
  const bigStartFrame = hasContext ? contextFrames * 0.6 : 0;
  const phase1End = bigStartFrame + fps * bigHoldDuration;
  const phase2Start = phase1End;
  const phase2End = phase2Start + fps * deflationDuration;
  const phase3Start = phase2End + fps * subtitleDelay;
  const phase3End = phase3Start + fps * 1.5;

  const bigEntrance = spring({
    fps,
    frame: frame - bigStartFrame,
    config: { damping: 14, stiffness: 50, mass: 1.0 },
  });

  const bigScale = interpolate(bigEntrance, [0, 1], [0.85, 1]);
  const bigOpacity = interpolate(frame, [bigStartFrame, bigStartFrame + fps * 0.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Phase 2: Deflation ──
  const deflationProgress = interpolate(
    frame,
    [phase2Start, phase2End],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) }
  );

  const bigFadeOut = interpolate(
    frame,
    [phase2Start, phase2Start + fps * 0.6],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const bigShrink = interpolate(deflationProgress, [0, 1], [1, 0.5]);

  // Small number entrance
  const smallEntrance = spring({
    fps,
    frame: frame - phase2Start - fps * 0.3,
    config: { damping: 14, stiffness: 60 },
  });

  const smallScale = interpolate(smallEntrance, [0, 1], [2.0, 1]);

  // ── Phase 3: Subtitle + subLabel ──
  const subtitleOpacity = interpolate(
    frame,
    [phase3Start, phase3End],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const subtitleY = interpolate(
    frame,
    [phase3Start, phase3End],
    [15, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.quad) }
  );

  const showBig = deflationProgress < 0.95;
  const showSmall = deflationProgress > 0.05;

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        fontFamily,
      }}
    >
      {/* Context line — shown first before the big number */}
      {hasContext && (
        <div
          style={{
            position: "absolute",
            opacity: contextOpacity,
            transform: `translateY(${contextY}px)`,
            fontSize: 32,
            fontWeight: 500,
            color: contextColor,
            letterSpacing: 4,
            textTransform: "uppercase",
            textAlign: "center",
            userSelect: "none",
          }}
        >
          {contextLine}
        </div>
      )}

      {/* Big number */}
      {showBig && (
        <div
          style={{
            position: "absolute",
            fontSize: 200,
            fontWeight: 900,
            color: bigColor,
            opacity: bigOpacity * bigFadeOut,
            transform: `scale(${bigScale * bigShrink})`,
            letterSpacing: -6,
            userSelect: "none",
            lineHeight: 1,
          }}
        >
          {bigNumber}
        </div>
      )}

      {/* Small number */}
      {showSmall && (
        <div
          style={{
            position: "absolute",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            opacity: smallEntrance,
            transform: `scale(${smallScale})`,
          }}
        >
          <div
            style={{
              fontSize: 180,
              fontWeight: 900,
              color: smallColor,
              letterSpacing: -4,
              userSelect: "none",
              lineHeight: 1,
            }}
          >
            {smallNumber}
          </div>

          {/* Sub-label (e.g. "in gold terms") */}
          {subLabel && (
            <div
              style={{
                fontSize: 26,
                fontWeight: 600,
                color: mutedColor,
                marginTop: 16,
                letterSpacing: 6,
                textTransform: "uppercase",
                opacity: subtitleOpacity,
              }}
            >
              {subLabel}
            </div>
          )}
        </div>
      )}

      {/* Subtitle */}
      {subtitle && (
        <div
          style={{
            position: "absolute",
            bottom: "20%",
            opacity: subtitleOpacity,
            transform: `translateY(${subtitleY}px)`,
            fontSize: 28,
            fontWeight: 400,
            color: subtitleColor,
            letterSpacing: 0.5,
            textAlign: "center",
            maxWidth: "70%",
            fontStyle: "italic",
          }}
        >
          {subtitle}
        </div>
      )}
    </AbsoluteFill>
  );
};
