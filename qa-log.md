# QA Pipeline Friction Report

**Date:** 2026-03-17
**Trigger:** First video production run (gold-vs-commodities)
**Scope:** Pipeline-level process friction — NOT content quality
**Author:** QA Agent

---

## Friction Points

### FP-001: PowerShell Dollar Sign Escaping on Windows

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Category** | Tooling |
| **Priority** | P0 — fix now |
| **Effort** | Small (1 session) |

**Symptom:** When agents use the Bash tool to run PowerShell commands (word count, regex, text processing), `$variable` syntax gets eaten by bash string interpolation before reaching PowerShell. Results in 3-5 retry loops per operation — a tax on every session.

**Root Cause:** The Bash tool on Windows passes commands through a shell layer that interprets `$` as variable expansion before PowerShell receives the command. Agents don't have guidance on how to handle this, so they discover it through trial and error every single session.

**Impact:**
- 3-5 wasted attempts per text-processing operation
- Compounds across sessions (estimated 10-15 min wasted per session)
- Agents forget the workaround between sessions (no persistent memory)

**Proposed Fix:**
1. **Create a utility script** `src/scripts/text-utils.ts` with common text operations (word count, regex search, line count, section extraction). Run via `npm run text-utils <operation> <file>` — bypasses shell escaping entirely.
2. **Add a "Windows/PowerShell Gotchas" section to AGENTS.md** documenting the escaping rules so every agent reads them on session start:
   - Use single quotes around PowerShell variables: `powershell -Command "& { (Get-Content 'file.txt').Length }"`
   - Or prefer `node -e` one-liners over PowerShell for text processing
   - Or use the dedicated `npm run text-utils` script
3. **Prefer Node.js over PowerShell for text operations in agent prompts** — Node.js `process.argv` doesn't have dollar-sign issues.

---

### FP-002: Multi-Agent Review Protocol Undefined

| Field | Value |
|-------|-------|
| **Severity** | Critical |
| **Category** | Architecture / Process |
| **Priority** | P0 — fix now |
| **Effort** | Medium (2-3 sessions) |

**Symptom:** When the script needed review from Critic, Content Writer, and Storyboard agents, there was no defined protocol for invocation order, feedback format, deduplication, or conflict resolution. Everything was ad-hoc.

**Root Cause:** The architecture (`agents-plan.md`) defines individual agent responsibilities well, but **inter-agent coordination protocols are completely missing**. The Director agent prompt describes oversight responsibilities at a high level ("coordinate handoffs") but provides zero concrete protocols:
- No standardized feedback format across agents
- No merge/dedup strategy for overlapping feedback
- No priority scheme when agents disagree
- No definition of when multi-agent review is triggered vs. single-agent review

**Impact:**
- Inconsistent feedback formats → manual normalization effort
- Overlapping feedback → user has to mentally deduplicate
- Conflicting recommendations → user becomes the tie-breaker with no framework to decide
- Time lost re-inventing the process every time a review is needed

**Proposed Fix:**

1. **Define a Review Protocol** — add a new file `.ai/protocols/multi-agent-review.md`:

   ```
   ## Multi-Agent Review Protocol

   ### When to Use
   - Any script revision beyond v1 (content has been through at least one edit cycle)
   - Before finalizing storyboard (script must be reviewed)
   - Before publishing (full pipeline review)

   ### Invocation Order
   1. Critic (artistic/viewer quality) — first, broadest perspective
   2. Content Writer (self-review, factual accuracy) — second, detail check
   3. YouTube Expert (SEO/algorithm implications) — third, platform fit
   4. Storyboard (visual feasibility) — if relevant

   ### Standardized Feedback Format
   Every reviewing agent outputs:
   - Issue ID (sequential per review)
   - Severity: Critical / High / Medium / Low
   - Category: Content / Structure / Accuracy / Engagement / Technical
   - Description: What's wrong
   - Suggestion: Concrete fix
   - Scope: Which section/lines affected

   ### Merge Rules
   - Duplicate detection: same section + same category = likely duplicate → keep higher severity
   - Conflicts: when agents disagree, flag for user decision with both rationales
   - Priority: Critical from any agent > High from any agent > etc.
   ```

2. **Add a `/review` slash command** that orchestrates this protocol — takes a project slug, invokes agents in sequence, collects structured feedback, deduplicates, and presents a unified review report.

3. **Update Director agent prompt** to reference this protocol and use it when coordinating reviews.

---

### FP-003: No Mid-Edit Checkpoint System for Version Tracking

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Category** | Architecture |
| **Priority** | P1 — fix this week |
| **Effort** | Medium (2-3 sessions) |

**Symptom:** When applying feedback to a script (v3.1 → v3.2), edits are applied incrementally across a session. If the session dies mid-edit, there's no record of which changes were applied and which weren't. The version header only gets updated at the end, after all changes are complete.

**Root Cause:** The version management system (`agents-plan.md`, section "Versiyon Yonetim Sistemi") was designed for **discrete version bumps** (v1 → v2 → v3), not for **incremental edits within a version**. There is no concept of:
- A change manifest (list of planned edits with applied/pending status)
- Sub-versions or edit checkpoints (v3.1, v3.2)
- A "changes in progress" tracking mechanism
- Session recovery protocol

The system assumes atomic version transitions: you're either at v3 or v4, never "halfway through applying v4 changes."

**Impact:**
- If a session crashes mid-edit, the file is in an unknown state
- No way to resume — the user and agent must re-read the file, compare to feedback, and figure out what was and wasn't done
- Risk of partial edits being treated as "done" (stale version header)

**Proposed Fix:**

1. **Introduce a change manifest pattern.** Before starting edits, the editing agent writes a `content/changes-v<N>.md` file:

   ```markdown
   # Change Manifest: script-v3 → script-v4
   Based on: review feedback from 2026-03-17

   ## Planned Changes
   - [x] Rewrite hook — add dramatic question
   - [x] Act 2: Add gold reserve data point (35,715 tonnes)
   - [ ] Act 5: Strengthen transition to conclusion
   - [ ] Update word count in metadata
   - [ ] Update version header

   ## Status: IN_PROGRESS (3/5 applied)
   ```

2. **Update Content Writer agent prompt** to create this manifest before starting batch edits. Each `[x]` is checked as the edit is applied. Version header is updated last.

3. **Recovery protocol:** If a session dies, the next agent reads the manifest, sees which changes are pending, and resumes from there.

---

### FP-004: Script Metadata Word Count Drift

| Field | Value |
|-------|-------|
| **Severity** | Critical |
| **Category** | Process |
| **Priority** | P0 — fix now |
| **Effort** | Small (1 session) |

**Symptom:** Script metadata said "~911 words / ~6:15-6:30" but actual voiceover content was 1,233 words (~8:30). A 35% drift that went undetected through multiple edit rounds, expanding from 5 acts to 7 acts without metadata update.

**Root Cause:** Two failures compounded:

1. **No automated word count validation.** The Content Writer agent writes the word count in metadata manually at draft time and never recalculates. When edits add content (enriching Act 2, splitting acts), the metadata goes stale.

2. **No post-edit validation gate.** There's nothing in the Content Writer or QA agent prompts that says "after editing, recount words and verify metadata matches." The QA checklist includes "Appropriate length for topic" but not "Metadata matches actual content."

**Impact:**
- Downstream timing calculations are wrong (TTS, scene timing, storyboard)
- Video duration surprises at production stage — requires re-planning
- Storyboard scene timing budgets are based on wrong total duration
- TTS generation creates audio that doesn't match expected length

**Proposed Fix:**

1. **Add `npm run text-utils wordcount <file>` command** (ties into FP-001 fix) — counts only `[VOICEOVER]` tagged text, excluding visual notes and metadata. Outputs: word count, estimated duration at 150 WPM.

2. **Add a mandatory post-edit rule to Content Writer agent prompt:**
   ```
   After ANY edit to voiceover text:
   1. Run word count on all [VOICEOVER] sections
   2. Update the "Target length" metadata to match actual count
   3. If word count deviates >15% from original target, flag to user
   ```

3. **Add to QA checklist — Content Stage:**
   ```
   - [ ] Word count in metadata matches actual voiceover word count (±5%)
   - [ ] Estimated duration is realistic at 150 WPM
   ```

4. **Consider a pre-storyboard validation gate** that blocks storyboard creation if content metadata is stale.

---

### FP-005: Director Agent Unused — No Orchestration in Practice

| Field | Value |
|-------|-------|
| **Severity** | Critical |
| **Category** | Architecture |
| **Priority** | P1 — fix this week |
| **Effort** | Large (multiple days) |

**Symptom:** The Director agent was designed to be the central orchestrator but was never used during the first video production. Instead, the user worked with the generic build agent, manually managing all agent invocations, handoffs, and pipeline state.

**Root Cause:** Multiple factors:

1. **Discoverability gap.** The user would need to know to invoke `/director` or switch to the Director agent. There's no onboarding flow that says "start here."

2. **Default agent is not the Director.** When a user opens a session, they get the generic build agent. The Director is opt-in, but it should be the default entry point for pipeline work.

3. **Director prompt is strategic, not operational.** The Director prompt (`.ai/agents/director.md`) focuses on high-level concerns (channel health, growth trends, strategic decisions) but lacks operational protocols:
   - No "when a user says X, route to agent Y" decision tree
   - No pipeline kickoff checklist
   - No handoff protocol between stages
   - No multi-agent review orchestration (connects to FP-002)

4. **Pipeline evolution phase mismatch.** `agents-plan.md` defines three phases: Manual → Semi-automatic → Director-managed. The current phase is "Manual" which explicitly says the user triggers each step. But even in manual mode, the Director should provide guidance — it just shouldn't auto-chain. This distinction isn't clear in the Director prompt.

**Impact:**
- The entire multi-agent architecture is underutilized
- No consistent pipeline coordination across sessions
- User bears full cognitive load of remembering pipeline state, agent capabilities, and coordination protocols
- The value proposition of the framework (automated pipeline) is not delivered

**Proposed Fix:**

1. **Make Director the recommended entry point.** Add to AGENTS.md:
   ```
   ## Starting a Production Session
   Begin every production session by invoking the Director agent (`/director`).
   The Director will assess pipeline state, recommend next steps, and
   route to the appropriate specialist agent.
   ```

2. **Add operational decision tree to Director prompt:**
   ```
   ## Routing Rules
   When user wants to:
   - Start a new video → check prerequisites, then route to Researcher
   - Continue existing project → read config.json, identify currentWork, route to appropriate agent
   - Review/feedback on content → invoke Multi-Agent Review Protocol (see protocols/multi-agent-review.md)
   - Check status → generate pipeline status report
   - Publish → verify all stages complete and versions consistent, then route to Publisher
   ```

3. **Add pipeline state summary to Director's startup routine:**
   ```
   ## On Session Start
   1. Read all projects/*/config.json
   2. Identify any in-progress work (currentWork != null)
   3. Run version consistency check on active projects
   4. Present status summary to user
   5. Recommend next action
   ```

4. **Long-term:** Consider making the Director agent the default agent in `.ai/` configuration, so every new session starts with pipeline context.

---

## Systemic Patterns

The five friction points above are not independent. They reveal three deeper structural issues:

### Pattern A: Missing "Glue Layer" Between Agents

**Related friction points:** FP-002, FP-005

The architecture defines 11 well-specified individual agents but provides almost no specification for how they work **together**. Each agent prompt describes its inputs, outputs, and responsibilities — but the inter-agent protocols (handoff format, feedback loops, review coordination, conflict resolution) are undefined.

The Director agent was supposed to be this glue layer, but its prompt is too high-level/strategic to serve as an operational coordinator.

**Recommendation:** Create a `.ai/protocols/` directory with explicit inter-agent protocols:
- `multi-agent-review.md` — feedback collection and merge protocol
- `stage-handoff.md` — what happens between pipeline stages
- `version-bump.md` — when and how to bump versions across stages
- `conflict-resolution.md` — how to handle disagreements between agents

### Pattern B: No Automated Validation Gates

**Related friction points:** FP-003, FP-004

The pipeline trusts agents to self-validate, but agents don't. Word counts drift. Metadata goes stale. Version headers lag behind actual changes. There's no mechanism that catches these issues automatically — they're discovered late (or never).

**Recommendation:** Implement lightweight validation scripts that run as part of the pipeline:
- `npm run validate <slug>` — checks word count vs metadata, version consistency, file existence, `based_on` freshness
- Add "run validation" as a mandatory step in agent prompts before marking a stage complete
- QA agent should be able to be invoked automatically at stage boundaries, not just on-demand

### Pattern C: Windows/Tooling Environment Not First-Class

**Related friction points:** FP-001

The framework was designed with Unix-style tooling assumptions. PowerShell escaping is the most visible symptom, but this class of problem will recur whenever agents need to interact with the OS layer. The fix isn't just documenting PowerShell workarounds — it's building a Node.js-based utility layer that abstracts away OS differences entirely.

**Recommendation:** All text-processing, file-manipulation, and validation operations should be exposed as `npm run` scripts (Node.js/TypeScript). Agents should never need to write raw shell commands for routine operations. This also makes the framework portable across Windows/Mac/Linux.

---

## Action Items Summary

| ID | Action | Priority | Effort | Depends On | Status |
|----|--------|----------|--------|------------|--------|
| A1 | Create `src/scripts/text-utils.ts` (word count, regex, line count) | P0 | Small | — | Open |
| A2 | Add Windows/PowerShell guidance to AGENTS.md | P0 | Small | — | ✅ Done (2026-03-17) |
| A3 | Add post-edit word count validation rule to Content Writer prompt | P0 | Small | A1 | ✅ Done (2026-03-17) |
| A4 | Add word count accuracy check to QA checklist | P0 | Small | — | ✅ Done (2026-03-17) — covered in QA agent rewrite |
| A5 | Create `.ai/protocols/multi-agent-review.md` | P0 | Medium | — | Open |
| A6 | Create `/review` slash command | P0 | Medium | A5 | Open |
| A7 | Add change manifest pattern to Content Writer prompt | P1 | Medium | — | ✅ Done (2026-03-17) |
| A8 | Add operational decision tree to Director prompt | P1 | Medium | A5 | ✅ Done (2026-03-17) — routing rules in Director rewrite |
| A9 | Add session startup routine to Director prompt | P1 | Small | — | ✅ Done (2026-03-17) — version-aware oversight in Director rewrite |
| A10 | Create `npm run validate <slug>` script | P1 | Medium | A1 | Open |
| A11 | Create `.ai/protocols/` directory with remaining protocols | P2 | Large | A5 | Open |
| A12 | Make Director the default/recommended entry point | P2 | Small | A8, A9 | ✅ Done (2026-03-17) — Director is now `mode: primary` |

---

## Metrics to Track

To measure whether these fixes actually reduce friction, track in future sessions:

1. **Shell retry count** — how many times an agent retries a command due to escaping issues (target: 0)
2. **Word count drift** — % deviation between metadata and actual word count at storyboard handoff (target: <5%)
3. **Director usage rate** — % of sessions that start with Director agent (target: 100%)
4. **Review time** — minutes spent on multi-agent review per script version (baseline: unknown, measure going forward)
5. **Mid-session recovery events** — times a session had to recover from incomplete edits (target: 0)

---

*This report will be updated as friction points are addressed. Next review scheduled after second video production run.*
