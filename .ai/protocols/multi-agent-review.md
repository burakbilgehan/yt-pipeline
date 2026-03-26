# Multi-Agent Review Protocol

A structured review workflow for pipeline deliverables that combines Critic + domain specialist feedback before a deliverable is presented to the user.

## When to Use

Invoke this protocol (via `/review <slug> <stage>`) when:
- A stage deliverable is ready and **before presenting it to the user**
- The Critic loop produced a FAIL and you need to route fixes intelligently
- The user requests an explicit review of a specific stage

Do **not** invoke for:
- Minor text edits or typo fixes
- Config file changes
- Already-approved deliverables being reused unchanged

---

## Protocol Steps

### Step 1 — Critic Gate

Invoke `critic` with:
- The deliverable file path (latest version)
- The stage name (`research`, `content`, `storyboard`, `production`, `publishing`)
- The project slug

Critic returns:
- **Grade:** A / B / C / D / F
- **Verdict:** PASS (A or B) or FAIL (C, D, F)
- **Issues:** categorized list (Factual / Quality / Structure / Completeness)

**If PASS → skip to Step 3.**

---

### Step 2 — Fix Routing (on FAIL)

Route each issue to the appropriate specialist:

| Issue Type | Route To |
|------------|----------|
| Factual errors, unverified claims | `researcher` (verify/correct) |
| Missing data, sources, context | `collector` (gather) |
| Writing quality, structure, pacing | `content-writer` (rewrite) |
| Visual planning issues | `storyboard` agent (revise) |
| Render/audio/sync issues | `video-production` (fix) |
| SEO, metadata quality | `youtube-expert` (optimize) |

After each round of fixes:
- Increment the version number in the fixed file's header
- Return to **Step 1** (max 3 total Critic loops)

**If still FAIL after 3 loops:**
- Present to user anyway, clearly labeled with remaining issues
- Log the repeated failure in `qa-log.md` (possible agent prompt issue)

---

### Step 3 — Specialist Spot-Check (stage-dependent)

After Critic PASS, run the domain specialist:

| Stage | Specialist |
|-------|-----------|
| `research` | `researcher` — source credibility check |
| `content` | `youtube-expert` — hook strength, retention pacing |
| `storyboard` | `storyboard` agent — timing feasibility self-check |
| `production` | Math/formula verification (see below) |
| `publishing` | `youtube-expert` — SEO score, tag completeness |

Specialist check is a **lightweight pass** (not a full rewrite). It returns:
- 1-3 specific improvement suggestions (or "looks good")
- A confidence score (1-5) for that deliverable

If confidence ≤ 2: treat as soft FAIL, route back to appropriate agent once.

### Step 3b — Math/Formula Verification (production stage ONLY)

For production reviews, before presenting to user:
1. Extract ALL on-screen formulas, divisions, comparisons from scene configs
2. Compute each formula independently (not trusting the displayed result)
3. Flag any mismatch between computed and displayed values
4. Check intermediate steps are shown when needed (e.g., annual→hourly→BigMacs/hr)
5. Verify rankings match the underlying data

**This is a BLOCKING check.** Wrong math on screen = automatic FAIL regardless of other quality.

---

### Step 4 — Present to User

Summarize the review with:

```
## Review Summary — <stage> v<N>

**Critic:** Grade <X> — PASS
**Specialist check (<agent>):** Confidence <N>/5

### What the review caught:
- Round 1: [issue] → [fix]
- Round 2: [issue] → [fix] (if applicable)

### Final state:
[1-2 sentence summary of the deliverable's quality]

**Ready for user approval.**
```

---

## Version Update Rule

Every time a deliverable is revised during the review loop:
1. Increment the version number in the file header
2. Update `changes_from_prev` in the header
3. Update `channels/<channel>/videos/<slug>/config.json` stage version to match

---

## Loop Limits

| Loop | Action |
|------|--------|
| Loop 1 | Fix → re-review |
| Loop 2 | Fix → re-review |
| Loop 3 | Fix → re-review |
| Loop 4+ | Present to user with issue list + log in qa-log.md |

Never silently accept a failing deliverable. Always surface issues to the user.
