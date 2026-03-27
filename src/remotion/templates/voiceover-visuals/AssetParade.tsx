import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";
import { TEXT, TEXT_SECONDARY, TEXT_MUTED } from "../../palette";

interface AssetItem {
  /** Asset name (e.g. "Oil (WTI)") */
  name: string;
  /** Current price string (e.g. "$67") */
  price: string;
  /** Gold ratio result (e.g. "0.022 oz") */
  ratio: string;
  /** Asset line color from chart */
  color: string;
}

interface AssetParadeProps {
  /** Formula parts to show initially */
  formulaParts?: string[];
  /** Assets to parade through — each gets its own calculation animation */
  assets: AssetItem[];
  /** Gold price string (e.g. "$2,990") */
  goldPrice: string;
  /** Data badge text at bottom */
  dataBadge?: string;
  /** Background color */
  backgroundColor?: string;
  /** Accent color */
  accentColor?: string;
  /** Font family */
  fontFamily?: string;
  /** How long to show the formula before parade starts (seconds, default 6) */
  formulaDuration?: number;
  /** How long each asset is shown (seconds, default 3.5) */
  assetDuration?: number;
}

/**
 * AssetParade — Formula explanation + animated asset-by-asset ratio calculation.
 *
 * Phase 1 (0 → formulaDuration): Formula parts animate in
 * Phase 2 (formulaDuration → end): Assets parade in one by one, each showing
 *   "AssetName $price ÷ Gold $goldPrice = ratio"
 * DataBadge fades in during Phase 2
 *
 * Replaces FormulaCard for more engaging, interactive feel.
 */
export const AssetParade: React.FC<AssetParadeProps> = ({
  formulaParts = ["Asset Price", "÷", "Gold Price (1 oz)", "=", "Asset/Gold Ratio"],
  assets,
  goldPrice,
  dataBadge,
  backgroundColor = "#F5F0E8",
  accentColor = "#C8A94E",
  fontFamily = "Inter, sans-serif",
  formulaDuration = 6,
  assetDuration = 3.5,
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
  const textPrimary = isDarkBg ? TEXT : "#1a1a1a";
  const textSecondary = isDarkBg ? TEXT_SECONDARY : "rgba(0,0,0,0.4)";
  const textMuted = isDarkBg ? TEXT_MUTED : "rgba(0,0,0,0.25)";
  const operatorColor = isDarkBg ? TEXT_MUTED : "rgba(0,0,0,0.25)";
  const cardBg = isDarkBg ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)";
  const cardBorder = isDarkBg ? "rgba(240,237,232,0.15)" : "rgba(0,0,0,0.08)";
  const accentBg = isDarkBg ? `${accentColor}22` : `${accentColor}18`;
  const accentBorder = isDarkBg ? `${accentColor}66` : `${accentColor}55`;

  const formulaEndFrame = fps * formulaDuration;
  const staggerDelay = fps * 0.4;

  // ── Formula phase: formula scales down after its duration ──
  const formulaScale = interpolate(
    frame,
    [formulaEndFrame - fps * 0.5, formulaEndFrame],
    [1, 0.7],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) }
  );
  const formulaY = interpolate(
    frame,
    [formulaEndFrame - fps * 0.5, formulaEndFrame],
    [0, -260],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) }
  );
  const formulaOpacity = interpolate(
    frame,
    [formulaEndFrame - fps * 0.3, formulaEndFrame + fps * 0.5],
    [1, 0.4],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // ── Asset parade phase ──
  const paradeFrame = frame - formulaEndFrame;
  const currentAssetIndex = Math.floor(paradeFrame / (fps * assetDuration));
  const assetLocalFrame = paradeFrame - currentAssetIndex * (fps * assetDuration);

  // Data badge
  const badgeOpacity = interpolate(
    frame,
    [formulaEndFrame + fps * 1, formulaEndFrame + fps * 2],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

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
      {/* ═══ Formula (top area, scales down when parade starts) ═══ */}
      <div
        style={{
          position: "absolute",
          top: frame < formulaEndFrame ? "50%" : "12%",
          left: "50%",
          transform: `translate(-50%, -50%) scale(${formulaScale})`,
          opacity: formulaOpacity,
          display: "flex",
          alignItems: "center",
          gap: 20,
          flexWrap: "wrap",
          justifyContent: "center",
          maxWidth: "85%",
          transition: "top 0.3s",
        }}
      >
        {formulaParts.map((part, i) => {
          const partFrame = frame - i * staggerDelay;
          const isOperator = part === "÷" || part === "=" || part === "×" || part === "+";

          const entrance = spring({
            fps,
            frame: partFrame,
            config: { damping: 14, stiffness: 70 },
          });

          const slideY = interpolate(entrance, [0, 1], [25, 0]);

          return (
            <div
              key={i}
              style={{
                opacity: entrance,
                transform: `translateY(${slideY}px)`,
                display: "flex",
                alignItems: "center",
              }}
            >
              {isOperator ? (
                <span
                  style={{
                    fontSize: frame < formulaEndFrame ? 52 : 36,
                    fontWeight: 300,
                    color: operatorColor,
                    padding: "0 6px",
                  }}
                >
                  {part}
                </span>
              ) : (
                <div
                  style={{
                    backgroundColor: part.includes("Ratio") ? accentBg : cardBg,
                    border: part.includes("Ratio")
                      ? `2px solid ${accentBorder}`
                      : `1px solid ${cardBorder}`,
                    borderRadius: 10,
                    padding: frame < formulaEndFrame ? "14px 24px" : "10px 18px",
                  }}
                >
                  <span
                    style={{
                      fontSize: frame < formulaEndFrame ? 38 : 26,
                      fontWeight: 700,
                      color: part.includes("Ratio") ? accentColor : textPrimary,
                      letterSpacing: 0.5,
                    }}
                  >
                    {part}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ═══ Asset Parade (center area) ═══ */}
      {paradeFrame >= 0 && currentAssetIndex < assets.length && (
        <div
          style={{
            position: "absolute",
            top: "42%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 24,
          }}
        >
          {(() => {
            const asset = assets[currentAssetIndex];
            if (!asset) return null;

            // Entrance spring for asset
            const assetEntrance = spring({
              fps,
              frame: assetLocalFrame,
              config: { damping: 16, stiffness: 80 },
            });

            // Staggered parts: Name, Price, ÷, Gold Price, =, Ratio
            const parts = [
              { text: asset.name, type: "name" as const },
              { text: asset.price, type: "price" as const },
              { text: "÷", type: "operator" as const },
              { text: `Gold ${goldPrice}`, type: "gold" as const },
              { text: "=", type: "operator" as const },
              { text: asset.ratio, type: "ratio" as const },
            ];

            return (
              <>
                {/* Asset name */}
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 600,
                    color: asset.color,
                    opacity: assetEntrance,
                    letterSpacing: 3,
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}
                >
                  {asset.name}
                </div>

                {/* Calculation row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  {parts.slice(1).map((part, j) => {
                    const partDelay = fps * 0.3 * (j + 1);
                    const partEntrance = spring({
                      fps,
                      frame: assetLocalFrame - partDelay,
                      config: { damping: 14, stiffness: 70 },
                    });

                    const isOp = part.type === "operator";
                    const isRatio = part.type === "ratio";

                    return (
                      <div
                        key={j}
                        style={{
                          opacity: partEntrance,
                          transform: `translateY(${interpolate(partEntrance, [0, 1], [20, 0])}px)`,
                        }}
                      >
                        {isOp ? (
                          <span
                            style={{
                              fontSize: 40,
                              fontWeight: 300,
                              color: operatorColor,
                            }}
                          >
                            {part.text}
                          </span>
                        ) : (
                          <div
                            style={{
                              backgroundColor: isRatio ? accentBg : cardBg,
                              border: isRatio
                                ? `2px solid ${accentBorder}`
                                : `1px solid ${cardBorder}`,
                              borderRadius: 10,
                              padding: "12px 24px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: isRatio ? 42 : 36,
                                fontWeight: isRatio ? 800 : 600,
                                color: isRatio ? accentColor : textPrimary,
                              }}
                            >
                              {part.text}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Exit: fade out near end of this asset's slot */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor,
                    opacity: interpolate(
                      assetLocalFrame,
                      [fps * (assetDuration - 0.4), fps * assetDuration],
                      [0, 1],
                      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                    ),
                    pointerEvents: "none",
                  }}
                />
              </>
            );
          })()}
        </div>
      )}

      {/* ═══ Asset counter / progress ═══ */}
      {paradeFrame >= 0 && currentAssetIndex < assets.length && (
        <div
          style={{
            position: "absolute",
            bottom: "20%",
            display: "flex",
            gap: 8,
            opacity: badgeOpacity,
          }}
        >
          {assets.map((_, i) => (
            <div
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: i <= currentAssetIndex ? accentColor : (isDarkBg ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)"),
                transition: "background-color 0.3s",
              }}
            />
          ))}
        </div>
      )}

      {/* ═══ Data badge ═══ */}
      {dataBadge && (
        <div
          style={{
            position: "absolute",
            bottom: "10%",
            opacity: badgeOpacity,
            fontSize: 18,
            fontWeight: 500,
            color: textMuted,
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          {dataBadge}
        </div>
      )}
    </AbsoluteFill>
  );
};
