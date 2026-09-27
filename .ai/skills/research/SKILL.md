---
name: research
description: "Research stage of a layout-2 video: one deep research round by the researcher agent, then independent verification of every sourced number by the claim-verifier agent. User-invoked; ends with user approval."
disable-model-invocation: true
argument-hint: "<slug>"
---

# Research stage

Input: `research/brief.md` (from the `idea` skill) and `config.json`. Output: `research/notes.md`, `research/claims.json` (data model: `src/pipeline/claims.ts`), `research/verification.json` (written only by `npm run claims -- <slug> --record`).

## Steps

1. **Research, once.** Spawn the `researcher` agent with the project directory's absolute path and the brief. One round per video; afterwards only targeted follow-ups for gaps or failed claims, never a full redo.
2. **Mechanical check.** `npm run claims -- <slug>`. Schema, derivation and reference errors are fixed in `claims.json` now; a wrong derivation means a claim value is wrong, not the formula.
3. **Independent verification.** `npm run claims -- <slug> --export` prints the claims still to verify (new or changed since their last verdict). Spawn the `claim-verifier` agent with that JSON pasted into its prompt and nothing else: no file paths, no brief, no notes, no narration. Its independence is the point.
4. **Record.** Save the verifier's JSON answer to a file in the scratchpad and run `npm run claims -- <slug> --record <file>`. The script stamps each verdict with the claim hash; a later edit to a claim makes its verdict stale automatically.
5. **Failures go to the user.** For each `mismatch` or `unsupported`, show the claim value and source next to what the verifier found. The user decides: correct the claim (then re-run steps 2 to 4 for it), replace the source, or drop the number. Never adopt the verifier's value silently.
6. **Show and stop.** A short summary of `notes.md` (findings, angle support, open questions), the claims table (id, value, unit, status) and the full paths of both files. The script stage starts only when the user asks for it.

Model and effort of both agents are pinned in their files; do not override them when spawning.
