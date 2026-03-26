---
description: Run multi-agent review on a pipeline stage deliverable
agent: director
---

Run a multi-agent review for: $ARGUMENTS

Expected format: `<slug> <stage>` (e.g. `my-video content`)

Follow the Multi-Agent Review Protocol at `.ai/protocols/multi-agent-review.md`:

1. **Critic Gate** — Invoke the Critic on the latest versioned file for the given stage. Provide the file path and stage context.

2. **Fix Routing** — If Critic returns FAIL, route each issue to the appropriate specialist agent (researcher, content-writer, collector, storyboard, video-production, or youtube-expert). After fixes, re-run Critic. Max 3 loops.

3. **Specialist Spot-Check** — After Critic PASS, run the stage-appropriate specialist for a lightweight confidence check.

4. **Present Summary** — Show the user a review summary including: Critic grade, specialist confidence score, what was caught and fixed each round, and final state assessment.

Always read `channels/<channel>/videos/<slug>/config.json` first to determine the current stage version and file paths.
