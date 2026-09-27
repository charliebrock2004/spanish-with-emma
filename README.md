# Spanish with Emma

Learn European Spanish by talking with Emma: from your very first *¡Hola!* to real spoken conversations. It's a mobile-first web app built for iPhone, and you can add it to your home screen.

- **65 lessons across 6 levels.** Level 1 is complete beginner (A1) and Level 6 is B2. The course has about 570 words and 1,400 exercises in total.
- **Speaking first.** You answer out loud through the microphone and get word-by-word feedback. You can switch to typing at any time.
- **Emma's voice.** Emma speaks Castilian Spanish and explains things in natural Scottish English. You can switch between 🇪🇸 Spanish and 🏴󠁧󠁢󠁳󠁣󠁴󠁿 Scottish voices, or leave it on Auto.
- **Talk to Emma.**
  - Thirteen guided conversations work offline. Emma remembers what you tell her ("Vivo en Escocia" → "¡Ah, Escocia! ¿Te gusta vivir allí?") and simplifies when you get stuck.
  - There are also seven free AI chat topics, which adapt to your level.
- **Gentle corrections.** Emma says "Almost! ❤️ In Spanish we normally say…", gives you another try, and saves the mistake for review.
- **Smart review.** A spaced-repetition review brings words back when they're due. You can also replay your mistakes and browse your full word list with mastery levels.
- **Six mini-games:** Word Match, Listen & Pick, Speed Round, Vocab Blast, Build the Sentence and Conversation Challenge.
- **Progression:**
  - XP, levels and streaks (with streak freezes rather than punishment)
  - 28 achievements
  - a daily goal
  - difficulty that adapts to how you're doing
  - a profile with weekly stats

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

Open it on your phone on the same network with `http://<your-computer's-IP>:3000`. Speech recognition needs HTTPS on a phone, so use a deployed URL (see below) or a tunnel for microphone features.

The whole game works with **no API keys**: lessons, speaking practice (using the device's own speech recognition), Emma's voice (using the device's own voices), reviews, games and guided conversations. Keys only add the optional extras below.

## Deploy to Vercel

1. Push this repository to GitHub and import it in Vercel. The framework preset is Next.js, and you don't need to change any settings.
2. Optionally, add environment variables in **Project → Settings → Environment Variables**. They're all described in [`.env.example`](.env.example):

| Variable | What it switches on |
|---|---|
| `ANTHROPIC_API_KEY` | Free AI conversation with Emma. `ANTHROPIC_MODEL` defaults to `claude-opus-5`. |
| `OPENAI_API_KEY` | Natural cloud voices (a Castilian Spanish voice and a Scottish English voice) and cloud speech recognition. |
| `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID_EN`, `ELEVENLABS_VOICE_ID_ES` | Alternative cloud voices from the ElevenLabs library. |
| `TTS_PROVIDER`, `STT_PROVIDER` | Choose between providers, or set them to `none`. |
| `APP_ACCESS_CODE` | Makes the paid routes private. You enter the code once in Settings. |

3. Deploy, then redeploy whenever you change a variable. The app reads which features are available at build time.

On iPhone, open the site in Safari → Share → **Add to Home Screen**. For Emma's Scottish voice without a cloud key, download **Fiona** in Settings → Accessibility → Spoken Content → Voices → English.

### How secrets are handled

API keys are only read on the server, in `lib/server/config.ts`, and are only used by the route handlers in `app/api/*`. They never reach the browser: the client only receives yes/no capability flags.

The routes also protect themselves:
- They reject cross-site requests.
- They rate-limit per IP.
- They check the optional access code with a timing-safe comparison.
- They validate every request.

The AI prompt is built entirely on the server. The browser sends the conversation and a topic id, never prompt text.

## Project structure

```
app/                      Next.js App Router pages and API routes
  api/chat                Emma's AI replies (Anthropic SDK, structured JSON output)
  api/tts, api/stt        Cloud voice and speech recognition proxies
  api/access              Access-code check
  lesson/[lessonId]       Lesson player (statically generated for every lesson)
  emma/, emma/[id]        Talk to Emma hub, guided and AI conversations
  review/, play/[gameId]  Review hub, smart review, mistakes and mini-games
  learn/, profile/, settings/, welcome/
components/               UI: game (exercises), conversation, games, review, profile, settings, emma, voice, ui
data/curriculum/          The course, written as data (level-1 … level-6)
data/conversations/       Guided scenarios and AI chat topics
lib/curriculum/           Lesson DSL and builder (options, distractors, tiles, validation)
lib/progress/             XP, streaks, spaced repetition, achievements, adaptive difficulty, journey
lib/text/                 Answer checking, fuzzy speech matching, common-mistake corrections
lib/conversation/         Guided conversation engine and AI chat client
services/voice/           VoiceService: speechToText / evaluateSpeech / speak with device and cloud providers
services/sound/           Synthesised sound effects and optional music (Web Audio, no files)
services/storage/         Persistence adapter (localStorage now, ready to swap for a database)
store/gameStore.ts        All progress and settings (Zustand, persisted)
```

### Adding lessons

Lessons are data. Create a file in `data/curriculum/level-N/`, add it to that level's `index.ts`, and the builder does the rest: multiple-choice options, word tiles, listening distractors, vocabulary links for spaced review, XP and time estimates.

```ts
export default defineLesson({
  id: 'l2-pets',
  title: 'Pets',
  description: 'Dogs, cats and describing them',
  emoji: '🐶',
  vocabulary: [word('perro', 'el perro', 'dog', 'family', { pron: 'el PEH-rro' })],
  exercises: [
    intro('perro'),
    meaning('perro'),
    speak('Tengo un perro', 'I have a dog'),
    order('Mi perro se llama Max', 'My dog is called Max'),
    conversation('Pets', [
      emma('¿Tienes mascotas?', 'Do you have pets?', you(['Tengo {any}', 'No {any}'], 'I have a dog.', { hint: 'Tengo un perro' })),
    ]),
  ],
});
```

`npm test` checks every exercise in the course. For example, it makes sure:
- multiple-choice options are distinct
- word tiles rebuild the answer
- every model answer is accepted
- wrong conversation replies are rejected

## Scripts

| Command | |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm test` | Unit and integration tests (Vitest): curriculum, answer checking, SRS, streaks, guided conversations, API routes, games |
| `npm run test:e2e` | End-to-end tests (Playwright on an iPhone-sized viewport, with speech mocked) |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm run assets:emma` | Rebuild Emma's cut-outs and icons from `assets/emma/source` |

## Tech

Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS 4, Zustand and the Anthropic SDK. It uses the Web Speech API for device speech, with optional OpenAI or ElevenLabs cloud voices. It is tested with Vitest and Playwright.
