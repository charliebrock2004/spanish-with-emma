import type { VocabCategory } from '@/types/curriculum';
import type { VocabProgress } from '@/types/progress';
import { DAY_MS } from './dates';

/**
 * A small Leitner-style spaced-review scheduler.
 *
 * Every correct answer can raise mastery by one step (at most once per day, so
 * cramming a word five times in one lesson doesn't "master" it); a wrong answer
 * drops it and makes the word due again straight away.
 */

export interface VocabLike {
  id: string;
  spanish: string;
  english: string;
  category: VocabCategory;
  difficulty: number;
}

/** Days until the next review, indexed by mastery (0–5). */
export const REVIEW_INTERVAL_DAYS = [0, 1, 3, 7, 14, 30] as const;
/** Mastery-0 words come back within the same session / later that day. */
const RELEARN_DELAY_MS = 10 * 60 * 1000;

export const MAX_MASTERY = 5;

export function newVocabProgress(item: VocabLike): VocabProgress {
  return {
    id: item.id,
    spanish: item.spanish,
    english: item.english,
    category: item.category,
    difficulty: item.difficulty,
    timesSeen: 0,
    timesCorrect: 0,
    timesIncorrect: 0,
    lastReviewed: null,
    nextReview: null,
    mastery: 0,
    streak: 0,
    masteryDate: null,
  };
}

export function markSeen(progress: VocabProgress, now: number): VocabProgress {
  return {
    ...progress,
    timesSeen: progress.timesSeen + 1,
    lastReviewed: progress.lastReviewed ?? now,
    nextReview: progress.nextReview ?? now + RELEARN_DELAY_MS,
  };
}

export function recordVocabAnswer(
  progress: VocabProgress,
  correct: boolean,
  now: number,
  today: string,
): VocabProgress {
  const next: VocabProgress = {
    ...progress,
    timesSeen: progress.timesSeen + 1,
    lastReviewed: now,
  };
  if (correct) {
    next.timesCorrect += 1;
    next.streak += 1;
    if (next.masteryDate !== today || next.mastery === 0) {
      next.mastery = Math.min(MAX_MASTERY, next.mastery + 1);
      next.masteryDate = today;
    }
    const days = REVIEW_INTERVAL_DAYS[next.mastery];
    next.nextReview = now + (days === 0 ? RELEARN_DELAY_MS : days * DAY_MS);
  } else {
    next.timesIncorrect += 1;
    next.streak = 0;
    next.mastery = Math.max(0, next.mastery - (next.mastery >= 3 ? 2 : 1));
    next.nextReview = now;
  }
  return next;
}

export const isLearned = (p: VocabProgress) => p.timesCorrect > 0;
export const isMastered = (p: VocabProgress) => p.mastery >= 4;
export const isDue = (p: VocabProgress, now: number) =>
  p.timesSeen > 0 && (p.nextReview === null || p.nextReview <= now);

/** Words the player keeps getting wrong. */
export function isWeak(p: VocabProgress): boolean {
  if (p.timesIncorrect === 0) return false;
  const errorRate = p.timesIncorrect / Math.max(1, p.timesSeen);
  return p.timesIncorrect >= 2 ? errorRate >= 0.25 : p.streak === 0;
}

/** How urgently a word needs review — higher first. */
export function reviewPriority(p: VocabProgress, now: number): number {
  const overdueDays = p.nextReview === null ? 0 : Math.max(0, (now - p.nextReview) / DAY_MS);
  const weakness = p.timesIncorrect * 2 - p.streak;
  return (isWeak(p) ? 100 : 0) + weakness * 5 + (MAX_MASTERY - p.mastery) * 3 + Math.min(overdueDays, 30);
}

export function reviewQueue(
  vocab: Record<string, VocabProgress>,
  now: number,
  { limit = 12, exclude = [] as string[] } = {},
): VocabProgress[] {
  const excluded = new Set(exclude);
  return Object.values(vocab)
    .filter((p) => !excluded.has(p.id) && isDue(p, now))
    .sort((a, b) => reviewPriority(b, now) - reviewPriority(a, now))
    .slice(0, limit);
}

export function weakWords(
  vocab: Record<string, VocabProgress>,
  { limit = 3, exclude = [] as string[] } = {},
): VocabProgress[] {
  const excluded = new Set(exclude);
  const now = Date.now();
  return Object.values(vocab)
    .filter((p) => !excluded.has(p.id) && isWeak(p))
    .sort((a, b) => reviewPriority(b, now) - reviewPriority(a, now))
    .slice(0, limit);
}
