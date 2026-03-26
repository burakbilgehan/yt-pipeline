# Math Verification

Verify all on-screen calculations before they reach viewers.

## When to Run

- Critic reviews production stage deliverables
- Before any render that displays numbers, formulas, or comparisons
- Any scene with `dataVisualization` type

## Process

1. **Extract** all on-screen formulas, divisions, comparisons from scene configs
2. **Compute** each formula independently (do NOT trust the displayed result)
3. **Compare** computed result against what will be displayed
4. **Check** intermediate steps are shown when needed (e.g., annual → hourly → per-unit)
5. **Verify** rankings match the underlying data

## Common Traps

- Rounding at different points gives different results
- Mixing adjusted/unadjusted data sources (e.g., nominal vs PPP GDP)
- Currency conversion with stale rates
- Percentages computed from wrong base
- Rankings that don't match the actual values shown

## Severity

**Wrong math displayed to viewers = automatic FAIL.** Minimum D grade from Critic.

This is a **blocking check** — no render proceeds with unverified math.

## Output

```
MATH CHECK: <scene-id>
STATUS: VERIFIED | MISMATCH

Formula: <what's displayed>
Expected: <independently computed result>
Displayed: <what the viewer sees>
Verdict: MATCH | MISMATCH — <explanation>
```
