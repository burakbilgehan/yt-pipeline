import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import type { SceneVisualInput } from "../../schemas";

interface SceneVisualProps {
  visual: SceneVisualInput;
  brandColor: string;
  fontFamily: string;
}

/**
 * Renders the background visual for a scene.
 * Handles: stock images, AI images, text-only overlays, and placeholder cards.
 * Stock videos are rendered as static images (Remotion handles video separately).
 */
export const SceneVisual: React.FC<SceneVisualProps> = ({
  visual,
  brandColor,
  fontFamily,
}) => {
  // If we have a resolved asset path, show the image
  if (visual.assetPath && (visual.type === "stock-image" || visual.type === "ai-image" || visual.type === "stock-video")) {
    return (
      <AbsoluteFill>
        <Img
          src={staticFile(visual.assetPath)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
        {/* Darkening overlay for text readability */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.5) 100%)",
          }}
        />
        {/* Text overlay on top of image */}
        {visual.textOverlay && (
          <TextOverlayCard
            text={visual.textOverlay}
            brandColor={brandColor}
            fontFamily={fontFamily}
          />
        )}
      </AbsoluteFill>
    );
  }

  // Text-only overlay scene (no background image)
  if (visual.type === "text-overlay") {
    return (
      <AbsoluteFill
        style={{
          background: `linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {visual.textOverlay && (
          <TextOverlayCard
            text={visual.textOverlay}
            brandColor={brandColor}
            fontFamily={fontFamily}
            large
          />
        )}
      </AbsoluteFill>
    );
  }

  // Placeholder for unresolved assets - shows description
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, #2d1b69 0%, #11998e 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 80,
      }}
    >
      <div
        style={{
          textAlign: "center",
          color: "#FFFFFF",
          fontFamily,
        }}
      >
        <div
          style={{
            fontSize: 18,
            opacity: 0.6,
            marginBottom: 16,
            textTransform: "uppercase",
            letterSpacing: 2,
          }}
        >
          {visual.type.replace("-", " ")}
        </div>
        <div
          style={{
            fontSize: 32,
            fontWeight: 600,
            lineHeight: 1.4,
          }}
        >
          {visual.description}
        </div>
        {visual.searchQuery && (
          <div
            style={{
              fontSize: 16,
              opacity: 0.5,
              marginTop: 12,
            }}
          >
            Search: {visual.searchQuery}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

// ─── Internal: Text overlay card ──────────────────────────────

interface TextOverlayCardProps {
  text: string;
  brandColor: string;
  fontFamily: string;
  large?: boolean;
}

const TextOverlayCard: React.FC<TextOverlayCardProps> = ({
  text,
  brandColor,
  fontFamily,
  large,
}) => {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: large ? 100 : 60,
      }}
    >
      <h1
        style={{
          color: "#FFFFFF",
          fontSize: large ? 72 : 48,
          fontFamily,
          fontWeight: 800,
          textAlign: "center",
          lineHeight: 1.2,
          textShadow: "0 4px 20px rgba(0,0,0,0.6)",
          borderLeft: `6px solid ${brandColor}`,
          paddingLeft: 30,
        }}
      >
        {text}
      </h1>
    </div>
  );
};
