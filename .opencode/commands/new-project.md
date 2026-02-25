---
description: Create a new video project
agent: build
---

Create a new video project with slug: $1

1. Create the project directory structure:
   ```
   projects/$1/
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
   - `slug` to "$1"
   - `title` to "$2" (if provided, otherwise use slug)
   - `createdAt` to current date
   - `stage` to "research"

3. Confirm the project was created and what the next step is.
