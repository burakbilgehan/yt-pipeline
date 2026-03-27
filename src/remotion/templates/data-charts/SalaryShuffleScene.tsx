import React from "react";
import {
  spring,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import type { DataChartInput } from "../../schemas";
import { BG, TEXT, TEXT_FAINT, POSITIVE, ACCENT_PINK, NEGATIVE } from "../../palette";

// ─── Types ────────────────────────────────────────────────────

export interface SalaryShuffleCountry {
  code: string;
  label: string;
  salary: number;
  hourlyRate: number;
}

export interface SalaryShuffleConfig {
  type: "salary-shuffle";
  countries: SalaryShuffleCountry[];
  initialSort: "salary" | "hourlyRate";
  resortTo: "salary" | "hourlyRate";
  resortLabel: string;
  /** Frame offset within the scene when resort animation triggers */
  resortTriggerFrame?: number;
  /** Title text displayed at top */
  title?: string;
  /** Data source attribution text */
  source?: string;
}

interface SalaryShuffleSceneProps {
  chart: DataChartInput;
  brandColor: string;
  fontFamily: string;
}

// ─── Theme ────────────────────────────────────────────────────

const MUTED = TEXT_FAINT;

// ─── Component ────────────────────────────────────────────────

export const SalaryShuffleScene: React.FC<SalaryShuffleSceneProps> = ({
  chart,
  brandColor,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cfg = chart as unknown as SalaryShuffleConfig;
  const accent = brandColor || ACCENT_PINK;
  const countries = cfg.countries || [];
  const resortTrigger = cfg.resortTriggerFrame ?? Math.round(fps * 12); // default: 12 seconds in
  const resortLabel = cfg.resortLabel || "Value per Hour";
  const title = cfg.title || "";
  const source = cfg.source || "";

  // ── Sort orders ──
  const sortedBySalary = [...countries].sort((a, b) => b.salary - a.salary);
  const sortedByBmPerHr = [...countries].sort((a, b) => b.hourlyRate - a.hourlyRate);

  // Position indices for each country in both sort orders
  const salaryIndex = new Map(sortedBySalary.map((c, i) => [c.code, i]));
  const bmIndex = new Map(sortedByBmPerHr.map((c, i) => [c.code, i]));

  // ── Animation phases ──
  // Phase 1: Countries fade in one by one (0 → resortTrigger - 60 frames)
  // Phase 2: "Value per Hour" column header appears
  // Phase 3: Countries resort with spring animation

  const ROW_HEIGHT = 120;
  const START_Y = 200;
  const LEFT_X = 300;
  const RESORT_COLUMN_X = 1200;

  // Resort spring (starts after trigger frame)
  const resortProgress = spring({
    fps,
    frame: Math.max(0, frame - resortTrigger),
    config: { damping: 18, stiffness: 40 },
  });

  // Column header appears slightly before resort
  const headerAppear = spring({
    fps,
    frame: Math.max(0, frame - resortTrigger + 15),
    config: { damping: 20, stiffness: 100 },
  });

  // Title fade
  const titleIn = spring({
    fps,
    frame,
    config: { damping: 30, stiffness: 120 },
  });

  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        backgroundColor: BG,
        position: "relative",
        overflow: "hidden",
        fontFamily,
      }}
    >
      {/* Title area */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: LEFT_X,
          opacity: titleIn,
        }}
      >
        <span
          style={{
            color: MUTED,
            fontSize: 16,
            fontWeight: 500,
            letterSpacing: 3,
            textTransform: "uppercase" as const,
          }}
        >
          {title}
        </span>
      </div>

      {/* Column headers */}
      <div
        style={{
          position: "absolute",
          top: START_Y - 55,
          left: LEFT_X,
          display: "flex",
          alignItems: "center",
          gap: 40,
        }}
      >
        <div
          style={{
            width: 400,
            color: MUTED,
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: 2,
            textTransform: "uppercase" as const,
            opacity: titleIn,
          }}
        >
          Country
        </div>
        <div
          style={{
            width: 250,
            color: MUTED,
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: 2,
            textTransform: "uppercase" as const,
            textAlign: "right" as const,
            opacity: titleIn,
          }}
        >
          Annual Salary
        </div>
      </div>

      {/* Resort column header */}
      <div
        style={{
          position: "absolute",
          top: START_Y - 55,
          left: RESORT_COLUMN_X,
          width: 350,
          textAlign: "right" as const,
          opacity: headerAppear,
          transform: `translateY(${interpolate(headerAppear, [0, 1], [20, 0])}px)`,
        }}
      >
        <span
          style={{
            color: accent,
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: 2,
            textTransform: "uppercase" as const,
          }}
        >
          {resortLabel}
        </span>
      </div>

      {/* Divider line under headers */}
      <div
        style={{
          position: "absolute",
          top: START_Y - 20,
          left: LEFT_X - 20,
          right: 200,
          height: 1,
          backgroundColor: "rgba(240, 237, 232, 0.08)",
          opacity: titleIn,
        }}
      />

      {/* Country rows */}
      {countries.map((country, originalIdx) => {
        // Stagger entrance
        const entranceDelay = originalIdx * 15; // ~0.5s stagger at 30fps
        const rowIn = spring({
          fps,
          frame: Math.max(0, frame - entranceDelay - 10),
          config: { damping: 15, stiffness: 80 },
        });

        // Calculate Y positions
        const sIdx = salaryIndex.get(country.code) ?? originalIdx;
        const bIdx = bmIndex.get(country.code) ?? originalIdx;
        const fromY = START_Y + sIdx * ROW_HEIGHT;
        const toY = START_Y + bIdx * ROW_HEIGHT;
        const currentY = interpolate(resortProgress, [0, 1], [fromY, toY]);

        // Check if this country moved up (positive change) or down
        const movedUp = bIdx < sIdx;
        const movedDown = bIdx > sIdx;

        // Glow effect during movement
        const isMoving = resortProgress > 0.05 && resortProgress < 0.95;
        const glowColor = movedUp ? POSITIVE : movedDown ? NEGATIVE : "transparent";

        // Hourly rate value fade in (appears with resort)
        const bmValueIn = spring({
          fps,
          frame: Math.max(0, frame - resortTrigger + 5 + bIdx * 3),
          config: { damping: 18, stiffness: 100 },
        });

        return (
          <div
            key={country.code}
            style={{
              position: "absolute",
              left: LEFT_X,
              top: currentY,
              display: "flex",
              alignItems: "center",
              gap: 40,
              opacity: rowIn,
              transform: `translateX(${interpolate(rowIn, [0, 1], [-60, 0])}px)`,
            }}
          >
            {/* Flag + Country name */}
            <div
              style={{
                width: 400,
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <span style={{ 
                fontSize: 14, 
                fontWeight: 700,
                color: BG,
                backgroundColor: "rgba(240, 237, 232, 0.85)",
                borderRadius: 4,
                padding: "4px 8px",
                letterSpacing: 1,
                minWidth: 42,
                textAlign: "center" as const,
              }}>
                {country.code}
              </span>
              <span
                style={{
                  color: TEXT,
                  fontSize: 28,
                  fontWeight: 600,
                }}
              >
                {country.label}
              </span>
            </div>

            {/* Salary value */}
            <div
              style={{
                width: 250,
                textAlign: "right" as const,
              }}
            >
              <span
                style={{
                  color: TEXT,
                  fontSize: 32,
                  fontWeight: 700,
                  fontFamily: "JetBrains Mono, monospace",
                  opacity: interpolate(resortProgress, [0, 0.5], [1, 0.4], {
                    extrapolateRight: "clamp",
                  }),
                }}
              >
                ${country.salary.toLocaleString()}
              </span>
            </div>

            {/* Hourly rate value (appears during resort) */}
            <div
              style={{
                position: "absolute",
                left: RESORT_COLUMN_X - LEFT_X,
                width: 350,
                textAlign: "right" as const,
                opacity: bmValueIn,
                transform: `translateX(${interpolate(bmValueIn, [0, 1], [30, 0])}px)`,
              }}
            >
              <span
                style={{
                  color: isMoving && movedUp ? POSITIVE : isMoving && movedDown ? NEGATIVE : accent,
                  fontSize: 32,
                  fontWeight: 700,
                  fontFamily: "JetBrains Mono, monospace",
                  textShadow: isMoving
                    ? `0 0 20px ${glowColor}40`
                    : "none",
                }}
              >
                {country.hourlyRate.toFixed(2)}
              </span>
              <span
                style={{
                  color: MUTED,
                  fontSize: 16,
                  fontWeight: 400,
                  marginLeft: 8,
                }}
              >
                $/hr
              </span>
            </div>

            {/* Movement indicator arrow (during resort) */}
            {resortProgress > 0.1 && (movedUp || movedDown) && (
              <div
                style={{
                  position: "absolute",
                  right: -80,
                  opacity: interpolate(resortProgress, [0.1, 0.5, 0.9, 1], [0, 0.8, 0.8, 0]),
                }}
              >
                <span
                  style={{
                    color: movedUp ? POSITIVE : NEGATIVE,
                    fontSize: 22,
                    fontWeight: 700,
                  }}
                >
                  {movedUp ? "▲" : "▼"} {Math.abs(sIdx - bIdx)}
                </span>
              </div>
            )}
          </div>
        );
      })}

      {/* Data source */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          right: 30,
          color: "rgba(240, 237, 232, 0.15)",
          fontSize: 11,
          fontWeight: 400,
          opacity: titleIn,
        }}
      >
        {source}
      </div>
    </div>
  );
};
