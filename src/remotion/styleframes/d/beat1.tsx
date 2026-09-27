/**
 * Beat 1 (frames 0-180): STRAIT STATUS.
 * The stage is a vessel-traffic card (a ship-tracking app) of the Strait of Hormuz. Giant type
 * sits behind it, tankers and slabs in front. Snaps on the 100 bpm grid:
 *   0   card and the HORMUZ band slam in
 *  18   status OPEN, 20.9 lands with a full-width flow bar
 *  54   the bar splits: 9.0 (blue) drops into a pipeline, 11.9 (pink) stays in the strait
 *  90   BLOCKED: ground flips to the light stage in one frame, barrier drops, tankers queue
 * 126   giant 11.9 NO OTHER ROUTE slams in, tanker sticker in front
 * 162   hold; 180 the wipe to beat 2
 */
import React from "react";
import { COLOR } from "../../catalog/tokens";
import { Lamp, Panel, Pipe, Snap, Tanker, Band } from "./objects";
import { HormuzMap, buildMap } from "./map";
import { BEAT, beat, beatPulse, idle, punch, ramp, slide } from "./motion";
import { GIANT, LIGHT, NAVY, body, giant, label } from "./type";

const CARD = { x: 88, y: 88, w: 900, h: 904, header: 112 };
const MAPBOX = { w: CARD.w, h: CARD.h - CARD.header };
const MODEL = buildMap(MAPBOX);

const T_OPEN = beat(1);
const T_SPLIT = beat(3);
const T_BLOCK = beat(5);
const T_NOROUTE = beat(7);

const TOTAL = 20.9;
const BYPASS = 9.0;
const REST = 11.9;
const BAR_W = 780;
const px = (v: number) => (v / TOTAL) * BAR_W;

/** Sticker tankers sailing east along the bottom right. After the blockade they queue at the barrier. */
const STREAM_N = 7;
const STREAM_SPEED = 3.4;
const STREAM_SPAN = 1000;
const BARRIER_X = 1836;
const QUEUE_GAP = 140;
function streamAt(frame: number): Array<{ x: number; stopped: boolean }> {
  const free = (i: number, f: number) => 1000 + ((((i * STREAM_SPAN) / STREAM_N + f * STREAM_SPEED) % STREAM_SPAN) + STREAM_SPAN) % STREAM_SPAN;
  if (frame < T_BLOCK) return Array.from({ length: STREAM_N }, (_, i) => ({ x: free(i, frame), stopped: false }));
  const atBlock = Array.from({ length: STREAM_N }, (_, i) => free(i, T_BLOCK));
  return atBlock.map((xb, i) => {
    const drift = xb + STREAM_SPEED * (frame - T_BLOCK);
    if (xb > BARRIER_X) return { x: drift, stopped: false };
    const rank = atBlock.filter((xj) => xj <= BARRIER_X && xj > xb).length;
    const target = BARRIER_X - rank * QUEUE_GAP;
    return { x: Math.min(drift, target), stopped: drift >= target };
  });
}

export const Beat1: React.FC<{ frame: number }> = ({ frame }) => {
  const blocked = frame >= T_BLOCK;
  const g = blocked ? LIGHT : NAVY;
  const cardIn = slide(frame, 0, 12, 1.0);
  const cardY = (1 - cardIn) * 1100;
  const bandX = -60 + idle(frame, 600, 30) - frame * 0.35;
  const split = slide(frame, T_SPLIT, 12, 0.8);
  const pipeFlow = frame * 1.4;
  const stream = streamAt(frame);
  const queued = stream.filter((t) => t.stopped).length;

  return (
    <div style={{ position: "absolute", inset: 0, background: g.bg, overflow: "hidden" }}>
      {/* giant word bands behind the stage, cropped by the frame */}
      <Snap frame={frame} at={0} dur={12} from={{ x: 900 }} c={0.6}>
        <Band text={blocked ? "BLOCKED" : "HORMUZ"} font={GIANT} size={470} color={g.band} y={-60} offset={bandX} gap={120} />
      </Snap>
      <Band text={blocked ? "NO ROUTE" : "TRAFFIC"} font={GIANT} size={470} color={g.band} y={720} offset={-bandX * 0.6 - 700} gap={120} />

      {/* the vessel-traffic card */}
      <div
        style={{
          position: "absolute",
          left: CARD.x,
          top: CARD.y + cardY,
          width: CARD.w,
          height: CARD.h,
          borderRadius: 28,
          background: NAVY.slab,
          overflow: "hidden",
          boxShadow: g.light ? "0 30px 80px rgba(22,24,32,0.28)" : "0 30px 80px rgba(0,0,0,0.45)",
        }}
      >
        <div style={{ position: "absolute", left: 0, top: 0, width: CARD.w, height: CARD.header, display: "flex", alignItems: "center", padding: "0 36px", gap: 22 }}>
          <div>
            <div style={label(22, COLOR.textTertiary)}>Vessel traffic · Live</div>
            <div style={{ ...body(38, COLOR.textPrimary, 500), marginTop: 6 }}>Strait of Hormuz</div>
          </div>
          <div style={{ flex: 1 }} />
          {frame >= T_OPEN && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "12px 22px 12px 16px",
                borderRadius: 999,
                background: blocked ? COLOR.highlight : "rgba(90,155,216,0.16)",
                transform: `scale(${punch(frame, blocked ? T_BLOCK : T_OPEN, 0.14).toFixed(3)})`,
              }}
            >
              <Lamp color={blocked ? COLOR.bg : COLOR.contrast} on={blocked ? 1 : 0.55 + 0.45 * beatPulse(frame)} size={18} />
              <span style={label(30, blocked ? COLOR.bg : COLOR.contrast)}>{blocked ? "Blocked" : "Open"}</span>
            </div>
          )}
        </div>
        <div style={{ position: "absolute", left: 0, top: CARD.header }}>
          <HormuzMap frame={frame} model={MODEL} box={MAPBOX} blockedAt={T_BLOCK} pipelineAt={T_SPLIT} light={false} />
        </div>
        {/* map footer: legend */}
        <div style={{ position: "absolute", left: 36, bottom: 26, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 24, height: 0, borderTop: `2px dashed ${COLOR.textTertiary}` }} />
          <span style={label(20, COLOR.textTertiary, 500)}>Tanker lane</span>
          {frame >= T_SPLIT && (
            <>
              <div style={{ width: 24, height: 3, background: COLOR.contrast, marginLeft: 18 }} />
              <span style={label(20, COLOR.contrast, 500)}>Bypass pipeline</span>
            </>
          )}
        </div>
        {blocked && queued > 0 && (
          <div style={{ position: "absolute", right: 36, bottom: 24, ...label(20, COLOR.highlight, 500) }}>
            {`Queue · ${queued} tankers waiting`}
          </div>
        )}
      </div>

      {/* the number: 20.9 lands on beat 1, snaps to 11.9 in place on beat 7 */}
      {frame < T_NOROUTE && (
      <Snap frame={frame} at={T_OPEN} dur={10} from={{ x: 700 }}>
        <div style={{ position: "absolute", left: 1044, top: 60 }}>
          <div style={{ ...giant(250, g.ink), marginLeft: -8 }}>20.9</div>
          <Panel x={0} y={250} w={520} h={58} fill={g.slab} skew={16}>
            <div style={{ ...label(34, COLOR.textPrimary), position: "absolute", left: 34, top: 12 }}>Million barrels a day</div>
          </Panel>
          <div style={{ ...body(28, g.ink2), position: "absolute", left: 4, top: 322 }}>pass through the strait, every day</div>
        </div>
      </Snap>
      )}
      {frame >= T_NOROUTE && (
        <Snap frame={frame} at={T_NOROUTE} dur={8} from={{ y: 160 }} c={0.9}>
          <div style={{ position: "absolute", left: 1044, top: 60, transform: `scale(${punch(frame, T_NOROUTE, 0.05, 8).toFixed(3)})`, transformOrigin: "0 0" }}>
            <div style={{ ...giant(250, COLOR.highlight), marginLeft: -8 }}>11.9</div>
            <Panel x={0} y={250} w={720} h={58} fill={g.slab} skew={16}>
              <div style={{ ...label(34, COLOR.textPrimary), position: "absolute", left: 34, top: 12 }}>Million barrels a day · no other route</div>
            </Panel>
            <div style={{ ...body(28, g.ink2), position: "absolute", left: 4, top: 322 }}>cannot leave the Gulf any other way</div>
          </div>
        </Snap>
      )}

      {/* the flow bar: 20.9 at full width, zero-based; on the split the 9.0 slice drops into the pipeline */}
      {frame >= T_OPEN && (
        <div style={{ position: "absolute", left: 1044, top: 430 }}>
          <div style={{ position: "absolute", left: 0, top: 44, width: BAR_W, height: 1, background: g.ink3, opacity: 0.5 }} />
          <div style={{ ...label(20, g.ink3, 500), position: "absolute", left: 0, top: 54 }}>0</div>
          <div style={{ ...label(20, g.ink3, 500), position: "absolute", left: BAR_W - 30, top: 54 }}>20.9</div>
          <div style={{ position: "absolute", left: 0, top: 0, height: 40, width: BAR_W * ramp(frame, T_OPEN, T_OPEN + 14), background: g.ink2, opacity: 1 - split }} />
          {/* pink remainder: stays in the strait */}
          <div style={{ position: "absolute", left: px(BYPASS), top: 0, height: 40, width: px(REST), background: COLOR.highlight, opacity: split }} />
          {/* blue slice drops 120 px into the pipeline row */}
          <div style={{ position: "absolute", left: 0, top: 120 * split, height: 40, width: px(BYPASS), background: COLOR.contrast, opacity: split }} />
          {frame >= T_SPLIT && (
            <>
              <div style={{ position: "absolute", left: px(BYPASS), top: 54, opacity: split, display: "flex", alignItems: "baseline", gap: 12 }}>
                <span style={giant(40, COLOR.highlight)}>11.9</span>
                <span style={label(24, blocked ? COLOR.highlight : g.ink2, 500)}>{blocked ? "no other route" : "stay in the strait"}</span>
              </div>
              <div style={{ position: "absolute", left: px(BYPASS) + 18, top: 112, opacity: split, display: "flex", alignItems: "baseline", gap: 12 }}>
                <span style={giant(40, COLOR.contrast)}>9.0</span>
                <span style={label(24, g.ink2, 500)}>can bypass by pipeline</span>
              </div>
              <svg width={BAR_W} height={40} style={{ position: "absolute", left: 0, top: 168, opacity: split }}>
                <Pipe x={4} y={18} length={px(BYPASS) - 8} flowPhase={pipeFlow} color={COLOR.contrast} flanges={2} />
              </svg>
            </>
          )}
        </div>
      )}

      {/* tanker stream as stickers along the bottom right: sailing east while open, piling up at the barrier once blocked */}
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <defs>
          <clipPath id="d-stream-clip">
            <rect x={1020} y={760} width={900} height={260} />
          </clipPath>
        </defs>
        <g clipPath="url(#d-stream-clip)">
          {stream.map((t, i) => (
            <Tanker key={i} x={t.x} y={926 + idle(frame, 44 + i * 5, 2.5, i * 9)} scale={0.62} fill={g.ink} rotate={idle(frame, 80 + i * 7, 0.6, i * 13)} flip />
          ))}
          {blocked && (
            <g transform={`translate(1884 ${900 + (1 - slide(frame, T_BLOCK, 8, 0.6)) * -220})`}>
              <rect x={-7} y={0} width={14} height={110} fill={COLOR.highlight} />
              <line x1={-7} y1={20} x2={7} y2={34} stroke={COLOR.bg} strokeWidth={3} opacity={0.6} />
              <line x1={-7} y1={50} x2={7} y2={64} stroke={COLOR.bg} strokeWidth={3} opacity={0.6} />
              <line x1={-7} y1={80} x2={7} y2={94} stroke={COLOR.bg} strokeWidth={3} opacity={0.6} />
            </g>
          )}
        </g>
      </svg>
      {blocked && queued > 0 && (
        <div style={{ position: "absolute", left: 1044, top: 960, display: "flex", alignItems: "baseline", gap: 12 }}>
          <span style={giant(48, COLOR.highlight)}>{queued}</span>
          <span style={label(24, g.ink2, 500)}>{queued === 1 ? "tanker waiting at the strait" : "tankers waiting at the strait"}</span>
        </div>
      )}
      {!blocked && frame >= T_OPEN && (
        <div style={{ position: "absolute", left: 1044, top: 960, display: "flex", alignItems: "baseline", gap: 12 }}>
          <span style={label(24, g.ink3, 500)}>Outbound tankers · strait open</span>
        </div>
      )}

      {/* strait-status stamp in the top-right corner on the blockade beat */}
      {blocked && (
        <Snap frame={frame} at={T_BLOCK} dur={8} from={{ y: -300 }} c={0.8}>
          <Panel x={1560} y={40} w={340} h={64} fill={COLOR.highlight} skew={14}>
            <div style={{ ...label(34, COLOR.bg), position: "absolute", left: 32, top: 15 }}>Strait closed</div>
          </Panel>
        </Snap>
      )}

      {/* ticker strip: constant motion at the bottom */}
      <Ticker frame={frame} text="VESSEL TRAFFIC ▸ STRAIT OF HORMUZ ▸ 20.9M BARRELS A DAY ▸ BYPASS CAPACITY 9.0M ▸ NO OTHER ROUTE 11.9M ▸ " bg={g.light ? COLOR.bg : COLOR.surface} ink={g.light ? COLOR.textSecondary : COLOR.textTertiary} speed={2.2} />

      {/* beat marks: a small metronome strip, top-left, ticks on each beat */}
      <div style={{ position: "absolute", left: 88, top: 44, display: "flex", gap: 8 }}>
        {Array.from({ length: 10 }, (_, i) => {
          const on = Math.floor(frame / BEAT) === i;
          return <div key={i} style={{ width: 22, height: 4, background: on ? COLOR.highlight : g.ink3, opacity: on ? 1 : 0.5 }} />;
        })}
      </div>
    </div>
  );
};

export const Ticker: React.FC<{ frame: number; text: string; bg: string; ink: string; speed: number }> = ({ frame, text, bg, ink, speed }) => {
  const reps = Array.from({ length: 4 }, () => text).join("");
  return (
    <div style={{ position: "absolute", left: 0, top: 1036, width: 1920, height: 44, background: bg, overflow: "hidden", display: "flex", alignItems: "center" }}>
      <div style={{ ...label(24, ink, 500), letterSpacing: "0.12em", transform: `translateX(${(-((frame * speed) % 1400)).toFixed(1)}px)` }}>{reps}</div>
    </div>
  );
};
