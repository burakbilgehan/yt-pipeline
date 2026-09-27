---
name: script
description: "Script stage of a layout-2 video: write or revise the narration as script/order.json plus one script/<block-id>.md per block. User-invoked; ends with user approval."
disable-model-invocation: true
argument-hint: "<slug>"
---

# Script stage

Inputs: `research/` notes and `config.json` metadata (targetLength, tone, targetAudience). Layout and file rules: AGENTS.md > Video Project Layout 2.

## Steps

1. `npm run status -- <slug>` to see what exists.
2. Plan sections and blocks. One block is one scene with one visual idea, usually 10 to 35 seconds of narration. A section is a group of blocks with a shared title.
3. Block ids are short semantic kebab-case slugs (`hormuz-traffic`, not `scene-7`). Never rename an id once its audio exists; reorder by editing `script/order.json` only.
4. Write `script/order.json`, then the block files one at a time. A block file holds narration only: no headings, no visual notes (visuals live in `storyboard/<id>.json`).
5. Delivery markup and spoken numbers: `ssml-writing` skill. Every number spoken aloud is a claim in `research/claims.json`; derived numbers follow the `math-verification` skill. A number with no claim goes back to the research stage, it is not written in.
6. For each spoken number, add `{ "block": "<id>", "phrase": "<words as spoken>" }` to its claim's `usedIn` (the only claim field this stage writes). Then `npm run claims -- <slug>`: no errors, and each warning either gets a `usedIn` entry or is a sentence with no figure in it.
7. `npm run status -- <slug>`: the predicted total must be within 10% of the target length. Cut or expand blocks until it is.
8. Show the user the status output and the narration, then stop. The storyboard stage starts only when the user asks for it.

## Revisions

Change only the blocks the user named. A reorder is an `order.json` edit, not a rewrite. After edits, run `npm run status -- <slug>` again and report the new total.
