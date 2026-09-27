---
name: publish
description: "Publishing stage (gate 4) of a layout-2 video: metadata, thumbnail, final render, preflight gates, the user's final viewing, and the upload command for the user. User-invoked."
disable-model-invocation: true
argument-hint: "<slug>"
---

# Publishing stage

The gates live in `src/pipeline/gates.ts`; `npm run preflight -- <slug>` prints them and the upload script refuses to run unless all pass.

## Steps

1. **Metadata.** Write `publishing/metadata.json` with the `youtube-metadata` and `seo-optimization` skills. Then `npm run metadata -- <slug>`: it validates the file and generates `description.txt` and `tags.txt`. Fix every error it reports; never edit the generated files.
2. **Thumbnail.** `publishing/thumbnail.png` or `.jpg`, 1280x720, under 2 MB. Its style follows `channels/<channel>/channel-assets/brand-guide.md`. If none exists, ask the user; do not invent one.
3. **Render.** If the `render` gate fails, `npm run render -- <slug>`. The renderer stamps which render input produced `final.mp4`, so any later change to a block makes the gate fail again.
4. **Gates.** `npm run preflight -- <slug>`. Report failures with their fix; do not work around a gate. Only the user can override a gate, by adding `--override <gate>="<reason>"` to the upload command (logged in `upload-log.md`; background music and metadata cannot be overridden). Mention it only when a gate is wrong, for example a verifier verdict the user has disproved.
5. **Final viewing (gate 4).** Open `production/output/final.mp4` for the user by its full path and ask them to watch it end to end. Their approval is the only way past this step.
6. **Upload is the user's.** Print `npm run upload -- <slug>` for them to run. Uploads cost API quota (about 6 a day, `templates/pipeline-defaults.json`) and a failed or timed-out upload may still have been processed: after any failure, check YouTube Studio before running it again.
7. **After upload.** Read `publishing/upload-log.md`: the video id is also saved to `config.json` `youtube`. Metadata changes after upload go through `publishing/metadata.json` and `npm run youtube-update -- <slug>`, also run by the user.
