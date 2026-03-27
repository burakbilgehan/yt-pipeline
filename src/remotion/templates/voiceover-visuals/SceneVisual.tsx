import React from "react";
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { Video } from "@remotion/media";
import type { SceneVisualInput } from "../../schemas";
import { BG, TEXT } from "../../palette";

interface SceneVisualProps {
  visual: SceneVisualInput;
  brandColor: string;
  fontFamily: string;
  /** Fallback image to show when no assetPath is available (continuity from previous scene) */
  fallbackImage?: string;
}

/**
 * Full-screen scene visual with Ken Burns effect (slow zoom + pan).
 * Shows stock/AI images as backgrounds. Composite scenes get a ranking badge + price tag.
 * Text-overlay scenes get a cinematic title card with smart line rendering.
 * No placeholder cards — if no image, show a dark cinematic gradient.
 */
export const SceneVisual: React.FC<SceneVisualProps> = ({
  visual,
  brandColor,
  fontFamily,
  fallbackImage,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const hasImage = !!visual.assetPath;
  const hasFallback = !!fallbackImage;
  const isTextOnly = visual.type === "text-overlay";

  // ── Text-only scene (title cards, CTAs) ──
  if (isTextOnly) {
    const textStr = typeof visual.textOverlay === "string" ? visual.textOverlay : undefined;
    return (
      <AbsoluteFill>
        <CinematicGradient brandColor={brandColor} />
        {textStr && (
          <TitleCard
            text={textStr}
            brandColor={brandColor}
            fontFamily={fontFamily}
            frame={frame}
            fps={fps}
          />
        )}
      </AbsoluteFill>
    );
  }

  const isVideo = visual.type === "stock-video" || (visual.assetPath?.match(/\.(mp4|webm|mov)$/i) ?? false);

  // ── Visual scene (stock video / stock image / composite / ai-image) ──
  return (
    <AbsoluteFill>
      {hasImage && isVideo ? (
        <KenBurnsVideo src={staticFile(visual.assetPath!)} frame={frame} sceneDurationInFrames={durationInFrames} />
      ) : hasImage ? (
        <KenBurnsImage src={staticFile(visual.assetPath!)} frame={frame} sceneDurationInFrames={durationInFrames} />
      ) : hasFallback && isVideoFile(fallbackImage!) ? (
        <KenBurnsVideo src={staticFile(fallbackImage!)} frame={frame} sceneDurationInFrames={durationInFrames} />
      ) : hasFallback ? (
        <KenBurnsImage src={staticFile(fallbackImage!)} frame={frame} sceneDurationInFrames={durationInFrames} />
      ) : (
        <CinematicGradient brandColor={brandColor} />
      )}

      {/* Dark vignette + bottom gradient — only over real images/videos,
          never over CinematicGradient (flat solid bg) */}
      {(hasImage || hasFallback) && (
        <>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(ellipse at center, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.55) 100%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "40%",
              background:
                "linear-gradient(transparent, rgba(0,0,0,0.7))",
            }}
          />
        </>
      )}

      {/* Ranking badge + price tag from textOverlay (only if it's a string) */}
      {visual.textOverlay && typeof visual.textOverlay === "string" && (
        <RankingOverlay
          text={visual.textOverlay}
          brandColor={brandColor}
          fontFamily={fontFamily}
          frame={frame}
          fps={fps}
        />
      )}
    </AbsoluteFill>
  );
};

// ─── Helper: detect video file extensions ───────────────────

function isVideoFile(path: string): boolean {
  return /\.(mp4|webm|mov)$/i.test(path);
}

// ─── Ken Burns Effect ────────────────────────────────────────

interface KenBurnsImageProps {
  src: string;
  frame: number;
  sceneDurationInFrames: number;
}

const KenBurnsImage: React.FC<KenBurnsImageProps> = ({ src, frame, sceneDurationInFrames }) => {
  const duration = Math.max(sceneDurationInFrames, 1);
  const scale = interpolate(frame, [0, duration], [1.0, 1.12], {
    extrapolateRight: "clamp",
  });
  const translateX = interpolate(frame, [0, duration], [0, -15], {
    extrapolateRight: "clamp",
  });
  const translateY = interpolate(frame, [0, duration], [0, -8], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
        }}
      />
    </AbsoluteFill>
  );
};

// ─── Ken Burns Video Effect ─────────────────────────────────

interface KenBurnsVideoProps {
  src: string;
  frame: number;
  sceneDurationInFrames: number;
}

const KenBurnsVideo: React.FC<KenBurnsVideoProps> = ({ src, frame, sceneDurationInFrames }) => {
  const duration = Math.max(sceneDurationInFrames, 1);
  const scale = interpolate(frame, [0, duration], [1.0, 1.12], {
    extrapolateRight: "clamp",
  });
  const translateX = interpolate(frame, [0, duration], [0, -15], {
    extrapolateRight: "clamp",
  });
  const translateY = interpolate(frame, [0, duration], [0, -8], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <Video
        src={src}
        muted
        loop
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
        }}
      />
    </AbsoluteFill>
  );
};

// ─── Cinematic Gradient (fallback for no-image scenes) ──────

const CinematicGradient: React.FC<{ brandColor: string }> = ({
  brandColor,
}) => (
  <AbsoluteFill
    style={{
      backgroundColor: BG,
    }}
  />
);

// ─── Ranking Overlay (badge + price) ────────────────────────

interface RankingOverlayProps {
  text: string;
  brandColor: string;
  fontFamily: string;
  frame: number;
  fps: number;
}

const RankingOverlay: React.FC<RankingOverlayProps> = ({
  text,
  brandColor,
  fontFamily,
  frame,
  fps,
}) => {
  const lines = text.split("\n");
  const titleLine = lines[0] || "";
  const priceLine = lines[1] || "";

  const rankMatch = titleLine.match(/#(\d+)/);
  const rankNumber = rankMatch ? rankMatch[1] : null;

  const nameMatch = titleLine.match(/[—–-]\s*(.+)/);
  const itemName = nameMatch ? nameMatch[1].trim() : titleLine.replace(/#\d+\s*/, "").trim();

  const enterSpring = spring({
    fps,
    frame,
    config: { damping: 18, stiffness: 80 },
  });

  const priceSpring = spring({
    fps,
    frame: frame - 8,
    config: { damping: 18, stiffness: 80 },
  });

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {rankNumber && (
        <div
          style={{
            position: "absolute",
            top: 50,
            left: 50,
            opacity: enterSpring,
            transform: `scale(${enterSpring})`,
          }}
        >
          <div
            style={{
              backgroundColor: brandColor,
              color: TEXT,
              fontSize: 56,
              fontFamily,
              fontWeight: 900,
              width: 100,
              height: 100,
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
            }}
          >
            {rankNumber}
          </div>
        </div>
      )}

      <div
        style={{
          position: "absolute",
          bottom: 120,
          left: 60,
          right: 200,
        }}
      >
        {itemName && (
          <div
            style={{
              color: TEXT,
              fontSize: 46,
              fontFamily,
              fontWeight: 700,
              textShadow: "0 2px 16px rgba(0,0,0,0.8)",
              opacity: enterSpring,
              transform: `translateX(${interpolate(enterSpring, [0, 1], [-40, 0])}px)`,
              marginBottom: 8,
            }}
          >
            {itemName}
          </div>
        )}

        {priceLine && (
          <div
            style={{
              display: "inline-flex",
              backgroundColor: "rgba(26, 24, 36, 0.75)",
              borderRadius: 8,
              padding: "8px 20px",
              borderLeft: `4px solid ${brandColor}`,
              opacity: priceSpring,
              transform: `translateX(${interpolate(priceSpring, [0, 1], [-30, 0])}px)`,
            }}
          >
            <span
              style={{
                color: TEXT,
                fontSize: 30,
                fontFamily,
                fontWeight: 600,
                letterSpacing: 1,
              }}
            >
              {priceLine}
            </span>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

// ─── Title Card (for text-overlay scenes) ───────────────────

interface TitleCardProps {
  text: string;
  brandColor: string;
  fontFamily: string;
  frame: number;
  fps: number;
}

/**
 * Detect if a line starts with a non-ASCII symbol (emoji) or common bullet char.
 * Lines shorter than 5 chars (like operators ×, =) are excluded.
 */
const isBulletItem = (line: string): boolean => {
  const trimmed = line.trim();
  if (trimmed.length < 5) return false;
  const cp = trimmed.codePointAt(0) || 0;
  return cp > 127 || /^[✗✓·•☐☑]/.test(trimmed);
};

const TitleCard: React.FC<TitleCardProps> = ({
  text,
  brandColor,
  fontFamily,
  frame,
  fps,
}) => {
  const lines = text.split("\n");
  const nonEmptyLines = lines.filter((l) => l.trim() !== "");

  // Detect bullet-list style (emoji/symbol-prefixed lines)
  const bulletCount = nonEmptyLines.filter(isBulletItem).length;
  const isBulletList = nonEmptyLines.length > 1 && bulletCount >= 2;

  if (isBulletList) {
    return (
      <BulletListCard
        lines={nonEmptyLines}
        brandColor={brandColor}
        fontFamily={fontFamily}
        frame={frame}
        fps={fps}
      />
    );
  }

  // For single or multi-line text, use pre-line to respect \n
  const enterSpring = spring({
    fps,
    frame,
    config: { damping: 15, stiffness: 60 },
  });

  const isMultiLine = nonEmptyLines.length > 1;
  const fontSize = isMultiLine
    ? nonEmptyLines.length > 4
      ? 36
      : 42
    : 56;

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 120px",
      }}
    >
      <div
        style={{
          opacity: enterSpring,
          transform: `scale(${interpolate(enterSpring, [0, 1], [0.9, 1])})`,
          textAlign: "center",
          maxWidth: 1200,
        }}
      >
        <h1
          style={{
            color: TEXT,
            fontSize,
            fontFamily,
            fontWeight: 600,
            lineHeight: 1.4,
            textShadow: "0 2px 20px rgba(0,0,0,0.4)",
            whiteSpace: "pre-line",
            margin: 0,
          }}
        >
          {text}
        </h1>
        <div
          style={{
            width: 100,
            height: 3,
            backgroundColor: brandColor,
            margin: "24px auto 0",
            borderRadius: 2,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

// ─── Bullet List Card (for emoji/symbol-prefixed lines) ─────

const BulletListCard: React.FC<{
  lines: string[];
  brandColor: string;
  fontFamily: string;
  frame: number;
  fps: number;
}> = ({ lines, brandColor, fontFamily, frame, fps }) => {
  // Auto-size font based on longest line
  const maxLen = Math.max(...lines.map((l) => l.length));
  const fontSize =
    maxLen > 50 ? 30 : maxLen > 40 ? 34 : maxLen > 30 ? 38 : 42;

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 120px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 1400 }}>
        {lines.map((line, i) => {
          const lineSpring = spring({
            fps,
            frame: frame - i * 6,
            config: { damping: 15, stiffness: 60 },
          });

          return (
            <div
              key={i}
              style={{
                opacity: lineSpring,
                transform: `translateX(${interpolate(lineSpring, [0, 1], [-20, 0])}px)`,
                color: TEXT,
                fontSize,
                fontFamily,
                fontWeight: 500,
                lineHeight: 1.8,
                textShadow: "0 2px 16px rgba(0,0,0,0.4)",
              }}
            >
              {line}
            </div>
          );
        })}
        <div
          style={{
            width: 80,
            height: 3,
            backgroundColor: brandColor,
            marginTop: 24,
            borderRadius: 2,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
