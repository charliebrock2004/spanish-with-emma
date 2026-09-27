import { describe, expect, it } from 'vitest';
import { blastCard, distinctWords, listenQuestion, matchRounds, speedQuestion, wordStream } from '@/lib/games/rounds';
import { distractorPool, mistakeSession, resolvedMistakeIds, smartReviewSession, smartReviewWords, wordBucket, type WordLite } from '@/lib/review/build';
import { newVocabProgress, type VocabLike } from '@/lib/progress/srs';
import { seededRandom } from '@/lib/utils';
import type { MistakeRecord, VocabProgress } from '@/types/progress';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 8, 20, 12);

const words: WordLite[] = [
  ['hola', 'hello', 'greetings'],
  ['adiós', 'goodbye', 'greetings'],
  ['gracias', 'thank you', 'basics'],
  ['por favor', 'please', 'basics'],
  ['sí', 'yes', 'basics'],
  ['no', 'no', 'basics'],
  ['agua', 'water', 'drinks'],
  ['café', 'coffee', 'drinks'],
  ['té', 'tea', 'drinks'],
  ['pan', 'bread', 'food'],
  ['queso', 'cheese', 'food'],
  ['rojo', 'red', 'colours'],
].map(([spanish, english, category], i) => ({
  id: `w${i}`,
  spanish,
  english,
  category: category as VocabLike['category'],
  difficulty: 1,
  level: i < 8 ? 1 : 2,
}));

function progress(word: VocabLike, patch: Partial<VocabProgress>): VocabProgress {
  return { ...newVocabProgress(word), timesSeen: 3, lastReviewed: NOW - 2 * DAY, ...patch };
}

describe('smart review', () => {
  it('reviews due words first, weakest first', () => {
    const vocab = {
      w0: progress(words[0], { mastery: 3, nextReview: NOW + DAY, timesCorrect: 3 }),
      w1: progress(words[1], { mastery: 1, nextReview: NOW - DAY, timesCorrect: 1 }),
      w2: progress(words[2], { mastery: 1, nextReview: NOW - DAY, timesIncorrect: 3, timesCorrect: 1 }),
    };
    const { words: picked, due } = smartReviewWords(vocab, NOW);
    expect(due).toBe(true);
    expect(picked.map((w) => w.id)).toEqual(['w2', 'w1']);
  });

  it('falls back to the least secure words when nothing is due', () => {
    const vocab = {
      w0: progress(words[0], { mastery: 4, nextReview: NOW + 5 * DAY }),
      w1: progress(words[1], { mastery: 2, nextReview: NOW + DAY }),
    };
    const { words: picked, due } = smartReviewWords(vocab, NOW);
    expect(due).toBe(false);
    expect(picked.map((w) => w.id)).toEqual(['w1', 'w0']);
  });

  it('ignores words the player has never met', () => {
    const vocab = { w0: { ...newVocabProgress(words[0]) } };
    expect(smartReviewWords(vocab, NOW).words).toHaveLength(0);
  });

  it('builds a session with distractors from known words and the curriculum', () => {
    const vocab = Object.fromEntries(words.slice(0, 5).map((w) => [w.id, progress(w, { nextReview: NOW - 1, mastery: 1 })]));
    const pool = distractorPool(vocab, words, 1);
    expect(pool.map((w) => w.id)).toEqual(['w0', 'w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7']);
    const { exercises } = smartReviewSession(vocab, words, 1, { now: NOW, speaking: false, seed: 't' });
    // 5 words + one match round.
    expect(exercises).toHaveLength(6);
    expect(exercises.some((e) => e.type === 'match')).toBe(true);
    for (const e of exercises) if (e.type === 'choice') expect(e.distractors.length).toBeGreaterThanOrEqual(3);
  });
});

describe('mistake review', () => {
  const mistake = (id: string, patch: Partial<MistakeRecord>): MistakeRecord => ({
    id,
    at: NOW,
    type: 'vocabulary',
    prompt: '',
    expected: '',
    given: '',
    vocabIds: [],
    resolved: false,
    ...patch,
  });

  it('replays snapshots, merges repeats and resolves them together', () => {
    const snapshot = { id: 'l1#3', type: 'speak' as const, skill: 'speaking' as const, vocabIds: ['w0'], spanish: 'hola', english: 'hello', accept: ['hola'] };
    const mistakes = [
      mistake('m1', { exercise: snapshot }),
      mistake('m2', { exercise: snapshot }),
      mistake('m3', { vocabIds: ['w6'] }),
      mistake('m4', { vocabIds: ['w6'], resolved: true }),
      mistake('m5', { vocabIds: ['missing'] }),
    ];
    const { exercises, mistakeIds } = mistakeSession(mistakes, words, { seed: 's' });
    expect(exercises).toHaveLength(2);
    expect(exercises[0]).toMatchObject({ id: 'l1#3', isReview: true });
    expect(mistakeIds['l1#3']).toEqual(['m1', 'm2']);
    expect(resolvedMistakeIds(mistakeIds, ['l1#3'])).toEqual(['m1', 'm2']);
    expect(resolvedMistakeIds(mistakeIds, [exercises[1].id])).toEqual(['m3']);
  });

  it('caps the session length', () => {
    const many = words.map((w, i) => mistake(`m${i}`, { vocabIds: [w.id] }));
    expect(mistakeSession(many, words, { seed: 's', limit: 4 }).exercises).toHaveLength(4);
  });
});

describe('word buckets', () => {
  it('sorts words into learning, strong and tricky', () => {
    expect(wordBucket(progress(words[0], { mastery: 5 }))).toBe('strong');
    expect(wordBucket(progress(words[0], { mastery: 2 }))).toBe('learning');
    expect(wordBucket(progress(words[0], { mastery: 1, timesSeen: 6, timesIncorrect: 3 }))).toBe('tricky');
  });
});

describe('mini-game rounds', () => {
  const random = () => seededRandom(42);

  it('never shows two identical meanings on a match board', () => {
    const pool = [...words, { ...words[0], id: 'dup', spanish: 'buenas' }];
    expect(distinctWords(pool)).toHaveLength(words.length);
    const boards = matchRounds(pool, random(), 3, 5);
    expect(boards.map((b) => b.length)).toEqual([5, 5]);
    const ids = boards.flat().map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('builds four distinct options that include the answer', () => {
    for (let i = 0; i < 6; i += 1) {
      const q = speedQuestion(words[i], words, random(), i);
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.options).toContain(q.answer);
      expect(q.optionsLang).toBe(i % 2 === 1 ? 'es' : 'en');
    }
    const listen = listenQuestion(words[3], words, random());
    expect(listen.answer).toBe('please');
    expect(listen.prompt).toBe('por favor');
  });

  it('makes blast cards that are sometimes true and sometimes false', () => {
    const r = random();
    const cards = Array.from({ length: 40 }, (_, i) => blastCard(words[i % words.length], words, r));
    expect(cards.some((c) => c.isMatch)).toBe(true);
    expect(cards.some((c) => !c.isMatch)).toBe(true);
    for (const c of cards) expect(c.isMatch ? c.english === c.word.english : c.english !== c.word.english).toBe(true);
  });

  it('streams words without immediate repeats', () => {
    const next = wordStream(words.slice(0, 3), random());
    let previous = next();
    for (let i = 0; i < 30; i += 1) {
      const current = next();
      expect(current.id).not.toBe(previous.id);
      previous = current;
    }
  });
});

describe('game words', () => {
  it('leaves out words spelt the same in both languages', async () => {
    const { gameWords } = await import('@/lib/review/build');
    const vocab = {
      a: progress({ id: 'a', spanish: 'no', english: 'no', category: 'basics', difficulty: 1 }, {}),
      b: progress({ id: 'b', spanish: 'hotel', english: 'Hotel', category: 'travel', difficulty: 1 }, {}),
      c: progress({ id: 'c', spanish: 'sí', english: 'yes', category: 'basics', difficulty: 1 }, {}),
    };
    expect(gameWords(vocab).map((w) => w.id)).toEqual(['c']);
  });
});
