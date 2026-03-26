# yt-pipeline

AI-powered YouTube channel factory framework. Automates the entire video production pipeline — from research to publishing — using AI agents orchestrated through [OpenCode](https://opencode.ai) or Claude.

## What is this?

`yt-pipeline` is a reusable framework for running one or more YouTube channels with minimal manual effort. Define your channel's identity once, then use AI agents to handle each stage of video production:

1. **Research** — Find trending topics, gather facts and data
2. **Content Writing** — Generate video scripts with voiceover markers
3. **Storyboarding** — Plan scene-by-scene visuals and timing
4. **Production** — Collect stock media, generate AI images, TTS voiceover, render video via Remotion
5. **Publishing** — Prepare YouTube metadata, upload, schedule
6. **Analytics** — Track performance, feed insights back into future videos

Each stage produces versioned files (`script-v1.md`, `script-v2.md`, etc.) so you never lose work and can iterate freely.

## Two-Layer Architecture

The project is cleanly separated into two layers:

### Layer 1 — Pipeline (this repo, lives in git)
Framework code: agent prompts, slash commands, TypeScript types, Remotion templates, Node.js scripts, template files. **Generic and channel-agnostic.**

### Layer 2 — Content (local only, NOT in git)
Everything channel-specific: research files, scripts, storyboards, renders, publishing metadata, analytics. Lives in `channels/` on your machine.

```
yt-pipeline/                          ← this repo (infrastructure)
├── src/
│   ├── remotion/                     # Video rendering engine
│   ├── scripts/                      # CLI scripts (TTS, render, upload, etc.)
│   ├── types/                        # TypeScript types
│   └── utils/                        # Shared utilities
├── .ai/                              # Agent & command definitions (source of truth)
├── templates/
│   ├── channel-config.json           # Channel config template
│   ├── project/                      # Video project folder template (includes config.json)
├── public/<video-slug>/              # Remotion assets (gitignored)
├── .env.example
└── package.json

channels/                             ← local only, NOT in git
└── <channel-slug>/
    ├── channel-config.json           # This channel's identity & settings
    ├── channel-assets/               # Profile photo, banner, etc.
    └── videos/
        └── <video-slug>/
            ├── config.json           # Pipeline state & version history
            ├── research/             # research-v1.md, research-v2.md, ...
            ├── content/              # script-v1.md, script-v2.md, ...
            ├── storyboard/           # storyboard-v1.json, ...
            ├── production/
            │   ├── audio/            # TTS voiceover files
            │   ├── visuals/          # Stock + AI images
            │   └── output/           # final.mp4
            ├── publishing/           # metadata-v1.json, upload-log.md
            └── analytics/            # snapshot-YYYY-MM-DD.json
```

## Quick Start

### Prerequisites

- **Node.js** 18+ (20+ recommended)
- **npm** 9+
- **OpenCode** CLI ([opencode.ai](https://opencode.ai)) or Claude
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

# 4. Create your channel
npm run new-channel my-channel-slug "My Channel Name"
# Edit channels/my-channel-slug/channel-config.json with your identity, tone, visuals

# 5. Start OpenCode (or open Claude)
opencode
```

### Create Your First Video

```bash
# Create a new video project
npm run new-video my-first-video "The World's Most Expensive Liquids" --channel my-channel-slug

# Use agents to work through the pipeline:
@researcher research "most expensive liquids in the world" for project my-first-video
@content-writer write a script for my-first-video based on research
@storyboard create storyboard for my-first-video

# Run production scripts:
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

### YouTube Data API v3 — Free (quota-based)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project, enable **YouTube Data API v3**
3. Go to **Credentials** → Create **OAuth 2.0 Client ID** (Desktop app)
4. Add `http://localhost:8888/callback` to Authorized redirect URIs
5. Run the auth flow to get your refresh token:
   ```bash
   node -e "
   const {google} = require('googleapis');
   require('dotenv').config();
   const oauth2Client = new google.auth.OAuth2(
     process.env.YOUTUBE_CLIENT_ID,
     process.env.YOUTUBE_CLIENT_SECRET,
     'http://localhost:8888/callback'
   );
   console.log(oauth2Client.generateAuthUrl({
     access_type: 'offline',
     scope: ['https://www.googleapis.com/auth/youtube'],
     prompt: 'consent'
   }));
   "
   ```
6. Set in `.env`:
   ```
   YOUTUBE_CLIENT_ID=your_client_id
   YOUTUBE_CLIENT_SECRET=your_client_secret
   YOUTUBE_REFRESH_TOKEN=your_refresh_token
   ```

## Channel Configuration

`channels/<slug>/channel-config.json` defines your channel's identity and defaults.

| Section | Controls |
|---------|----------|
| `channel` | Name, handle, language, niche, description, maturity |
| `content` | Default tone, target audience, video length, avoid topics |
| `tts` | ElevenLabs voice ID, model, stability |
| `visuals` | Brand colors, font, resolution, fps, AI image style |
| `youtube` | Default category, visibility, tags, end screen pattern |

## NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run new-channel <slug> [name]` | Create a new channel |
| `npm run new-video <slug> [title] [--channel <slug>]` | Create a new video project |
| `npm run tts <slug>` | Generate TTS voiceover |
| `npm run render <slug>` | Render video via Remotion |
| `npm run upload <slug>` | Upload to YouTube |
| `npm run analytics <slug>` | Fetch YouTube analytics |
| `npm run collect <slug> <image\|video> <query>` | Download Pexels stock media |
| `npm run generate-image <slug> <prompt>` | Generate AI image |
| `npm run studio` | Open Remotion Studio |
| `npm run sync-ai` | Sync .ai/ → .claude/ + .opencode/ |

## Agents

| Agent | Role |
|-------|------|
| `@director` | Pipeline orchestration, coordinates all other agents |
| `@researcher` | Topic research, fact gathering, source validation |
| `@content-writer` | Script writing with voiceover markers |
| `@content-strategist` | Topic ideation, trend analysis, content calendar |
| `@storyboard` | Scene-by-scene visual planning |
| `@collector` | Stock media & asset gathering |
| `@video-production` | Production oversight, render coordination |
| `@publisher` | YouTube metadata, SEO, upload |
| `@youtube-expert` | YouTube algorithm strategy |
| `@analytics` | Performance analysis and insights |
| `@critic` | Quality gate at every pipeline stage |
| `@qa` | Process improvement, friction detection |

## Multiple Channels

The framework supports multiple channels on the same machine:

```bash
npm run new-channel cooking-channel "My Cooking Channel"
npm run new-channel finance-channel "My Finance Channel"

npm run new-video pasta-101 --channel cooking-channel
npm run new-video bitcoin-explained --channel finance-channel
```

Each channel has its own config, voice, visual style, and video library.

## Version Management

- Files: `script-v1.md`, `script-v2.md`, `storyboard-v1.json`, etc.
- Old versions are **never deleted**
- Each file includes a version header: `version`, `based_on`, `changes_from_prev`, `date`
- `config.json` tracks current version per stage and a full `history` array

## Cost Estimate

For a typical 8-minute data-driven video:

| Service | Usage | Cost |
|---------|-------|------|
| ElevenLabs TTS | ~3,000 chars | Free (10k/month) |
| Pexels stock | N/A (data charts) | Free |
| DALL-E / Gemini | 0-5 images | ~$0.00-0.20 |
| YouTube API | Upload + analytics | Free |
| **Total** | | **~$0.00-0.20/video** |

## License

MIT
