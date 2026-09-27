/**
 * Publishing gates of a layout-2 project. `npm run preflight` prints them and `npm run upload`
 * refuses to start unless all pass. Add a gate by appending to PUBLISH_GATES; nothing else changes.
 */

import fs from "node:fs";
import path from "node:path";
import { assemble } from "../scripts/assemble.js";
import { runClaimsCheck } from "./claims.js";
import { buildMetadata, publishPaths, renderIsCurrent } from "./publish.js";
import { loadGlobal, paths } from "./v2.js";
import { watchVerdict } from "./watch.js";

export interface GateResult {
  passed: boolean;
  message: string;
}
export interface Gate {
  name: string;
  check: (slug: string) => GateResult;
}

/** YouTube custom thumbnail limit. */
const THUMBNAIL_MAX_BYTES = 2 * 1024 * 1024;

export const PUBLISH_GATES: Gate[] = [
  {
    name: "audio + timeline",
    check: (slug) => {
      const { stale, timeline } = assemble(slug);
      if (stale.length) return { passed: false, message: `audio out of date: ${stale.join(", ")} (npm run tts -- ${slug})` };
      return { passed: true, message: `${timeline.scenes.length} scenes, ${timeline.totalDuration.toFixed(1)}s` };
    },
  },
  {
    name: "render",
    check: (slug) => {
      const r = renderIsCurrent(slug);
      return { passed: r.ok, message: r.why };
    },
  },
  {
    name: "watch",
    check: (slug) => watchVerdict(slug),
  },
  {
    name: "claims",
    check: (slug) => {
      const lines: string[] = [];
      const passed = runClaimsCheck(slug, true, (s) => lines.push(s));
      return { passed, message: passed ? lines.at(-1)! : `${lines.filter((l) => l.startsWith("ERROR")).slice(0, 3).join("; ")} (npm run claims -- ${slug} --strict)` };
    },
  },
  {
    name: "metadata",
    check: (slug) => {
      const built = buildMetadata(slug);
      if (built.errors.length) return { passed: false, message: `${built.errors.join("; ")} (npm run metadata -- ${slug})` };
      return { passed: true, message: `"${built.metadata.title}", ${built.metadata.tags.length} tags, ${built.chapters.length} chapters, ${built.metadata.visibility}` };
    },
  },
  {
    name: "thumbnail",
    check: (slug) => {
      const dir = publishPaths(slug).thumbnailDir;
      const file = fs.existsSync(dir) ? fs.readdirSync(dir).find((f) => /^thumbnail\.(png|jpe?g)$/i.test(f)) : undefined;
      if (!file) return { passed: false, message: "publishing/thumbnail.{png,jpg} missing" };
      const size = fs.statSync(path.join(dir, file)).size;
      if (size > THUMBNAIL_MAX_BYTES) return { passed: false, message: `${file} is ${(size / 1048576).toFixed(1)} MB, YouTube limit 2 MB` };
      return { passed: true, message: file };
    },
  },
  {
    name: "background music",
    check: (slug) => {
      const tracks: any[] = (loadGlobal(slug) as any).backgroundMusic?.tracks ?? [];
      if (!tracks.length) return { passed: false, message: "storyboard/global.json backgroundMusic.tracks is empty; music is required for publishing" };
      // The renderer serves bgm/<name> from production/audio/bgm/<name>.
      const missing = tracks.map((t) => path.basename(t.file ?? t.src ?? "")).filter((f) => !f || !fs.existsSync(path.join(paths(slug).audioDir, "bgm", f)));
      if (missing.length) return { passed: false, message: `missing in production/audio/bgm/: ${missing.join(", ")}` };
      return { passed: true, message: `${tracks.length} track(s)` };
    },
  },
  {
    name: "feedback",
    check: (slug) => {
      const file = path.join(paths(slug).root, "feedback", "feedback.json");
      const open = fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")).items as any[]).filter((f) => f.status === "open").length : 0;
      return open ? { passed: false, message: `${open} open item(s) (npm run feedback -- ${slug} list)` } : { passed: true, message: "no open items" };
    },
  },
];

// ─── Overrides ──────────────────────────────────────────────────────

/** Gates the user can never override: music is a publishing invariant, metadata is the upload request itself. */
export const NON_OVERRIDABLE = new Set(["background music", "metadata"]);

export interface Override {
  gate: string;
  reason: string;
}

/**
 * Parses `--override <gate>="<reason>"` arguments (repeatable), typed by the user on the upload
 * command. Every override is logged in publishing/upload-log.md before the upload starts.
 */
export function parseOverrides(args: string[]): Override[] {
  const out: Override[] = [];
  args.forEach((a, i) => {
    if (a !== "--override") return;
    const m = (args[i + 1] ?? "").match(/^([a-z +]+)=(.+)$/);
    if (!m) throw new Error(`--override needs <gate>="<reason>", got "${args[i + 1] ?? ""}"`);
    const [, gate, reason] = m;
    if (!PUBLISH_GATES.some((g) => g.name === gate)) throw new Error(`--override: unknown gate "${gate}" (gates: ${PUBLISH_GATES.map((g) => g.name).join(", ")})`);
    if (NON_OVERRIDABLE.has(gate)) throw new Error(`--override: gate "${gate}" cannot be overridden`);
    if (reason.trim().length < 10) throw new Error(`--override ${gate}: give a real reason (10+ characters)`);
    out.push({ gate, reason: reason.trim() });
  });
  return out;
}

/** Failed gates left after overrides, and the overrides that were actually used. */
export function applyOverrides(results: Array<GateResult & { name: string }>, overrides: Override[]) {
  const failed = results.filter((r) => !r.passed);
  const used = overrides.filter((o) => failed.some((r) => r.name === o.gate));
  return { blocking: failed.filter((r) => !used.some((o) => o.gate === r.name)), used };
}

export function runGates(slug: string, gates: Gate[] = PUBLISH_GATES): Array<GateResult & { name: string }> {
  return gates.map((g) => {
    try {
      return { name: g.name, ...g.check(slug) };
    } catch (e) {
      return { name: g.name, passed: false, message: (e as Error).message.split("\n")[0] };
    }
  });
}
