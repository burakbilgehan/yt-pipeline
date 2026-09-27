/**
 * Renderer for layout-2 videos with "renderer": "catalog".
 *
 * Input is production/render-input.json (built by `npm run assemble`): scenes carry
 * content-timeline seconds; frames come from ../timing toFrame, the same mapping the
 * scripts use. Transitions never add time: audio and scene boundaries stay where the
 * timeline puts them.
 *
 * Transitions (derived from order.json sections, never chosen per scene):
 *  - inside a section the outgoing scene slides out to the left, fading fast, and the incoming
 *    one snaps in from the right with overshoot and motion blur MOTION.sceneEnterDelay frames
 *    later, so the two are never legible together; the header and grain hold the frame;
 *  - at a section boundary the whole stage turns 180 degrees on its vertical axis, a pink
 *    slab sweeps across mid-turn, and the back of the stage carries the new section. The
 *    turn is timed so the stage is edge-on exactly on the new scene's first frame.
 * Kick: a short scale punch of the frame at a scene's "kick" cue, only if the storyboard sets one.
 */
import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadRedHatDisplay } from "@remotion/google-fonts/RedHatDisplay";
import { BackgroundMusicLayer } from "../components";
import type { BackgroundMusicConfig } from "../components";
import { toFrame } from "../timing";
import { Stage, type StageSlot } from "./Stage";
import { COLOR, DUR, EASE, LAYOUT, MOTION } from "./tokens";
import { Grain } from "./Atmosphere";
import { KICK_CUE, type SceneType } from "./schema";
import { blurFor, overshoot, punch, ramp, turnBlurFor } from "./motion";
import { BlurDefs, type ChipTone } from "./ui";
import { Statement } from "./scenes/Statement";
import { BigNumber } from "./scenes/BigNumber";
import { Bars } from "./scenes/Bars";
import { Duel } from "./scenes/Duel";
import { MapFocus } from "./scenes/MapFocus";

loadInter("normal", { weights: ["400", "500", "700"], subsets: ["latin"] });
loadRedHatDisplay("normal", { weights: ["800"], subsets: ["latin"] });

export interface CatalogRenderScene {
  id: string;
  section: string;
  startTime: number;
  endTime: number;
  type: SceneType;
  title: string;
  kicker?: string;
  source?: string;
  status?: { text: string; tone: ChipTone };
  chapter?: { index: number; total: number };
  props: any;
  /** Cue name -> frame offset from the scene start. */
  cues: Record<string, number>;
}

export interface CatalogVideoProps {
  renderer: "catalog";
  title: string;
  scenes: CatalogRenderScene[];
  audioSegments: Array<{ src: string; startTime: number }>;
  backgroundMusic?: BackgroundMusicConfig;
}

function SceneBody({ scene }: { scene: CatalogRenderScene }) {
  const cues = scene.cues ?? {};
  switch (scene.type) {
    case "statement":
      return <Statement {...scene.props} emphasisAt={cues.emphasis} />;
    case "big-number":
      return <BigNumber {...scene.props} referenceAt={cues.reference} remainderAt={cues.remainder} />;
    case "compare-values":
      return Duel.applies(scene.props) ? (
        <Duel {...scene.props} secondAt={cues.second} annotationAt={cues.annotation} />
      ) : (
        <Bars {...scene.props} annotationAt={cues.annotation} />
      );
    case "ranked-bars":
      return <Bars {...scene.props} ranked annotationAt={cues.annotation} />;
    case "map-focus":
      return <MapFocus {...scene.props} zoomAt={cues.zoom} />;
    default:
      // Rejected by the schema in assemble; drawn loudly if it ever gets here.
      return <div style={{ position: "absolute", inset: 0, background: "#ff00ff" }} />;
  }
}

/** Frames before a turn's boundary at which it starts, so the stage is edge-on on the boundary frame. */
const TURN_LEAD = (() => {
  for (let k = 1; k <= DUR.turn; k++) if (EASE.turn(k / DUR.turn) >= 0.5) return k;
  return Math.ceil(DUR.turn / 2);
})();

/**
 * Scene motion inside a section. enter: snap in from the right (none when the stage turns into
 * the scene). exitAt: slide out to the left, fading over the last two thirds.
 */
const SceneMotion: React.FC<{ enter: boolean; exitAt?: number; children: React.ReactNode }> = ({ enter, exitAt, children }) => {
  const frame = useCurrentFrame();
  const at = enter ? MOTION.sceneEnterDelay : 0;
  const pos = (f: number) => {
    let x = enter ? MOTION.sceneIn * (1 - overshoot((f - at) / DUR.snap)) : 0;
    let o = enter && f < at ? 0 : 1;
    if (exitAt !== undefined && f >= exitAt) {
      const u = Math.min(1, (f - exitAt) / DUR.snapOut);
      x -= MOTION.sceneOut * u * u * (3 - 2 * u);
      o = Math.max(0, 1 - u / MOTION.sceneOutFade);
    }
    return { x, o };
  };
  const p = pos(frame);
  const q = pos(frame - 1);
  const filter = frame === at && enter ? blurFor(-MOTION.sceneIn, 0) : blurFor(p.x - q.x, 0);
  return <AbsoluteFill style={{ opacity: p.o, transform: `translateX(${p.x.toFixed(1)}px)`, filter }}>{children}</AbsoluteFill>;
};

/** The whole face turning at section boundaries, with the mid-turn slab. Same element tree on every frame. */
const Turning: React.FC<{ boundaries: number[]; children: React.ReactNode }> = ({ boundaries, children }) => {
  const frame = useCurrentFrame();
  const b = boundaries.find((x) => frame >= x - TURN_LEAD && frame < x - TURN_LEAD + DUR.turn);
  let face: React.CSSProperties = {};
  let w = 0;
  if (b !== undefined) {
    const start = b - TURN_LEAD;
    const t = ramp(frame, start, start + DUR.turn, 0, 1, EASE.turn);
    const tPrev = ramp(frame - 1, start, start + DUR.turn, 0, 1, EASE.turn);
    const theta = 180 * t;
    const faceRot = frame < b ? theta : theta - 180;
    const dip = 1 - MOTION.turnDip * Math.sin(Math.PI * t);
    face = {
      transform: `scale(${dip.toFixed(4)}) rotateY(${faceRot.toFixed(3)}deg)`,
      filter: turnBlurFor(180 * (t - tPrev)),
      borderRadius: MOTION.turnRadius,
    };
    w = ramp(frame, start + DUR.turn * MOTION.wipe.from, start + DUR.turn * MOTION.wipe.to, 0, 1, EASE.turn);
  }
  const { skew, width } = MOTION.wipe;
  const edge = -skew - 100 + w * (LAYOUT.width + skew + 200);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ perspective: MOTION.turnPerspective, perspectiveOrigin: "50% 50%" }}>
        <AbsoluteFill style={{ overflow: "hidden", background: COLOR.bg, ...face }}>{children}</AbsoluteFill>
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background: COLOR.highlight,
          display: w > 0 && w < 1 ? undefined : "none",
          clipPath: `polygon(${edge.toFixed(1)}px 0, ${(edge + width).toFixed(1)}px 0, ${(edge + width - skew).toFixed(1)}px 100%, ${(edge - skew).toFixed(1)}px 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};

/** Scale punch of the frame at each kick. */
const Kick: React.FC<{ kicks: number[]; children: React.ReactNode }> = ({ kicks, children }) => {
  const frame = useCurrentFrame();
  const k = kicks.reduce((acc, at) => acc * punch(frame, at), 1);
  return <AbsoluteFill style={{ transform: `scale(${k.toFixed(4)})` }}>{children}</AbsoluteFill>;
};

export const CatalogVideo: React.FC<CatalogVideoProps> = ({ scenes, audioSegments, backgroundMusic }) => {
  const { fps } = useVideoConfig();
  const placed = scenes.map((s, i) => {
    const from = toFrame(s.startTime, fps);
    const turn = i > 0 && scenes[i - 1].section !== s.section;
    return { s, from, duration: toFrame(s.endTime, fps) - from, turn };
  });
  const slots: StageSlot[] = placed.map(({ s, from, turn }) => ({ from, turn, kicker: s.kicker, title: s.title, source: s.source, status: s.status }));
  const boundaries = placed.filter((p) => p.turn).map((p) => p.from);
  const kicks = placed.map((p) => (p.s.cues?.[KICK_CUE] !== undefined ? p.from + p.s.cues[KICK_CUE] : undefined)).filter((k): k is number => k !== undefined);

  const sequences = placed.map(({ s, from, duration }, i) => {
    const next = placed[i + 1];
    // The outgoing scene keeps rendering while it slides out, unless the stage turns away from it.
    const slidesOut = !!next && !next.turn;
    return (
      <Sequence key={s.id} from={from} durationInFrames={duration + (slidesOut ? DUR.snapOut : 0)} name={`${s.type}: ${s.id}`}>
        <SceneMotion enter={!placed[i].turn} exitAt={slidesOut ? duration : undefined}>
          <SceneBody scene={s} />
        </SceneMotion>
      </Sequence>
    );
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.bg }}>
      <BlurDefs />
      <Kick kicks={kicks}>
        <Turning boundaries={boundaries}>
          <Stage slots={slots} />
          {sequences}
        </Turning>
      </Kick>
      {audioSegments.map((seg, i) => (
        <Sequence key={`audio-${i}`} from={toFrame(seg.startTime, fps)} name={`Audio ${i + 1}`}>
          <Audio src={staticFile(seg.src)} />
        </Sequence>
      ))}
      {backgroundMusic && <BackgroundMusicLayer config={backgroundMusic} />}
      <Grain />
    </AbsoluteFill>
  );
};
