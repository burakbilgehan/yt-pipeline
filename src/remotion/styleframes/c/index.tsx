/**
 * Style frame direction C: cinematic depth.
 * One continuous world seen through one camera. Beat 1 (0-180): the Hormuz flow as 209 lanes on
 * a floor, 90 of which bend into the pipeline bypass while 119 pass the gate between two slabs of
 * land. The camera then rises through the gate (165-215) and settles frontal on beat 2 (215-360):
 * Brent crude as an upright wall standing on the same floor, $0 at the floor, $73 to a $119 peak.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame, Easing } from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadManrope } from "@remotion/google-fonts/Manrope";
import { loadFont as loadInstrumentSerif } from "@remotion/google-fonts/InstrumentSerif";
import { COLOR, FONT } from "../../catalog/tokens";
import { H, SCENE, W, cameraAt, horizonY, project, ramp } from "./camera";
import { BLUE_RGB, BYPASS, Flow, FloorGrid, Gate, LANES, PINK_RGB, bypassDx, laneX } from "./flow";
import { PEAK_DAY, PRICE_BEFORE, PRICE_PEAK, PriceWall, dayX, priceY } from "./price";
import { Billboard, Grain, Reveal } from "./ui";

loadInter("normal", { weights: ["400", "500"], subsets: ["latin"] });
loadManrope("normal", { weights: ["500", "700"], subsets: ["latin"] });
const serif = loadInstrumentSerif("italic", { weights: ["400"], subsets: ["latin"] });

export const STYLEFRAME_DURATION = 360;

const num = (size: number, color: string, weight = 700): React.CSSProperties => ({
  fontFamily: FONT.heading,
  fontWeight: weight,
  fontSize: size,
  lineHeight: 1,
  letterSpacing: "-0.035em",
  color,
  fontVariantNumeric: "tabular-nums",
});
const body = (size: number, color: string, weight = 400): React.CSSProperties => ({
  fontFamily: FONT.body,
  fontWeight: weight,
  fontSize: size,
  lineHeight: 1.3,
  letterSpacing: "-0.005em",
  color,
});
const phrase = (size: number, color: string): React.CSSProperties => ({
  fontFamily: serif.fontFamily,
  fontStyle: "italic",
  fontWeight: 400,
  fontSize: size,
  lineHeight: 1.1,
  color,
});

export const StyleFrame: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = cameraAt(frame);
  const hz = horizonY(cam);

  // Beat 1 state
  const split = ramp(frame, 52, 108, 0, 1);
  const tint = ramp(frame, 46, 84, 0, 1);
  const gate = ramp(frame, 88, 120, 0, 1) * ramp(frame, 178, 198, 1, 0);
  const threshold = ramp(frame, 112, 134, 0, 1);
  const flowOpacity = ramp(frame, 200, 250, 1, 0.32);
  const gridOpacity = ramp(frame, 0, 40, 0.5, 1) * ramp(frame, 200, 250, 1, 0.6);
  const headlineDim = ramp(frame, 122, 142, 1, 0.55);

  // Beat 2 state
  const wallOpacity = ramp(frame, 186, 206, 0, 1);
  // The pre-blockade line is already standing when the camera arrives; the rise draws after it settles.
  const FLAT = 34 / 55;
  const progress = frame < 218 ? ramp(frame, 186, 214, 0, FLAT, Easing.out(Easing.cubic)) : ramp(frame, 218, 300, FLAT, 1, Easing.inOut(Easing.cubic));
  const refs = ramp(frame, 204, 228, 0, 1);
  const peakRef = ramp(frame, 298, 316, 0, 1);

  // Anchors for typography placed in the world.
  const pinkCenterX = (laneX(BYPASS) + laneX(LANES - 1)) / 2;
  const bypassCenterX = (laneX(0) + laneX(BYPASS - 1)) / 2 + bypassDx(SCENE.gateZ, 1);
  const gateLight = project(cam, [pinkCenterX, 0.3, SCENE.gateZ]);
  const peakLight = project(cam, [dayX(PEAK_DAY), priceY(PRICE_PEAK), SCENE.wallZ]);

  const inBeat1 = frame < 232;
  const inBeat2 = frame > 186;

  return (
    <AbsoluteFill style={{ background: COLOR.bg, overflow: "hidden" }}>
      {/* Atmosphere: a faint band of light along the horizon, a low pink glow at the gate, later at the peak. */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${COLOR.bg} 0%, ${COLOR.surface} ${Math.max(0, (hz / H) * 100 - 4)}%, ${COLOR.bg} ${Math.min(100, (hz / H) * 100 + 34)}%)`,
        }}
      />
      {peakLight && inBeat2 ? (
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse 26% 30% at ${peakLight.x}px ${peakLight.y}px, rgba(${PINK_RGB},${0.1 * peakRef}) 0%, rgba(${PINK_RGB},0) 100%)`,
          }}
        />
      ) : null}

      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="c-fog" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={COLOR.bg} stopOpacity={0} />
            <stop offset="0.3" stopColor={COLOR.bg} stopOpacity={1} />
            <stop offset="1" stopColor={COLOR.bg} stopOpacity={0} />
          </linearGradient>
        </defs>
        <FloorGrid cam={cam} opacity={gridOpacity} />
        <Flow cam={cam} frame={frame} split={split} tint={tint} opacity={flowOpacity} />
        {/* Depth fog over the floor, hung from the horizon. */}
        <rect x={0} y={hz - 220} width={W} height={ramp(frame, 165, 215, 720, 640)} fill="url(#c-fog)" />
        {inBeat1 ? <Gate cam={cam} strength={gate} threshold={threshold} /> : null}
        {inBeat2 ? <PriceWall cam={cam} progress={progress} opacity={wallOpacity} refs={refs} peakRef={peakRef} /> : null}
      </svg>

      {gateLight && inBeat1 ? (
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse 30% 22% at ${gateLight.x}px ${gateLight.y}px, rgba(${PINK_RGB},${0.12 * gate}) 0%, rgba(${PINK_RGB},0) 100%)`,
          }}
        />
      ) : null}
      {/* Beat 1 typography */}
      {inBeat1 ? (
        <>
          <Billboard cam={cam} anchor={[-13.5, 9.7, 20]} refDepth={30} maxScale={1.15} align="left">
            <Reveal frame={frame} at={10} out={166}>
              <div style={{ opacity: headlineDim }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 24 }}>
                  <span style={num(176, COLOR.textPrimary)}>20.9</span>
                  <span style={body(34, COLOR.textSecondary, 500)}>million barrels a day</span>
                </div>
                <div style={{ ...body(34, COLOR.textTertiary), marginTop: 2 }}>pass through the Strait of Hormuz</div>
              </div>
            </Reveal>
          </Billboard>

          <Billboard cam={cam} anchor={[bypassCenterX, SCENE.slabHeight + 0.35, SCENE.gateZ]} refDepth={20} maxScale={1.1} align="center">
            <Reveal frame={frame} at={100} out={168}>
              <div style={{ textAlign: "center", transform: "translateY(-100%)" }}>
                <div style={num(84, `rgb(${BLUE_RGB})`, 500)}>9.0</div>
                <div style={{ ...body(28, COLOR.textSecondary), marginTop: 2 }}>can be rerouted by pipeline</div>
              </div>
            </Reveal>
          </Billboard>

          <Billboard cam={cam} anchor={[pinkCenterX, SCENE.slabHeight + 0.9, SCENE.gateZ]} refDepth={20} maxScale={1.1} align="center">
            <Reveal frame={frame} at={124} out={172}>
              <div style={{ textAlign: "center", transform: "translateY(-100%)" }}>
                <div style={num(168, `rgb(${PINK_RGB})`)}>11.9</div>
                <div style={{ ...phrase(56, COLOR.textPrimary), marginTop: 6 }}>have no other route</div>
              </div>
            </Reveal>
          </Billboard>
        </>
      ) : null}

      {/* Beat 2 typography */}
      {inBeat2 ? (
        <>
          <Billboard cam={cam} anchor={[dayX(0) - 0.35, priceY(PRICE_BEFORE) - 0.12, SCENE.wallZ]} refDepth={20} align="right">
            <Reveal frame={frame} at={212}>
              <div style={{ textAlign: "right" }}>
                <div style={num(84, COLOR.textPrimary, 500)}>$73</div>
                <div style={{ ...body(27, COLOR.textTertiary), marginTop: 2 }}>Brent, a barrel</div>
                <div style={body(27, COLOR.textTertiary)}>before the blockade</div>
              </div>
            </Reveal>
          </Billboard>
          <Billboard cam={cam} anchor={[dayX(PEAK_DAY) + 0.4, priceY(PRICE_PEAK), SCENE.wallZ]} refDepth={20} align="left">
            <Reveal frame={frame} at={298}>
              <div style={{ transform: "translateY(-50%)" }}>
                <div style={num(84, `rgb(${PINK_RGB})`, 500)}>$119</div>
                <div style={{ ...body(27, COLOR.textTertiary), marginTop: 2 }}>peak, day 21 of the blockade</div>
              </div>
            </Reveal>
          </Billboard>
          <Billboard cam={cam} anchor={[-9.4, 11.7, 30]} refDepth={16} align="left">
            <Reveal frame={frame} at={310}>
              <div>
                <div style={num(224, COLOR.textPrimary)}>+63%</div>
                <div style={{ ...phrase(52, COLOR.textSecondary), marginTop: 4, marginLeft: 8 }}>in three weeks</div>
              </div>
            </Reveal>
          </Billboard>
          <Billboard cam={cam} anchor={[dayX(0), 0.78, SCENE.wallZ]} refDepth={20} align="center">
            <Reveal frame={frame} at={228}>
              <div style={{ ...body(25, COLOR.textTertiary), textAlign: "center" }}>blockade begins</div>
            </Reveal>
          </Billboard>
        </>
      ) : null}

      {/* Vignette and grain */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 78% 78% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.28) 100%)" }} />
      <Grain frame={frame} />
    </AbsoluteFill>
  );
};
