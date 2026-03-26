<!-- AUTO-GENERATED from .ai/ — DO NOT EDIT. Run "npm run sync-ai" to regenerate. -->

# YouTube Upload

Workflow for uploading videos to YouTube and verifying success.

## Command

```bash
npm run upload <slug>
```

## Pre-Upload Checklist

1. `channels/<channel>/videos/<slug>/production/output/final.mp4` exists
2. `channels/<channel>/videos/<slug>/publishing/metadata-v<N>.json` exists and is complete
3. Tags validated (total chars, forbidden chars)
4. User has explicitly approved the upload

## Upload Verification

**Upload failure ≠ not published.** The API may timeout but still process the upload.

After upload:
1. Check the upload log (`channels/<channel>/videos/<slug>/publishing/upload-log.md`)
2. If error: verify YouTube Studio manually before retrying
3. If success: log video ID and URL

## API Quota

- ~6 uploads per day (read `templates/pipeline-defaults.json → youtube.apiQuotaUploadsPerDay`)
- Failed attempts still consume quota
- Plan uploads accordingly — don't retry blindly

## File Outputs

| File | Content |
|------|---------|
| `channels/<channel>/videos/<slug>/publishing/publish-plan-v<N>.md` | Upload strategy and schedule |
| `channels/<channel>/videos/<slug>/publishing/metadata-v<N>.json` | Title, description, tags, category |
| `channels/<channel>/videos/<slug>/publishing/upload-log.md` | Upload attempts, results, video IDs |
