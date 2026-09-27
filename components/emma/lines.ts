/**
 * Emma's voice: warm, playful, patient, occasionally cheeky — never gushing
 * over every answer. Lines rotate so she doesn't repeat herself.
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
  perfectLesson: ['A perfect lesson. ¡Increíble!', "Not a single mistake. I'm genuinely impressed."],
  harder: ["You're flying — I'll make things a wee bit harder. 🔥"],
  easier: ["Let's slow down a touch and practise a bit more. 🌱"],
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
