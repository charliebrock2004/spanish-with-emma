/**
 * Emma's voice: warm, playful, patient, a wee bit cheeky and Scottish — never
 * gushing over every answer. Lines rotate so she doesn't repeat herself.
 */
const LINES = {
  correct: ['¡Muy bien!', "That's it.", 'Correct.', 'Nice.', '¡Eso es!', 'Spot on.', 'Yes!', '¡Bien!', 'Exactly.'],
  correctStreak: [
    "You're on a roll 🔥",
    "You're getting the hang of this.",
    '¡Genial! Keep going.',
    'Look at you go.',
    'Perfecto.',
    "Careful — you'll be dreaming in Spanish soon.",
  ],
  correctAfterMistake: ['Much better!', 'There you go.', 'Nailed it this time.', '¡Eso es! See?'],
  accents: ['Correct — just watch the accent.', 'Yes! Tiny thing: the accent.'],
  typo: ['Got it — small spelling slip.', 'Yes! Just watch the spelling.'],
  incorrect: ['Almost! ❤️', 'Not quite — nearly there.', 'Close one!', "Don't worry — this one's tricky.", "Ooh, so close. Let's look at it."],
  speakGreat: ['Nice pronunciation!', '¡Perfecto!', 'That sounded great.', 'Lovely accent.', 'Muy bien dicho.'],
  speakGood: ['Good — I understood you perfectly.', 'Nice! Nearly spot on.', 'Got it!'],
  speakRetry: ["Almost — try that once more, nice and clear.", "I didn't quite catch that. One more time?", 'Close! Give it another go.'],
  speakGiveUp: ["Let's move on — we'll practise that one again later.", "No stress — I'll bring this one back in your review."],
  lessonDone: ['¡Lo has hecho! Lesson complete.', "That's the lesson done — lovely work.", 'Done! You get better every single day.'],
  perfectLesson: ['A perfect lesson. ¡Increíble!', "Not a single mistake. I'm genuinely impressed.", "Flawless. I'm telling everyone."],
  harder: ["You're flying — I'll make things a wee bit harder. 🔥"],
  easier: ["Let's slow down a touch and practise a bit more. 🌱"],
  // ─── Game moments ───
  combo3: ['¡Toma! Three in a row.', 'Combo! Keep it going.', "That's a combo — double XP!"],
  combo5: ["×3! You're on fire 🔥", 'Five in a row — ¡madre mía!', "Oh, you're good at this."],
  combo10: ['TEN in a row?! Who even are you? ×5!', '¡Imparable! Ten in a row.', "Ten! I'm actually speechless. Well — almost."],
  levelUp: ['Level up! Look at you go.', '¡Subes de nivel! That was quick.', 'Another level. You’re getting dangerous.'],
  purchase: ['Oh, I love it. Very me.', '¡Qué bonito! Good choice.', 'Honestly? Great taste.'],
  chest: ['Ooh, what have we got…', 'Go on, open it!', 'I love this bit.'],
  welcomeBack: ["You're back! No guilt — let's just pick up where we left off.", '¡Hola de nuevo! I kept your seat warm.'],
  todayDone: ["That's you done for today. Go have a cup of tea — you've earned it.", "Everything done! ¡Qué crack! Same time tomorrow?"],
  newRecord: ['¡Nuevo récord! Your best score yet.', 'A new record! Frame that one.'],
  // ─── Lesson pacing ───
  finalChallenge: ['Last one — make it count!', "Final challenge. You've got this.", "One more and it's done. ¡Vamos!"],
  finalDone: ["¡Eso es! That's the lesson in the bag.", "And that's a wrap!", 'Final one — nailed it.'],
  firstWord: ["¡Perfecto! That's your very first Spanish word.", 'Listen to you! Your first Spanish word.'],
  // ─── Collecting ───
  wearing: ['Ta-da! What do you think?', "Right, I'm keeping this on.", 'Oh, I love it. Very me.'],
  newLook: ['Ooh, something new to wear!', "A new look! I'll try it on later.", 'For me? You shouldn’t have.'],
} as const;

export type LineKind = keyof typeof LINES;

const lastUsed = new Map<LineKind, string>();

export function emmaLine(kind: LineKind): string {
  const pool = LINES[kind];
  const previous = lastUsed.get(kind);
  const options = pool.length > 1 ? pool.filter((l) => l !== previous) : pool;
  const line = options[Math.floor(Math.random() * options.length)];
  lastUsed.set(kind, line);
  return line;
}

/** The same line for the same `seed` — for lines chosen while rendering, which must be pure. */
export function emmaLineFor(kind: LineKind, seed: string): string {
  const pool = LINES[kind];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return pool[hash % pool.length];
}

/** Emma's line when a combo crosses a multiplier step (3, 5, 10). */
export function comboLine(combo: number): string | null {
  if (combo === 3) return emmaLine('combo3');
  if (combo === 5) return emmaLine('combo5');
  if (combo === 10) return emmaLine('combo10');
  return null;
}
