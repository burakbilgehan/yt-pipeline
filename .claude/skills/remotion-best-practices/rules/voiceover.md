---
name: voiceover
description: Adding AI-generated voiceover to Remotion compositions using Google Cloud TTS
metadata:
  tags: voiceover, audio, google-cloud-tts, tts, speech, ssml, calculateMetadata, dynamic duration
---

# Adding AI voiceover to a Remotion composition

Use **Google Cloud Text-to-Speech** to generate speech audio per scene, then use [`calculateMetadata`](./calculate-metadata) to dynamically size the composition to match the audio.

## Prerequisites

A **Google Cloud API key** is required (`GOOGLE_CLOUD_API_KEY` environment variable), restricted to the Cloud Text-to-Speech API.

Ensure the environment variable is available when running the generation script:

```bash
node --strip-types generate-voiceover.ts
```

## Generating audio with Google Cloud TTS

Create a script that reads the config, calls the Google Cloud TTS API for each scene, and writes WAV files to the `public/` directory so Remotion can access them via `staticFile()`.

The core API call for a single scene:

```ts title="generate-voiceover.ts"
// Read voice config from channel-config.json → tts
// voiceName, languageCode, modelId, speed, encoding come from there — never hardcode
const { voiceName, languageCode, speed, modelId } = channelConfig.tts;

// Voice name format depends on model — construct per API docs
const response = await fetch(
  `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_CLOUD_API_KEY}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: {
        ssml: `<speak>
          <s>Welcome to the show.</s>
          <break time="500ms"/>
          <s><prosody rate="slow">Let's begin.</prosody></s>
        </speak>`,
      },
      voice: {
        languageCode,
        name: voiceName,
      },
      audioConfig: {
        audioEncoding: "LINEAR16",  // WAV — read from channel-config → tts.encoding
        speaking_rate: speed ?? 1.0,
      },
    }),
  },
);

const data = await response.json();
const audioBuffer = Buffer.from(data.audioContent, "base64");
writeFileSync(`public/voiceover/${compositionId}/${scene.id}.wav`, audioBuffer);
```

### Input modes

Google Cloud TTS supports three input modes — use the right one for your script:

| Input field | When to use | Supports |
|-------------|-------------|----------|
| `text` | Plain text, no markup | Punctuation-based pauses only |
| `markup` | Scripts with `[pause short/long]` tags | `[pause short]`, `[pause]`, `[pause long]` tags |
| `ssml` | Full SSML control | `<break>`, `<prosody>`, `<say-as>`, `<phoneme>`, `<p>`, `<s>` |

### SSML tags available (Google Cloud TTS)

- `<speak>` — root element (required for SSML input)
- `<break time="Xms"/>` — precise pause in milliseconds
- `<prosody rate="slow">` — rate: `x-slow`/`slow`/`medium`/`fast`/`x-fast`. **Never use `pitch` attribute** — produces robotic output (technical limitation).
- `<p>`, `<s>` — paragraph and sentence boundaries
- `<say-as interpret-as="date/characters/cardinal">` — pronunciation hints
- `<phoneme alphabet="ipa" ph="...">` — custom IPA pronunciation
- `<sub alias="...">` — substitution alias

### Speaking rate (pace control)

Use `speaking_rate` in `audioConfig` (0.25 to 2.0, default 1.0):

```json
{ "audioConfig": { "audioEncoding": "LINEAR16", "speaking_rate": 0.85 } }
```

### Custom pronunciations

For technical terms or abbreviations:

```json
{
  "input": {
    "text": "The GDP fell by 2.4 percent",
    "custom_pronunciations": {
      "phrase": "GDP",
      "phonetic_encoding": "PHONETIC_ENCODING_IPA",
      "pronunciation": "dʒiː diː piː"
    }
  }
}
```

## Dynamic composition duration with calculateMetadata

Use [`calculateMetadata`](./calculate-metadata.md) to measure the [audio durations](./get-audio-duration.md) and set the composition length accordingly.

```tsx
import { CalculateMetadataFunction, staticFile } from "remotion";
import { getAudioDuration } from "./get-audio-duration";

const FPS = 30;

const SCENE_AUDIO_FILES = [
  "voiceover/my-comp/scene-01-intro.wav",
  "voiceover/my-comp/scene-02-main.wav",
  "voiceover/my-comp/scene-03-outro.wav",
];

export const calculateMetadata: CalculateMetadataFunction<Props> = async ({
  props,
}) => {
  const durations = await Promise.all(
    SCENE_AUDIO_FILES.map((file) => getAudioDuration(staticFile(file))),
  );

  const sceneDurations = durations.map((durationInSeconds) => {
    return durationInSeconds * FPS;
  });

  return {
    durationInFrames: Math.ceil(sceneDurations.reduce((sum, d) => sum + d, 0)),
  };
};
```

The computed `sceneDurations` are passed into the component via a `voiceover` prop so the component knows how long each scene should be.

If the composition uses [`<TransitionSeries>`](./transitions.md), subtract the overlap from total duration: [./transitions.md#calculating-total-composition-duration](./transitions.md#calculating-total-composition-duration)

## Rendering audio in the component

See [audio.md](./audio.md) for more information on how to render audio in the component.

## Delaying audio start

See [audio.md#delaying](./audio.md#delaying) for more information on how to delay the audio start.
