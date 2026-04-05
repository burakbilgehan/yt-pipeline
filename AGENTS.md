# yt-pipeline — YouTube Channel Factory Framework

AI-powered video production pipeline — from research to publishing.

## Core Rules

- **NEVER batch-write.** Any output expected to exceed ~50 lines MUST be written incrementally: outline first → write to file → expand section by section → revise in place. Never "prepare" a large file in memory and write it all at once. This is the single most important rule in this project. See `incremental-writing` skill for details.
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

Two separate git repos, both cloned side-by-side on every workstation:

| Repo | GitHub | Visibility | Root dir | What it holds |
|------|--------|-----------|----------|---------------|
| **Infrastructure** | `burakbilgehan/yt-pipeline` | Public | `yt-pipeline/` | Framework code, agent prompts, Remotion templates, scripts — generic, channel-agnostic |
| **Content** | `burakbilgehan/yt-pipeline-content` | Private | `yt-pipeline/channels/` | Video projects, research, scripts, configs — channel-specific |

### Setup on a new machine

```bash
git clone https://github.com/burakbilgehan/yt-pipeline.git
cd yt-pipeline
git clone https://github.com/burakbilgehan/yt-pipeline-content.git channels
npm install
```

### Key points

- `channels/` is gitignored by the infra repo — it's a nested but independent repo.
- Content repo tracks **text files only** (configs, scripts, research, storyboards). All media (mp4, wav, mp3, png, jpg, etc.) is gitignored in the content repo.
- `dist/` is regenerable (`npm run build` = `tsc`), not tracked in either repo.
- Commit and push each repo independently. They have no git-level dependency (no submodules).

## Project Resolution Protocol

1. **Channel**: look under `channels/`. If only one, use it. If multiple, require `--channel <slug>` or ask.
2. **Video**: `channels/<channel>/videos/<slug>/`.
3. **Validation**: confirm `channels/<channel>/videos/<slug>/config.json` exists. If not, project doesn't exist.
4. **Active project shortcut**: read all `channels/<channel>/videos/<slug>/config.json` files to find `status: "in_progress"`.
5. **Cancelled**: skip any `"status": "cancelled"`.

## Directory Structure

This is the SINGLE SOURCE OF TRUTH for all file and directory locations in the pipeline. Every file the pipeline creates, collects, or uses must have a home defined here. If a new need arises requiring new files/directories, update this section FIRST.

```
yt-pipeline/                                        ← git repo (infrastructure only)
├── src/
│   ├── components/
│   │   └── ui/                                     # shadcn/ui primitives ONLY (npx shadcn add ...)
│   ├── lib/
│   │   └── utils.ts                                # cn() helper (clsx + tailwind-merge)
│   ├── remotion/
│   │   ├── styles.css                              # Tailwind v4 + shadcn CSS variables
│   │   ├── design-system/
│   │   │   ├── DESIGN-SYSTEM.md                    # DS reference doc (source of truth)
│   │   │   ├── types.ts                            # L1-L5 TypeScript interfaces
│   │   │   ├── registry.ts                         # Runtime registries (register*/get*)
│   │   │   ├── component-catalog.json              # Machine-readable component catalog
│   │   │   ├── index.ts                            # Barrel exports
│   │   │   ├── atmospheres/                        # L2: full-screen background layers
│   │   │   │   └── index.ts                        # Exports + registrations
│   │   │   ├── motion/                             # L3: animation primitives
│   │   │   │   └── index.ts                        # Exports + registrations
│   │   │   ├── surfaces/                           # L4: card/container treatments
│   │   │   │   └── index.ts                        # Exports + registrations
│   │   │   └── showcase/                           # Visual demo compositions (DS- prefix)
│   │   ├── components/                             # Shared Remotion components (ProgressBar, etc.)
│   │   ├── compositions/                           # Remotion entry compositions
│   │   └── templates/                              # Scene-level templates (data-charts, etc.)
│   ├── scripts/                                    # CLI scripts (tts, render, upload, etc.)
│   └── types/                                      # Shared TypeScript types
├── .ai/                                            # Agents, skills, commands (source of truth)
├── templates/
│   ├── channel-config.json                         # Channel config template
│   ├── pipeline-defaults.json                      # Pipeline-wide defaults
│   ├── tts-style-guide.md                          # SSML/markup reference
│   └── project/                                    # Video project folder template
├── public/<video-slug>/                            # Remotion assets (gitignored)
└── package.json

channels/                                           ← local only, NOT in git
└── <channel>/
    ├── channel-config.json                         # Channel identity, tone, visuals, TTS config
    ├── channel-assets/                             # Brand assets (logos, guides, design tokens)
    │   └── brand-guide.md                          # Visual bible
    ├── cache/                                      # Analytics runtime cache (auto-managed)
    ├── publishing/                                 # Channel-level publishing docs
    │   └── content-calendar.md                     # Content calendar
    ├── research/                                   # Channel-level research (TTS comparisons, etc.)
    └── videos/
        └── <slug>/
            ├── config.json                         # Pipeline state & versions (ONLY file at video root)
            ├── research/
            │   ├── research-v<N>.md                # Versioned research document
            │   ├── data/                           # Raw data files, CSVs
            │   └── sources/                        # Source references, saved articles
            ├── content/
            │   ├── script-v<N>.md                  # Versioned video script
            │   └── changes-v<N>.md                 # Batch edit manifest (when 3+ changes)
            ├── storyboard/
            │   ├── storyboard-v<N>.json            # Skeleton → final storyboard (JSON only)
            │   ├── storyboard-summary-v<N>.md      # Human-readable summary
            │   ├── critique-v<N>.md                # Critic feedback
            │   ├── scenes/                         # Active scene detail files
            │   │   └── scene-NNN.json              # Per-scene visual details
            │   └── _archive/                       # Superseded storyboard versions
            ├── production/
            │   ├── audio/                          # TTS output (.wav)
            │   │   ├── {section}--{scene-id}.wav   # TTS audio files
            │   │   ├── audio-manifest.json         # Duration, word count, speed per block
            │   │   ├── bgm/                        # Background music files
            │   │   └── _archive/                   # Superseded audio versions
            │   ├── visuals/                        # Stock media, AI images, hook videos
            │   │   └── asset-log.md                # Download log for all collected assets
            │   ├── output/                         # Rendered videos
            │   │   └── final.mp4                   # Final render (only permanent file)
            │   ├── test-renders/                   # Frame-by-frame test stills (.png)
            │   └── render-props.json               # Remotion render configuration
            ├── publishing/
            │   └── seo-notes-v<N>.md               # SEO optimization notes
            └── analytics/
                ├── analytics-<YYYY-MM-DD>.json     # Snapshot-based performance data
                └── qa-report.md                    # QA audit report
```

## Canonical Locations

| Thing | Full Path | Never put here |
|-------|-----------|----------------|
| Test renders / stills | `channels/<channel>/videos/<slug>/production/test-renders/` | Repo root, `preview/` |
| Background music | `channels/<channel>/videos/<slug>/production/audio/bgm/` | Repo root, video root `bgm/` |
| Stock media + hook videos | `channels/<channel>/videos/<slug>/production/visuals/` | `public/`, video root |
| TTS audio | `channels/<channel>/videos/<slug>/production/audio/` | Anywhere else |
| Final render | `channels/<channel>/videos/<slug>/production/output/final.mp4` | `out/` |
| Storyboard archives | `channels/<channel>/videos/<slug>/storyboard/_archive/` | `storyboard/scenes-v*/` |
| Brand assets | `channels/<channel>/channel-assets/` | Channel root |
| Content calendar | `channels/<channel>/publishing/content-calendar.md` | Repo root |
| QA report | `channels/<channel>/videos/<slug>/analytics/qa-report.md` | Video root |
| DS atmosphere components | `src/remotion/design-system/atmospheres/<Name>.tsx` | `src/components/ui/`, repo root |
| DS motion primitives | `src/remotion/design-system/motion/<Name>.tsx` | `src/components/ui/`, repo root |
| DS surface components | `src/remotion/design-system/surfaces/<Name>.tsx` | `src/components/ui/`, repo root |
| DS showcase compositions | `src/remotion/design-system/showcase/<Name>Showcase.tsx` | `src/remotion/compositions/` |
| DS reference doc | `src/remotion/design-system/DESIGN-SYSTEM.md` | Anywhere else |
| Component catalog | `src/remotion/design-system/component-catalog.json` | Anywhere else |
| shadcn/ui primitives | `src/components/ui/<name>.tsx` | `src/remotion/design-system/` |

## File & Directory Hygiene

- **No files at video root** except `config.json`. Everything goes in its pipeline subdirectory.
- **No ad-hoc directories.** Only directories defined in the Directory Structure above are valid. `preview/`, `bgm/` at video root, `background-music/`, `voice-samples/`, `edge-tts-backup/` inside `production/audio/` are all non-standard and must be moved or removed during audit.
- **No `video-config.json`.** Pipeline state lives in `channels/<channel>/videos/<slug>/config.json`. Remotion render props go in `channels/<channel>/videos/<slug>/production/render-props.json`.
- **Storyboard format is JSON.** `storyboard-v<N>.json` is canonical. Markdown storyboards (`storyboard-v<N>.md`) are legacy and should not be created for new projects. Existing ones are kept as history.
- **Pipeline status values** must be one of: `pending`, `in_progress`, `completed`, `cancelled`, `active`. Never use `complete` (missing -d).
- **Scene files live in `storyboard/scenes/`** — always the current/latest version. Superseded scenes go to `storyboard/_archive/`.
- **Audio format**: new projects use WAV (from Chirp 3 HD). Legacy projects may have MP3 — don't convert, just note in config.
- **History entry format**: use `{ "action": "<stage>.<event>", "at": "<ISO date>", "version": <N>, "reason": "...", "agent": "..." }`. This matches `src/types/index.ts → HistoryEntry` — the single source of truth. Legacy entries with `"event"` or `"timestamp"` keys exist in old projects — do not retroactively fix, do not write new ones in that format.

## Config Files

| File | Full Path | Scope | What it configures |
|------|-----------|-------|--------------------|
| `channel-config.json` | `channels/<channel>/channel-config.json` | Per channel | TTS voice/model, brand colors, fonts, resolution, YouTube defaults |
| `pipeline-defaults.json` | `templates/pipeline-defaults.json` | Global | WPM, pause durations, format specs, tag limits, stock constraints |
| `config.json` | `channels/<channel>/videos/<slug>/config.json` | Per video | Pipeline versions, status, history, format, target length |
| `brand-guide.md` | `channels/<channel>/channel-assets/brand-guide.md` | Per channel | Visual bible — colors, fonts, image style, animation rules |

## NPM Scripts

```bash
npm run new-channel <slug> [name]
npm run new-video <slug> [title] [--channel <slug>]
npm run tts <slug>
npm run render <slug>
npm run upload <slug>
npm run analytics [slug|channel]
npm run collect <slug> <type> <query>
npm run studio -- --public-dir <project-path>
npm run sync-ai
```

## Orchestration Model

**Director** is the primary orchestrator:
- **Review Protocol**: opt-in only — run on user request or when output quality is clearly insufficient. Source: `.ai/protocols/multi-agent-review.md`. Do not run automatically after every deliverable.
- **QA Loop**: reactive — triggered by user negative feedback or 3+ Critic failures.
- **Content Strategist Alignment**: on request only.
- **Stage transitions**: never automatic — require user approval.

## Windows / PowerShell

- `$variable` in Bash tool calls gets eaten by PowerShell. Use Node.js one-liners or `npx tsx` instead.
- Use forward slashes `/` in code paths.
- Files may have `\r\n` line endings.
