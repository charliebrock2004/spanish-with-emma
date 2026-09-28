# Spanish with Emma

Learn European Spanish by talking with Emma — from your very first *¡Hola!* to real spoken conversations. It's a mobile-first game for iPhone (add it to your home screen): play, earn, unlock, improve, collect, come back.

**The course**
- **65 lessons in 6 levels** — from complete beginner (A1) to B2, about 570 words and 1,400 exercises — laid out as a journey across Spain, from Madrid to Santiago.
- **Speaking first.** You answer out loud and get word-by-word feedback (or type, any time).
- **Talk to Emma.** Thirteen guided conversations (plus two special scenes from the shop) run on the device — no AI key needed — and remember what you tell her; seven free AI chat topics adapt to your level.
- **Gentle corrections, smart review, six mini-games** (Word Match, Listen & Pick, Speed Round, Vocab Blast, Build the Sentence, Conversation Challenge).

**The game**
- **A journey across Spain.** Each level is a stop — Madrid, Salamanca, Barcelona, Sevilla, Valencia, Santiago — drawn as a postcard with its landmarks. Finish one for a passport stamp and a train to the next city (and something true about it). Home and the results screen always show where you are and how far to the next stop.
- **Answers that feel different by moment**: a quick tick for a right answer, sparks for a combo, fire at ten in a row, a ribbon for milestones (your first spoken word, each lesson's final challenge) — gentle and never punishing when you're wrong. Phones that support it buzz too.
- **Player level 1 → 120**, separate from your language level, with a level-up moment, coins and unlocks along the way (several levels at once are one celebration, not a queue of them).
- **Coins** from lessons, quests, streaks, games and chests — spent in the **shop** on Emma's outfits, backgrounds, avatar frames, chat bubbles, colour themes, special conversation scenes, XP boosts and streak freezes. Cosmetics and conveniences only — nothing pay-to-win, and no real money anywhere.
- **Combos** (×2 at 3 in a row, ×3 at 5, ×5 at 10), **⭐⭐⭐ ratings** and a **perfect-lesson** bonus.
- **Daily quests** (three a day, plus a daily chest), a **weekly challenge** with an exclusive cosmetic, **streak milestones** (3, 7, 14, 30, 60, 100, 365 days) with freezes that are earned or bought — and a warm welcome back, never guilt.
- **Chests** with published odds, decided the moment they're opened (reloading can't reroll them).
- **Achievements** in a cabinet — bronze, silver and gold, with locked ones as silhouettes.
- **Emma as the main character** — fifteen expressions, her own reactions, and her outfit, background, frame and speech bubble chosen by you. Buy something she can wear and she puts it straight on.
- **Mini-game medals** — bronze, silver and gold targets for each of the six games.
- **Emma's voice** — ElevenLabs (a warm, natural Scottish voice for her English and a Castilian one for her Spanish), streamed as it's generated, with pause, replay and slow replay.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

Open it on your phone on the same network with `http://<your-computer's-IP>:3000`. Speech recognition needs HTTPS on a phone, so use a deployed URL (see below) or a tunnel for microphone features.

The whole game works with **no API keys**: lessons, speaking practice (the device's own speech recognition), Emma's voice (the device's own voices), reviews, games, quests, the shop and guided conversations. Keys only add the optional extras below.

## Deploy to Vercel

1. Push this repository to GitHub and import it in Vercel. The framework preset is Next.js; no settings to change.
2. Optionally add environment variables in **Project → Settings → Environment Variables** — all described in [`.env.example`](.env.example):

| Variable | What it switches on |
|---|---|
| `ANTHROPIC_API_KEY` | Free AI conversation with Emma (`ANTHROPIC_MODEL`, default `claude-opus-5`). |
| `ELEVENLABS_API_KEY` | Emma's natural voice (primary provider), streamed. |
| `EMMA_VOICE_ID` | Emma's ElevenLabs voice for both languages — or set `EMMA_ENGLISH_VOICE_ID` (Scottish) and `EMMA_SPANISH_VOICE_ID` (Castilian) separately. |
| `ELEVENLABS_MODEL` | Optional; default `eleven_multilingual_v2`. `eleven_flash_v2_5` for the lowest latency. |
| `EMMA_TTS_PROVIDER` | `elevenlabs` (default when its key is set), `openai` or `none`. The other configured provider is the automatic fallback, then the device voice. |
| `OPENAI_API_KEY` | Fallback cloud voice (steered to Scottish English / Castilian Spanish) and cloud speech recognition. |
| `STT_PROVIDER` | `none` to always use the device's speech recognition. |
| `APP_ACCESS_CODE` | Makes the paid routes private; entered once in Settings. |

3. Deploy (and redeploy after changing a variable — capabilities are read at build time).

On iPhone: Safari → Share → **Add to Home Screen**. For a Scottish voice without a cloud key, download **Fiona** in Settings → Accessibility → Spoken Content → Voices → English.

### Choosing Emma's voice

Emma should sound like a young, warm, natural Scottish woman — authentic, never a caricature — and speak Castilian Spanish.

1. In ElevenLabs, go to **Voices → Voice Library**, search **Scottish**, filter **Female** and **Young**, and preview a few. Pick one that's warm and clear at a relaxed pace. **Add to my voices**, then **⋯ → Copy voice ID**.
2. Or design one: **Voices → Voice Design**, describe her — *"A warm, friendly young woman in her twenties from Edinburgh, with a soft, natural Scottish accent. Clear, relaxed and encouraging, like a kind teacher chatting with a friend."* — generate, save and copy the voice ID.
3. For her Spanish, search the library for a young female **Castilian / Spain** voice (or design one: *"a warm young woman from Madrid speaking clear Castilian Spanish"*).
4. Set `EMMA_ENGLISH_VOICE_ID` and `EMMA_SPANISH_VOICE_ID` (or just `EMMA_VOICE_ID` to use one voice for both; the multilingual model speaks both languages).

If only `ELEVENLABS_API_KEY` is set, the app uses ElevenLabs' premade voice **"Lily"** (`pFZP5JQG7iQjIQuC4Bku`) — warm and British, **not** Scottish — as a stand-in so the key works immediately; Settings → About shows a reminder to set `EMMA_VOICE_ID`.

**How it speaks:** every line goes through a speech-preparation layer (`lib/voice/prepare.ts`) that removes markup, emoji and UI hints, expands abbreviations (*Sr.* → *señor*, *e.g.* → *for example*, *4,50 €* → *4,50 euros*), turns dashes and line breaks into pauses, tidies Spanish punctuation and cuts long replies into sentence-sized chunks. The first chunk streams straight into the audio player while the next ones load, and the chat prefetches Emma's lines while she's "typing". Delivery follows the moment — cheerful, excited, gentle or calm — and can be switched to an even tone in Settings.

### How secrets are handled

API keys are only read on the server (`lib/server/config.ts`) and only used by the route handlers in `app/api/*`. They never reach the browser — it only learns yes/no capability flags. The routes reject cross-site requests, rate-limit per IP, check the optional access code with a timing-safe comparison and validate every request. The AI prompt is built entirely on the server; the browser sends the conversation and a topic id, never prompt text.

## The reward economy

All prices live in `lib/game/economy.ts`; the rules live in `lib/game/engine.ts` (pure functions, fully unit tested).

| Source | XP | Coins |
|---|---|---|
| Correct answer | 10 × combo (×1/×2/×3/×5) | — |
| Spoken answer | 15 × combo | 1 |
| Lesson complete (first time / replay) | 25 | 10 / 3 |
| Perfect lesson (first time / again) | +50 | +20 / +5 |
| Finishing a level (region) | +100 | +100 + milestone chest |
| Review session | 20 | 5 |
| Game | 10 + 3 per right answer (max 60) + 25 new record | up to 25; **60 a day max** |
| Conversation | 5 per reply (max 50) + 30 for four or more | 3–10 |
| Daily goal | 20 | 10 |
| Daily quests | 40–100 each | 8–20 each, + daily chest |
| Weekly challenge | 1,000 | 300 + badge + exclusive cosmetic |
| Streak milestones | 100 → 3,000 | 50 → 2,000 (+ exclusives and chests) |
| Level up | — | 25 + 5 per 5 levels; chest every 5 levels |
| Achievements | — | 25 / 50 / 100 (bronze / silver / gold) |

Cosmetics cost 300–1,000 coins (a few days of play); an XP boost 200 and a streak freeze 250. Every one-off reward has a key in a **reward ledger** (`claimed` in the save), so replays, reloads, double taps and duplicate calls can never pay twice; coins can't go negative; chest contents are fixed on opening.

## Project structure

```
app/                      Next.js App Router pages and API routes
  api/chat                Emma's AI replies (Anthropic SDK, structured JSON output)
  api/tts, api/stt        Voice (ElevenLabs → OpenAI, streamed) and speech recognition proxies
  quests/, shop/          Quests, streak and chests; the shop
  lesson/[lessonId]       Lesson player (statically generated for every lesson)
  emma/, emma/[id]        Talk to Emma hub, guided, special and AI conversations
  review/, play/[gameId]  Review hub, smart review, mistakes and mini-games
  learn/, profile/, settings/, welcome/
components/
  celebrate/              Toasts, level-up / streak / weekly moments, chest opening
  cosmetics/              Backgrounds, frames, bubbles, themes
  emma/                   Emma's avatar and figures, 15 states, her lines
  game-ui/                HUD, level badge, coins, stars, reward chips
  home/, quests/, shop/   Game lobby, quests, shop
  game/, games/           Lessons (combos, results) and mini-games (countdown, scoring)
data/
  curriculum/             The course (level-1 … level-6)
  conversations/          Guided scenes, special scenes, AI chat topics
  achievements.ts, shop.ts, regions.ts, outfits.json
lib/game/                 Economy, levels, quests, weekly, streak milestones, chests, shop, engine
lib/voice/                Speech preparation (clean-up, abbreviations, pauses, chunking, styles)
lib/progress/, lib/text/, lib/curriculum/, lib/conversation/
services/voice/           VoiceService: listen / evaluate / speak, device + cloud providers
services/sound/           Synthesised sound effects and music (Web Audio, no files)
store/gameStore.ts        Saved game (Zustand, versioned with migrations) on top of lib/game/engine
docs/                     iPhone manual test checklist
```

### Adding lessons

Lessons are data. Create a file in `data/curriculum/level-N/`, add it to that level's `index.ts`, and the builder does the rest:

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
  ],
});
```

### Emma's art

Everything comes from the four original illustrations in `assets/emma/source/`. `npm run assets:emma` cuts them out and generates every outfit by recolouring her polka-dot outfit (only pixels below the neckline are touched — face, hair and skin stay exactly as drawn). To add an outfit, add its colours to `data/outfits.json` and an item to `data/shop.ts`, then run the script. To give one of Emma's fifteen states its own drawing, add the cut-outs as a new pose and point the state at it in `components/emma/emma.ts` (see the comment there).

## Scripts

| Command | |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm test` | Unit and integration tests (Vitest): curriculum, answer checking, SRS, streaks, guided conversations, API routes, the game engine and economy, voice preparation and the TTS route |
| `npm run test:e2e` | End-to-end tests (Playwright on an iPhone-sized viewport, speech mocked): a new learner's whole first session, rewards, quests, achievements, chests, the shop, levels, streaks, voice settings, games and mobile layout |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm run assets:emma` | Rebuild Emma's cut-outs, outfits and icons |

Real-device testing: [docs/IPHONE_TEST_CHECKLIST.md](docs/IPHONE_TEST_CHECKLIST.md).

## Tech

Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS 4, Zustand and the Anthropic SDK — no animation or UI libraries (celebrations are CSS and a small canvas). Web Speech API for device speech, with optional ElevenLabs / OpenAI cloud voices. Tested with Vitest and Playwright.
