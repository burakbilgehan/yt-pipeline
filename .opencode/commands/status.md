---
description: Show project pipeline status with version info
agent: director
---
<!-- AUTO-GENERATED from .ai/ — DO NOT EDIT. Run "npm run sync-ai" to regenerate. -->

Show the current status of project: $ARGUMENTS

Read `projects/<slug>/config.json` and report:

1. **Current Work** - What `currentWork` is set to (what's actively being worked on, or null if idle)
2. **Pipeline Stage Versions** - For each stage in the pipeline, show:
   - Stage name
   - Current version number
   - Status (not_started / in_progress / completed / revision_needed)
3. **Version Consistency** - Check if downstream stages reference the latest upstream versions:
   - Does the script's `based_on` match the current research version?
   - Does the storyboard's `basedOn.content` match the current script version?
   - Flag any stale dependencies with ⚠️
4. **Recent History** - Show the last 5 entries from the `history` array (timestamp, event, reason)
5. **What's Next** - Suggest the logical next step based on current state
6. **Blockers** - Any issues preventing progress

Format the output as a clear table where possible.

If no project slug is given, list all projects in the `projects/` directory with their `currentWork` and a summary of stage statuses.
