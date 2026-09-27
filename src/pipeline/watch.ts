/**
 * Watch analysis and the watch gate.
 *
 * `analyze` decodes every frame of a video at low resolution and measures the change between
 * consecutive frames; `detect` turns that signal into cuts, motion bursts, holds, periodic motion
 * and near-blank frames; `evaluate` checks the detections against the rules in
 * templates/pipeline-defaults.json `watch`. A render that breaks a rule fails: `npm run render`,
 * `npm run preview-scene` and `npm run watch` exit 1, and the `watch` publishing gate reads the
 * verdict file written next to final.mp4.
 *
 * A rule blocks only what is never intended: blank frames (a blink) and periodic pulses. Anything
 * that can be a creative choice (a long still moment for drama, pacing) is reported for review,
 * never blocked. (user, 27.09.2026) Unsourced numbers belong to the `claims` gate; one type
 * system and flat data layers are not measurable from pixels.
 */

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import sharp from "sharp";
import { DESIGN_FPS, END_PADDING_SEC, toFrame } from "../remotion/timing.js";
import { MOTION } from "../remotion/catalog/tokens.js";
import { publishPaths } from "./publish.js";
import { paths, type Timeline } from "./v2.js";

const W = 96;
const H = 54;

export interface WatchRules {
  /** A frame whose greyscale standard deviation is below this is near-blank. */
  blankStdev: number;
  /** Near-blank frames allowed outside the ignored ranges (dark padding). */
  maxBlankFrames: number;
  /** Periodic motion (pulse, heartbeat) is forbidden. */
  forbidPeriodic: boolean;
}

export function loadWatchRules(): WatchRules {
  const d = JSON.parse(fs.readFileSync(path.resolve("templates/pipeline-defaults.json"), "utf8"));
  const { blankStdev, maxBlankFrames, forbidPeriodic } = d.watch as WatchRules;
  return { blankStdev, maxBlankFrames, forbidPeriodic };
}

// ─── Analysis ───────────────────────────────────────────────────────

export function ffmpeg(args: string[]) {
  const r = spawnSync("npx", ["remotion", "ffmpeg", "-v", "error", "-y", ...args], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`);
}

function probe(file: string): { fps: number; duration: number } {
  const r = spawnSync("npx", ["remotion", "ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate:format=duration", "-of", "json", file], { encoding: "utf8" });
  const j = JSON.parse(r.stdout);
  const [a, b] = String(j.streams[0].r_frame_rate).split("/").map(Number);
  return { fps: a / (b || 1), duration: Number(j.format.duration) };
}

export interface Analysis {
  video: string;
  fps: number;
  duration: number;
  /**
   * Mean absolute greyscale difference to the frame 1/DESIGN_FPS s earlier, 0..255 (0 at the
   * start), so thresholds mean the same at any output fps.
   */
  diff: number[];
  /** Greyscale standard deviation of each frame. */
  stdev: number[];
}

/** Decodes the video at 96x54 into `workDir` (deleted afterwards) and measures every frame. */
export async function analyze(video: string, workDir: string): Promise<Analysis> {
  const low = path.join(workDir, "low");
  fs.rmSync(low, { recursive: true, force: true });
  fs.mkdirSync(low, { recursive: true });
  const { fps, duration } = probe(video);
  ffmpeg(["-i", video, "-s", `${W}x${H}`, path.join(low, "%06d.png")]);
  const files = fs.readdirSync(low).filter((f) => f.endsWith(".png")).sort();
  const frames: Buffer[] = [];
  for (const f of files) frames.push(await sharp(path.join(low, f)).greyscale().raw().toBuffer());
  fs.rmSync(low, { recursive: true, force: true });

  const step = Math.max(1, Math.round(fps / DESIGN_FPS));
  const diff = frames.map((buf, i) => {
    if (i < step) return 0;
    const prev = frames[i - step];
    let s = 0;
    for (let k = 0; k < buf.length; k++) s += Math.abs(buf[k] - prev[k]);
    return s / buf.length;
  });
  const stdev = frames.map((buf) => {
    let m = 0;
    for (const v of buf) m += v;
    m /= buf.length;
    let v2 = 0;
    for (const v of buf) v2 += (v - m) ** 2;
    return Math.sqrt(v2 / buf.length);
  });
  return { video, fps, duration, diff, stdev };
}

// ─── Detection ──────────────────────────────────────────────────────

/** A one-frame change at least this large is a cut. */
export const CUT = 18;
/** A change at least this large is motion; below half of it the frame is still. */
export const MOVE = 0.6;

export type Ev = { kind: "cut" | "motion"; from: number; to: number; peak: number };
export interface Detection {
  events: Ev[];
  /** [first, last] frame of every still run of at least `minHoldSec`. */
  holds: Array<[number, number]>;
  periodic: Array<{ at: number; lag: number; r: number }>;
  /** Frames below the blank threshold. */
  blanks: number[];
  /** Sliding window of the periodicity test, in frames. */
  win: number;
}

export function detect(a: Analysis, minHoldSec: number, blankStdev: number): Detection {
  const { diff, fps } = a;
  const events: Ev[] = [];
  // One cut shows in `step` consecutive differences (see analyze); count it once.
  const step = Math.max(1, Math.round(fps / DESIGN_FPS));
  for (let i = 1; i < diff.length; i++) if (diff[i] >= CUT && !(step > 1 && events.at(-1)?.from === i - 1)) events.push({ kind: "cut", from: i, to: i, peak: i });
  let i = 1;
  while (i < diff.length) {
    if (diff[i] >= MOVE && diff[i] < CUT) {
      let j = i;
      let peak = i;
      while (j + 1 < diff.length && diff[j + 1] >= MOVE && diff[j + 1] < CUT) {
        j++;
        if (diff[j] > diff[peak]) peak = j;
      }
      if (j - i >= 2) events.push({ kind: "motion", from: i, to: j, peak });
      i = j + 1;
    } else i++;
  }
  events.sort((x, y) => x.from - y.from);

  const holds: Array<[number, number]> = [];
  let start = 0;
  for (let k = 1; k <= diff.length; k++) {
    const still = k < diff.length && diff[k] < MOVE / 2;
    if (!still) {
      if ((k - start) / fps >= minHoldSec) holds.push([start, k - 1]);
      start = k;
    }
  }

  // Periodic motion: autocorrelation of the change signal over sliding 4 s windows.
  const periodic: Detection["periodic"] = [];
  const win = Math.round(4 * fps);
  for (let s = 1; s + win < diff.length; s += Math.round(fps)) {
    const seg = diff.slice(s, s + win);
    const mean = seg.reduce((x, y) => x + y, 0) / seg.length;
    const dev = seg.map((v) => v - mean);
    const denom = dev.reduce((x, y) => x + y * y, 0);
    if (denom < 1e-6 || mean < MOVE / 3) continue;
    let best = { lag: 0, r: 0 };
    for (let lag = Math.round(fps * 0.25); lag <= Math.round(fps * 1.5); lag++) {
      let num = 0;
      for (let k = 0; k + lag < dev.length; k++) num += dev[k] * dev[k + lag];
      const r = num / denom;
      if (r > best.r) best = { lag, r };
    }
    if (best.r > 0.5) periodic.push({ at: s, lag: best.lag, r: best.r });
  }
  // Also periodic if 4+ consecutive event onsets are evenly spaced (within 2 frames), 0.25 to 1.5 s apart.
  const onsets = events.map((e) => e.from);
  for (let x = 0; x + 3 < onsets.length; ) {
    const gap = onsets[x + 1] - onsets[x];
    let y = x + 1;
    while (y + 1 < onsets.length && Math.abs(onsets[y + 1] - onsets[y] - gap) <= 2) y++;
    if (y - x >= 3 && gap >= fps * 0.25 && gap <= fps * 1.5) {
      periodic.push({ at: onsets[x], lag: gap, r: 1 });
      periodic.push({ at: onsets[y] - win, lag: gap, r: 1 });
      x = y;
    } else x++;
  }
  periodic.sort((p, q) => p.at - q.at);

  const blanks = a.stdev.map((s, k) => (s < blankStdev ? k : -1)).filter((k) => k >= 0);
  return { events, holds, periodic, blanks, win };
}

/** Periodic detections merged into continuous stretches: [from, to] in frames with the repeat interval. */
export function periodicGroups(d: Detection, fps: number): Array<{ from: number; to: number; lag: number; r: number }> {
  const out: Array<{ from: number; to: number; lag: number; r: number }> = [];
  const p = d.periodic;
  if (p.length === 0) return out;
  let groupStart = p[0];
  for (let k = 1; k <= p.length; k++) {
    const cur = p[k];
    const prev = p[k - 1];
    if (!cur || cur.at - prev.at > Math.round(fps) * 1.5 || Math.abs(cur.lag - prev.lag) > 3) {
      out.push({ from: groupStart.at, to: prev.at + d.win, lag: prev.lag, r: prev.r });
      if (cur) groupStart = cur;
    }
  }
  return out;
}

// ─── Rules ──────────────────────────────────────────────────────────

/** Seconds ranges of the video that rules skip, e.g. the dark padding before the first and after the last scene. */
export type Range = [number, number];

export interface SceneSpan {
  id: string;
  from: number;
  to: number;
}

export interface Violation {
  rule: "blank" | "periodic";
  /** Scene the violation mostly falls in, when the caller knows the scenes. */
  scene?: string;
  /** Seconds in the analyzed video. */
  from: number;
  to: number;
  message: string;
}

export const fmt = (sec: number) => `${Math.floor(sec / 60)}:${(sec % 60).toFixed(2).padStart(5, "0")}`;

/**
 * Checks the detections against the rules. Blank frames inside `ignore` are allowed.
 */
export function evaluate(a: Analysis, d: Detection, rules: WatchRules, ignore: Range[]): Violation[] {
  const { fps } = a;
  const ignored = (k: number) => ignore.some(([s, e]) => k / fps >= s && k / fps < e);
  const out: Violation[] = [];

  const blanks = d.blanks.filter((k) => !ignored(k));
  if (blanks.length > rules.maxBlankFrames) {
    // Report contiguous runs.
    let runStart = blanks[0];
    for (let n = 1; n <= blanks.length; n++) {
      if (n === blanks.length || blanks[n] !== blanks[n - 1] + 1) {
        const runEnd = blanks[n - 1];
        out.push({ rule: "blank", from: runStart / fps, to: (runEnd + 1) / fps, message: `${runEnd - runStart + 1} near-blank frame(s)` });
        if (n < blanks.length) runStart = blanks[n];
      }
    }
  }

  if (rules.forbidPeriodic)
    for (const g of periodicGroups(d, fps))
      out.push({ rule: "periodic", from: g.from / fps, to: g.to / fps, message: `motion repeats every ${(g.lag / fps).toFixed(2)} s (pulse)` });

  return out.sort((x, y) => x.from - y.from);
}

/**
 * Frames of a full render that are empty by design, in seconds: the dark padding before the first
 * scene plus the first scene's entry delay (MOTION.sceneEnterDelay; later scenes are covered by the
 * outgoing one during it), and the dark padding after the last scene. Derived from the same
 * constants the renderer uses, so a change there moves these ranges with it.
 */
export function paddingRanges(duration: number, fps: number): Range[] {
  return [
    [0, (toFrame(0, fps) + (MOTION.sceneEnterDelay * fps) / DESIGN_FPS) / fps],
    [duration - END_PADDING_SEC, Infinity],
  ];
}

/** Scene spans of a layout-2 project in seconds of the analyzed video, shifted by `offsetSec` for a clip. */
export function sceneSpans(slug: string, fps: number, offsetSec = 0): SceneSpan[] {
  const t = JSON.parse(fs.readFileSync(paths(slug).timeline, "utf8")) as Timeline;
  return t.scenes.map((s) => ({ id: s.id, from: toFrame(s.startTime, fps) / fps - offsetSec, to: toFrame(s.endTime, fps) / fps - offsetSec }));
}

export function formatViolations(v: Violation[]): string[] {
  return v.map((x) => `  ${x.rule.padEnd(8)} ${fmt(x.from)} to ${fmt(x.to)}  ${x.scene ? `[${x.scene}] ` : ""}${x.message}`);
}

// ─── Verdict (publishing gate) ──────────────────────────────────────

export interface Verdict {
  video: string;
  passed: boolean;
  rules: WatchRules;
  violations: Violation[];
  checkedAt: string;
}

function sha(file: string): string {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

export function verdictPath(slug: string): string {
  return path.join(path.dirname(publishPaths(slug).video), "final.watch.json");
}

/** Records the watch result of final.mp4, bound to its bytes. */
export function writeVerdict(slug: string, rules: WatchRules, violations: Violation[]): void {
  const v: Verdict = { video: sha(publishPaths(slug).video), passed: violations.length === 0, rules, violations, checkedAt: new Date().toISOString() };
  fs.writeFileSync(verdictPath(slug), JSON.stringify(v, null, 2) + "\n");
}

/** Whether final.mp4 passed the watch rules as they are now. */
export function watchVerdict(slug: string): { passed: boolean; message: string } {
  const video = publishPaths(slug).video;
  const file = verdictPath(slug);
  if (!fs.existsSync(video)) return { passed: false, message: "production/output/final.mp4 missing" };
  if (!fs.existsSync(file)) return { passed: false, message: `final.mp4 has not been watched (npm run render -- ${slug})` };
  const v: Verdict = JSON.parse(fs.readFileSync(file, "utf8"));
  if (v.video !== sha(video)) return { passed: false, message: `final.mp4 changed after it was watched (npm run render -- ${slug})` };
  if (JSON.stringify(v.rules) !== JSON.stringify(loadWatchRules())) return { passed: false, message: `watch rules changed since the check (npm run watch -- ${video} --slug ${slug})` };
  if (!v.passed) return { passed: false, message: `${v.violations.length} violation(s): ${v.violations.slice(0, 3).map((x) => `${x.rule} at ${fmt(x.from)}${x.scene ? ` (${x.scene})` : ""}`).join(", ")}` };
  return { passed: true, message: `no violations (${v.checkedAt})` };
}

// ─── Full run: report, key frames, contact sheet ────────────────────

export interface WatchOptions {
  /** Analysis folder: report.txt, sheet.jpg, key/. */
  out: string;
  /** Still stretches listed in the report from this length on (information, not a rule). */
  reportHoldSec?: number;
  ignore?: Range[];
  /** The video is a full MainVideo render: skip its designed empty frames at both ends. */
  padding?: boolean;
  /** Scene spans in seconds of this video (given its fps), to name the scene of every violation. */
  scenes?: (fps: number) => SceneSpan[];
  maxKeys?: number;
}

/**
 * Watches a video the way a reviewer would: report of shots, events, holds, periodic motion and
 * blank frames, full-resolution frames where something happens, a contact sheet, and the rule
 * violations. Returns the report lines and the violations; the caller decides the exit code.
 */
export async function watchVideo(video: string, opts: WatchOptions): Promise<{ lines: string[]; violations: Violation[]; rules: WatchRules }> {
  const rules = loadWatchRules();
  const reportHold = opts.reportHoldSec ?? 3;
  const out = opts.out;
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(path.join(out, "key"), { recursive: true });

  const a = await analyze(video, out);
  // Padding from the decoded frame count: the container duration can run a frame or two longer.
  const length = a.diff.length / a.fps;
  const ignore = [...(opts.padding ? paddingRanges(length, a.fps) : []), ...(opts.ignore ?? [])].filter(([s, e]) => e > 0 && s < length).map(([s, e]): Range => [Math.max(0, s), e]);
  const d = detect(a, reportHold, rules.blankStdev);
  const { fps, diff } = a;
  const n = diff.length;
  const lines: string[] = [`${path.basename(video)}: ${n} frames, ${fps} fps, ${a.duration.toFixed(2)} s`];

  const cutFrames = d.events.filter((e) => e.kind === "cut").map((e) => e.from);
  const bounds = [0, ...cutFrames, n];
  lines.push("", "Shots:");
  for (let s = 0; s + 1 < bounds.length; s++) {
    const x = bounds[s];
    const y = bounds[s + 1];
    if (y - x < 2) continue;
    const moving = diff.slice(x + 1, y).filter((v) => v >= MOVE / 2).length;
    let still = 0;
    let run = 0;
    for (let k = x + 1; k < y; k++) {
      run = diff[k] < MOVE / 2 ? run + 1 : 0;
      still = Math.max(still, run);
    }
    lines.push(`  ${fmt(x / fps)} to ${fmt(y / fps)}  ${((y - x) / fps).toFixed(1)} s, moving ${Math.round((100 * moving) / Math.max(1, y - x - 1))}%, longest still ${(still / fps).toFixed(1)} s`);
  }
  lines.push("", "Events:");
  for (const e of d.events) lines.push(`  ${fmt(e.from / fps)}  ${e.kind}${e.kind === "motion" ? ` until ${fmt(e.to / fps)}` : ""}  (change ${diff[e.peak].toFixed(1)})`);
  lines.push("", `Holds over ${reportHold}s:`);
  for (const [x, y] of d.holds) if ((y - x + 1) / fps >= reportHold) lines.push(`  ${fmt(x / fps)} to ${fmt(y / fps)}  (${((y - x + 1) / fps).toFixed(1)} s)`);
  lines.push("", "Periodic motion (possible pulse):");
  const groups = periodicGroups(d, fps);
  if (groups.length === 0) lines.push("  none");
  for (const g of groups) lines.push(`  ${fmt(g.from / fps)} to ${fmt(g.to / fps)}: repeats every ${(g.lag / fps).toFixed(2)} s (r ${g.r.toFixed(2)})`);
  lines.push("", `Near-blank frames: ${d.blanks.length}${d.blanks.length ? ` (first at ${fmt(d.blanks[0] / fps)})` : ""}`);

  // Key frames: just before, the peak and the settled frame of each event (events within 0.3 s merged),
  // one per hold, one per violation, first and last.
  const merged: Ev[] = [];
  for (const e of d.events) {
    const last = merged[merged.length - 1];
    if (last && e.from - last.to <= fps * 0.3) {
      if (diff[e.peak] > diff[last.peak]) last.peak = e.peak;
      last.to = Math.max(last.to, e.to);
    } else merged.push({ ...e });
  }
  const violations = evaluate(a, d, rules, ignore);
  for (const v of violations) {
    const overlap = (s: SceneSpan) => Math.min(s.to, v.to) - Math.max(s.from, v.from);
    const best = (opts.scenes?.(a.fps) ?? []).filter((s) => overlap(s) > 0).sort((x, y) => overlap(y) - overlap(x))[0];
    if (best) v.scene = best.id;
  }
  const keys = new Set<number>([0, n - 1]);
  for (const e of merged) for (const k of [Math.max(0, e.from - 2), e.peak, Math.min(n - 1, e.to + 4)]) keys.add(k);
  for (const [x, y] of d.holds) keys.add(Math.round((x + y) / 2));
  for (const v of violations) keys.add(Math.min(n - 1, Math.round(v.from * fps)));
  let keyList = [...keys].sort((x, y) => x - y);
  const maxKeys = opts.maxKeys ?? Infinity;
  if (keyList.length > maxKeys) {
    const step = keyList.length / maxKeys;
    keyList = Array.from({ length: maxKeys }, (_, m) => keyList[Math.floor(m * step)]);
  }
  for (const k of keyList) ffmpeg(["-ss", (k / fps).toFixed(3), "-i", video, "-frames:v", "1", path.join(out, "key", `${(k / fps).toFixed(2).padStart(7, "0")}.png`)]);

  const tiles = fs.readdirSync(path.join(out, "key")).filter((f) => f.endsWith(".png")).sort();
  const tw = 384;
  const th = 216;
  const cols = 5;
  const rows = Math.ceil(tiles.length / cols);
  const comps = await Promise.all(
    tiles.map(async (f, m) => {
      const img = await sharp(path.join(out, "key", f)).resize(tw, th, { fit: "contain", background: "#000" }).toBuffer();
      const label = Buffer.from(`<svg width="${tw}" height="28"><rect width="${tw}" height="28" fill="black" opacity="0.7"/><text x="8" y="20" font-family="Helvetica" font-size="18" fill="white">${f.replace(".png", "")} s</text></svg>`);
      return [
        { input: img, left: (m % cols) * tw, top: Math.floor(m / cols) * (th + 28) + 28 },
        { input: label, left: (m % cols) * tw, top: Math.floor(m / cols) * (th + 28) },
      ];
    }),
  );
  await sharp({ create: { width: cols * tw, height: rows * (th + 28), channels: 3, background: "#000" } })
    .composite(comps.flat())
    .jpeg({ quality: 85 })
    .toFile(path.join(out, "sheet.jpg"));

  lines.push("", `Key frames: ${keyList.length} in ${path.join(out, "key")}`, `Sheet: ${path.join(out, "sheet.jpg")}`);
  const r = rules;
  lines.push("", `Rules (templates/pipeline-defaults.json watch): blank frames max ${r.maxBlankFrames}, periodic ${r.forbidPeriodic ? "forbidden" : "allowed"}${ignore.length ? `; ignored: ${ignore.map(([s, e]) => `${fmt(s)} to ${Number.isFinite(e) ? fmt(e) : "end"}`).join(", ")}` : ""}`);
  lines.push(violations.length ? `FAIL: ${violations.length} violation(s)` : "PASS: no violations");
  lines.push(...formatViolations(violations));
  fs.writeFileSync(path.join(out, "report.txt"), lines.join("\n") + "\n");
  // Registered for .ai/hooks/clean-watch.mjs, which deletes analysis folders after an hour.
  fs.mkdirSync(path.resolve(".cache"), { recursive: true });
  fs.appendFileSync(path.resolve(".cache", "watch-dirs.txt"), `${path.resolve(out)}\n`);
  return { lines, violations, rules };
}

/** Default analysis folder of a video: next to it, `<name>.watch`. */
export function watchDir(video: string): string {
  return video.replace(/\.[^.]+$/, "") + ".watch";
}
