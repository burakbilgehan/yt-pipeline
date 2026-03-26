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
- `channels/<channel>/videos/<slug>/config.json` tracks current version and full history

## Config Update Pattern

All agents follow this when creating/updating pipeline stages in `channels/<channel>/videos/<slug>/config.json`:

### Create (new stage)
```json
{
  "pipeline.<stage>": { "status": "in_progress", "version": 1 }
}
```
Add `<stage>.started` to history array.

### Revise (new version)
Increment version number. Add `<stage>.reopened` to history with reason.

### Complete (approval received)
Set `status: "completed"`. Add `<stage>.completed` to history.

## Status Verification

Local config can drift from reality:
- **Published but still "in_progress"**: After YouTube upload, verify via `npm run analytics <slug>` or YouTube API. If published, update to `"completed"` and add `publishing.completed` to history.
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
