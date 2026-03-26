# QA Log

## Open Action Items

| ID | Issue | Fix | Owner |
|----|-------|-----|-------|
| RCA-001-A | Storyboard prompt lacks explicit write workflow | ✅ Applied — `## Workflow` section added to `.ai/agents/storyboard.md` | Fixed |
| RCA-001-B | Storyboard prompt skeleton-first missing | ✅ Applied — skeleton-first rule added | Fixed |
| RCA-001-C | Subagent approval flow ambiguous | ✅ Applied — "write draft first, approval gates status" clarified | Fixed |
| RCA-002-A | Storyboard subagent task produces empty result despite correct prompt | Director should write storyboard directly OR use inline delegation, not Task tool subagent | Director |
| RCA-002-B | Context too large for subagent — 188-line script + agent prompt + AGENTS.md + channel config exceeds effective working capacity | Break storyboard into smaller steps or let Director handle directly | Director |

## Resolved

| ID | Issue | Resolution |
|----|-------|------------|
| FP-001 | PowerShell `$` escaping on Windows | Added Node.js workarounds to AGENTS.md |
| FP-002 | No multi-agent review protocol | Partial — Director Critic loop defined. Full protocol pending (A3) |
| FP-003 | No mid-edit checkpoint | Change manifest pattern added to content-writer agent |
| FP-004 | Script word count drift vs metadata | Post-edit validation rule added to content-writer agent |
| FP-005 | Director agent unused | Director set as `mode: primary`, entry point documented |
| A1 | No voiceover word count tool | Created `src/scripts/text-utils.ts` — `npm run text-utils wordcount/stats/duration` |
| A2 | No version consistency check | Created `src/scripts/validate.ts` — `npm run validate <slug>` |
| A3 | No multi-agent review protocol | Created `.ai/protocols/multi-agent-review.md` + `/review` command |

## Root Cause Analyses

### RCA-001: Storyboard Agent Silent Failure — No Output Produced
| Field | Value |
|-------|-------|
| Date | 2026-03-18 |
| Failure Type | prompt-gap |
| Severity | Critical |
| Affected Agent | storyboard |

**What happened:** Director invoked storyboard agent twice for `sleep-deprivation-economy` project (task IDs: ses_2ffcf7a23ffelCAvFxyHcq9SW7, ses_2ffc9d9d4ffe66cAD0Nna2Jfj0). Both attempts returned empty — no file written to `storyboard/storyboard-v1.json`. Second attempt included explicit paths and "Write the complete file now" instruction. Still failed.

**Root cause:** Three compounding prompt gaps:

1. **(PRIMARY) No explicit procedural workflow.** The prompt defines "Where to Write" and "Output Format" but never gives a step-by-step action sequence ("Read X → Write Y → Update Z"). Compare: researcher prompt says "Create the output file first (skeleton), then fill it in." Storyboard prompt has no equivalent. The agent treats the format spec as informational rather than an instruction to execute.

2. **(COMPOUNDING) JSON output without skeleton-first approach.** The agent must produce a large structured JSON with nested scene objects from a 188-line script. Without a "write skeleton first, fill incrementally" instruction, it attempts to compose the entire structure in memory and may stall on complexity — unlike content-writer which outputs forgiving Markdown.

3. **(COMPOUNDING) Ambiguous approval gate.** Rule says "Present to user and wait for approval before finalizing." As a subagent, the "user" is the Director. The agent may interpret this as "don't write files until approval" — so it holds back. Other agents (researcher, content-writer) write files first and THEN present for approval.

**Contributing factor:** At 72 lines, the storyboard prompt is the shortest content-producing agent prompt. Researcher is 56 lines but has explicit write instructions. Content-writer is 153 lines with extremely prescriptive format guidance.

**Fix:**
- [ ] Add `## Workflow` section to `.ai/agents/storyboard.md` with explicit step-by-step: read config → read script → read channel-config → create JSON skeleton file → populate scenes → create summary .md → update config.json → present summary
- [ ] Add skeleton-first rule: "Create the output file first with skeleton structure, then populate each scene. Do not compose the entire JSON in memory before writing."
- [ ] Change Rule 3 from "Present to user and wait for approval before finalizing" → "Write draft files first, then present a summary of scenes to the caller. Approval gates the status transition to 'completed' — not the file write itself."
- [ ] Run `npm run sync-ai` after prompt update to propagate to `.claude/` and `.opencode/`

**Status:** Fixed — all three prompt changes applied and synced. However, issue persisted (see RCA-002).

---

### RCA-002: Storyboard Subagent Persistent Empty Output — Tooling/Context Issue
| Field | Value |
|-------|-------|
| Date | 2026-03-18 |
| Failure Type | tooling-issue |
| Severity | Critical |
| Affected Agent | storyboard (subagent invocation) |
| Related | RCA-001 (prompt fixes applied but did not resolve) |

**What happened:** After RCA-001 fixes were applied (Workflow section, skeleton-first rule, write-before-approval clarification) and synced via `npm run sync-ai`, the storyboard agent was invoked a third time with an extremely detailed 6-step prompt including exact file paths, exact JSON structure, and explicit "You MUST use the Write tool" instruction. The subagent STILL returned an empty `<task_result></task_result>`. A fourth attempt where the Director tried to write directly also aborted.

**Timeline:**
1. Attempt 1 — empty result (pre-RCA-001)
2. Attempt 2 — empty result, explicit paths (pre-RCA-001)
3. RCA-001 fixes applied + synced
4. Attempt 3 — empty result, ultra-detailed prompt (post-RCA-001) ← **proves this is NOT a prompt gap**
5. Attempt 4 — Director direct write, aborted

**Root cause:** This is NOT a prompt issue. The prompt was correct after RCA-001. The failure is at the **tooling/infrastructure layer**. Analysis:

1. **(PRIMARY) Subagent context overload.** The storyboard task requires the subagent to:
   - Load its own agent prompt (85 lines in .claude format)
   - Load AGENTS.md system instructions (inherited)
   - Read config.json (93 lines)
   - Read script-v2.md (188 lines — the LONGEST script in the pipeline)
   - Read channel-config.json
   - Compose a ~270-line JSON output (based on gold project storyboard precedent: 272 lines / 21KB)
   
   The subagent must READ 3+ files totaling ~400+ lines, then WRITE a ~270-line structured JSON — all within a single Task tool invocation. This is the heaviest single-task workload in the entire pipeline. By comparison, the gold project storyboard was likely created in a different session context (possibly pre-subagent architecture, or with a shorter script).

2. **(COMPOUNDING) JSON is unforgiving.** A Markdown storyboard summary would be far easier for a subagent to produce — a malformed line doesn't corrupt the whole file. JSON requires perfect structure. If the subagent starts producing output and hits a limit or error, the partial JSON is useless and it may abort silently rather than write a broken file.

3. **(EVIDENCE) The gold project storyboard EXISTS (21KB, 272 lines).** This proves the storyboard agent CAN produce output. The difference: that project may have been created differently (direct write, different session, shorter script). The sleep-deprivation script at 188 lines with 8 production flags is significantly more complex.

4. **(EVIDENCE) Content-writer succeeded for the same project.** Content-writer produced script-v1 and script-v2 successfully. But content-writer outputs Markdown (forgiving format) and works incrementally (changes manifest). The storyboard agent must produce a single valid JSON file.

**What RCA-001 got wrong:** RCA-001 correctly identified prompt gaps, but these were NOT the blocking issue. The prompt was a contributing factor for Attempts 1-2, but Attempt 3 with an explicitly detailed prompt STILL failed. The actual blocker is the subagent Task tool struggling with the combined read+compose+write workload for this specific project size.

**Immediate workaround (UNBLOCKS RIGHT NOW):**
- [ ] **Director writes the storyboard directly** — no subagent delegation. Director reads script-v2.md, reads config.json, reads channel-config.json, and uses the Write tool to create `storyboard-v1.json` and `storyboard-summary-v1.md` directly. This eliminates the subagent context bottleneck.

**Structural fixes (prevent recurrence):**
- [ ] Add to `.ai/agents/director.md`: "For storyboard creation, prefer direct creation over subagent delegation when the script exceeds 100 lines. The storyboard subagent works well for short-format videos but may struggle with long-format scripts that require large structured JSON output."
- [ ] Add to `.ai/agents/storyboard.md` Workflow step 4: "If creating as a subagent and the script exceeds 100 lines, write the JSON in two passes: first a skeleton with scene IDs and timestamps only, then a second Edit pass to fill in voiceover and visual details per scene."
- [ ] Consider adding a `/storyboard-direct` command that runs storyboard creation as a Director-level task rather than a subagent delegation.
- [ ] Long-term: investigate splitting storyboard creation into a multi-step command (scene extraction → visual assignment → JSON assembly) rather than a single monolithic task.

**Status:** Open — immediate workaround recommended, structural fixes proposed

---

### RCA-003: Director Assumes Upload Failed When Video Is Actually Live
| Field | Value |
|-------|-------|
| Date | 2026-03-23 |
| Failure Type | state-sync-gap |
| Severity | Medium |
| Affected Agent | director, publisher |

**What happened:** The first video (gold-vs-commodities) was uploaded manually via YouTube Studio after the pipeline upload script failed with a quota error. However, in subsequent sessions the Director would see `upload-log.md` with `Status: FAILED` and assume the video wasn't published — despite the video being live on YouTube with 187+ views.

**Root cause:** The pipeline has no reconciliation mechanism between local state and actual YouTube state. The Director trusts local `upload-log.md` and `config.json` as ground truth without verifying against the YouTube API.

**Fix applied:**
- Added Hard Rule #13 to AGENTS.md: "Pipeline Upload Failures Don't Mean Video Isn't Published"
- Fixed `upload-log.md` for gold-vs-commodities to reflect actual state (manually uploaded, live)
- `analytics:sync` script already reconciles by fetching actual YouTube video catalog
- Director session-start protocol should run `analytics:sync` to verify YouTube state

**Prevention:**
- On session start, Director should run `npm run analytics:sync` to get actual YouTube state
- If a video has `youtube.videoId` in config but upload-log says FAILED, check YouTube API before assuming failure
- Consider adding a `verify-upload` npm script that checks if a videoId is actually live

---

### RCA-004: Director Fails to Recognize Cancelled Projects
| Field | Value |
|-------|-------|
| Date | 2026-03-23 |
| Failure Type | context-loss |
| Severity | Low |
| Affected Agent | director |

**What happened:** The sleep-deprivation-economy project was cancelled (config.json has `"status": "cancelled"` and `"cancelReason"`), but in some sessions the Director would still reference it as a pending/active project or suggest resuming it.

**Root cause:** Director prompt didn't explicitly instruct agents to check for and skip cancelled projects. The `status: cancelled` field was present in config but agents treated project existence as evidence of active work.

**Fix applied:**
- Added Hard Rule #14 to AGENTS.md: "Respect Project `status: cancelled` in config.json"
- Cancelled projects are excluded from all pipeline operations and active project counts

---

### RCA-005: YouTube Tag Character Limit Miscalculation
| Field | Value |
|-------|-------|
| Date | 2026-03-23 |
| Failure Type | data-validation-gap |
| Severity | Medium |
| Affected Agent | publisher |

**What happened:** Upload of time-vs-earnings failed with `invalidTags` because tag character count exceeded YouTube's 500-char limit. Naive counting showed 496 chars (under limit), but YouTube counts multi-word tags with +2 chars for implied quotes, making the actual count 542 chars.

**Root cause:** Publisher agent and upload script counted tag characters naively (sum of string lengths + commas) without accounting for YouTube's quote-padding behavior on multi-word tags.

**Fix applied:**
- Added Hard Rule #15 to AGENTS.md: YouTube Tag Character Counting rules
- Removed 3 low-value tags to bring count to 478 YouTube-style chars
- Publisher agent should calculate YouTube-style character count before finalizing metadata

---

*Detail for any entry: ask Director to expand*
