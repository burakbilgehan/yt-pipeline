/**
 * timeline: 3 to 7 dated events on one horizontal axis across the content width.
 * even: equal spacing. proportional: spaced by date (schema guarantees ISO dates in order).
 * Events alternate below and above the axis so neighbours never collide; each shows its date
 * (value type) and text (body). The first event is there from the start; event k lands on cue
 * "event<k>" (default: evenly through the first half of the scene) and the highlight progress
 * line along the axis grows to it. The emphasis event gets a highlight dot and date.
 */
import React from "react";
import { COLOR, DUR, EASE, LAYOUT, MOTION, SHAPE, body, value as valueStyle } from "../tokens";
import { progress, useFrame, useDuration } from "../motion";
import { Layer, Snap } from "../ui";
import { isoDate } from "../schema";

export interface TimelineProps {
  events: Array<{ date: string; text: string; emphasis?: boolean }>;
  scale: "even" | "proportional";
  /** Scene frame at which each event lands (index 0 is ignored). */
  eventAt?: Array<number | undefined>;
}

const { content } = LAYOUT;
const AXIS_Y = 560;
const INSET = 80;
const TEXT_W = 380;

export const Timeline: React.FC<TimelineProps> = ({ events, scale, eventAt = [] }) => {
  const frame = useFrame();
  const durationInFrames = useDuration();
  const n = events.length;
  const x0 = content.left + INSET;
  const x1 = content.right - INSET;
  const days = events.map((e) => isoDate(e.date) ?? 0);
  const xOf = (i: number) =>
    scale === "proportional" ? x0 + ((days[i] - days[0]) / Math.max(days[n - 1] - days[0], 1)) * (x1 - x0) : x0 + (i / (n - 1)) * (x1 - x0);
  const span = Math.max(60, Math.floor(durationInFrames / 2));
  const at = events.map((_, i) => (i === 0 ? 0 : Math.max(eventAt[i] ?? Math.round((i * span) / (n - 1)), 6)));
  const axisIn = progress(frame, 0, 20, EASE.move);

  // Progress line: grows between the last landed event and the next as each lands.
  let reached = x0;
  events.forEach((_, i) => {
    if (i === 0) return;
    const t = progress(frame, at[i] - 8, 12, EASE.hard);
    if (t > 0) reached = xOf(i - 1) + (xOf(i) - xOf(i - 1)) * t;
  });

  return (
    <>
      <Layer frame={frame} z={MOTION.z.measure} flat>
        <div style={{ position: "absolute", left: content.left, top: AXIS_Y - 2, width: (content.right - content.left) * axisIn, height: 4, borderRadius: SHAPE.radius, background: COLOR.surface2 }} />
        <div style={{ position: "absolute", left: x0, top: AXIS_Y - 2, width: Math.max(0, reached - x0), height: 4, borderRadius: SHAPE.radius, background: COLOR.highlight }} />
        {events.map((e, i) => {
          if (frame < at[i]) return null;
          const p = progress(frame, at[i], DUR.snap, EASE.hard);
          const color = e.emphasis ? COLOR.highlight : COLOR.textPrimary;
          const r = e.emphasis ? 14 : 10;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: xOf(i) - r,
                top: AXIS_Y - r,
                width: 2 * r,
                height: 2 * r,
                borderRadius: r,
                background: e.emphasis ? COLOR.highlight : COLOR.bg,
                border: e.emphasis ? undefined : `3px solid ${color}`,
                boxSizing: "border-box",
                transform: `scale(${(0.4 + 0.6 * p).toFixed(3)})`,
              }}
            />
          );
        })}
      </Layer>
      {events.map((e, i) => {
        const below = i % 2 === 0;
        const x = xOf(i);
        const left = Math.min(Math.max(x - TEXT_W / 2, content.left), content.right - TEXT_W);
        const color = e.emphasis ? COLOR.highlight : COLOR.textPrimary;
        return (
          <Snap key={i} frame={frame} at={at[i]} from={{ y: below ? 40 : -40 }}>
            <div
              style={{
                position: "absolute",
                left,
                width: TEXT_W,
                top: below ? AXIS_Y + 40 : undefined,
                bottom: below ? undefined : LAYOUT.height - AXIS_Y + 40,
                display: "flex",
                flexDirection: below ? "column" : "column-reverse",
                alignItems: x - TEXT_W / 2 < content.left ? "flex-start" : x + TEXT_W / 2 > content.right ? "flex-end" : "center",
                gap: 12,
                textAlign: x - TEXT_W / 2 < content.left ? "left" : x + TEXT_W / 2 > content.right ? "right" : "center",
              }}
            >
              <div style={valueStyle("m", color)}>{e.date}</div>
              <div style={{ ...body("m", COLOR.textSecondary), whiteSpace: "normal" }}>{e.text}</div>
            </div>
          </Snap>
        );
      })}
    </>
  );
};
