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
import type { SceneVisualInput } from "../../schemas";

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
 * Text-overlay scenes get a cinematic title card.
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
    return (
      <AbsoluteFill>
        <CinematicGradient brandColor={brandColor} />
        {visual.textOverlay && (
          <TitleCard
            text={visual.textOverlay}
            brandColor={brandColor}
            fontFamily={fontFamily}
            frame={frame}
            fps={fps}
          />
        )}
      </AbsoluteFill>
    );
  }

  // ── Visual scene (stock image / composite / ai-image) ──
  return (
    <AbsoluteFill>
      {hasImage ? (
        <KenBurnsImage src={staticFile(visual.assetPath!)} frame={frame} sceneDurationInFrames={durationInFrames} />
      ) : hasFallback ? (
        <KenBurnsImage src={staticFile(fallbackImage!)} frame={frame} sceneDurationInFrames={durationInFrames} />
      ) : (
        <CinematicGradient brandColor={brandColor} />
      )}

      {/* Dark vignette overlay for readability */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      {/* Bottom gradient for text area */}
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

      {/* Ranking badge + price tag from textOverlay */}
      {visual.textOverlay && (
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

// ─── Ken Burns Effect ────────────────────────────────────────

interface KenBurnsImageProps {
  src: string;
  frame: number;
  sceneDurationInFrames: number;
}

const KenBurnsImage: React.FC<KenBurnsImageProps> = ({ src, frame, sceneDurationInFrames }) => {
  // Slow zoom from 100% to 110% over the actual scene duration
  // Also slight pan (translateX shifts slightly)
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

// ─── Cinematic Gradient (fallback for no-image scenes) ──────

const CinematicGradient: React.FC<{ brandColor: string }> = ({
  brandColor,
}) => (
  <AbsoluteFill
    style={{
      background: `linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 40%, ${brandColor}22 100%)`,
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
  // Parse the textOverlay to extract ranking number and price
  // Format: "#10 — Human Blood\n$1,500/gallon" or just plain text
  const lines = text.split("\n");
  const titleLine = lines[0] || "";
  const priceLine = lines[1] || "";

  // Extract ranking number (e.g., "#10", "#1")
  const rankMatch = titleLine.match(/#(\d+)/);
  const rankNumber = rankMatch ? rankMatch[1] : null;

  // Extract item name (after "— " or after "#N ")
  const nameMatch = titleLine.match(/[—–-]\s*(.+)/);
  const itemName = nameMatch ? nameMatch[1].trim() : titleLine.replace(/#\d+\s*/, "").trim();

  // Entrance animation
  const enterSpring = spring({
    fps,
    frame,
    config: { damping: 18, stiffness: 80 },
  });

  const priceSpring = spring({
    fps,
    frame: frame - 8, // Staggered entrance
    config: { damping: 18, stiffness: 80 },
  });

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* Ranking badge (top-left corner) */}
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
              color: "#FFFFFF",
              fontSize: 56,
              fontFamily,
              fontWeight: 900,
              width: 100,
              height: 100,
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
            }}
          >
            {rankNumber}
          </div>
        </div>
      )}

      {/* Item name + price (bottom-left, above subtitle area) */}
      <div
        style={{
          position: "absolute",
          bottom: 120,
          left: 60,
          right: 200,
        }}
      >
        {/* Item name */}
        {itemName && (
          <div
            style={{
              color: "#FFFFFF",
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

        {/* Price tag */}
        {priceLine && (
          <div
            style={{
              display: "inline-flex",
              backgroundColor: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(8px)",
              borderRadius: 8,
              padding: "8px 20px",
              borderLeft: `4px solid ${brandColor}`,
              opacity: priceSpring,
              transform: `translateX(${interpolate(priceSpring, [0, 1], [-30, 0])}px)`,
            }}
          >
            <span
              style={{
                color: "#FFFFFF",
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

const TitleCard: React.FC<TitleCardProps> = ({
  text,
  brandColor,
  fontFamily,
  frame,
  fps,
}) => {
  const enterSpring = spring({
    fps,
    frame,
    config: { damping: 15, stiffness: 60 },
  });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 120,
      }}
    >
      <div
        style={{
          opacity: enterSpring,
          transform: `scale(${interpolate(enterSpring, [0, 1], [0.9, 1])})`,
          textAlign: "center",
        }}
      >
        <h1
          style={{
            color: "#FFFFFF",
            fontSize: 64,
            fontFamily,
            fontWeight: 800,
            lineHeight: 1.2,
            textShadow: "0 4px 30px rgba(0,0,0,0.5)",
          }}
        >
          {text}
        </h1>
        <div
          style={{
            width: 120,
            height: 4,
            backgroundColor: brandColor,
            margin: "24px auto 0",
            borderRadius: 2,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
