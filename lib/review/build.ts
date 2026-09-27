import { buildReviewSession, reviewExercise } from '@/lib/curriculum/generate';
import { normalizeText, stripAccents } from '@/lib/text/normalize';
import { isDue, MAX_MASTERY, reviewPriority, type VocabLike } from '@/lib/progress/srs';
import type { Exercise, LevelId } from '@/types/curriculum';
import type { MistakeRecord, VocabProgress } from '@/types/progress';

/**
 * Builds review sessions and game word pools from the player's progress.
 * Pure functions — safe in the browser and easy to test.
 */

/** A curriculum word as sent to review and game pages. */
export interface WordLite extends VocabLike {
  level: LevelId;
}

/** Games need a handful of words the player has actually met. */
export const MIN_GAME_WORDS = 6;

export const seenWords = (vocab: Record<string, VocabProgress>) => Object.values(vocab).filter((v) => v.timesSeen > 0);

/** Words spelt the same in both languages ("no", "hotel") make games trivial. */
const sameInBoth = (w: VocabLike) => stripAccents(normalizeText(w.spanish)) === stripAccents(normalizeText(w.english, { lang: 'en' }));

/** Words the mini-games can use. */
export const gameWords = (vocab: Record<string, VocabProgress>) => seenWords(vocab).filter((w) => !sameInBoth(w));

/**
 * Words for a smart review: everything due (most urgent first); if nothing is
 * due, the least secure words the player knows, so "practise anyway" still helps.
 */
export function smartReviewWords(vocab: Record<string, VocabProgress>, now: number, limit = 12): { words: VocabProgress[]; due: boolean } {
  const seen = seenWords(vocab);
  const due = seen.filter((w) => isDue(w, now)).sort((a, b) => reviewPriority(b, now) - reviewPriority(a, now));
  if (due.length > 0) return { words: due.slice(0, limit), due: true };
  const practice = [...seen].sort(
    (a, b) => a.mastery - b.mastery || (a.lastReviewed ?? 0) - (b.lastReviewed ?? 0) || b.timesIncorrect - a.timesIncorrect,
  );
  return { words: practice.slice(0, Math.min(limit, 10)), due: false };
}

/** Distractors come from words the player knows first, then the curriculum up to their level. */
export function distractorPool(vocab: Record<string, VocabProgress>, curriculum: WordLite[], level: LevelId): VocabLike[] {
  const known = seenWords(vocab);
  const ids = new Set(known.map((w) => w.id));
  const extra = curriculum.filter((w) => w.level <= level && !ids.has(w.id));
  return [...known, ...extra];
}

export function smartReviewSession(
  vocab: Record<string, VocabProgress>,
  curriculum: WordLite[],
  level: LevelId,
  { now, speaking, seed }: { now: number; speaking: boolean; seed: string },
): { exercises: Exercise[]; due: boolean; words: VocabProgress[] } {
  const { words, due } = smartReviewWords(vocab, now);
  const exercises = buildReviewSession(words, distractorPool(vocab, curriculum, level), { speaking, seed });
  return { exercises, due, words };
}

/**
 * Replays the player's unresolved mistakes — the exact exercise when we have a
 * snapshot, otherwise a fresh question on the same word. Several mistakes on
 * the same exercise become one question that resolves them all.
 */
export function mistakeSession(
  mistakes: MistakeRecord[],
  pool: VocabLike[],
  { limit = 10, seed }: { limit?: number; seed: string },
): { exercises: Exercise[]; mistakeIds: Record<string, string[]> } {
  const byId = new Map(pool.map((w) => [w.id, w]));
  const exercises: Exercise[] = [];
  const mistakeIds: Record<string, string[]> = {};
  for (const m of mistakes) {
    if (m.resolved) continue;
    let exercise: Exercise | undefined = m.exercise ? { ...m.exercise, isReview: true } : undefined;
    if (!exercise) {
      const word = m.vocabIds.map((id) => byId.get(id)).find(Boolean);
      if (!word) continue;
      exercise = reviewExercise(word, pool, m.type === 'listening' ? 'listen' : 'recall', `${seed}-${word.id}`);
    }
    if (!mistakeIds[exercise.id]) {
      if (exercises.length >= limit) continue;
      exercises.push(exercise);
      mistakeIds[exercise.id] = [];
    }
    mistakeIds[exercise.id].push(m.id);
  }
  return { exercises, mistakeIds };
}

export function resolvedMistakeIds(mistakeIds: Record<string, string[]>, correctExerciseIds: string[]): string[] {
  return correctExerciseIds.flatMap((id) => mistakeIds[id] ?? []);
}

/** Mastery buckets for the word list. */
export type WordFilter = 'all' | 'learning' | 'strong' | 'tricky';

export function wordBucket(w: VocabProgress): Exclude<WordFilter, 'all'> {
  if (w.timesIncorrect >= 2 && w.timesIncorrect / Math.max(1, w.timesSeen) >= 0.25 && w.mastery < 4) return 'tricky';
  return w.mastery >= 4 ? 'strong' : 'learning';
}

export const masteryLabel = (mastery: number) =>
  ['New', 'Seen', 'Learning', 'Getting there', 'Strong', 'Mastered'][Math.max(0, Math.min(MAX_MASTERY, mastery))];
