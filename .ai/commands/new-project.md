---
description: Create a new video project
agent: director
---

Create a new video project from the arguments: $ARGUMENTS

Parse the first word as the slug and the rest as the optional title.

1. Create the project directory structure:
   ```
   channels/<channel>/videos/<slug>/
     config.json
     research/
     content/
     storyboard/
     production/
       audio/
       visuals/
       output/
     publishing/
     analytics/
   ```

2. Initialize `config.json` from the template at `templates/default-config.json`, setting:
   - `slug` to the provided slug
   - `title` to the provided title (if given, otherwise use the slug)
   - `createdAt` to current date
   - All pipeline stages to `{ status: "not_started", version: 0 }`
   - `currentWork` to null
   - `history` to empty array

3. Confirm the project was created and suggest the next step: `/research <slug> <topic>`.
