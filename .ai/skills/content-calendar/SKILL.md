---
name: content-calendar
description: "Maintain and use the channel content calendar"
---

# Content Calendar

How to maintain and use the channel content calendar.

## File Location

`channels/<channel>/publishing/content-calendar.md`

## Format

```markdown
# Content Calendar

## Upcoming
| Priority | Format | Topic | Target Date | Status | Notes |

## Published
| Topic | Format | Published | Performance | Follow-up? |

## Backlog
- Idea: description (source: trend / analytics / user)
```

## Planning Rules

- Factor in existing calendar when evaluating new topics — avoid overlap
- Flag time-sensitive topics with urgency level
- Channel maturity matters (read `channels/<channel>/channel-config.json → channel.maturity`):
  - `seed`: experimentation OK, test different formats/topics
  - `growing`: start doubling down on what works, keep some experimentation
  - `established`: consistent output, refine what performs best
  - `mature`: stick to proven positioning, audience expectations
