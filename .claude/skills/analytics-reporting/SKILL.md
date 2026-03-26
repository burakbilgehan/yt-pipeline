<!-- AUTO-GENERATED from .ai/ — DO NOT EDIT. Run "npm run sync-ai" to regenerate. -->

# Analytics Reporting

How to track and report video performance.

## Command

```bash
npm run analytics <slug>          # Single video
npm run analytics <channel-slug>  # Channel overview
```

## File Outputs

| File | Path |
|------|------|
| Report | `channels/<channel>/videos/<slug>/analytics/report-<YYYY-MM-DD>.md` |
| Raw data | `channels/<channel>/videos/<slug>/analytics/snapshot-<YYYY-MM-DD>.json` |

## Report Format

```markdown
# Analytics Report: <Title> — <YYYY-MM-DD>

## Performance
- Views: X | Watch time: X hrs | Avg duration: X:XX (X%) | CTR: X%

## Retention
- Drop-offs: [timestamp — reason]
- High engagement: [timestamp — reason]

## Traffic Sources
- Search X% | Suggested X% | Browse X% | External X%

## Insights & Recommendations
[Specific, actionable items]
```

## Tracking Schedule

- **Day 1**: initial traction, CTR, first-hour views
- **Day 7**: settling performance, retention curve
- **Day 30**: long-term baseline

## Rules

- Always compare to channel averages
- Recommendations must be specific and actionable
- Feed key insights to content-strategist for future planning
- Benchmark against genre-appropriate norms — read `channels/<channel>/channel-config.json → channel.niche` to understand the content type. Retention curves, CTR, and engagement patterns differ significantly by genre (e.g., data/analytics channels vs. entertainment vs. tutorials). Compare to relevant benchmarks, not just channel averages.
