# Pre-Publish QA Report — gold-vs-commodities-100-years

**Date:** 2026-03-17  
**QA Agent:** Pre-publish comprehensive review  
**Video:** `production/output/gold-vs-commodities-100-years.mp4` (250.3 MB, 517s, 1920x1080@30fps)  
**Status:** 🟡 NOT READY TO PUBLISH — 3 Critical, 4 High, 4 Medium, 2 Low issues

---

## 1. Version Consistency Check

| Stage | Config Version | Latest File | Status |
|-------|---------------|-------------|--------|
| research | v1 (completed) | research-v2.md | 🔴 Config says v1, file is v2 |
| content | v3 (in_progress) | script-v3.md | ⚠️ Status should be "completed" |
| storyboard | v1 (in_progress) | storyboard-v1.json | 🔴 STALE: basedOn content v2, current is v3 |
| production | v0 (in_progress) | video-config.json + rendered MP4 | 🔴 Version 0 but production is done |
| publishing | v0 (pending) | empty directory | ✅ Correct — not yet published |
| analytics | v0 (pending) | empty directory | ✅ Correct — not yet published |

### Dependency Chain Analysis

```
research-v2 ← script-v1 (based_on: research-v2) ✅
research-v2 ← script-v2 (based_on: research-v2) ✅
script-v3.2 ← script-v3 (based_on: script-v3.2 + Critic trim review) ✅ (internal revision)
script-v2 ← storyboard-v1 (basedOn.content: 2) 🔴 STALE — should reference content v3
script-v3 ← video-config.json (voiceover text matches script-v3) ✅ (implicit)
script-v3 ← TTS audio (history: "Generated TTS from script-v3.md") ✅
```

---

## 2. Checklist Results

### A. Channel Config Consistency

| Item | Status | Details |
|------|--------|---------|
| Channel handle | 🔴 FAIL | Config: `@theworldwithnumbers`, YouTube reality: `@sickmananalytics`. **Mismatch.** |
| Channel name | ✅ PASS | Config: "The World With Numbers" — matches YouTube |
| Voice ID conflict | 🔴 FAIL | TWO different voiceIds: `tts.voiceId` = `KmnvDXRA0HU55Q0aqkPG` (line 21), `tts.elevenlabs.voiceId` = `onwK4e9ZLuTAKqWW03F9` (line 23). Video used `KmnvDXRA0HU55Q0aqkPG`. |
| Brand color | ⚠️ WARNING | Config: `#6C63FF` (purple). Video uses `#C8A94E` (gold). Intentional per-project override but not documented. |
| Default video length | ⚠️ WARNING | Config: `defaultLength: 180` (3 min). Actual video: 517s (8:36). Major deviation — config needs updating or this field needs clarification. |
| Resolution / FPS | ✅ PASS | Config: 1920x1080@30fps. Video: 1920x1080@30fps. Match. |
| Font family | ✅ PASS | Config: "Inter, sans-serif". Video-config: "Inter, sans-serif". Match. |
| End screen template | ⚠️ WARNING | Config: "Subscribe button + next video suggestion". Video CTA scene has subscribe only + 2 blank card slots. No "next video" configured (expected — first video). |
| Video count | ⚠️ WARNING | Config: `videoCount: 0`. Correct pre-publish, must be updated to 1 after upload. |
| Launch date | ⚠️ WARNING | Config: `launchDate: null`. Must be set after first publish. |

### B. Pipeline State (config.json)

| Item | Status | Details |
|------|--------|---------|
| currentWork.agent | 🔴 FAIL | Shows `content-writer` at stage `content`. Should reflect current state (pre-publishing). |
| currentWork.stage | 🔴 FAIL | Shows `content`. Should be `publishing` or `pre-publish-review`. |
| research.version | 🔴 FAIL | Config says `1`, but `research-v2.md` exists. Should be `2`. |
| content.status | 🔴 FAIL | Shows `in_progress`. Script v3 is finalized. Should be `completed`. |
| content.version | ✅ PASS | `3` — matches `script-v3.md`. |
| storyboard.status | 🔴 FAIL | Shows `in_progress`. Storyboard was used for production. Should be `completed`. |
| production.version | 🔴 FAIL | Shows `0`. Should be `1` — a finished render exists. |
| production.status | ⚠️ WARNING | Shows `in_progress`. Could be argued correct if final review not done, but the video IS rendered. |
| history consistency | ⚠️ WARNING | History uses mixed event key names: `event` (older entries) vs `action` (newer entries). Should be consistent. |
| history completeness | ⚠️ WARNING | Missing entries: research.completed (v1→v2 transition), storyboard.completed, content.completed for v3, production render completed. |

### C. Video Config vs Rendered Output

| Item | Status | Details |
|------|--------|---------|
| Duration | ✅ PASS | Config: 517s. Video: ~517s. Match. |
| Scene count | ✅ PASS | 7 scenes defined (hook, setup, act2-6, scoreboard, cta). Matches script's 7 acts. |
| Scene timing gaps | ✅ PASS | No gaps: 0→17→61→151→215→281→358→448→505→517. Continuous. |
| Audio segments | ✅ PASS | 7 voiceover segments defined. 7 MP3 files exist in `production/audio/`. |
| Audio segment 1 start | ⚠️ WARNING | First audio segment starts at `startTime: 1` (1 second delay). Intentional? Or should be 0? |
| Background music | ✅ PASS | "Taste - TrackTribe.mp3" exists in `production/audio/background-music/`. |
| BG music volume | ✅ PASS | 0.07 (7%) — appropriate for voiceover-heavy content. |
| Scene voiceover text | ✅ PASS | All 7 scene voiceover texts match script-v3.md exactly. Verified word-by-word. |
| Scoreboard data | ✅ PASS | Values match script: Nikkei +942.4%, S&P +236.6%, DAX +224.4%, Dow +131.8%, FTSE +40.5%, Silver −66.1%, Copper −67.4%, Oil −74.2%, Platinum −95.0%. |

### D. Missing Assets

| Item | Status | Details |
|------|--------|---------|
| Final video MP4 | ✅ PASS | `gold-vs-commodities-100-years.mp4` exists (250.3 MB). |
| TTS voiceovers | ✅ PASS | All 7 files present: voiceover-001 through voiceover-007.mp3. |
| Background music | ✅ PASS | Present. |
| Thumbnail | 🔴 FAIL | **No thumbnail found anywhere in the project.** No thumbnail file in publishing/, production/, or project root. |
| Test render frames | ✅ PASS | 20 test render PNGs in `test-renders/`. Good coverage across all acts. |

### E. Metadata / Publishing Readiness

| Item | Status | Details |
|------|--------|---------|
| YouTube title | 🔴 FAIL | No publishing metadata file exists. `publishing/` directory is empty. |
| YouTube description | 🔴 FAIL | Not prepared. |
| YouTube tags | 🔴 FAIL | Not prepared. Project `config.json` has internal tags but no YouTube-optimized tags. |
| YouTube category | 🔴 FAIL | Not specified in any publishing config. |
| YouTube language | ✅ PASS | Implicit from channel config: `en`. |
| End screen elements | ⚠️ WARNING | CTA scene (505-517s, 12 seconds) has subscribe button + channel name. YouTube end screens require minimum 5 seconds — ✅ met (12s). But no "next video" or playlist cards are configured. For a first video this is acceptable, but the 2 blank card positions should be documented for post-second-video update. |

### F. Storyboard Staleness

| Item | Status | Details |
|------|--------|---------|
| Storyboard basedOn | 🔴 FAIL | `storyboard-v1.json` → `basedOn.content: 2`. Current content is v3. Script v3 had **FX conversion bug fixes** for Nikkei, DAX, FTSE data. Storyboard was never updated. |
| Storyboard duration | 🔴 FAIL | `storyboard-v1.json` → `totalDuration: 230`. Actual video: 517s. Massive mismatch — video is 2.25x longer than storyboard specified. |
| Impact assessment | ⚠️ WARNING | Despite the stale storyboard, video-config.json was built directly from script-v3 with correct data. The storyboard was effectively bypassed. This is a process gap, not a content error. |

### G. Voice ID Resolution

| Item | Status | Details |
|------|--------|---------|
| Correct voiceId | ⚠️ WARNING | `tts.voiceId: "KmnvDXRA0HU55Q0aqkPG"` (line 21) is the one used in production. `tts.elevenlabs.voiceId: "onwK4e9ZLuTAKqWW03F9"` (line 23) is a **different, unused voice**. Config structure is ambiguous — `tts.voiceId` vs `tts.elevenlabs.voiceId` creates confusion about which takes precedence. |

---

## 3. Issues Summary

### 🔴 Critical (3) — Must fix before publish

| # | Issue | File | Fix |
|---|-------|------|-----|
| C1 | **No thumbnail exists** | `publishing/` | Create a thumbnail (1280x720). This is a first-video, first-impression asset. Cannot publish without it. |
| C2 | **No publishing metadata** (title, description, tags) | `publishing/` | Create `publishing/metadata.json` or `publishing/youtube-metadata.md` with SEO-optimized title, description, tags, category. |
| C3 | **Channel handle mismatch** | `channel-config.json:4` | YouTube handle is `@sickmananalytics`, config says `@theworldwithnumbers`. Update config to match YouTube reality, or change YouTube handle before first publish. This affects upload scripts and any handle references. |

### ⚠️ High (4) — Fix before or immediately after publish

| # | Issue | File | Fix |
|---|-------|------|-----|
| H1 | **config.json pipeline state is stale** | `config.json` | Update: `currentWork` → publishing stage, `research.version` → 2, `content.status` → completed, `storyboard.status` → completed, `production.version` → 1. |
| H2 | **Duplicate/conflicting voiceId** | `channel-config.json:21,23` | Remove `tts.voiceId` (line 21) and use only `tts.elevenlabs.voiceId`. Or vice versa. The TTS script should read from one canonical location. Currently `KmnvDXRA0HU55Q0aqkPG` is the correct production voice. |
| H3 | **Storyboard is stale (basedOn content v2, current v3)** | `storyboard/storyboard-v1.json` | Script v3 corrected FX conversion bugs for Nikkei, DAX, FTSE. Storyboard references v2. Either create storyboard-v2 or document that storyboard was bypassed for this project. |
| H4 | **Storyboard duration mismatch** (230s vs 517s actual) | `storyboard/storyboard-v1.json:7` | Storyboard says 230s, video is 517s. The video grew 2.25x from original plan. Storyboard was never updated to reflect the expanded script. |

### 📙 Medium (4) — Fix in next pipeline iteration

| # | Issue | File | Fix |
|---|-------|------|-----|
| M1 | **defaultLength: 180 in channel config** | `channel-config.json:15` | First video is 517s. Either this field represents a minimum/target for shorts, or it's outdated. Clarify its purpose or update to reflect actual content length (~480-540s). |
| M2 | **History uses mixed event keys** | `config.json:55-132` | Older entries use `event`, newer use `action`. Standardize to one format. Also older entries lack `version` field. |
| M3 | **Missing history entries** | `config.json` | No entries for: research v1→v2 completion, storyboard completion, content v3 completion, production render completion. |
| M4 | **Brand color override undocumented** | `video-config.json:8` | Video uses gold (#C8A94E) instead of channel brand purple (#6C63FF). This is sensible for the topic but should be documented as intentional per-project override. |

### 💡 Low (2) — Nice to have

| # | Issue | File | Fix |
|---|-------|------|-----|
| L1 | **First audio segment starts at 1s, not 0s** | `video-config.json:170` | `voiceover-001.mp3` has `startTime: 1`. Is the 1-second delay intentional (dramatic pause)? If so, document it. If not, set to 0. |
| L2 | **Extra render artifacts in output/** | `production/output/` | 8 files in output: 5 phase renders (faz1-5), gold-video.mp4, preview, and final. Consider cleaning up intermediate renders after final is confirmed. |

---

## 4. Pre-Publish Action Plan

### Must Do (before clicking "Upload")

1. **Create thumbnail** — 1280x720, compelling visual. Consider the "26,000% → 132%" reveal or the 100-year scoreboard as thumbnail concepts.
2. **Create publishing metadata** — Write `publishing/youtube-metadata.md`:
   - SEO-optimized title (e.g., "I Priced Every Asset in Gold for 100 Years — The Results Are Shocking")
   - Description with timestamps, data sources, subscribe CTA
   - 15-20 YouTube tags mixing broad ("investing", "gold") and specific ("dow to gold ratio", "asset prices in gold terms")
   - Category: Education
3. **Fix channel handle** — Decide: change YouTube handle to `@theworldwithnumbers`, or update `channel-config.json` to `@sickmananalytics`. This must be resolved before upload scripts run.
4. **Resolve voiceId conflict** — Pick one canonical location in `channel-config.json`. Recommend: keep `tts.elevenlabs.voiceId: "KmnvDXRA0HU55Q0aqkPG"` and remove the top-level `tts.voiceId`, OR make the TTS script read from a single field.

### Should Do (before or right after publish)

5. **Update config.json pipeline state** — Bring all version numbers and statuses up to date.
6. **Document storyboard bypass** — Note that storyboard-v1 was effectively superseded by video-config.json built directly from script-v3.
7. **Update channel-config.json** — Set `videoCount: 1` and `launchDate` after publish.

### Can Do Later

8. Standardize history entry format in config.json.
9. Clean up intermediate render files.
10. Review `defaultLength` meaning in channel config.

---

## 5. What's Working Well

- **Content quality is high.** Script v3 voiceover text in video-config matches script-v3.md exactly. The FX bug fix from v2→v3 was correctly propagated to production.
- **Audio assets are complete.** All 7 TTS segments + background music present and accounted for.
- **Scene timing is gapless.** No missing frames between scenes.
- **Scoreboard data is internally consistent** across script, video-config, and research.
- **Test render coverage is excellent.** 20 frame captures across all acts show thorough visual QA was done.
- **Video specs are correct.** 1920x1080@30fps matches channel config exactly.
- **Critic review was done.** critique-v1.md and critique-v2.md exist, showing the critic loop functioned.

---

*Report generated by QA Agent — 2026-03-17*
