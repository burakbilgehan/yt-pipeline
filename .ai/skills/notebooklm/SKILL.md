---
name: notebooklm
description: "Programmatic access to Google NotebookLM — create notebooks, add sources, chat, generate artifacts"
---

# NotebookLM

Complete programmatic access to Google NotebookLM—including capabilities not exposed in the web UI. Create notebooks, add sources (URLs, YouTube, PDFs, audio, video, images), chat with content, generate all artifact types, and download results in multiple formats.

Activate on explicit `/notebooklm` mention or intent: "Create a podcast about X", "Summarize these URLs", "Generate a quiz", "Turn this into an audio overview", "Make an infographic", "Create a mind map".

## Installation

**From PyPI (Recommended):**
```bash
pip install notebooklm-py
```

⚠️ **DO NOT install from main branch.** Always use PyPI or a specific release tag.

## Prerequisites

Before using any command, authenticate:

```bash
notebooklm login          # Opens browser for Google OAuth
notebooklm list           # Verify authentication works
```

### CI/CD and Parallel Agents

| Variable | Purpose |
|----------|---------|
| `NOTEBOOKLM_HOME` | Custom config directory (default: `~/.notebooklm`) |
| `NOTEBOOKLM_PROFILE` | Active profile name |
| `NOTEBOOKLM_AUTH_JSON` | Inline auth JSON for CI/CD |

**Parallel agents:** Always use explicit notebook ID (`-n <id>`) instead of `notebooklm use` — concurrent agents sharing context file will overwrite each other.

## Agent Setup Verification

1. `notebooklm status` → "Authenticated as: email@..."
2. `notebooklm list --json` → valid JSON
3. If either fails → `notebooklm login`

## Autonomy Rules

**Run automatically (no confirmation):**
`status`, `auth check`, `list`, `source list`, `artifact list`, `language list/get/set`, `source wait` (subagent), `artifact wait` (subagent), `research status/wait` (subagent), `use`, `create`, `ask`, `history`, `source add`, `profile list/create/switch`, `doctor`

**Ask before running:**
`delete`, `generate *`, `download *`, `artifact wait` (main conversation), `source wait` (main conversation), `research wait` (main conversation), `ask --save-as-note`, `history --save`

## Quick Reference

| Task | Command |
|------|---------|
| Authenticate | `notebooklm login` |
| Diagnose auth | `notebooklm auth check` |
| List notebooks | `notebooklm list` |
| Create notebook | `notebooklm create "Title"` |
| Set context | `notebooklm use <notebook_id>` |
| Show context | `notebooklm status` |
| Add URL source | `notebooklm source add "https://..."` |
| Add file | `notebooklm source add ./file.pdf` |
| Add YouTube | `notebooklm source add "https://youtube.com/..."` |
| List sources | `notebooklm source list` |
| Wait for source | `notebooklm source wait <source_id>` |
| Web research (fast) | `notebooklm source add-research "query"` |
| Web research (deep) | `notebooklm source add-research "query" --mode deep --no-wait` |
| Chat | `notebooklm ask "question"` |
| Chat (JSON + refs) | `notebooklm ask "question" --json` |
| Chat → save as note | `notebooklm ask "question" --save-as-note` |
| Generate podcast | `notebooklm generate audio "instructions"` |
| Generate video | `notebooklm generate video "instructions"` |
| Generate report | `notebooklm generate report --format briefing-doc` |
| Generate quiz | `notebooklm generate quiz` |
| Check artifact status | `notebooklm artifact list` |
| Wait for artifact | `notebooklm artifact wait <artifact_id>` |
| Download audio | `notebooklm download audio ./output.mp3` |
| Download video | `notebooklm download video ./output.mp4` |
| Download slide deck | `notebooklm download slide-deck ./slides.pdf` |
| Download slide (PPTX) | `notebooklm download slide-deck ./slides.pptx --format pptx` |
| Download quiz | `notebooklm download quiz quiz.json` |
| Download flashcards | `notebooklm download flashcards cards.json` |
| Download mind map | `notebooklm download mind-map ./map.json` |
| Health check | `notebooklm doctor` |

**Parallel safety:** Use `-n <notebook_id>` for `artifact wait`, `source wait`, `research wait/status`, `download *`. Other commands use `--notebook`. Prefer full UUIDs in automation.

## Generation Types

| Type | Command | Download |
|------|---------|----------|
| Podcast | `generate audio` `--format [deep-dive\|brief\|critique\|debate]` | .mp3 |
| Video | `generate video` `--format [explainer\|brief]` | .mp4 |
| Slide Deck | `generate slide-deck` | .pdf / .pptx |
| Infographic | `generate infographic` | .png |
| Report | `generate report --format [briefing-doc\|study-guide\|blog-post\|custom]` | .md |
| Mind Map | `generate mind-map` (instant/sync) | .json |
| Data Table | `generate data-table` description required | .csv |
| Quiz | `generate quiz` | .json/.md/.html |
| Flashcards | `generate flashcards` | .json/.md/.html |

All generate commands support `-s <source_id>` (specific sources), `--language`, `--json`, `--retry N`.

## Common Workflows

### Research to Podcast (Interactive)

1. `notebooklm create "Research: [topic]"`
2. `notebooklm source add` for each URL/document
3. `notebooklm source list --json` until all status=READY
4. `notebooklm generate audio "Focus on [specific angle]"` (confirm when asked)
5. `notebooklm download audio ./podcast.mp3` when complete

### Research to Podcast (Automated — Subagent)

1. Create notebook, add sources
2. Spawn subagent to wait for sources: `notebooklm source wait <id> -n <notebook_id>`
3. `notebooklm generate audio "..." --json` → parse `artifact_id`
4. Spawn subagent: `notebooklm artifact wait <artifact_id> -n <notebook_id> --timeout 600` then download
5. Main conversation continues non-blocking

### Deep Web Research (Subagent)

1. `notebooklm create "Research: [topic]"`
2. `notebooklm source add-research "topic" --mode deep --no-wait`
3. Spawn subagent: `notebooklm research wait -n <notebook_id> --import-all --timeout 300`

## Processing Times

| Operation | Typical | Timeout |
|-----------|---------|---------|
| Source processing | 30s–10min | 600s |
| Research (fast) | 30s–2min | 180s |
| Research (deep) | 15–30min | 1800s |
| Mind-map | instant | n/a |
| Quiz / flashcards | 5–15min | 900s |
| Audio generation | 10–20min | 1200s |
| Video generation | 15–45min | 2700s |

## Error Handling

| Error | Cause | Action |
|-------|-------|--------|
| Auth/cookie error | Session expired | `notebooklm auth check` then `notebooklm login` |
| "No notebook context" | Context not set | Use `-n <id>` or `notebooklm use <id>` |
| Rate limit / GENERATION_FAILED | Google rate limit | Wait 5–10 min, retry |
| Download fails | Generation incomplete | Check `artifact list` for status |

Exit codes: 0 = success, 1 = error, 2 = timeout (wait commands only).

## Known Limitations

**Rate limited (may fail):** Audio, video, quiz, flashcards, infographic, slide deck generation.

**Always reliable:** Notebook management, source handling, chat, mind-map, report, data-table.

Workaround: wait 5–10 minutes and retry, or use NotebookLM web UI as fallback.

## Language

Language is a **global** setting affecting all notebooks.

```bash
notebooklm language set zh_Hans   # Simplified Chinese
notebooklm language set ja        # Japanese
notebooklm language set en        # English (default)
```

Override per command: `notebooklm generate audio --language ja`

## Troubleshooting

```bash
notebooklm auth check          # Diagnose auth issues
notebooklm auth check --test   # Full validation with network test
notebooklm doctor              # Check environment health
notebooklm --version           # Check version
```
