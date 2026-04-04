---
name: incremental-writing
description: "Mandatory incremental writing protocol — never batch-write files over ~50 lines"
---
<!-- AUTO-GENERATED from .ai/ — DO NOT EDIT. Run "npm run sync-ai" to regenerate. -->


# Incremental Writing

**The single most important rule in this project.** Never prepare a large file in memory and write it all at once.

## When This Applies

Any file expected to exceed ~50 lines. Includes: research docs, scripts, storyboards, code files, reports. Does NOT apply to short configs, small edits, or files clearly under 50 lines.

## Why

- Batch writes blow up context windows — one failure means starting from zero
- No progress visibility — user stares at "preparing write" for minutes
- Partial work is lost on failure; incremental work survives
- Reviewing a 350-line dump is harder than watching a document grow

## The Protocol

### Phase 1: Skeleton
Write a minimal file with structure only — headings, section names, placeholder notes. Commit to disk immediately. This is your outline AND your working document.

### Phase 2: Expand
Work through sections one at a time. Each section: think → write to file → move to next. Use Edit tool to add content to the existing file, not Write to replace the whole thing.

### Phase 3: Revise
Re-read what you wrote. Cut what's weak, tighten what's verbose, fix inconsistencies. Again, use Edit — surgical changes, not full rewrites.

## Rules

1. **Write early.** The file should exist on disk within your first 1-2 tool calls. An empty skeleton is better than nothing.
2. **Write often.** After each meaningful unit of work (a section, a scene, a function), save to disk.
3. **Never hold more than ~50 lines in memory** before writing. If you're composing something longer, stop and write what you have.
4. **Use Edit, not Write** for additions after the skeleton. Write overwrites the entire file — Edit patches it.
5. **If interrupted, the file should reflect all work done so far.** A reader should be able to open the file at any point and see coherent (if incomplete) output.

## Anti-Patterns (NEVER do these)

| Anti-pattern | What to do instead |
|---|---|
| "Let me prepare the full document..." | Write skeleton immediately, expand in place |
| One giant Write call with 200+ lines | Multiple Edit calls, each adding a section |
| Thinking for 3 minutes then writing everything | Think about section 1 → write section 1 → think about section 2 → write section 2 |
| Rewriting the entire file to change one section | Use Edit with targeted oldString/newString |

## Example Flow: Research Document

```
1. Write skeleton: title, headers, empty sections          → Write (file created, ~15 lines)
2. Fill "Key Findings" section                              → Edit (add ~20 lines)
3. Fill "Data & Statistics" section                         → Edit (add ~25 lines)
4. Fill "Counter-arguments" section                         → Edit (add ~15 lines)
5. Fill "Sources" section                                   → Edit (add ~10 lines)
6. Revise: tighten intro, fix a statistic                  → Edit (2-3 small changes)
7. Done. File grew organically over 6 steps.
```

## Example Flow: Code File

```
1. Write skeleton: imports, function signatures, TODO comments  → Write (~20 lines)
2. Implement first function                                      → Edit
3. Implement second function                                     → Edit
4. Add error handling                                            → Edit
5. Done.
```
