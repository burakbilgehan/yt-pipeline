# QA Log

## Open Action Items

*None.*

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

*(logged when user gives negative feedback → Director triggers RCA)*

---

*Detail for any entry: ask Director to expand*
