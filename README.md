# yt-pipeline

AI-powered YouTube channel factory framework. Automates the entire video production pipeline — from research to publishing — using AI agents orchestrated through [OpenCode](https://opencode.ai).

## What is this?

`yt-pipeline` is a reusable framework for running a YouTube channel with minimal manual effort. You define your channel's identity once in `channel-config.json`, then use AI agents to handle each stage of video production:

1. **Research** — Find trending topics, gather facts and data
2. **Content Writing** — Generate video scripts with voiceover markers
3. **Storyboarding** — Plan scene-by-scene visuals and timing
4. **Production** — Collect stock media, generate AI images, TTS voiceover, render video via Remotion
5. **Publishing** — Prepare YouTube metadata, upload, schedule
6. **Analytics** — Track performance, feed insights back into future videos

Each stage produces versioned files (`script-v1.md`, `script-v2.md`, etc.) so you never lose work and can iterate freely.

## Architecture

```
yt-pipeline/
├── .opencode/
│   ├── agents/          # 11 AI agent prompts
│   └── commands/        # 13 slash commands for OpenCode
├── src/
│   ├── remotion/        # Video rendering engine
│   │   ├── schemas.ts           # Zod schemas (canonical types)
│   │   ├── Root.tsx             # Remotion root (registers compositions)
│   │   ├── components/          # Shared: TransitionWrapper, ProgressBar, SubtitleOverlay, SectionTitle
│   │   ├── compositions/        # MainComposition, DataChartPreview
│   │   └── templates/
│   │       ├── voiceover-visuals/   # Template 1: narration + images/text
│   │       └── data-charts/         # Template 2: animated charts, counters, comparisons
│   ├── scripts/         # Node.js scripts for heavy tasks
│   │   ├── new-project.ts       # Create a new video project
│   │   ├── tts-generate.ts      # ElevenLabs TTS generation
│   │   ├── remotion-render.ts   # Bundle + render video
│   │   ├── youtube-upload.ts    # Upload to YouTube
│   │   ├── fetch-analytics.ts   # Pull YouTube analytics
│   │   ├── collect-stock.ts     # Download Pexels stock media
│   │   └── generate-image.ts    # Generate DALL-E images
│   ├── types/index.ts   # TypeScript types
│   └── utils/project.ts # Shared utilities
├── templates/
│   ├── default-config.json      # Project config template
│   └── channel-config.json      # Channel config template
├── figma-plugin/        # Figma storyboard sync plugin
│   ├── code.ts          # Plugin logic
│   ├── ui.html          # Plugin UI
│   └── manifest.json    # Figma manifest
├── projects/            # Video projects (one folder per video)
│   └── <slug>/
│       ├── config.json          # Project state + pipeline status
│       ├── research/            # research-v1.md, research-v2.md, ...
│       ├── content/             # script-v1.md, script-v2.md, ...
│       ├── storyboard/          # storyboard-v1.json, ...
│       ├── production/
│       │   ├── audio/           # TTS voiceover files
│       │   ├── visuals/         # Stock + AI images
│       │   └── output/          # final.mp4
│       ├── publishing/          # metadata-v1.json, upload-log.md
│       └── analytics/           # snapshot-YYYY-MM-DD.json
├── channel-config.json  # YOUR channel settings (copy from templates/)
├── .env                 # API keys (not committed)
└── package.json
```

## Quick Start

### Prerequisites

- **Node.js** 18+ (20+ recommended)
- **npm** 9+
- **OpenCode** CLI installed ([opencode.ai](https://opencode.ai))
- A code editor (VS Code recommended)

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/burakbilgehan/yt-pipeline.git
cd yt-pipeline

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your API keys (see API Keys section below)

# 4. Set up channel config
cp templates/channel-config.json channel-config.json
# Edit channel-config.json with your channel's identity, tone, visual preferences

# 5. Start OpenCode
opencode
```

### Create Your First Video

```bash
# Inside OpenCode:

# Create a new project
npm run new-project my-first-video "The World's Most Expensive Liquids"

# Use agents to work through the pipeline:
@researcher research "most expensive liquids in the world" for project my-first-video
@content-writer write a script for my-first-video based on research
@storyboard create storyboard for my-first-video

# Run production scripts:
npm run collect my-first-video image "expensive perfume bottle"
npm run generate-image my-first-video "golden liquid pouring in cinematic lighting"
npm run tts my-first-video
npm run render my-first-video

# Prepare and upload:
@publisher prepare metadata for my-first-video
npm run upload my-first-video
```

## API Keys

All API keys go in `.env`. Here's how to get each one:

### ElevenLabs (Text-to-Speech) — Free tier: 10,000 chars/month

1. Sign up at [elevenlabs.io](https://elevenlabs.io)
2. Go to **Profile** → copy your **API Key**
3. Go to **Voices** → pick a voice → copy the **Voice ID** from the URL
4. Set in `.env`:
   ```
   ELEVENLABS_API_KEY=your_key_here
   ELEVENLABS_VOICE_ID=your_voice_id
   ```

### Pexels (Stock Images/Videos) — Free, unlimited

1. Sign up at [pexels.com/api](https://www.pexels.com/api/)
2. Create a new project → copy the **API Key**
3. Set in `.env`:
   ```
   PEXELS_API_KEY=your_key_here
   ```

### OpenAI (DALL-E Image Generation) — Pay-per-use

1. Sign up at [platform.openai.com](https://platform.openai.com)
2. Go to **API Keys** → create a new key
3. Set in `.env`:
   ```
   OPENAI_API_KEY=your_key_here
   ```

### YouTube Data API v3 + Analytics — Free (quota-based)

This requires OAuth2 setup:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or select existing)
3. Enable **YouTube Data API v3** and **YouTube Analytics API**
4. Go to **Credentials** → Create **OAuth 2.0 Client ID**
   - Application type: **Desktop app**
   - Download the client secret JSON
5. Copy `client_id` and `client_secret` from the JSON
6. Get a refresh token:
   - Use the [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
   - Scope: `https://www.googleapis.com/auth/youtube` and `https://www.googleapis.com/auth/yt-analytics.readonly`
   - Exchange the authorization code for tokens
   - Copy the **refresh_token**
7. Set in `.env`:
   ```
   YOUTUBE_CLIENT_ID=your_client_id
   YOUTUBE_CLIENT_SECRET=your_client_secret
   YOUTUBE_REFRESH_TOKEN=your_refresh_token
   ```

## Channel Configuration

`channel-config.json` defines your channel's identity and defaults. Copy the template and customize:

```bash
cp templates/channel-config.json channel-config.json
```

Key sections:

| Section | Controls |
|---------|----------|
| `channel` | Name, handle, language, niche, description |
| `content` | Default tone, target audience, video length, brand keywords, avoid topics |
| `tts` | ElevenLabs voice ID, model, stability, similarity boost |
| `visuals` | Remotion template, brand colors, font, resolution, fps, stock source, AI image style |
| `youtube` | Default category, visibility, tags, description CTA, end screen pattern |

All agents and scripts read from this file. Project-level `config.json` can override these defaults per video.

## NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run new-project <slug> [title]` | Create a new video project |
| `npm run tts <slug>` | Generate TTS voiceover from latest script |
| `npm run render <slug>` | Render video via Remotion |
| `npm run upload <slug>` | Upload to YouTube |
| `npm run analytics <slug\|channel>` | Fetch YouTube analytics |
| `npm run collect <slug> <image\|video> <query>` | Download Pexels stock media |
| `npm run generate-image <slug> <prompt>` | Generate DALL-E image |
| `npm run studio` | Open Remotion Studio for preview |
| `npm run figma:build` | Build Figma storyboard plugin |

## Agents

11 AI agents handle different pipeline stages. Invoke them via OpenCode's `@mention`:

| Agent | Role |
|-------|------|
| `@researcher` | Topic research, fact gathering, source validation |
| `@content-writer` | Script writing with voiceover markers |
| `@content-strategist` | Topic ideation, trend analysis, content calendar |
| `@storyboard` | Scene-by-scene visual planning, timing, transitions |
| `@collector` | Stock media search coordination |
| `@video-production` | Production oversight, render coordination |
| `@publisher` | YouTube metadata, SEO, upload preparation |
| `@youtube-expert` | YouTube algorithm strategy, optimization tips |
| `@analytics` | Performance analysis, insights, recommendations |
| `@qa` | Quality checks across all pipeline stages |
| `@director` | Pipeline orchestration, suggests next steps |

## Version Management

Every versioned file follows this pattern:
- Files: `script-v1.md`, `script-v2.md`, `storyboard-v1.json`, etc.
- Old versions are **never deleted**
- Each file includes a version header: `version`, `based_on`, `changes_from_prev`, `date`
- `config.json` tracks current version per stage and a full `history` array
- The pipeline is non-linear — you can jump back to any stage and create a new version

## Figma Plugin

The storyboard agent outputs `storyboard-v*.json` files. The Figma plugin imports these into Figma as frame-by-frame layouts:

1. Build: `npm run figma:build`
2. In Figma: **Plugins** → **Development** → **Import plugin from manifest** → select `figma-plugin/manifest.json`
3. Open the plugin, paste the storyboard JSON, click **Sync**
4. Each scene becomes a Figma frame with color-coded visual type indicators

## Cost Estimate

For a typical 3-minute video:

| Service | Usage | Cost |
|---------|-------|------|
| ElevenLabs TTS | ~2,000 chars | Free (10k/month) |
| Pexels stock | 5-10 images | Free |
| DALL-E 3 | 3-5 images | ~$0.12-0.20 |
| YouTube API | Upload + analytics | Free |
| **Total** | | **~$0.12-0.20/video** |

## License

Private repository. All rights reserved.
