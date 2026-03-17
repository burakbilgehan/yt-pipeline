---
description: Run quality checks on a project's pipeline outputs
agent: qa
---

Quality check the project: $ARGUMENTS

Run through the quality checklist for each completed pipeline stage:
1. Check research for source quality and verified claims
2. Check script for factual accuracy and engagement structure
3. Check storyboard for timing and visual coverage
4. **Always run version consistency checks** — detect stale `based_on` references across stages
5. Summarize issues by severity (Critical / High / Medium / Low)

Write the report to `channels/<channel>/videos/<slug>/qa-report.md`.
