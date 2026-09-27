---
name: math-verification
description: "Verify all on-screen calculations before they reach viewers"
---

# Math Verification

Every number a viewer hears or sees is a claim in `research/claims.json`; every number computed from other numbers is a `derive` claim (sum, diff, product, ratio, share, pct-change). `npm run claims -- <slug>` recomputes each derivation and fails when the stated value is off by more than half a unit of its last decimal. Nobody, model included, computes a derived number by hand.

## Your part: the judgment the script cannot make

- **Right operation, right base.** A percent change is from the earlier value; a share divides by the whole, not by another part.
- **Comparable inputs.** Same period, same unit, same definition (nominal vs real, PPP vs market rate, gross vs net, calendar vs fiscal year). The script checks arithmetic, not whether the two claims should be combined.
- **Currency and inflation.** Conversions use a sourced rate for the stated date, which is itself a claim.
- **Rounding once.** Derive from the unrounded source values, then round the result for speech; never derive from already rounded figures.
- **Rankings.** A ranking shown on screen must match the values it shows.
- **Renderer-derived values.** The catalog computes some values on screen: the compare-values delta (signed change and percent of the first item), the big-number remainder and difference, and the ranked-bars scale ticks. Each derived value the narration speaks needs its own `derive` claim.

A wrong number shown to viewers blocks the render: fix the claim, not the check.
