/**
 * Beat 1 (frames 0-180): the Gulf map card is the stage; the number is the picture.
 *   0    map card turns in from the left in 3D, header settles
 *  22    20.9 snaps in from the right; the full-width flow bar draws margin to margin
 *  66    bypass: the blue 9.0 segment fills; the two pipelines draw on the card (schematic)
 * 100    the pink 11.9 segment fills the rest
 * 126    KICK: 20.9 leaves, 11.9 slams in pink, "no other route" panel; the strait is barred
 * 168    the stage turns (index.tsx)
 * The stacked bar is one bar, zero at the left margin, 1728 px = 20.9 M b/d. Every label under
 * the bar is centered under the segment it measures; the axis ends are marked 0 and 20.9.
 */
import React from "react";
import { COLOR } from "../../catalog/tokens";
import { GulfMap, buildMap } from "./map";
import { HARD, MOVE, SETTLE, drift, ramp } from "./motion";
import { Chip, Panel, Snap } from "./ui";
import { body, caption, giant, value } from "./type";

export const T_NUM = 22;
export const T_BYPASS = 66;
export const T_REST = 100;
export const T_NOROUTE = 126;

const TOTAL = 20.9;
const BYPASS = 9.0;
const REST = 11.9;

const M = 96;
const BAR = { x: M, y: 800, w: 1728, h: 40 };
const px = (v: number) => (v / TOTAL) * BAR.w;

const CARD = { x: M, y: 140, w: 844, h: 560 };
const MODEL = buildMap({ w: CARD.w, h: CARD.h });

/**
 * A depth layer inside the face: perspective plus the slow shared drift, parallax by z.
 * flat: no rotation, for layers that carry data marks (a tilted bar misstates its length).
 */
export const Layer: React.FC<{ frame: number; z: number; children: React.ReactNode; extra?: string; flat?: boolean }> = ({ frame, z, children, extra = "", flat = false }) => {
  const ry = flat ? 0 : drift(frame, 1.6, 0);
  const rx = flat ? 0 : drift(frame, 0.8, 300);
  return (
    <div style={{ position: "absolute", inset: 0, perspective: 2400, perspectiveOrigin: "50% 50%" }}>
      <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", transform: `rotateY(${ry.toFixed(3)}deg) rotateX(${rx.toFixed(3)}deg) translateZ(${z}px) ${extra}` }}>{children}</div>
    </div>
  );
};

export const Beat1: React.FC<{ frame: number }> = ({ frame }) => {
  const blocked = frame >= T_NOROUTE;
  // map card turn-in: from edge-on at the left to its resting tilt
  const turnIn = ramp(frame, 0, 26, 0, 1, SETTLE);
  const cardRy = -78 + 70 * turnIn;
  const cardTx = -240 * (1 - turnIn);
  const headerIn = ramp(frame, 8, 22, 0, 1, SETTLE);
  const barDraw = ramp(frame, T_NUM, T_NUM + 30, 0, 1, MOVE);
  const blue = ramp(frame, T_BYPASS, T_BYPASS + 10, 0, 1, HARD);
  const pink = ramp(frame, T_REST, T_REST + 10, 0, 1, HARD);

  return (
    <div style={{ position: "absolute", inset: 0, background: COLOR.bg, overflow: "hidden" }}>
      {/* the map card, a real object in depth */}
      <Layer frame={frame} z={-60}>
        <div
          style={{
            position: "absolute",
            left: CARD.x,
            top: CARD.y,
            width: CARD.w,
            height: CARD.h,
            borderRadius: 24,
            overflow: "hidden",
            background: COLOR.surface,
            transformOrigin: "0% 50%",
            transform: `translateX(${cardTx.toFixed(1)}px) rotateY(${cardRy.toFixed(2)}deg) rotateX(3deg)`,
            opacity: ramp(frame, 0, 6),
          }}
        >
          <GulfMap frame={frame} model={MODEL} box={{ w: CARD.w, h: CARD.h }} pipesAt={T_BYPASS} blockedAt={T_NOROUTE} />
          {/* card footer: legend */}
          <div style={{ position: "absolute", left: 24, bottom: 20, display: "flex", alignItems: "center", gap: 12, opacity: ramp(frame, T_BYPASS + 6, T_BYPASS + 18) }}>
            <div style={{ width: 26, height: 3, background: COLOR.contrast }} />
            <span style={caption(16, COLOR.textSecondary)}>Bypass pipelines · schematic</span>
          </div>
          <div style={{ position: "absolute", right: 24, bottom: 20, ...caption(16, COLOR.textTertiary) }}>Coastlines: Natural Earth</div>
        </div>
      </Layer>

      {/* giant numeral, in front of the card */}
      <Layer frame={frame} z={80}>
        <Snap frame={frame} at={T_NUM} dur={11} from={{ x: 760 }} out={{ at: T_NOROUTE - 7, y: -240, dur: 7 }} c={1.0}>
          <div style={{ position: "absolute", right: M, top: 118, textAlign: "right" }}>
            <div style={giant(380)}>20.9</div>
            <div style={{ ...body(34, COLOR.textPrimary, 500), marginTop: 18, opacity: ramp(frame, T_NUM + 8, T_NUM + 20) }}>million barrels of crude a day</div>
            <div style={{ ...body(28, COLOR.textSecondary), marginTop: 6, opacity: ramp(frame, T_NUM + 14, T_NUM + 26) }}>pass through the Strait of Hormuz</div>
          </div>
        </Snap>
        <Snap frame={frame} at={T_NOROUTE} dur={10} from={{ x: 820 }} c={1.0}>
          <div style={{ position: "absolute", right: M, top: 118, textAlign: "right" }}>
            <div style={giant(380, COLOR.highlight)}>11.9</div>
          </div>
        </Snap>
        <Snap frame={frame} at={T_NOROUTE + 5} dur={10} from={{ x: 700 }} c={0.9}>
          <Panel x={1824 - 420} y={528} w={420} h={62} fill={COLOR.highlight} skew={18}>
            <div style={{ ...caption(28, COLOR.bg), position: "absolute", right: 36, top: 18 }}>No other route</div>
          </Panel>
          <div style={{ position: "absolute", right: M, top: 608, ...body(28, COLOR.textSecondary), opacity: ramp(frame, T_NOROUTE + 12, T_NOROUTE + 22) }}>million barrels a day cannot leave the Gulf any other way</div>
        </Snap>
      </Layer>

      {/* the flow bar: one stacked bar, zero at the left margin */}
      {frame >= T_NUM && (
        <Layer frame={frame} z={-20} flat>
        <div style={{ position: "absolute", inset: 0 }}>
          <div style={{ position: "absolute", left: BAR.x, top: BAR.y, width: BAR.w * barDraw, height: BAR.h, background: COLOR.dataNeutral }} />
          <div style={{ position: "absolute", left: BAR.x, top: BAR.y, width: px(BYPASS) * blue, height: BAR.h, background: COLOR.contrast }} />
          <div style={{ position: "absolute", left: BAR.x + px(BYPASS), top: BAR.y, width: px(REST) * pink, height: BAR.h, background: COLOR.highlight }} />
          {/* axis line and end ticks */}
          <div style={{ position: "absolute", left: BAR.x, top: BAR.y + BAR.h + 6, width: BAR.w * barDraw, height: 1, background: COLOR.textTertiary, opacity: 0.6 }} />
          <div style={{ position: "absolute", left: BAR.x, top: BAR.y + BAR.h + 6, width: 1, height: 10, background: COLOR.textTertiary }} />
          <div style={{ position: "absolute", left: BAR.x, top: BAR.y + BAR.h + 24, ...caption(18, COLOR.textTertiary) }}>0</div>
          {barDraw >= 1 && (
            <>
              <div style={{ position: "absolute", left: BAR.x + BAR.w - 1, top: BAR.y + BAR.h + 6, width: 1, height: 10, background: COLOR.textTertiary }} />
              <div style={{ position: "absolute", right: 1920 - (BAR.x + BAR.w), top: BAR.y + BAR.h + 24, ...caption(18, COLOR.textTertiary) }}>20.9</div>
            </>
          )}
          {/* segment labels, each centered under its segment */}
          <Snap frame={frame} at={T_BYPASS + 4} dur={9} from={{ y: 40 }} c={0.8}>
            <SegLabel cx={BAR.x + px(BYPASS) / 2} v="9.0" text="can bypass by pipeline" color={COLOR.contrast} />
          </Snap>
          <Snap frame={frame} at={T_REST + 4} dur={9} from={{ y: 40 }} c={0.8}>
            <SegLabel cx={BAR.x + px(BYPASS) + px(REST) / 2} v="11.9" text={blocked ? "no other route" : "stay on tankers through the strait"} color={COLOR.highlight} />
          </Snap>
        </div>
        </Layer>
      )}
      {/* header and status chip, in front of everything */}
      <div style={{ position: "absolute", left: M, top: 72, ...caption(22, COLOR.textTertiary), opacity: headerIn, transform: `translateY(${((1 - headerIn) * 10).toFixed(1)}px)` }}>
        Strait of Hormuz · crude oil flow · million barrels a day
      </div>
      {headerIn > 0 && <div style={{ opacity: headerIn }}><Chip x={1824} y={58} text={blocked ? "Strait blocked" : "Vessel traffic · open"} tone={blocked ? "pink" : "blue"} align="right" /></div>}

    </div>
  );
};

const SegLabel: React.FC<{ cx: number; v: string; text: string; color: string }> = ({ cx, v, text, color }) => (
  <div style={{ position: "absolute", left: cx, top: 884, transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
    <div style={value(48, color)}>{v}</div>
    <div style={caption(20, COLOR.textSecondary)}>{text}</div>
  </div>
);
