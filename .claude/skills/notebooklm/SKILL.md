---
name: notebooklm
description: "Human-in-the-loop NotebookLM research — Director prepares prompts, user executes in NotebookLM, Director processes outputs"
---
<!-- AUTO-GENERATED from .ai/ — DO NOT EDIT. Run "npm run sync-ai" to regenerate. -->


# NotebookLM Research (Human-in-the-Loop)

NotebookLM is powerful for research but the programmatic integration is unreliable (slow, duplicate source uploads, flaky auth). Instead: **Director prepares structured prompts → user runs them in NotebookLM web UI → user pastes outputs back → Director processes into research doc.**

## Workflow

### Phase 1: Director Prepares

Before asking user to open NotebookLM, Director prepares:

1. **Notebook setup instructions** — what to name it, which sources to add
2. **Source list** — exact URLs, PDFs, or topics to add as sources
3. **Query sequence** — numbered list of questions to ask NotebookLM, in optimal order (broad → specific → cross-cutting)

Present all of this in a single, copy-pasteable block.

### Phase 2: User Executes

User opens NotebookLM web UI and:
1. Creates notebook (or uses existing one)
2. Adds sources from the list
3. Asks the queries one by one
4. Copies relevant outputs back to the conversation

Director should NOT assume any specific timing. User may do this across minutes or hours.

### Phase 3: Director Processes

When user provides NotebookLM outputs:
1. Parse and extract key facts, data points, quotes
2. Cross-reference across multiple query responses
3. Identify gaps — what wasn't answered or needs deeper research
4. Write versioned research document (`research-v<N>.md`)
5. If gaps remain, prepare follow-up queries (return to Phase 1)

## Prompt Templates

### Source Setup Prompt

```
NotebookLM'de yeni notebook oluştur: "[Video Title] Research"

Şu kaynakları ekle:
1. [URL or description]
2. [URL or description]
...

Kaynaklar yüklendikten sonra (yeşil tik), şu soruları sırayla sor:
```

### Query Sequence Template

```
Sorular (sırayla sor, her cevabı bana yapıştır):

1. [Broad context question — "What are the main themes across all sources about X?"]
2. [Specific data question — "What specific statistics or data points exist about Y?"]
3. [Cross-cutting question — "How do the sources disagree or present different perspectives on Z?"]
4. [Gap-finding question — "What important aspects of X are NOT covered by these sources?"]
```

### Follow-up Prompt (if gaps found)

```
Ek kaynaklar ekle:
1. [new URL addressing gap]

Sonra şu ek soruları sor:
1. [targeted question for gap]
```

## Rules

- **Never assume NotebookLM access.** Always present queries as text for user to execute.
- **Batch queries efficiently.** Group related questions so user makes fewer round-trips.
- **Number everything.** User should be able to say "here's the answer to query 3" without ambiguity.
- **Don't ask user to generate artifacts** (podcasts, videos, etc.) during research phase — just chat queries.
- **Source deduplication.** Before preparing source list, check if a research notebook already exists for this video (check config.json history). If so, tell user to reuse it.
- **Output format.** When processing responses, always write to versioned research file. Never keep research only in conversation context.
