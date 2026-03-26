---
description: Create a new video project
agent: director
---
<!-- AUTO-GENERATED from .ai/ — DO NOT EDIT. Run "npm run sync-ai" to regenerate. -->

Create a new video project from the arguments: $ARGUMENTS

Parse the first word as the slug and the rest as the optional title.

Run: `npm run new-video <slug> [title] [--channel <channel>]`

This creates the project directory structure under `channels/<channel>/videos/<slug>/` with all standard subdirectories and an initialized `config.json`.

After creation, suggest the next step: `/research <slug> <topic>`.
