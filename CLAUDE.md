@AGENTS.md

## Claude Code notes

- Guardrails live in `.claude/settings.json` (permissions) and `.ai/hooks/` (PreToolUse/PostToolUse scripts). They are committed and apply to every session started in this repo.
- Editing files under `.ai/skills/` or `.ai/agents/` triggers `.ai/sync.ts` automatically. Never edit generated `.claude/skills/`, `.claude/agents/` or `.opencode/` files by hand.
