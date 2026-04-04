# Version Management

How versioned files and `channels/<channel>/videos/<slug>/config.json` pipeline state work.

All versioned files live under their respective stage directory within `channels/<channel>/videos/<slug>/`.

## Versioned Files

Pattern: `<name>-v<N>.<ext>` — always in the stage directory:
- Research: `channels/<channel>/videos/<slug>/research/research-v<N>.md`
- Script: `channels/<channel>/videos/<slug>/content/script-v<N>.md`
- Storyboard: `channels/<channel>/videos/<slug>/storyboard/storyboard-v<N>.json`
- SEO notes: `channels/<channel>/videos/<slug>/publishing/seo-notes-v<N>.md`

- Never delete old versions
- Each includes a `based_on` header referencing its source
- `channels/<channel>/videos/<slug>/config.json` tracks current version, full history, and **the exact active file path**

## activePath — Single Source of Truth for File Location

`config.json` stores `activePath` for every pipeline stage. This is the **canonical, absolute path** to the current active file for that stage.

**Rules:**
1. `activePath` is written to `config.json` **before** the agent begins writing the file. This locks the canonical location.
2. No agent ever computes a path from the version number alone. Every agent reads `activePath` from `config.json` to find the current file.
3. Only one `activePath` exists per stage at any time. Creating a new version = updating `activePath` to the new file + archiving is implicit (old file remains, but `activePath` no longer points to it).
4. If an agent receives a file path from the Director, that path must match `activePath` in `config.json`. If there is a discrepancy, **stop and report to Director — do not write to either path.**

## Config Update Pattern

All agents follow this when creating/updating pipeline stages in `channels/<channel>/videos/<slug>/config.json`:

### Create (new stage)
```json
{
  "pipeline.<stage>": {
    "status": "in_progress",
    "version": 1,
    "activePath": "channels/<channel>/videos/<slug>/<dir>/<name>-v1.<ext>"
  }
}
```
Write `activePath` first. Then create the file at that exact path. Add a history entry:
```json
{ "action": "<stage>.started", "version": 1, "at": "<ISO date>", "agent": "<your-agent-name>" }
```

### Revise (new version)
1. Compute the new path: increment version number.
2. **Update `activePath` in config.json to the new path.**
3. Then write the new file at that path.
4. Add a history entry:
```json
{ "action": "<stage>.reopened", "version": <N>, "at": "<ISO date>", "agent": "<your-agent-name>", "reason": "<why>" }
```

### Complete (approval received)
Set `status: "completed"`. `activePath` stays unchanged — it still points to the approved file. Add a history entry:
```json
{ "action": "<stage>.completed", "version": <N>, "at": "<ISO date>", "agent": "<your-agent-name>" }
```

## History Entry Format

**Canonical format** (single source of truth: `src/types/index.ts → HistoryEntry`):

| Field | Required | Description |
|-------|----------|-------------|
| `action` | ✓ | `"<stage>.started"`, `"<stage>.completed"`, `"<stage>.reopened"`, `"<stage>.restarted"`, `"project.created"`, `"project.cancelled"` |
| `at` | ✓ | ISO date string |
| `version` | — | Which version was active (omit for project-level events) |
| `reason` | — | Why this happened (required for reopened/restarted) |
| `agent` | — | Which agent or script performed the action |

**Do not use** `"event"` or `"timestamp"` keys — those are legacy. Existing entries with those keys are fine to keep, but never write new ones.

## Status Verification

Local config can drift from reality:
- **Published but still "in_progress"**: After YouTube upload, verify via `npm run analytics <slug>` or YouTube API. If published, update to `"completed"` and add `{ "action": "publishing.completed", ... }` to history.
- **Cancelled verification**: If a project appears abandoned, check with user before marking `"cancelled"`. Once cancelled, all agents skip it.
- **Single source of truth**: `channels/<channel>/videos/<slug>/config.json` is the ONLY place pipeline status lives. No duplicate status in other files.

## Version Mismatch Detection

If upstream stage was revised after downstream was created:
- Example: content v3, but storyboard was based on content v2
- Flag to Director with recommendation to re-run downstream stages
- Check `basedOn` in storyboard JSON against current content version

## File Header

Every versioned file starts with:
```
> version: <N>
> based_on: <source>-v<X>
> changes_from_prev: <what changed>
> date: <ISO date>
```
