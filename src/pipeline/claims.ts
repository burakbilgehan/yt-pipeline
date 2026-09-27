/**
 * Claims: the single source of every number a video states.
 *
 *   research/claims.json        one entry per fact: value, unit, source or derivation, where it is spoken
 *   research/verification.json  independent verifier verdicts, keyed by claim id and stamped with the claim hash
 *
 * Field owners: the research stage writes everything except `usedIn`; the script stage writes `usedIn`.
 * The claim hash covers only what the verifier checks, so narration edits (usedIn) never invalidate a verdict.
 * Verdicts are recorded by script (`npm run claims -- <slug> --record <file>`), never written by hand,
 * so the hash is always computed here and never by a model.
 */

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { z } from "zod";
import { BLOCK_ID, loadNarration, orderedBlocks, paths } from "./v2.js";

// ─── Schemas ────────────────────────────────────────────────────────

export const DERIVE_OPS = ["sum", "diff", "product", "ratio", "share", "pct-change"] as const;

const sourceSchema = z
  .object({
    publisher: z.string().min(1),
    title: z.string().min(1),
    url: z.string().url(),
    /** Publication date or data period as the source states it. */
    published: z.string().optional(),
    /** Date the source was read, YYYY-MM-DD. */
    accessed: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    /** The sentence or table cell the value comes from, copied verbatim. */
    quote: z.string().min(1),
  })
  .strict();

const deriveSchema = z
  .object({
    op: z.enum(DERIVE_OPS),
    /** Claim ids, in order. diff/ratio/share/pct-change take exactly two. */
    of: z.array(z.string().regex(BLOCK_ID)).min(2),
  })
  .strict();

export const claimSchema = z
  .object({
    id: z.string().regex(BLOCK_ID),
    /** What the number is, in one line: "Oil flow through the Strait of Hormuz, 2024 average". */
    text: z.string().min(1).max(160),
    value: z.number().finite(),
    unit: z.string().min(1).max(40),
    /** Decimals the value is stated with; derivations must match within half a unit of the last decimal. */
    decimals: z.number().int().min(0).max(6),
    source: sourceSchema.optional(),
    derive: deriveSchema.optional(),
    /** Written by the script stage: where the number is spoken. `phrase` must appear verbatim (case-insensitive) in script/<block>.md. */
    usedIn: z.array(z.object({ block: z.string().regex(BLOCK_ID), phrase: z.string().min(1) }).strict()).default([]),
  })
  .strict()
  .refine((c) => c.source || c.derive, { message: "needs a source or a derive" })
  .refine((c) => !c.derive || ["sum", "product"].includes(c.derive.op) || c.derive.of.length === 2, {
    message: "diff, ratio, share and pct-change take exactly two claims",
  });
export type Claim = z.infer<typeof claimSchema>;

export const claimsFileSchema = z.object({ claims: z.array(claimSchema) }).strict();

export const VERDICTS = ["confirmed", "mismatch", "unsupported"] as const;

/** What the verifier returns, one entry per claim it checked. */
export const verifierOutputSchema = z.array(
  z
    .object({
      id: z.string().regex(BLOCK_ID),
      verdict: z.enum(VERDICTS),
      /** The value the verifier found, in the claim's unit. Required unless unsupported. */
      foundValue: z.number().finite().optional(),
      sourceUrl: z.string().url().optional(),
      note: z.string().max(400),
    })
    .strict()
    .refine((r) => r.verdict === "unsupported" || (r.foundValue !== undefined && r.sourceUrl), {
      message: "confirmed and mismatch need foundValue and sourceUrl",
    }),
);
export type VerifierResult = z.infer<typeof verifierOutputSchema>[number];

export const verificationFileSchema = z
  .object({
    results: z.record(
      z.string(),
      z.object({
        hash: z.string(),
        verdict: z.enum(VERDICTS),
        foundValue: z.number().optional(),
        sourceUrl: z.string().optional(),
        note: z.string(),
        checkedAt: z.string(),
      }),
    ),
  })
  .strict();
export type VerificationFile = z.infer<typeof verificationFileSchema>;

// ─── Paths and loading ──────────────────────────────────────────────

export function claimPaths(slug: string) {
  const root = paths(slug).root;
  return {
    claims: path.join(root, "research", "claims.json"),
    verification: path.join(root, "research", "verification.json"),
  };
}

export function loadClaims(slug: string): Claim[] {
  const file = claimPaths(slug).claims;
  if (!fs.existsSync(file)) return [];
  return claimsFileSchema.parse(JSON.parse(fs.readFileSync(file, "utf8"))).claims;
}

export function loadVerification(slug: string): VerificationFile {
  const file = claimPaths(slug).verification;
  if (!fs.existsSync(file)) return { results: {} };
  return verificationFileSchema.parse(JSON.parse(fs.readFileSync(file, "utf8")));
}

// ─── Hashing and derivation ─────────────────────────────────────────

/** Everything the verifier checks. Excludes usedIn on purpose. */
export function claimHash(c: Claim): string {
  const key = JSON.stringify({ text: c.text, value: c.value, unit: c.unit, decimals: c.decimals, source: c.source ?? null, derive: c.derive ?? null });
  return createHash("sha256").update(key).digest("hex").slice(0, 16);
}

export function compute(op: (typeof DERIVE_OPS)[number], v: number[]): number {
  switch (op) {
    case "sum":
      return v.reduce((a, b) => a + b, 0);
    case "product":
      return v.reduce((a, b) => a * b, 1);
    case "diff":
      return v[0] - v[1];
    case "ratio":
      return v[0] / v[1];
    case "share":
      return (v[0] / v[1]) * 100;
    case "pct-change":
      return ((v[1] - v[0]) / v[0]) * 100;
  }
}

/** Half a unit of the last stated decimal, plus float slack. */
export const tolerance = (decimals: number) => 0.5 * 10 ** -decimals + 1e-9;

// ─── Check ──────────────────────────────────────────────────────────

export type ClaimStatus = "verified" | "derived" | "pending" | "stale" | "mismatch" | "unsupported";

export interface ClaimReport {
  errors: string[];
  warnings: string[];
  status: Map<string, ClaimStatus>;
}

/** Number words that signal a spoken figure. "one" is left out: it is mostly a pronoun or article. */
const NUMBER_WORD =
  /\b(?:\d[\d,.]*|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|trillion|half|halves|third|thirds|quarter|quarters|fifth|fifths|tenth|tenths|percent|double|doubled|triple|tripled)\b/i;

/**
 * Validates claims against themselves, the narration and the recorded verdicts.
 * `narration` maps block id to its text for every block in order.json.
 */
export function checkClaims(claims: Claim[], verification: VerificationFile, narration: Map<string, string>): ClaimReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const status = new Map<string, ClaimStatus>();
  const byId = new Map<string, Claim>();

  for (const c of claims) {
    if (byId.has(c.id)) errors.push(`${c.id}: duplicate id`);
    byId.set(c.id, c);
  }

  // Derivations: references exist, no cycles, value matches the computed result.
  const visiting = new Set<string>();
  const done = new Set<string>();
  const acyclic = (id: string): boolean => {
    if (done.has(id)) return true;
    if (visiting.has(id)) return false;
    visiting.add(id);
    const ok = (byId.get(id)?.derive?.of ?? []).every((d) => !byId.has(d) || acyclic(d));
    visiting.delete(id);
    if (ok) done.add(id);
    return ok;
  };
  for (const c of claims) {
    if (!c.derive) continue;
    const missing = c.derive.of.filter((d) => !byId.has(d));
    if (missing.length) {
      errors.push(`${c.id}: derive refers to unknown claim(s) ${missing.join(", ")}`);
      continue;
    }
    if (!acyclic(c.id)) {
      errors.push(`${c.id}: derive cycle`);
      continue;
    }
    const got = compute(c.derive.op, c.derive.of.map((d) => byId.get(d)!.value));
    if (!Number.isFinite(got) || Math.abs(got - c.value) > tolerance(c.decimals)) {
      errors.push(`${c.id}: ${c.derive.op}(${c.derive.of.join(", ")}) = ${+got.toFixed(c.decimals + 3)}, claim says ${c.value} (${c.decimals} decimals)`);
    }
  }

  // Where each number is spoken.
  const spoken = new Map<string, string[]>();
  for (const c of claims) {
    for (const u of c.usedIn) {
      const text = narration.get(u.block);
      if (text === undefined) {
        errors.push(`${c.id}: usedIn block "${u.block}" is not in script/order.json`);
        continue;
      }
      if (!text.toLowerCase().includes(u.phrase.toLowerCase())) {
        errors.push(`${c.id}: phrase "${u.phrase}" not found in script/${u.block}.md`);
        continue;
      }
      spoken.set(u.block, [...(spoken.get(u.block) ?? []), u.phrase.toLowerCase()]);
    }
  }
  // Sentences that sound like they state a figure but no claim covers.
  for (const [block, text] of narration) {
    const phrases = spoken.get(block) ?? [];
    for (const sentence of text.split(/(?<=[.!?])\s+/)) {
      const m = sentence.match(NUMBER_WORD);
      if (!m) continue;
      const s = sentence.toLowerCase();
      if (phrases.some((p) => s.includes(p) || p.includes(s))) continue;
      warnings.push(`${block}: no claim covers "${sentence.trim()}" (matched "${m[0]}")`);
    }
  }

  // Verification state.
  for (const c of claims) {
    if (c.derive) {
      status.set(c.id, "derived");
      continue;
    }
    const r = verification.results[c.id];
    if (!r) status.set(c.id, "pending");
    else if (r.hash !== claimHash(c)) status.set(c.id, "stale");
    else if (r.verdict === "confirmed" && r.foundValue !== undefined && Math.abs(r.foundValue - c.value) > tolerance(c.decimals)) {
      status.set(c.id, "mismatch");
      errors.push(`${c.id}: verifier confirmed but found ${r.foundValue}, claim says ${c.value}`);
    } else if (r.verdict === "confirmed") status.set(c.id, "verified");
    else {
      status.set(c.id, r.verdict);
      errors.push(`${c.id}: verifier says ${r.verdict}${r.foundValue !== undefined ? ` (found ${r.foundValue})` : ""}: ${r.note}`);
    }
  }
  for (const id of Object.keys(verification.results)) {
    if (!byId.has(id)) warnings.push(`verification.json has a verdict for unknown claim "${id}"`);
  }

  return { errors, warnings, status };
}

/** Claims the verifier should see: sourced (not derived), pending or stale unless `all`. No usedIn, no narration. */
export function exportForVerifier(claims: Claim[], verification: VerificationFile, all = false) {
  return claims
    .filter((c) => !c.derive)
    .filter((c) => all || verification.results[c.id]?.hash !== claimHash(c))
    .map(({ id, text, value, unit, decimals, source }) => ({ id, text, value, unit, decimals, source }));
}

/** Merges verifier results into verification.json, stamping each with the current claim hash. */
export function recordVerdicts(claims: Claim[], verification: VerificationFile, results: VerifierResult[], now = new Date()): VerificationFile {
  const byId = new Map(claims.map((c) => [c.id, c]));
  const next: VerificationFile = { results: { ...verification.results } };
  for (const r of results) {
    const c = byId.get(r.id);
    if (!c) throw new Error(`verifier returned unknown claim "${r.id}"`);
    if (c.derive) throw new Error(`${r.id} is derived; derived claims are checked by script, not by the verifier`);
    next.results[r.id] = {
      hash: claimHash(c),
      verdict: r.verdict,
      foundValue: r.foundValue,
      sourceUrl: r.sourceUrl,
      note: r.note,
      checkedAt: now.toISOString().slice(0, 10),
    };
  }
  return next;
}

// ─── Gate ───────────────────────────────────────────────────────────

/** Narration of every block in order.json; empty map before the script stage. */
function narrationOf(slug: string): Map<string, string> {
  if (!fs.existsSync(paths(slug).order)) return new Map();
  return new Map(orderedBlocks(slug).map(({ id }) => [id, fs.existsSync(paths(slug).block(id)) ? loadNarration(slug, id) : ""]));
}

/** Runs the check and prints it. Returns false when the gate fails. Shared by npm run claims and the publishing gate. */
export function runClaimsCheck(slug: string, strict: boolean, log: (s: string) => void = console.log): boolean {
  if (!fs.existsSync(claimPaths(slug).claims)) {
    log(`${slug}: research/claims.json missing`);
    return false;
  }
  let report: ClaimReport;
  let claims: Claim[];
  try {
    claims = loadClaims(slug);
    report = checkClaims(claims, loadVerification(slug), narrationOf(slug));
  } catch (e) {
    log(`claims: ${(e as Error).message}`);
    return false;
  }
  const count = (s: string) => [...report.status.values()].filter((v) => v === s).length;
  const open = [...report.status].filter(([, s]) => s === "pending" || s === "stale").map(([id, s]) => `${id} (${s})`);
  for (const e of report.errors) log(`ERROR ${e}`);
  for (const w of report.warnings) log(`warn  ${w}`);
  if (open.length) log(`${strict ? "ERROR" : "todo "} not verified: ${open.join(", ")}`);
  log(`${claims.length} claims: ${count("verified")} verified, ${count("derived")} derived, ${open.length} to verify, ${report.errors.length} error(s), ${report.warnings.length} warning(s)`);
  return report.errors.length === 0 && (!strict || open.length === 0);
}
