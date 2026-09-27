/**
 * Claims gate of a layout-2 project (see src/pipeline/claims.ts for the data model).
 *
 * Usage:
 *   npm run claims -- <slug>                  check; exit 1 on any error
 *   npm run claims -- <slug> --strict         also fail on pending or stale verification (publishing gate)
 *   npm run claims -- <slug> --export [--all] print the claims the verifier should check, as JSON
 *   npm run claims -- <slug> --record <file>  merge verifier results (JSON array) into research/verification.json
 */

import fs from "node:fs";
import { assertLayout2, writeJson } from "../pipeline/v2.js";
import { claimPaths, exportForVerifier, loadClaims, loadVerification, recordVerdicts, runClaimsCheck, verifierOutputSchema } from "../pipeline/claims.js";

function main() {
  const [slug, ...rest] = process.argv.slice(2);
  if (!slug) {
    console.error("Usage: npm run claims -- <slug> [--strict | --export [--all] | --record <file>]");
    process.exit(1);
  }
  assertLayout2(slug);

  if (rest.includes("--export")) {
    console.log(JSON.stringify(exportForVerifier(loadClaims(slug), loadVerification(slug), rest.includes("--all")), null, 2));
    return;
  }

  if (rest.includes("--record")) {
    const file = rest[rest.indexOf("--record") + 1];
    if (!file) throw new Error("--record needs a file");
    const results = verifierOutputSchema.parse(JSON.parse(fs.readFileSync(file, "utf8")));
    writeJson(claimPaths(slug).verification, recordVerdicts(loadClaims(slug), loadVerification(slug), results));
    console.log(`recorded ${results.length} verdict(s)`);
  }

  if (!runClaimsCheck(slug, rest.includes("--strict"))) process.exit(1);
}

const isMain = process.argv[1]?.endsWith("scripts/claims.ts");
if (isMain) main();
