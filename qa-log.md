# QA Log

## Open Action Items

| ID | Issue | Priority | Status |
|----|-------|----------|--------|
| A1 | Create `src/scripts/text-utils.ts` (voiceover word count) | P1 | Open |
| A2 | Create `npm run validate <slug>` (version consistency check) | P1 | Open |
| A3 | Create `.ai/protocols/multi-agent-review.md` + `/review` command | P2 | Open |

## Resolved

| ID | Issue | Resolution |
|----|-------|------------|
| FP-001 | PowerShell `$` escaping on Windows | Added Node.js workarounds to AGENTS.md |
| FP-002 | No multi-agent review protocol | Partial — Director Critic loop defined. Full protocol pending (A3) |
| FP-003 | No mid-edit checkpoint | Change manifest pattern added to content-writer agent |
| FP-004 | Script word count drift vs metadata | Post-edit validation rule added to content-writer agent |
| FP-005 | Director agent unused | Director set as `mode: primary`, entry point documented |

## Root Cause Analyses

*(logged when user gives negative feedback → Director triggers RCA)*

---

*Detail for any entry: ask Director to expand*
