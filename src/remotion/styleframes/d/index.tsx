/**
 * Style frame direction D: the interface is the stage.
 * Beat 1 is a vessel-traffic card whose status snaps OPEN -> BLOCKED; beat 2 is a stock-app card
 * beside a departure-board price. Energy comes from editing: holds of 1 to 1.5 s, hard snaps on
 * a 100 bpm grid (every 18 frames), motion-blurred slides with a small overshoot, giant type
 * interleaved with the objects, and a skewed panel wipe between the beats.
 */
import React from "react";
import { AbsoluteFill } from "remotion";
import { useCurrentFrame } from "remotion";
import { COLOR } from "../../catalog/tokens";
import { Beat1 } from "./beat1";
import { Beat2 } from "./beat2";
import { HARD, beat, beatPulse, ramp } from "./motion";
import { BlurDefs } from "./objects";
import { Grain } from "./grain";

export const STYLEFRAME_DURATION = 360;

const T_WIPE = beat(10);
const WIPE_DUR = 12;
const SKEW = 320;

export const StyleFrame: React.FC = () => {
  const frame = useCurrentFrame();
  const p = ramp(frame, T_WIPE, T_WIPE + WIPE_DUR, 0, 1, HARD);
  const edge = -SKEW - 80 + p * (1920 + SKEW + 160);
  const showBeat1 = frame < T_WIPE + WIPE_DUR;
  const showBeat2 = frame >= T_WIPE;
  const clip = `polygon(-1px 0, ${edge.toFixed(1)}px 0, ${(edge - SKEW).toFixed(1)}px 100%, -1px 100%)`;

  // a kick on every beat: the whole stage punches 1 % and settles
  const kick = 1 + 0.012 * beatPulse(frame, 8);

  return (
    <AbsoluteFill style={{ background: COLOR.bg }}>
      <BlurDefs />
      <div style={{ position: "absolute", inset: 0, transform: `scale(${kick.toFixed(4)})`, transformOrigin: "50% 50%" }}>
      {showBeat1 && <Beat1 frame={frame} />}
      {showBeat2 && (
        <div style={{ position: "absolute", inset: 0, clipPath: p < 1 ? clip : undefined }}>
          <div style={{ position: "absolute", inset: 0, transform: `translateX(${((1 - p) * 140).toFixed(1)}px)` }}>
            <Beat2 frame={frame} />
          </div>
        </div>
      )}
      {/* leading edge of the wipe: a pink slab followed by a navy one */}
      {p > 0 && p < 1 && (
        <>
          <div style={{ position: "absolute", inset: 0, background: COLOR.bg, clipPath: `polygon(${(edge + 60).toFixed(1)}px 0, ${(edge + 200).toFixed(1)}px 0, ${(edge + 200 - SKEW).toFixed(1)}px 100%, ${(edge + 60 - SKEW).toFixed(1)}px 100%)` }} />
          <div style={{ position: "absolute", inset: 0, background: COLOR.highlight, clipPath: `polygon(${edge.toFixed(1)}px 0, ${(edge + 60).toFixed(1)}px 0, ${(edge + 60 - SKEW).toFixed(1)}px 100%, ${(edge - SKEW).toFixed(1)}px 100%)` }} />
        </>
      )}
      </div>
      <Grain frame={frame} />
    </AbsoluteFill>
  );
};
