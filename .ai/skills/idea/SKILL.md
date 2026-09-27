---
name: idea
description: "Idea stage (gate 1): turn a raw video idea into an approved brief and a new layout-2 project. User-invoked; ends with user approval."
disable-model-invocation: true
argument-hint: "<idea in a sentence>"
---

# Idea stage

Goal: decide whether the idea becomes a video, and with which question and angle, before any research is spent on it.

## Steps

1. Run the `alignment-check` skill on the idea and check the calendar and published videos for overlap (`content-calendar` skill, `channels/<channel>/videos/`).
2. Sharpen it into one question the video answers with numbers ("How much of the world's oil depends on one strait?"). A topic is not a question.
3. Propose, in one message: the question, 2 or 3 angles (each one line: what the viewer learns that they would not guess), a working title, a slug, the format and target length, the 3 to 6 numbers the video cannot exist without, and the alignment score. Recommend one angle.
4. Stop and wait. Nothing is created before the user approves.
5. On approval: `npm run new-video -- <slug> "<working title>"`, then write `research/brief.md` with the approved question, angle, audience takeaway, must-have numbers, and anything the user ruled out. The brief is the research stage's only input from this conversation.
6. Show the brief's full path and stop. The research stage starts only when the user asks for it.
