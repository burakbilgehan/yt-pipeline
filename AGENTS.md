# yt-pipeline — YouTube Channel Factory Framework

You are part of the **yt-pipeline** YouTube channel factory framework. This project automates the full video production pipeline — from research to publishing — using AI agents.

## Core Rules

- **All conversation with the user is in Turkish.** YouTube content (scripts, metadata, reports) is in English.
- Use **TypeScript** everywhere in code.
- Follow the architecture defined in [agents-plan.md](agents-plan.md).
- Never auto-chain pipeline stages — always wait for explicit user approval before invoking the next agent.

## Single Source of Truth: `.ai/`

Agent and command definitions live in `.ai/agents/` and `.ai/commands/`. These are the **only** files you should edit for agent/command changes.

- `.claude/agents/`, `.claude/commands/` — **AUTO-GENERATED, DO NOT EDIT**
- `.opencode/agents/`, `.opencode/commands/` — **AUTO-GENERATED, DO NOT EDIT**
- `opencode.json` — **AUTO-GENERATED, DO NOT EDIT**

**If you need to update an agent or command, edit the file in `.ai/`, NEVER in `.opencode/` or `.claude/`.** Changes to generated files will be overwritten on next sync. Manual sync: `npm run sync-ai`.

## Architecture Overview

The project has two distinct layers:

### Pipeline (lives in git)
Framework code — agent prompts, slash commands, TypeScript types, Remotion templates, Node.js scripts, template files. These are **generic** and **channel-agnostic**.

### Content (does NOT live in git)
Video projects, research files, scripts, storyboards, renders, publishing metadata, analytics. These are **channel-specific** and live in `projects/` locally.

## Key Files & Directories

| Path | Purpose |
|------|---------|
| `channel-config.json` | Channel identity, tone, visuals, YouTube defaults |
| `agents-plan.md` | Full architecture decisions and agent definitions |
| `projects/<slug>/config.json` | Per-project pipeline state and version history |
| `src/remotion/` | Video rendering engine (Remotion + TypeScript) |
| `src/scripts/` | Node.js scripts: TTS, render, upload, analytics, collect |
| `templates/` | Starter templates for new projects |

## NPM Scripts (for heavy tasks)

```bash
npm run new-project <slug> [title]   # Create new project
npm run tts <slug>                   # ElevenLabs TTS voiceover
npm run render <slug>                # Remotion video render
npm run upload <slug>                # YouTube upload
npm run analytics [slug|channel]     # Fetch YouTube analytics
npm run collect <slug> <type> <query># Pexels stock download
npm run generate-image <slug> <prompt># AI image generation
npm run studio                       # Open Remotion Studio
npm run sync-ai                      # Sync .ai/ → .claude/ + .opencode/
```

## Version Management

Every pipeline stage uses versioned files (`script-v1.md`, `script-v2.md`, etc.). Old versions are **never deleted**. Each file includes a version header with `based_on` reference to its upstream source. `config.json` tracks current version and full history per project.

## Channel Maturity Model

`channel-config.json` → `channel.maturity` controls how agents adapt:
- `seed` — new channel, use generic best practices
- `growing` — 5-20 videos, start adapting to early data
- `established` — 20+ videos, optimize based on analytics
- `mature` — 50+ videos, full channel identity locked in
