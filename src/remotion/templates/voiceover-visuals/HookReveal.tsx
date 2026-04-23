import React, { useMemo } from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";
import { TEXT_SECONDARY } from "../../palette";

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
  /** Visual variant: "classic" (default) or "counting-ticker" */
  variant?: "classic" | "counting-ticker";
}

// ─── Parse numeric value from formatted string like "26,000%" ───
function parseDisplayNumber(s: string): number {
  return parseFloat(s.replace(/[,%]/g, ""));
}

// ─── Format number back with commas + suffix ───
function formatDisplayNumber(n: number, suffix: string): string {
  const rounded = Math.round(n);
  return rounded.toLocaleString("en-US") + suffix;
}

// ─── Interpolate color between two hex colors ───
function lerpColor(c1: string, c2: string, t: number): string {
  const hex = (s: string) => parseInt(s, 16);
  const r1 = hex(c1.slice(1, 3)), g1 = hex(c1.slice(3, 5)), b1 = hex(c1.slice(5, 7));
  const r2 = hex(c2.slice(1, 3)), g2 = hex(c2.slice(3, 5)), b2 = hex(c2.slice(5, 7));
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

/**
 * HookReveal — Text-driven dramatic number reveal.
 *
 * Supports two variants:
 *
 * **"classic"** (default) — Big number appears, holds, deflates to small number.
 *   Phase 0: Context line fades in
 *   Phase 1: Big number scales up, holds
 *   Phase 2: Deflation — big shrinks, small appears
 *   Phase 3: Subtitle + subLabel fade in
 *
 * **"counting-ticker"** — Fast counting ticker that races up then rewinds down.
 *   Phase 0: Context line fades in ("The Dow Jones · Since 1925")
 *   Phase 1: Counter races up 0 → bigNumber (green), decelerating
 *   Phase 2: Brief hold at peak
 *   Phase 3: Counter rewinds bigNumber → smallNumber (color shifts to gold)
 *   Phase 4: subLabel + subtitle fade in, number holds
 */
export const HookReveal: React.FC<HookRevealProps> = (props) => {
  const {
    variant = "classic",
  } = props;

  if (variant === "counting-ticker") {
    return <CountingTickerVariant {...props} />;
  }
  return <ClassicVariant {...props} />;
};

// ═══════════════════════════════════════════════════════════════
// COUNTING TICKER VARIANT
// ═══════════════════════════════════════════════════════════════

const CountingTickerVariant: React.FC<HookRevealProps> = ({
  bigNumber,
  smallNumber,
  subtitle,
  subLabel,
  contextLine,
  contextDuration = 1.5,
  bigColor = "#2D8B4E",
  smallColor = "#C8A94E",
  backgroundColor = "#F5F0E8",
  fontFamily = "Montserrat, sans-serif",
  bigHoldDuration = 5,
  deflationDuration = 2.5,
  subtitleDelay = 0.5,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isDarkBg = (() => {
    if (backgroundColor.startsWith("#") && backgroundColor.length >= 7) {
      const r = parseInt(backgroundColor.slice(1, 3), 16);
      const g = parseInt(backgroundColor.slice(3, 5), 16);
      const b = parseInt(backgroundColor.slice(5, 7), 16);
      return (r * 299 + g * 587 + b * 114) / 1000 < 128;
    }
    return backgroundColor.startsWith("#0") || backgroundColor.startsWith("#1") || backgroundColor.startsWith("#2") || backgroundColor.startsWith("#3");
  })();
  const mutedColor = isDarkBg ? TEXT_SECONDARY : "rgba(0,0,0,0.35)";
  const subtitleColor = isDarkBg ? "rgba(240,237,232,0.85)" : "rgba(0,0,0,0.5)";
  const contextTextColor = isDarkBg ? "rgba(240,237,232,0.75)" : "rgba(0,0,0,0.4)";

  // Parse target values
  const bigVal = parseDisplayNumber(bigNumber);
  const smallVal = parseDisplayNumber(smallNumber);
  const suffix = bigNumber.includes("%") ? "%" : "";

  // ── Timeline (in frames) ──
  const contextFrames = fps * contextDuration;          // 0 → 1.5s
  const countUpDuration = fps * (bigHoldDuration - 1);  // 1.5s → ~5.5s (count up)
  const holdDuration = fps * 1.0;                       // hold at peak ~1s
  const rewindDuration = fps * deflationDuration;       // rewind ~2.5s
  const labelDelay = fps * subtitleDelay;               // delay before labels

  const countUpStart = contextFrames;
  const countUpEnd = countUpStart + countUpDuration;
  const holdEnd = countUpEnd + holdDuration;
  const rewindStart = holdEnd;
  const rewindEnd = rewindStart + rewindDuration;
  const labelStart = rewindEnd + labelDelay;
  const labelEnd = labelStart + fps * 1.2;

  // ── Phase 0: Context line ──
  const hasContext = Boolean(contextLine);
  const contextOpacity = hasContext
    ? interpolate(
        frame,
        [0, fps * 0.4, contextFrames - fps * 0.3, contextFrames],
        [0, 1, 1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      )
    : 0;

  const contextY = hasContext
    ? interpolate(
        frame,
        [contextFrames - fps * 0.5, contextFrames],
        [0, -80],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.quad) }
      )
    : 0;

  // ── Phase 1: Count up (0 → bigVal) ──
  const countUpProgress = interpolate(
    frame,
    [countUpStart, countUpEnd],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }
  );

  // ── Phase 2: Hold ──
  const isHolding = frame >= countUpEnd && frame < rewindStart;

  // ── Phase 3: Rewind (bigVal → smallVal) ──
  const rewindProgress = interpolate(
    frame,
    [rewindStart, rewindEnd],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) }
  );

  const isRewinding = frame >= rewindStart && frame <= rewindEnd;
  const isDoneRewinding = frame > rewindEnd;

  // ── Current displayed value ──
  const displayValue = useMemo(() => {
    if (frame < countUpStart) return formatDisplayNumber(0, suffix);
    if (frame <= countUpEnd) {
      // Count up: 0 → bigVal
      const val = countUpProgress * bigVal;
      return formatDisplayNumber(val, suffix);
    }
    if (frame < rewindStart) {
      // Hold at peak
      return formatDisplayNumber(bigVal, suffix);
    }
    if (frame <= rewindEnd) {
      // Rewind: bigVal → smallVal
      const val = bigVal + (smallVal - bigVal) * rewindProgress;
      return formatDisplayNumber(val, suffix);
    }
    // Done — show smallVal
    return formatDisplayNumber(smallVal, suffix);
  }, [frame, countUpStart, countUpEnd, rewindStart, rewindEnd, countUpProgress, rewindProgress, bigVal, smallVal, suffix]);

  // ── Color transition ──
  const currentColor = useMemo(() => {
    if (frame < rewindStart) return bigColor;
    if (frame <= rewindEnd) {
      return lerpColor(bigColor, smallColor, rewindProgress);
    }
    return smallColor;
  }, [frame, rewindStart, rewindEnd, rewindProgress, bigColor, smallColor]);

  // ── Number entrance opacity ──
  const numberOpacity = interpolate(
    frame,
    [countUpStart, countUpStart + fps * 0.3],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // ── Scale: slight pulse at peak hold, bounce at rewind end ──
  const peakPulse = isHolding
    ? 1 + 0.03 * Math.sin((frame - countUpEnd) / fps * Math.PI * 2)
    : 1;

  const rewindBounce = isDoneRewinding
    ? spring({
        fps,
        frame: frame - rewindEnd,
        config: { damping: 8, stiffness: 200, mass: 0.6 },
      })
    : 0;

  // During rewind: slight scale down then back up
  const rewindScale = isRewinding
    ? interpolate(rewindProgress, [0, 0.5, 1], [1, 0.92, 1])
    : 1;

  const bounceScale = isDoneRewinding
    ? interpolate(rewindBounce, [0, 1], [0.95, 1])
    : 1;

  const finalScale = peakPulse * rewindScale * bounceScale;

  // ── Font size: slightly smaller during rewind to emphasize the "shrink" ──
  const fontSize = interpolate(
    frame,
    [rewindStart, rewindEnd],
    [200, 180],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // ── Shake effect at rewind end ──
  const shakeX = isDoneRewinding && frame - rewindEnd < fps * 0.3
    ? Math.sin((frame - rewindEnd) * 3) * interpolate(frame - rewindEnd, [0, fps * 0.3], [8, 0], { extrapolateRight: "clamp" })
    : 0;

  // ── Phase 4: Labels ──
  const labelOpacity = interpolate(
    frame,
    [labelStart, labelEnd],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const labelY = interpolate(
    frame,
    [labelStart, labelEnd],
    [20, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.quad) }
  );

  // ── Speed lines / motion blur hint during count-up ──
  const isCountingUp = frame >= countUpStart && frame <= countUpEnd;
  const countUpSpeed = isCountingUp ? countUpProgress : 0;

  // ── Decorative "ghost" numbers during count-up (previous values fading out) ──
  const ghostOpacity = isCountingUp
    ? interpolate(countUpProgress, [0, 0.3, 0.8, 1], [0, 0.15, 0.08, 0])
    : 0;

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        fontFamily,
        overflow: "hidden",
      }}
    >
      {/* Speed lines during count-up */}
      {isCountingUp && countUpSpeed > 0.05 && (
        <>
          {[...Array(8)].map((_, i) => {
            const yPos = 15 + i * 12;
            const lineOpacity = interpolate(
              countUpSpeed,
              [0.05, 0.3, 0.8, 1],
              [0, 0.06, 0.03, 0]
            );
            return (
              <div
                key={`speed-${i}`}
                style={{
                  position: "absolute",
                  top: `${yPos}%`,
                  left: "10%",
                  right: "10%",
                  height: 2,
                  background: `linear-gradient(90deg, transparent, ${bigColor}${Math.round(lineOpacity * 255).toString(16).padStart(2, "0")}, transparent)`,
                  opacity: lineOpacity,
                  transform: `translateY(${Math.sin(frame * 0.5 + i) * 3}px)`,
                }}
              />
            );
          })}
        </>
      )}

      {/* Ghost numbers above/below during count-up */}
      {ghostOpacity > 0 && (
        <>
          <div
            style={{
              position: "absolute",
              fontSize: 120,
              fontWeight: 900,
              color: bigColor,
              opacity: ghostOpacity * 0.5,
              transform: `translateY(-140px)`,
              letterSpacing: -4,
              userSelect: "none",
              filter: "blur(2px)",
            }}
          >
            {formatDisplayNumber(Math.max(0, countUpProgress * bigVal - bigVal * 0.08), suffix)}
          </div>
          <div
            style={{
              position: "absolute",
              fontSize: 120,
              fontWeight: 900,
              color: bigColor,
              opacity: ghostOpacity * 0.3,
              transform: `translateY(140px)`,
              letterSpacing: -4,
              userSelect: "none",
              filter: "blur(3px)",
            }}
          >
            {formatDisplayNumber(Math.max(0, countUpProgress * bigVal - bigVal * 0.15), suffix)}
          </div>
        </>
      )}

      {/* Context line */}
      {hasContext && (
        <div
          style={{
            position: "absolute",
            opacity: contextOpacity,
            transform: `translateY(${contextY}px)`,
            fontSize: 32,
            fontWeight: 500,
            color: contextTextColor,
            letterSpacing: 4,
            textTransform: "uppercase",
            textAlign: "center",
            userSelect: "none",
          }}
        >
          {contextLine}
        </div>
      )}

      {/* Main counting number */}
      <div
        style={{
          position: "absolute",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          opacity: numberOpacity,
          transform: `scale(${finalScale}) translateX(${shakeX}px)`,
        }}
      >
        <div
          style={{
            fontSize,
            fontWeight: 900,
            color: currentColor,
            letterSpacing: -6,
            userSelect: "none",
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {displayValue}
        </div>

        {/* Sub-label (e.g. "in gold terms") — appears after rewind */}
        {subLabel && (
          <div
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: mutedColor,
              marginTop: 20,
              letterSpacing: 6,
              textTransform: "uppercase",
              opacity: labelOpacity,
              transform: `translateY(${labelY}px)`,
            }}
          >
            {subLabel}
          </div>
        )}
      </div>

      {/* Subtitle at bottom */}
      {subtitle && (
        <div
          style={{
            position: "absolute",
            bottom: "18%",
            opacity: labelOpacity,
            transform: `translateY(${labelY}px)`,
            fontSize: 30,
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

// ═══════════════════════════════════════════════════════════════
// CLASSIC VARIANT (original behavior)
// ═══════════════════════════════════════════════════════════════

const ClassicVariant: React.FC<HookRevealProps> = ({
  bigNumber,
  smallNumber,
  subtitle,
  subLabel,
  contextLine,
  contextDuration = 1.5,
  bigColor = "#2D8B4E",
  smallColor = "#C8A94E",
  backgroundColor = "#F5F0E8",
  fontFamily = "Montserrat, sans-serif",
  bigHoldDuration = 5,
  deflationDuration = 2.5,
  subtitleDelay = 0.5,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isDarkBg = (() => {
    if (backgroundColor.startsWith("#") && backgroundColor.length >= 7) {
      const r = parseInt(backgroundColor.slice(1, 3), 16);
      const g = parseInt(backgroundColor.slice(3, 5), 16);
      const b = parseInt(backgroundColor.slice(5, 7), 16);
      return (r * 299 + g * 587 + b * 114) / 1000 < 128;
    }
    return backgroundColor.startsWith("#0") || backgroundColor.startsWith("#1") || backgroundColor.startsWith("#2") || backgroundColor.startsWith("#3");
  })();
  const mutedColor = isDarkBg ? TEXT_SECONDARY : "rgba(0,0,0,0.35)";
  const subtitleColor = isDarkBg ? "rgba(240,237,232,0.85)" : "rgba(0,0,0,0.5)";
  const contextTextColor = isDarkBg ? "rgba(240,237,232,0.75)" : "rgba(0,0,0,0.4)";

  // ── Phase 0: Context line ──
  const contextFrames = fps * contextDuration;
  const hasContext = Boolean(contextLine);

  const contextOpacity = hasContext
    ? interpolate(
        frame,
        [0, fps * 0.4, contextFrames * 0.5, contextFrames * 0.9],
        [0, 1, 1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      )
    : 0;

  const contextY = hasContext
    ? interpolate(
        frame,
        [contextFrames * 0.4, contextFrames * 0.9],
        [0, -120],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.quad) }
      )
    : 0;

  // ── Phase 1: Big number entrance ──
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
      {hasContext && (
        <div
          style={{
            position: "absolute",
            opacity: contextOpacity,
            transform: `translateY(${contextY}px)`,
            fontSize: 32,
            fontWeight: 500,
            color: contextTextColor,
            letterSpacing: 4,
            textTransform: "uppercase",
            textAlign: "center",
            userSelect: "none",
          }}
        >
          {contextLine}
        </div>
      )}

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
