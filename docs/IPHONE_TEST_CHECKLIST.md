# iPhone Safari — manual test checklist

Automated tests run on an iPhone-sized Chromium with the speech APIs mocked. This list covers what only a real iPhone can tell you. Run it on a physical iPhone (ideally one recent and one older model, e.g. an iPhone 15 and an iPhone SE), in **Safari** and again after **Add to Home Screen** (standalone mode keeps its own storage).

Tick each box; anything marked **Expected** that doesn't happen is a bug.

**Setup:** deploy to an HTTPS URL (the microphone needs HTTPS). Test once with no API keys (device voices only) and once with `ELEVENLABS_API_KEY` + `EMMA_VOICE_ID` set. Settings → Sound effects on.

---

## 1. First run and layout

- [ ] Open the site: the welcome screen appears, with no horizontal scrolling and nothing under the notch or Dynamic Island.
- [ ] Go through onboarding. **Expected:** Home shows the HUD (level, streak, coins), Emma on her stage, **Continue quest**, daily quests, and a welcome chest.
- [ ] Rotate to landscape and back. **Expected:** nothing overlaps, and the bottom nav stays above the home indicator.
- [ ] Settings → Accessibility → Display & Text Size → Larger Text (a few steps). **Expected:** text grows, buttons still fit, and nothing is cut off.
- [ ] iOS Reduce Motion **on**, and separately the in-app Settings → Reduce motion. **Expected:** no confetti, no bouncing, and celebrations still show, just calmly.

## 2. Microphone permission

- [ ] First speaking exercise → tap the mic. **Expected:** the Safari permission prompt appears. Tap **Allow**, say *hola*. **Expected:** it's recognised, with a waveform while listening.
- [ ] Deny permission (fresh site data, then **Don't Allow**). **Expected:** a friendly message explaining how to allow the mic, and a **Type it instead** option. The lesson carries on by typing.
- [ ] Re-enable: Settings → Safari → Microphone → Allow (or aA → Website Settings). **Expected:** the mic works again without reinstalling.
- [ ] Settings → Screen Time → Content & Privacy → Dictation off (or Siri & Dictation off). **Expected:** the app explains that dictation is disabled and offers typing.
- [ ] Settings → Speaking → **Test microphone**. **Expected:** "It works! I heard: …".

## 3. Speech recognition

- [ ] Say short Spanish phrases (*buenos días*, *me llamo …*) with an English accent. **Expected:** accepted when close, with word-by-word feedback.
- [ ] Say nothing for a while. **Expected:** it stops listening by itself and prompts you to try again (no endless spinner).
- [ ] With noise in the background (TV on). **Expected:** it still works, or asks you to try again gently.
- [ ] Talk to Emma → a guided scene → answer by voice. **Expected:** Listening… → Thinking… → Emma replies and speaks.
- [ ] If an AI key is set: free chat by voice. **Expected:** "Thinking…" appears while waiting, Emma's avatar shows thinking, then speaking.

## 4. Emma's voice (TTS)

- [ ] **No keys:** Emma's Spanish uses a Spanish voice (Mónica), and English uses Fiona if it's downloaded (Settings → Accessibility → Spoken Content → Voices → English → Fiona). **Expected:** Settings → Emma's voice shows the device voices, with the Scottish one marked.
- [ ] **ElevenLabs:** Emma's English is the Scottish voice and her Spanish is Castilian. Settings → About shows "Natural cloud voices: On — ElevenLabs". Without `EMMA_VOICE_ID`, a reminder about the stand-in voice appears.
- [ ] Long lines (a lesson tip, a long chat reply). **Expected:** she starts speaking within about a second and carries on without gaps between sentences.
- [ ] Tap a speaker button while Emma talks. **Expected:** it pauses; tap again and it resumes from the same place.
- [ ] The 🐢 button. **Expected:** a clearly slower version.
- [ ] Chat header while she speaks. **Expected:** a waveform and a pause button.
- [ ] Settings → Expressive voice on/off. **Expected:** celebrations sound brighter and corrections softer when on; an even tone when off.
- [ ] Emojis and markup are never read aloud (for example, "You're on a roll 🔥" is spoken without "fire").

## 5. Autoplay restrictions

- [ ] Reload a lesson page directly (no tap yet). **Expected:** nothing tries to play before your first tap. After the first tap, audio works for the rest of the session.
- [ ] Settings → Play audio automatically **off**. **Expected:** Emma only speaks when you tap.
- [ ] Ringer switch on **silent**. **Expected:** note what happens; document any difference between sound effects (Web Audio) and Emma's voice. Effects are expected to follow the silent switch.

## 6. Background, foreground and locking

- [ ] Mid-lesson, switch to another app for a minute, then come back. **Expected:** the lesson is where you left it, and learning time didn't count while you were away.
- [ ] Lock the screen while Emma is speaking. **Expected:** speech stops or pauses cleanly. On unlock, nothing is stuck in "Speaking…", and the next tap works.
- [ ] Lock the screen while listening. **Expected:** listening ends. On unlock, the mic button is ready again.
- [ ] Leave the app open past midnight, then bring it to the foreground. **Expected:** new daily quests appear, and yesterday's streak day counts.

## 7. Interrupted audio

- [ ] Receive a phone call or FaceTime (or trigger Siri) while Emma speaks. **Expected:** audio stops, and the app recovers after the call. The next line plays when you tap.
- [ ] Play music in another app, then open the lesson. **Expected:** Emma's voice plays when you tap (music may duck or pause). Nothing crashes.
- [ ] Disconnect AirPods mid-sentence. **Expected:** playback stops or continues on the speaker, and the UI doesn't get stuck.

## 8. Slow network and offline

- [ ] Settings → Developer → Network Link Conditioner "3G" (or a weak signal). **Expected:** Emma still speaks. With a cloud voice there may be a short "Getting ready…", but no long silence.
- [ ] Airplane mode, then do a lesson. **Expected:** lessons, speaking (device recogniser permitting), device voices, games and guided conversations all work.
- [ ] Airplane mode, then AI free chat. **Expected:** a friendly "I couldn't reply" note with **Try again**, and no crash.
- [ ] With a cloud voice set, go offline mid-lesson. **Expected:** Emma switches to the device voice for the next line.

## 9. Persistence

- [ ] Finish a lesson, then force-quit Safari and reopen. **Expected:** XP, coins, streak, quests, chests and the equipped outfit are all kept.
- [ ] Add to Home Screen and open from the icon. **Expected:** a separate fresh start is normal (standalone storage is separate). Progress persists across launches of the icon.
- [ ] Private Browsing. **Expected:** the app works for the session and says nothing alarming. Progress is lost when the tab closes, which is expected.
- [ ] Settings → You → Export progress, then import on another device. **Expected:** everything, including coins and cosmetics, is restored.

## 10. Rewards (no double-claiming)

- [ ] Finish a lesson, and on the results screen pull to refresh or reload. **Expected:** you're sent back into the lesson from the start. The rewards you already got aren't paid again, and the coin total doesn't jump.
- [ ] Open a chest and reload during the animation. **Expected:** after the reload the chest is already open with the same prizes, and the coins were added once.
- [ ] Complete all three daily quests. **Expected:** one daily chest appears, and doing more quests doesn't add another.
- [ ] Double-tap **Check** or an answer quickly. **Expected:** the answer counts once (XP and combo go up by one step).

## 11. Shop and cosmetics

- [ ] Buy an outfit you can afford. **Expected:** coins go down by the price and Emma wears it (on Home, the Profile and the results screens). It survives a reload.
- [ ] Try to buy something you can't afford. **Expected:** the button is disabled, with "You need N more coins", and coins are unchanged.
- [ ] Exclusive items (for example Seville Gold) show as silhouettes with "Reach player level 20".
- [ ] Buy a streak freeze at 2/2. **Expected:** refused with a clear message.
- [ ] Equip a colour theme. **Expected:** the whole app's accent colour changes, including after a reload.
- [ ] Chest odds ("What could be inside?") are shown before opening.

## 12. Streak

- [ ] Play on two consecutive days. **Expected:** the streak goes to 2, and the flame is lit on the day you've played.
- [ ] Miss exactly one day while holding a freeze. **Expected:** "Streak saved" and the streak continues, with one freeze used.
- [ ] Miss more days than you have freezes. **Expected:** a warm "welcome back" (with a small reward), and the streak starts again at 1. No guilt messaging.
- [ ] Reach 3 days. **Expected:** the 3 day streak celebration (full screen) with its reward, once.

## 13. Games

- [ ] Each of the six games: start screen, then 3 · 2 · 1 · ¡Ya!, then play (score, combo ×2/×3/×5 badge, timer where timed), then results with XP, coins and NEW RECORD when beaten.
- [ ] Game coins cap at 60 a day (shown on the start screen). XP keeps coming.

---

Record the device, iOS version, Safari/standalone, and API-key setup with each run.
