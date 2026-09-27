/**
 * Style frame direction E: the synthesis.
 * D's editing grammar (an interface card is the stage, hard snaps with motion blur, skewed panels,
 * giant type in depth), C's motion quality (one slow drifting camera, parallax by depth, confident
 * easing), A's screen usage (full-bleed, huge numerals, asymmetric), and real 3D turns: the map
 * card turns in as an object, the whole stage turns on its vertical axis to reveal beat 2 on its
 * back, and the price digits turn on their cells from 73 straight to 119.
 * Kicks: exactly two, on the two key reveals (11.9 at frame 126, $119 at frame 270). No pulse.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLOR } from "../../catalog/tokens";
import { Grain } from "../../catalog/Atmosphere";
import { Beat1, T_NOROUTE } from "./beat1";
import { Beat2, T_LOCK } from "./beat2";
import { TURN, punch, ramp } from "./motion";
import { BlurDefs } from "./ui";

export const STYLEFRAME_DURATION = 360;

const T_TURN = 168;
const TURN_DUR = 30;
const SKEW = 360;

export const StyleFrame: React.FC = () => {
  const frame = useCurrentFrame();

  // the stage turn: 0 -> 180 degrees around the vertical axis, with a dip in scale so the edges stay in frame
  const t = ramp(frame, T_TURN, T_TURN + TURN_DUR, 0, 1, TURN);
  const tPrev = ramp(frame - 1, T_TURN, T_TURN + TURN_DUR, 0, 1, TURN);
  const theta = 180 * t;
  const omega = 180 * (t - tPrev); // deg per frame
  const dip = 1 - 0.14 * Math.sin(Math.PI * t);
  const front = theta < 90;
  const faceRot = front ? theta : theta - 180;
  const blur = omega < 3 ? undefined : omega < 7 ? "url(#e-blur-x1)" : omega < 12 ? "url(#e-blur-x2)" : "url(#e-blur-x3)";

  // the two kicks
  const kick = punch(frame, T_NOROUTE, 0.028, 9) * punch(frame, T_LOCK, 0.028, 9);

  // a pink slab sweeps across at the middle of the turn (the wipe accent of the reference edits)
  const w = ramp(frame, T_TURN + 8, T_TURN + 22, 0, 1, TURN);
  const edge = -SKEW - 100 + w * (1920 + SKEW + 200);

  return (
    <AbsoluteFill style={{ background: COLOR.bg }}>
      <BlurDefs />
      <div style={{ position: "absolute", inset: 0, transform: `scale(${kick.toFixed(4)})`, transformOrigin: "50% 50%" }}>
        <div style={{ position: "absolute", inset: 0, perspective: 2600, perspectiveOrigin: "50% 50%" }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              transform: `scale(${dip.toFixed(4)}) rotateY(${faceRot.toFixed(3)}deg)`,
              transformOrigin: "50% 50%",
              filter: blur,
              overflow: "hidden",
              borderRadius: t > 0 && t < 1 ? 28 : 0,
              background: COLOR.bg,
            }}
          >
            {front ? <Beat1 frame={frame} /> : <Beat2 frame={frame} />}
          </div>
        </div>
        {w > 0 && w < 1 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: COLOR.highlight,
              clipPath: `polygon(${edge.toFixed(1)}px 0, ${(edge + 90).toFixed(1)}px 0, ${(edge + 90 - SKEW).toFixed(1)}px 100%, ${(edge - SKEW).toFixed(1)}px 100%)`,
            }}
          />
        )}
      </div>
      <Grain />
    </AbsoluteFill>
  );
};
