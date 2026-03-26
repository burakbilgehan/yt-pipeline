# yt-pipeline — YouTube Channel Factory Framework

AI-powered video production pipeline — from research to publishing.

## Core Rules

- **Turkish conversation, English content.** All YouTube output (scripts, metadata, reports) in English.
- **TypeScript** everywhere in code.
- **Never auto-chain** pipeline stages — wait for explicit user approval.
- **Config over hardcoding.** If a value exists in config, use it. Fall back to `pipeline-defaults.json`.
- **`status: cancelled` = dead.** Skip in all operations.

## Source of Truth: `.ai/`

Agent/command/skill definitions live in `.ai/`. **Only edit files here.**
`.claude/`, `.opencode/`, `opencode.json` are auto-generated — sync with `npm run sync-ai`.

```
.ai/
├── agents/       # Agent personas (lean — "how you think")
├── commands/     # Slash commands
├── skills/       # Focused operational modules (referenced by agents via skills: frontmatter)
├── protocols/    # Multi-step coordination workflows
└── sync.ts       # Sync script
```

## Architecture

**Pipeline** (git): framework code, agent prompts, Remotion templates, scripts — generic, channel-agnostic.
**Content** (local only): video projects, research, scripts, renders — channel-specific, in `channels/`.

## Project Resolution Protocol

1. **Channel**: look under `channels/`. If only one, use it. If multiple, require `--channel <slug>` or ask.
2. **Video**: `channels/<channel>/videos/<slug>/`.
3. **Validation**: confirm `config.json` exists. If not, project doesn't exist.
4. **Active project shortcut**: read all `config.json` files to find `status: "in_progress"`.
5. **Cancelled**: skip any `"status": "cancelled"`.

## Directory Structure

```
yt-pipeline/                          ← git repo (infrastructure only)
├── src/                              # Remotion, scripts, types, utils
├── .ai/                              # Agents, skills, commands (source of truth)
├── templates/
│   ├── channel-config.json           # Channel config template
│   ├── pipeline-defaults.json        # Pipeline-wide defaults
│   ├── tts-style-guide.md            # SSML/markup reference
│   └── project/                      # Video project folder template
├── public/<video-slug>/              # Remotion assets (gitignored)
└── package.json

channels/                             ← local only, NOT in git
└── <channel-slug>/
    ├── channel-config.json           # Channel identity, tone, visuals, TTS config
    ├── channel-assets/               # Brand assets (logos, guides, design tokens)
    │   └── brand-guide.md            # Visual bible
    ├── cache/                        # Analytics runtime cache (auto-managed)
    ├── publishing/                   # Channel-level publishing docs (SEO setup, etc.)
    ├── research/                     # Channel-level research (TTS comparisons, etc.)
    └── videos/
        └── <video-slug>/
            ├── config.json           # Pipeline state & versions
            ├── research/
            │   ├── data/             # Raw data files, CSVs
            │   └── sources/          # Source references
            ├── content/
            ├── storyboard/
            │   ├── scenes/           # Active scene detail files (scene-NNN.json)
            │   └── _archive/         # Superseded storyboard versions
            ├── production/
            │   ├── audio/            # TTS output (.wav + audio-manifest.json)
            │   │   ├── bgm/          # Background music files
            │   │   └── _archive/     # Superseded audio versions
            │   ├── visuals/          # Stock media, AI images, hook videos
            │   ├── output/           # Rendered videos + test renders/stills
            │   └── test-renders/     # Frame-by-frame test stills (.png)
            ├── publishing/
            └── analytics/
```

## Canonical Locations

| Thing | Location | Never put here |
|-------|----------|----------------|
| Test renders / stills | `production/test-renders/` | Repo root, `preview/` |
| Background music | `production/audio/bgm/` | Repo root, video root `bgm/` |
| Stock media + hook videos | `production/visuals/` | `public/`, video root |
| TTS audio | `production/audio/` | Anywhere else |
| Final render | `production/output/final.mp4` | `out/` |
| Storyboard archives | `storyboard/_archive/` | `storyboard/scenes-v*/` |
| Brand assets | `channel-assets/` | Channel root |

## File & Directory Hygiene

- **No files at video root** except `config.json`. Everything goes in its pipeline subdirectory.
- **No ad-hoc directories.** Only directories defined in the template above are valid. `preview/`, `bgm/` at video root, `background-music/`, `voice-samples/`, `edge-tts-backup/` inside `production/audio/` are all non-standard and must be moved or removed during audit.
- **No `video-config.json`.** Pipeline state lives in `config.json`. Remotion render props go in `production/render-props.json`.
- **Storyboard format is JSON.** `storyboard-v<N>.json` is canonical. Markdown storyboards (`storyboard-v<N>.md`) are legacy and should not be created for new projects. Existing ones are kept as history.
- **Pipeline status values** must be one of: `pending`, `in_progress`, `completed`, `cancelled`, `active`. Never use `complete` (missing -d).
- **Scene files live in `storyboard/scenes/`** — always the current/latest version. Superseded scenes go to `storyboard/_archive/`.
- **Audio format**: new projects use WAV (from Chirp 3 HD). Legacy projects may have MP3 — don't convert, just note in config.
- **History event format**: use `{ "event": "<stage>.<action>", "timestamp": "...", "agent": "...", "details": "..." }`. Legacy entries may use `"action"` key — don't retroactively fix published projects.

## Config Files

| File | Scope | What it configures |
|------|-------|--------------------|
| `channel-config.json` | Per channel | TTS voice/model, brand colors, fonts, resolution, YouTube defaults |
| `pipeline-defaults.json` | Global | WPM, pause durations, format specs, tag limits, stock constraints |
| `config.json` | Per video | Pipeline versions, status, history, format, target length |
| `brand-guide.md` | Per channel | Visual bible — colors, fonts, image style, animation rules |

## NPM Scripts

```bash
npm run new-channel <slug> [name]
npm run new-video <slug> [title] [--channel <slug>]
npm run tts <slug>
npm run render <slug>
npm run upload <slug>
npm run analytics [slug|channel]
npm run collect <slug> <type> <query>
npm run generate-image <slug> <prompt>
npm run studio -- --public-dir <project-path>
npm run sync-ai
```

## Orchestration Model

**Director** is the primary orchestrator:
- **Review Protocol**: automatic after every deliverable. Single source of truth: `.ai/protocols/multi-agent-review.md`. Covers Critic gate, fix routing, specialist spot-checks, loop limits.
- **QA Loop**: reactive — triggered by user negative feedback or 3+ Critic failures.
- **Content Strategist Alignment**: auto at project start and script finalization. Score 1-5.
- **Stage transitions**: never automatic — require user approval.

## Windows / PowerShell

- `$variable` in Bash tool calls gets eaten by PowerShell. Use Node.js one-liners or `npx tsx` instead.
- Use forward slashes `/` in code paths.
- Files may have `\r\n` line endings.
