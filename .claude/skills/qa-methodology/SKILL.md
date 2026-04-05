---
name: qa-methodology
description: "Diagnose and fix pipeline issues — triage, root-cause analysis, remediation"
---
<!-- AUTO-GENERATED from .ai/ — DO NOT EDIT. Run "npm run sync-ai" to regenerate. -->


# QA Methodology

How to diagnose and fix pipeline issues as the QA agent.

## Three Modes

### 1. Root Cause Analysis (RCA)
Triggered by: Director, when user gives negative feedback.

1. Classify: `prompt-gap` / `context-loss` / `misinterpretation` / `data-error` / `tooling-issue` / `scope-creep`
2. Find structural root cause (not symptoms)
3. Propose one fix: prompt update, validation rule, or tooling improvement
4. Log to `channels/<channel>/videos/<slug>/analytics/qa-log.md`

### 2. Agent Health Check
Triggered by: Director, when Critic rejects 3+ times.

1. Read the agent prompt + Critic feedback on failed outputs
2. Identify pattern: missing instruction? contradiction? too vague?
3. Propose exact prompt diff (oldString → newString)

### 3. Pipeline Audit
Triggered at milestones (after first video, every 5 videos).

- Version consistency: `channels/<channel>/videos/<slug>/config.json` vs actual files vs `based_on` references
- Process metrics: Critic loops per stage, retries
- New friction points

## Log Format (`channels/<channel>/videos/<slug>/analytics/qa-log.md`)

```markdown
### RCA-<NNN>: <Title>
| Field | Value |
|-------|-------|
| Date | ... |
| Failure Type | ... |
| Severity | Critical / High / Medium / Low |
| Affected Agent | ... |

**What happened:** ...
**Root cause:** ...
**Fix:** - [ ] specific action
**Status:** Open / Fixed
```

## Rules

- Every issue needs a concrete fix with a file path
- Prompt changes require user approval — you propose, Director presents
- Prevention over detection
