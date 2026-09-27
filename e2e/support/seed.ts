import type { Page } from '@playwright/test';

const DAY = 86_400_000;

const WORDS: Array<[string, string, string, string]> = [
  ['hola', 'hola', 'hello', 'greetings'],
  ['adios', 'adiós', 'goodbye', 'greetings'],
  ['buenos-dias', 'buenos días', 'good morning', 'greetings'],
  ['buenas-noches', 'buenas noches', 'good night', 'greetings'],
  ['gracias', 'gracias', 'thank you', 'basics'],
  ['por-favor', 'por favor', 'please', 'basics'],
  ['si', 'sí', 'yes', 'basics'],
  ['me-llamo', 'me llamo', 'my name is', 'people'],
  ['como-estas', '¿cómo estás?', 'how are you?', 'questions'],
  ['muy-bien', 'muy bien', 'very well', 'feelings'],
  ['genial', 'genial', 'great', 'feelings'],
  ['cansado', 'cansado', 'tired', 'feelings'],
  ['uno', 'uno', 'one', 'numbers'],
  ['dos', 'dos', 'two', 'numbers'],
  ['tres', 'tres', 'three', 'numbers'],
  ['rojo', 'rojo', 'red', 'colours'],
  ['azul', 'azul', 'blue', 'colours'],
  ['verde', 'verde', 'green', 'colours'],
];

/** A learner who has finished most of Level 1 and knows a few words. */
export function learnerState(now = Date.now()) {
  const vocab = Object.fromEntries(
    WORDS.map(([id, spanish, english, category], i) => [
      id,
      {
        id,
        spanish,
        english,
        category,
        difficulty: 1,
        timesSeen: 4,
        timesCorrect: 3,
        timesIncorrect: i % 5 === 0 ? 2 : 0,
        lastReviewed: now - 2 * DAY,
        nextReview: i % 2 === 0 ? now - 60_000 : now + 3 * DAY,
        mastery: (i % 5) + 1,
        streak: 1,
        masteryDate: null,
      },
    ]),
  );
  const lessons = ['l1-hola', 'l1-manners', 'l1-me-llamo', 'l1-como-estas', 'l1-numbers', 'l1-colours', 'l1-de-donde', 'l1-age'];
  return {
    version: 1,
    state: {
      profile: { name: 'Charlie', experience: 'new', startedAt: now - 10 * DAY, onboarded: true, placementLevel: 1 },
      xp: 640,
      completedLessons: Object.fromEntries(
        lessons.map((id) => [id, { level: 1, completedAt: now - DAY, bestAccuracy: 0.9, perfect: false, attempts: 1, xpEarned: 80 }]),
      ),
      completedLevels: [],
      vocab,
      mistakes: [
        {
          id: 'm1',
          at: now - DAY,
          type: 'vocabulary',
          prompt: 'good morning',
          expected: 'buenos días',
          given: 'buenas noches',
          vocabIds: ['buenos-dias'],
          resolved: false,
        },
      ],
      achievements: {},
      settings: { soundEffects: false, music: false },
    },
  };
}

/** Saves progress into the app's storage before the app loads. */
export async function seed(page: Page, state: object = learnerState()) {
  await page.addInitScript((value) => {
    if (!window.localStorage.getItem('spanish-with-emma')) window.localStorage.setItem('spanish-with-emma', value);
  }, JSON.stringify(state));
}
