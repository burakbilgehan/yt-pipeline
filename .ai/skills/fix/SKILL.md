---
name: fix
description: "Apply user feedback to specific scenes of a layout-2 video with a scoped, fast loop: record, edit only the named blocks, re-voice, preview. Use whenever the user reports a problem in a line, number, scene or visual."
argument-hint: "<slug> <what is wrong>"
---

# Fix loop

Goal: a reported problem is fixed in minutes without breaking any other scene.

1. **Map to blocks.** `npm run status -- <slug>` lists blocks with numbers and ids. Map each complaint to block ids; if one is ambiguous, ask once with the candidates.
2. **Record.** `npm run feedback -- <slug> add <block-id|global> "<complaint>"` for every item before editing anything.
3. **Scope.** Edit only the named blocks' `script/<id>.md` and `storyboard/<id>.json`. Anything else (other blocks, `storyboard/global.json`, `src/`) only if the user asked; otherwise propose it in one line and wait.
4. **Apply, in parallel where independent.** Narration change, then `npm run tts -- <slug>` (only that block is re-voiced). Visual change in the block's visual file. A changed number is a changed claim in `research/claims.json`: edit the claim, run `npm run claims -- <slug>`, then re-verify it: `npm run claims -- <slug> --export` (only changed claims), pass that JSON alone to the `claim-verifier` agent, save its answer to the scratchpad and `npm run claims -- <slug> --record <file>`.
5. **Show.** `npm run preview-scene -- <slug> <block-id>` for every touched block; it checks the clip against the watch rules (`templates/pipeline-defaults.json` `watch`) and opens it only if it passes. On exit 1, a violation your edit introduced is fixed in this loop. Any other violation (it was there before, or it comes from the catalog or the timing) goes to the user with its report line; never get past it by changing `holdSec`, the rules, other blocks or `src/`.
6. **Report** per item: what changed, clip path. Mark `npm run feedback -- <slug> fixed <n>` only after the user confirms.
7. **Three strikes.** If the same block fails three attempts, stop tweaking and propose a different approach (another visual type, a rewritten block).

Batch of many items: record all first, fix block by block with a preview each.
