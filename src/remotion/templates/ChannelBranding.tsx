import React from "react";
import { AbsoluteFill } from "remotion";

export interface ChannelBrandingProps {
  /** Type of branding asset */
  type: "profile" | "banner" | "watermark";
  /** Visual variant */
  variant: "A" | "B" | "C";
  /** Channel name */
  channelName?: string;
  /** Tagline */
  tagline?: string;
  /** Background color */
  bgColor?: string;
  /** Accent color (gold) */
  accentColor?: string;
  /** Text color */
  textColor?: string;
  /** Font family */
  fontFamily?: string;
}

const defaults = {
  bgColor: "#1A1824",
  accentColor: "#D47FA6",
  textColor: "#E8E0D4",
  fontFamily: "Inter, sans-serif",
};

export const ChannelBranding: React.FC<ChannelBrandingProps> = (props) => {
  const { type } = props;

  if (type === "profile") return <ProfilePicture {...props} />;
  if (type === "banner") return <ChannelBanner {...props} />;
  if (type === "watermark") return <Watermark {...props} />;
  return null;
};

// ═══════════════════════════════════════════════════════════════
// PROFILE PICTURE — 800x800 (displayed as circle on YouTube)
// ═══════════════════════════════════════════════════════════════

const ProfilePicture: React.FC<ChannelBrandingProps> = ({
  variant = "A",
  bgColor = defaults.bgColor,
  accentColor = defaults.accentColor,
  textColor = defaults.textColor,
  fontFamily = defaults.fontFamily,
}) => {
  if (variant === "B") {
    return (
      <AbsoluteFill style={{ backgroundColor: bgColor, fontFamily }}>
        {/* Bar chart icon */}
        <div
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg viewBox="0 0 400 400" width={500} height={500}>
            {/* 5 bars ascending then descending — mountain shape */}
            {[
              { x: 80, h: 120 },
              { x: 130, h: 180 },
              { x: 180, h: 240 },
              { x: 230, h: 190 },
              { x: 280, h: 130 },
            ].map(({ x, h }, i) => (
              <rect
                key={i}
                x={x}
                y={300 - h}
                width={35}
                height={h}
                rx={4}
                fill={i === 2 ? accentColor : accentColor}
                opacity={i === 2 ? 1 : 0.4 + i * 0.08}
              />
            ))}
            {/* Baseline */}
            <line x1={65} y1={305} x2={330} y2={305} stroke={accentColor} strokeWidth={2} opacity={0.3} />
          </svg>
        </div>
      </AbsoluteFill>
    );
  }

  if (variant === "C") {
    return (
      <AbsoluteFill style={{ backgroundColor: bgColor, fontFamily }}>
        {/* Upward trending line with dot at end */}
        <div
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg viewBox="0 0 400 400" width={520} height={520}>
            {/* Grid lines — very subtle */}
            {[0, 1, 2, 3, 4].map((i) => (
              <line
                key={`grid-${i}`}
                x1={80}
                y1={100 + i * 50}
                x2={340}
                y2={100 + i * 50}
                stroke={accentColor}
                strokeWidth={0.5}
                opacity={0.12}
              />
            ))}
            {/* Upward trending line — jagged but overall rising */}
            <path
              d="M 80 300 L 120 280 L 145 290 L 170 250 L 200 260 L 225 210 L 255 220 L 280 170 L 310 150 L 340 110"
              fill="none"
              stroke={accentColor}
              strokeWidth={6}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.9}
            />
            {/* Endpoint dot */}
            <circle cx={340} cy={110} r={10} fill={accentColor} />
            {/* Subtle glow on endpoint */}
            <circle cx={340} cy={110} r={20} fill={accentColor} opacity={0.2} />
          </svg>
        </div>
      </AbsoluteFill>
    );
  }

  // Variant A — line chart with area fill
  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, fontFamily }}>
      <div
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg viewBox="0 0 400 400" width={540} height={540}>
          {/* Area fill under the line */}
          <path
            d="M 60 320 L 100 290 L 130 300 L 165 255 L 200 265 L 230 220 L 260 200 L 295 150 L 330 120 L 355 90 L 355 320 Z"
            fill="url(#profileAreaGrad)"
            opacity={0.3}
          />
          {/* Main line */}
          <path
            d="M 60 320 L 100 290 L 130 300 L 165 255 L 200 265 L 230 220 L 260 200 L 295 150 L 330 120 L 355 90"
            fill="none"
            stroke={accentColor}
            strokeWidth={7}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Endpoint dot */}
          <circle cx={355} cy={90} r={12} fill={accentColor} />
          <circle cx={355} cy={90} r={22} fill={accentColor} opacity={0.15} />
          <defs>
            <linearGradient id="profileAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accentColor} stopOpacity={0.5} />
              <stop offset="100%" stopColor={accentColor} stopOpacity={0} />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════════
// CHANNEL BANNER — 2560x1440 (safe area: 1546x423 centered)
// ═══════════════════════════════════════════════════════════════

const ChannelBanner: React.FC<ChannelBrandingProps> = ({
  variant = "A",
  channelName = "The World With Numbers",
  tagline = "Data-driven stories that reveal how the world really works",
  bgColor = defaults.bgColor,
  accentColor = defaults.accentColor,
  textColor = defaults.textColor,
  fontFamily = defaults.fontFamily,
}) => {
  // Banner chart path — wider, spanning the full banner
  const bannerChartPath =
    "M 0 900 L 200 870 L 400 820 L 500 850 L 700 780 L 900 790 L 1100 700 L 1300 720 L 1500 650 L 1700 600 L 1900 550 L 2100 480 L 2300 420 L 2560 350";

  if (variant === "B") {
    // Variant B — channel name left-aligned in safe area, multiple chart lines
    return (
      <AbsoluteFill style={{ backgroundColor: bgColor, fontFamily }}>
        {/* Multiple faded chart lines */}
        <svg
          viewBox="0 0 2560 1440"
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
        >
          <path d={bannerChartPath} fill="none" stroke={accentColor} strokeWidth={2} opacity={0.1} />
          <path
            d="M 0 950 L 300 920 L 600 880 L 800 900 L 1000 830 L 1200 850 L 1400 770 L 1600 740 L 1800 680 L 2000 620 L 2200 560 L 2560 500"
            fill="none" stroke="#5BBF8C" strokeWidth={2} opacity={0.08}
          />
          <path
            d="M 0 1000 L 250 980 L 500 950 L 750 970 L 1000 920 L 1250 940 L 1500 880 L 1750 850 L 2000 800 L 2250 750 L 2560 700"
            fill="none" stroke="#C97B9F" strokeWidth={2} opacity={0.06}
          />
        </svg>

        {/* Safe area content — centered */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 900,
              color: textColor,
              letterSpacing: -2,
              textAlign: "center",
            }}
          >
            {channelName}
          </div>
          <div
            style={{
              width: 200,
              height: 3,
              backgroundColor: accentColor,
              opacity: 0.5,
            }}
          />
          <div
            style={{
              fontSize: 28,
              fontWeight: 400,
              color: accentColor,
              letterSpacing: 3,
              textTransform: "uppercase",
              textAlign: "center",
              opacity: 0.7,
            }}
          >
            {tagline}
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  if (variant === "C") {
    // Variant C — minimal, just the chart line and name
    return (
      <AbsoluteFill style={{ backgroundColor: bgColor, fontFamily }}>
        <svg
          viewBox="0 0 2560 1440"
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
        >
          {/* Single prominent chart line */}
          <path
            d={bannerChartPath}
            fill="none"
            stroke={accentColor}
            strokeWidth={3}
            opacity={0.2}
            strokeLinecap="round"
          />
          {/* Area fill */}
          <path
            d={bannerChartPath + " L 2560 1440 L 0 1440 Z"}
            fill="url(#bannerAreaGrad)"
            opacity={0.08}
          />
          <defs>
            <linearGradient id="bannerAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accentColor} stopOpacity={0.4} />
              <stop offset="100%" stopColor={accentColor} stopOpacity={0} />
            </linearGradient>
          </defs>
        </svg>

        {/* Channel name — centered in safe area */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: 64,
            fontWeight: 800,
            color: textColor,
            letterSpacing: -1,
            textAlign: "center",
            opacity: 0.9,
          }}
        >
          {channelName}
        </div>
      </AbsoluteFill>
    );
  }

  // Variant A — chart line with area, name + tagline centered
  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, fontFamily }}>
      <svg
        viewBox="0 0 2560 1440"
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
      >
        {/* Area fill */}
        <path
          d={bannerChartPath + " L 2560 1440 L 0 1440 Z"}
          fill="url(#bannerAreaGradA)"
          opacity={0.1}
        />
        {/* Main chart line */}
        <path
          d={bannerChartPath}
          fill="none"
          stroke={accentColor}
          strokeWidth={3}
          opacity={0.15}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <defs>
          <linearGradient id="bannerAreaGradA" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accentColor} stopOpacity={0.3} />
            <stop offset="100%" stopColor={accentColor} stopOpacity={0} />
          </linearGradient>
        </defs>
      </svg>

      {/* Safe area content */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 15,
        }}
      >
        <div
          style={{
            fontSize: 68,
            fontWeight: 900,
            color: textColor,
            letterSpacing: -2,
            textAlign: "center",
          }}
        >
          {channelName}
        </div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 500,
            color: accentColor,
            letterSpacing: 4,
            textTransform: "uppercase",
            textAlign: "center",
            opacity: 0.6,
            maxWidth: 800,
          }}
        >
          {tagline}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════════
// WATERMARK — 150x150 (displayed small on video, bottom-right)
// ═══════════════════════════════════════════════════════════════

const Watermark: React.FC<ChannelBrandingProps> = ({
  bgColor = "transparent",
  accentColor = defaults.accentColor,
  fontFamily = defaults.fontFamily,
}) => (
  <AbsoluteFill style={{ backgroundColor: bgColor, fontFamily }}>
    <div
      style={{
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg viewBox="0 0 150 150" width={150} height={150}>
        {/* Simple upward line chart — recognizable at tiny size */}
        <path
          d="M 20 110 L 45 95 L 65 100 L 85 75 L 105 60 L 130 35"
          fill="none"
          stroke={accentColor}
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.8}
        />
        <circle cx={130} cy={35} r={7} fill={accentColor} opacity={0.9} />
      </svg>
    </div>
  </AbsoluteFill>
);
