---
description: Show project status
agent: build
---

Show the current status of project: $ARGUMENTS

Read `projects/$1/config.json` and report:
1. Current pipeline stage
2. What's been completed
3. What's next
4. Any blockers or issues

If no project slug is given, list all projects in the `projects/` directory with their statuses.
