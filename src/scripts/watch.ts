/**
 * "Watch" a rendered video the way a reviewer would, deterministically.
 *
 * Decodes every frame at low resolution, measures the change between consecutive
 * frames, and reports:
 *   - cuts (a large one-frame change) and motion bursts (sustained change),
 *   - holds (nothing changes for longer than --hold seconds),
 *   - periodic motion (the same change repeating at a fixed interval: a pulse or heartbeat),
 *   - near-blank frames.
 * Then it extracts full-resolution frames only where something happens (before, at and
 * after every event, plus one per hold) and writes a contact sheet of them with timestamps.
 *
 * Usage: npm run watch -- <video.mp4> [--hold 3] [--out <dir>] [--max <n>]
 *        npm run watch -- <video.mp4> --clean      delete the analysis folder after the review
 * Output: <dir>/report.txt, <dir>/sheet.jpg, <dir>/key/<time>.png (full resolution)
 * Per shot (between cuts) the report gives its length, how much of it moves, and its longest still stretch.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import sharp from "sharp";

const W = 96;
const H = 54;

function arg(name: string, def?: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : def;
}

function ffmpeg(args: string[]) {
  const r = spawnSync("npx", ["remotion", "ffmpeg", "-v", "error", "-y", ...args], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`);
}

function probe(file: string): { fps: number; duration: number } {
  const r = spawnSync("npx", ["remotion", "ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate:format=duration", "-of", "json", file], { encoding: "utf8" });
  const j = JSON.parse(r.stdout);
  const [a, b] = String(j.streams[0].r_frame_rate).split("/").map(Number);
  return { fps: a / (b || 1), duration: Number(j.format.duration) };
}

const fmt = (sec: number) => `${Math.floor(sec / 60)}:${(sec % 60).toFixed(2).padStart(5, "0")}`;

async function main() {
  const video = process.argv[2];
  if (!video || !fs.existsSync(video)) {
    console.error("Usage: npm run watch -- <video.mp4> [--hold 3] [--out <dir>]");
    process.exit(1);
  }
  const holdSec = Number(arg("--hold", "3"));
  const out = path.resolve(arg("--out", video.replace(/\.[^.]+$/, "") + ".watch")!);
  if (process.argv.includes("--clean")) {
    fs.rmSync(out, { recursive: true, force: true });
    console.log(`removed ${out}`);
    return;
  }
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(path.join(out, "low"), { recursive: true });
  fs.mkdirSync(path.join(out, "key"), { recursive: true });

  const { fps, duration } = probe(video);
  ffmpeg(["-i", video, "-s", `${W}x${H}`, path.join(out, "low", "%06d.png")]);
  const lows = fs.readdirSync(path.join(out, "low")).filter((f) => f.endsWith(".png")).sort();
  const frames: Buffer[] = [];
  for (const f of lows) frames.push(await sharp(path.join(out, "low", f)).greyscale().raw().toBuffer());

  // Change between consecutive frames: mean absolute difference, 0..255.
  const diff = frames.map((buf, i) => {
    if (i === 0) return 0;
    const prev = frames[i - 1];
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

  const CUT = 18;
  const MOVE = 0.6;
  const lines: string[] = [`${path.basename(video)}: ${frames.length} frames, ${fps} fps, ${duration.toFixed(2)} s`];

  // Events: cuts and motion bursts.
  type Ev = { kind: string; from: number; to: number; peak: number };
  const events: Ev[] = [];
  for (let i = 1; i < diff.length; i++) if (diff[i] >= CUT) events.push({ kind: "cut", from: i, to: i, peak: i });
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
  events.sort((a, b) => a.from - b.from);

  // Holds: long runs without visible change.
  const holds: Array<[number, number]> = [];
  let start = 0;
  for (let k = 1; k <= diff.length; k++) {
    const still = k < diff.length && diff[k] < MOVE / 2;
    if (!still) {
      if ((k - start) / fps >= holdSec) holds.push([start, k - 1]);
      start = k;
    }
  }

  // Periodic motion: autocorrelation of the change signal over sliding 4 s windows.
  const periodic: Array<{ at: number; lag: number; r: number }> = [];
  const win = Math.round(4 * fps);
  for (let s = 1; s + win < diff.length; s += Math.round(fps)) {
    const seg = diff.slice(s, s + win);
    const mean = seg.reduce((a, b) => a + b, 0) / seg.length;
    const dev = seg.map((v) => v - mean);
    const denom = dev.reduce((a, b) => a + b * b, 0);
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
  for (let a = 0; a + 3 < onsets.length; ) {
    const gap = onsets[a + 1] - onsets[a];
    let b = a + 1;
    while (b + 1 < onsets.length && Math.abs(onsets[b + 1] - onsets[b] - gap) <= 2) b++;
    if (b - a >= 3 && gap >= fps * 0.25 && gap <= fps * 1.5) {
      periodic.push({ at: onsets[a], lag: gap, r: 1 });
      periodic.push({ at: onsets[b] - win, lag: gap, r: 1 });
      a = b;
    } else a++;
  }
  periodic.sort((x, y) => x.at - y.at);

  // Shots: stretches between cuts, with how much of each moves.
  const cutFrames = events.filter((e) => e.kind === "cut").map((e) => e.from);
  const bounds = [0, ...cutFrames, diff.length];
  lines.push("", "Shots:");
  for (let s = 0; s + 1 < bounds.length; s++) {
    const a = bounds[s];
    const b = bounds[s + 1];
    if (b - a < 2) continue;
    const moving = diff.slice(a + 1, b).filter((d) => d >= MOVE / 2).length;
    let still = 0;
    let run = 0;
    for (let k = a + 1; k < b; k++) {
      run = diff[k] < MOVE / 2 ? run + 1 : 0;
      still = Math.max(still, run);
    }
    lines.push(`  ${fmt(a / fps)} to ${fmt(b / fps)}  ${((b - a) / fps).toFixed(1)} s, moving ${Math.round((100 * moving) / Math.max(1, b - a - 1))}%, longest still ${(still / fps).toFixed(1)} s`);
  }

  lines.push("", "Events:");
  for (const e of events) lines.push(`  ${fmt(e.from / fps)}  ${e.kind}${e.kind === "motion" ? ` until ${fmt(e.to / fps)}` : ""}  (change ${diff[e.peak].toFixed(1)})`);
  lines.push("", `Holds over ${holdSec}s:`);
  for (const [a, b] of holds) lines.push(`  ${fmt(a / fps)} to ${fmt(b / fps)}  (${((b - a + 1) / fps).toFixed(1)} s)`);
  lines.push("", "Periodic motion (possible pulse):");
  if (periodic.length === 0) lines.push("  none");
  else {
    let groupStart = periodic[0];
    for (let k = 1; k <= periodic.length; k++) {
      const cur = periodic[k];
      const prev = periodic[k - 1];
      if (!cur || cur.at - prev.at > Math.round(fps) * 1.5 || Math.abs(cur.lag - prev.lag) > 3) {
        lines.push(`  ${fmt(groupStart.at / fps)} to ${fmt((prev.at + win) / fps)}: repeats every ${(prev.lag / fps).toFixed(2)} s (r ${prev.r.toFixed(2)})`);
        if (cur) groupStart = cur;
      }
    }
  }
  const blanks = stdev.map((s, k) => (s < 3 ? k : -1)).filter((k) => k >= 0);
  lines.push("", `Near-blank frames: ${blanks.length}${blanks.length ? ` (first at ${fmt(blanks[0] / fps)})` : ""}`);

  // Key frames: around every event, one per hold, first and last.
  // Key frames: just before, the peak and the settled frame of each event (events within 0.3 s merged),
  // one per hold, first and last. --max caps the count if ever needed.
  const maxKeys = Number(arg("--max", "100000"));
  const merged: Ev[] = [];
  for (const e of events) {
    const last = merged[merged.length - 1];
    if (last && e.from - last.to <= fps * 0.3) {
      if (diff[e.peak] > diff[last.peak]) last.peak = e.peak;
      last.to = Math.max(last.to, e.to);
    } else merged.push({ ...e });
  }
  const keys = new Set<number>([0, frames.length - 1]);
  for (const e of merged) for (const k of [Math.max(0, e.from - 2), e.peak, Math.min(frames.length - 1, e.to + 4)]) keys.add(k);
  for (const [a, b] of holds) keys.add(Math.round((a + b) / 2));
  let keyList = [...keys].sort((a, b) => a - b);
  if (keyList.length > maxKeys) {
    const step = keyList.length / maxKeys;
    keyList = Array.from({ length: maxKeys }, (_, n) => keyList[Math.floor(n * step)]);
  }
  for (const k of keyList) {
    const name = `${(k / fps).toFixed(2).padStart(7, "0")}.png`;
    ffmpeg(["-ss", (k / fps).toFixed(3), "-i", video, "-frames:v", "1", path.join(out, "key", name)]);
  }

  // Contact sheet of key frames with timestamps.
  const tiles = fs.readdirSync(path.join(out, "key")).filter((f) => f.endsWith(".png")).sort();
  const tw = 384;
  const th = 216;
  const cols = 5;
  const rows = Math.ceil(tiles.length / cols);
  const comps = await Promise.all(
    tiles.map(async (f, n) => {
      const img = await sharp(path.join(out, "key", f)).resize(tw, th, { fit: "contain", background: "#000" }).toBuffer();
      const label = Buffer.from(`<svg width="${tw}" height="28"><rect width="${tw}" height="28" fill="black" opacity="0.7"/><text x="8" y="20" font-family="Helvetica" font-size="18" fill="white">${f.replace(".png", "")} s</text></svg>`);
      return [
        { input: img, left: (n % cols) * tw, top: Math.floor(n / cols) * (th + 28) + 28 },
        { input: label, left: (n % cols) * tw, top: Math.floor(n / cols) * (th + 28) },
      ];
    }),
  );
  await sharp({ create: { width: cols * tw, height: rows * (th + 28), channels: 3, background: "#000" } })
    .composite(comps.flat())
    .jpeg({ quality: 85 })
    .toFile(path.join(out, "sheet.jpg"));

  fs.rmSync(path.join(out, "low"), { recursive: true, force: true });
  lines.push("", `Key frames: ${keyList.length} in ${path.join(out, "key")}`, `Sheet: ${path.join(out, "sheet.jpg")}`);
  fs.writeFileSync(path.join(out, "report.txt"), lines.join("\n") + "\n");
  console.log(lines.join("\n"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
