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
Video projects, research files, scripts, storyboards, renders, publishing metadata, analytics. These are **channel-specific** and live in `channels/` locally.

## Directory Structure

```
yt-pipeline/                          ← git repo (infrastructure only)
├── src/                              # Remotion, scripts, types, utils
├── .ai/                              # Agent & command definitions (source of truth)
├── templates/
│   ├── channel-config.json           # Channel config template
│   ├── default-config.json           # Video config template
│   └── project/                      # Full video project folder template
├── public/<video-slug>/              # Remotion assets (gitignored, populated at render time)
├── .env.example
└── package.json

channels/                             ← local only, NOT in git
└── <channel-slug>/
    ├── channel-config.json           # This channel's config
    ├── channel-assets/               # Profile photo, banner, etc.
    └── videos/
        └── <video-slug>/
            ├── config.json           # Pipeline state & version history
            ├── research/
            ├── content/
            ├── storyboard/
            ├── production/
            │   ├── audio/
            │   ├── visuals/
            │   └── output/           # Rendered videos
            ├── publishing/
            └── analytics/
```

## Key Files & Directories

| Path | Purpose |
|------|---------|
| `channels/<channel>/channel-config.json` | Channel identity, tone, visuals, YouTube defaults |
| `channels/<channel>/videos/<slug>/config.json` | Per-video pipeline state and version history |
| `templates/channel-config.json` | Starter template for new channels |
| `templates/project/` | Starter template for new video projects |
| `agents-plan.md` | Full architecture decisions and agent definitions |
| `src/remotion/` | Video rendering engine (Remotion + TypeScript) |
| `src/scripts/` | Node.js scripts: TTS, render, upload, analytics, collect |
| `public/<slug>/` | Remotion render assets (gitignored) |

## NPM Scripts (for heavy tasks)

```bash
npm run new-channel <slug> [name]              # Create new channel
npm run new-video <slug> [title] [--channel <slug>]  # Create new video project
npm run tts <slug>                             # ElevenLabs TTS voiceover
npm run render <slug>                          # Remotion video render
npm run upload <slug>                          # YouTube upload
npm run analytics [slug|channel]               # Fetch YouTube analytics
npm run collect <slug> <type> <query>          # Pexels stock download
npm run generate-image <slug> <prompt>         # AI image generation
npm run studio                                 # Open Remotion Studio
npm run sync-ai                                # Sync .ai/ → .claude/ + .opencode/
```

## Channel Config Location

Agents must look for `channel-config.json` at:
1. `channels/<channel-slug>/channel-config.json` (primary)
2. Auto-detect: first directory found under `channels/`
3. Legacy fallback: `channel-config.json` at repo root (deprecated)

## Version Management

Every pipeline stage uses versioned files (`script-v1.md`, `script-v2.md`, etc.). Old versions are **never deleted**. Each file includes a version header with `based_on` reference to its upstream source. `config.json` tracks current version and full history per project.

## Channel Maturity Model

`channel-config.json` → `channel.maturity` controls how agents adapt:
- `seed` — new channel, use generic best practices
- `growing` — 5-20 videos, start adapting to early data
- `established` — 20+ videos, optimize based on analytics
- `mature` — 50+ videos, full channel identity locked in

## Orchestration Model

The **Director agent** is the primary orchestrator. All production sessions should start with the Director. The orchestration model has these key mechanisms:

### Critic Loop (Automatic)
Nothing reaches the user without Critic approval. After any agent produces a deliverable:
1. Director invokes Critic → Critic reviews → PASS or FAIL
2. If FAIL → Director routes fixes to appropriate agent → Critic re-reviews → max 3 loops
3. User sees final output + change log of what was caught/fixed

### QA Reactive Loop
When the user gives negative feedback, Director immediately invokes QA for root cause analysis. QA classifies the failure (prompt-gap, context-loss, misinterpretation, etc.), logs it in `qa-log.md`, and proposes structural fixes.

### Content Strategist Alignment
Auto-triggered at project start and script finalization to verify the content fits the channel's macro direction. Returns an alignment score (1-5).

### Pipeline Stage Transitions
**Never auto-chain.** Every stage transition requires explicit user approval. Only quality gates (Critic, validation checks) run automatically.

## Windows / PowerShell Gotchas

This project runs on Windows. All agents MUST be aware of these issues:

### Dollar Sign Escaping
When using the Bash tool on Windows, `$variable` syntax in PowerShell commands gets eaten by the shell layer before PowerShell receives it. **This causes silent failures.**

**Workarounds (in order of preference):**

1. **Use Node.js one-liners instead of PowerShell:**
   ```bash
   node -e "console.log(require('fs').readFileSync('file.txt','utf8').split(/\s+/).length)"
   ```

2. **Use `npx tsx` for TypeScript scripts:**
   ```bash
   npx tsx src/scripts/text-utils.ts wordcount path/to/file.md
   ```

3. **Write a temp .ps1 file and execute it** (for complex PowerShell):
   ```bash
   # Write the script first, then invoke it
   powershell -File temp-script.ps1
   ```

4. **Avoid raw PowerShell commands with `$` variables** in Bash tool calls — they will fail.

### Path Separators
Windows uses `\` but most Node.js tools accept `/`. Always use forward slashes in code. The Bash tool accepts both.

### Line Endings
Files may have `\r\n` (Windows) line endings. When matching or replacing text, be aware of this. Node.js `fs` handles this transparently in most cases.
