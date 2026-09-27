import type { Exercise, Lang } from '@/types/curriculum';
import type { VocabLike } from '@/lib/progress/srs';
import { normalizeText, stripAccents } from '@/lib/text/normalize';
import { hashString, seededRandom, shuffle } from '@/lib/utils';

/**
 * Builds exercises straight from vocabulary — used by smart review, the
 * "quick review" cards slipped into lessons, and the mini-games. Safe to run in
 * the browser (no curriculum import).
 */

export type ReviewKind = 'meaning' | 'recall' | 'listen' | 'type' | 'speak';

const key = (text: string, lang: Lang) => stripAccents(normalizeText(text, { lang }));

function distractorsFor(word: VocabLike, pool: VocabLike[], lang: Lang, random: () => number, count = 5): string[] {
  const field = lang === 'es' ? 'spanish' : 'english';
  const seen = new Set([key(word[field], lang)]);
  const same = shuffle(pool.filter((p) => p.id !== word.id && p.category === word.category), random);
  const rest = shuffle(pool.filter((p) => p.id !== word.id && p.category !== word.category), random);
  const out: string[] = [];
  for (const p of [...same, ...rest]) {
    const k = key(p[field], lang);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p[field]);
    if (out.length >= count) break;
  }
  return out;
}

export function reviewExercise(word: VocabLike, pool: VocabLike[], kind: ReviewKind, seedKey: string): Exercise {
  const id = `review:${word.id}:${kind}:${seedKey}`;
  const random = seededRandom(hashString(id));
  const base = { id, vocabIds: [word.id], isReview: true };
  switch (kind) {
    case 'meaning':
      return {
        ...base,
        type: 'choice',
        variant: 'meaning',
        skill: 'vocabulary',
        prompt: `What does *${word.spanish}* mean?`,
        display: word.spanish,
        displayLang: 'es',
        audio: word.spanish,
        answer: word.english,
        distractors: distractorsFor(word, pool, 'en', random),
        optionsLang: 'en',
        explanation: `*${word.spanish}* means "${word.english}".`,
      };
    case 'recall':
      return {
        ...base,
        type: 'choice',
        variant: 'recall',
        skill: 'vocabulary',
        prompt: `How do you say "${word.english}" in Spanish?`,
        display: word.english,
        displayLang: 'en',
        answer: word.spanish,
        distractors: distractorsFor(word, pool, 'es', random),
        optionsLang: 'es',
        explanation: `"${word.english}" is *${word.spanish}*.`,
      };
    case 'listen':
      return {
        ...base,
        type: 'listen',
        skill: 'listening',
        mode: 'choose',
        audio: word.spanish,
        english: word.english,
        distractors: distractorsFor(word, pool, 'es', random),
        explanation: `*${word.spanish}* — "${word.english}"`,
      };
    case 'type':
      return {
        ...base,
        type: 'translate',
        skill: 'vocabulary',
        from: 'en',
        text: word.english,
        answers: [word.spanish],
        bankDistractors: distractorsFor(word, pool, 'es', random, 4).flatMap((d) => d.split(' ')).slice(0, 4),
      };
    case 'speak':
      return {
        ...base,
        type: 'speak',
        skill: 'speaking',
        spanish: word.spanish,
        english: word.english,
        accept: [word.spanish],
      };
  }
}

/** Picks an exercise type that suits how well the word is known. */
export function kindForMastery(mastery: number, index: number, speaking: boolean): ReviewKind {
  const rotations: ReviewKind[][] = [
    ['meaning', 'listen', 'meaning'],
    ['recall', 'listen', 'meaning'],
    ['recall', 'type', 'listen'],
    ['type', 'recall', speaking ? 'speak' : 'listen'],
    ['type', speaking ? 'speak' : 'recall', 'listen'],
    ['type', speaking ? 'speak' : 'type', 'recall'],
  ];
  const row = rotations[Math.max(0, Math.min(5, mastery))];
  return row[index % row.length];
}

export function buildReviewSession(
  words: Array<VocabLike & { mastery?: number }>,
  pool: VocabLike[],
  { speaking, seed }: { speaking: boolean; seed: string },
): Exercise[] {
  const exercises = words.map((w, i) => reviewExercise(w, pool, kindForMastery(w.mastery ?? 0, i, speaking), `${seed}-${i}`));
  // A match round in the middle keeps it lively when there are enough words.
  if (words.length >= 5) {
    const pairs = words.slice(0, 5).map((w) => ({ id: w.id, spanish: w.spanish, english: w.english }));
    exercises.splice(Math.min(4, exercises.length), 0, {
      id: `review:match:${seed}`,
      type: 'match',
      skill: 'vocabulary',
      vocabIds: pairs.map((p) => p.id),
      pairs,
      isReview: true,
    });
  }
  return exercises;
}
