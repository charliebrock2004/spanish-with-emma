import type { VocabLike } from '@/lib/progress/srs';
import { normalizeText } from '@/lib/text/normalize';
import { shuffle } from '@/lib/utils';

/**
 * Question generators for the mini-games. Everything is driven by a seeded
 * random function so rounds are reproducible in tests.
 */

type Random = () => number;

const keyEs = (w: VocabLike) => normalizeText(w.spanish, { lang: 'es' });
const keyEn = (w: VocabLike) => normalizeText(w.english, { lang: 'en' });

/** Removes words that would look identical on screen (same Spanish or same English). */
export function distinctWords(words: VocabLike[]): VocabLike[] {
  const es = new Set<string>();
  const en = new Set<string>();
  const out: VocabLike[] = [];
  for (const w of words) {
    const a = keyEs(w);
    const b = keyEn(w);
    if (es.has(a) || en.has(b)) continue;
    es.add(a);
    en.add(b);
    out.push(w);
  }
  return out;
}

/** Up to `rounds` boards of `size` pairs, with no word repeated. */
export function matchRounds(pool: VocabLike[], random: Random, rounds = 3, size = 5): VocabLike[][] {
  const words = distinctWords(shuffle(pool, random));
  const boards: VocabLike[][] = [];
  for (let i = 0; i < rounds; i += 1) {
    const board = words.slice(i * size, (i + 1) * size);
    if (board.length < Math.min(size, 3)) break;
    boards.push(board);
  }
  return boards;
}

export interface ChoiceQuestion {
  word: VocabLike;
  /** Text shown (or spoken) as the question. */
  prompt: string;
  promptLang: 'es' | 'en';
  options: string[];
  optionsLang: 'es' | 'en';
  answer: string;
}

function optionsFor(word: VocabLike, pool: VocabLike[], lang: 'es' | 'en', random: Random, count: number): string[] {
  const field = lang === 'es' ? 'spanish' : 'english';
  const key = lang === 'es' ? keyEs : keyEn;
  const seen = new Set([key(word)]);
  const sameCategory = shuffle(pool.filter((p) => p.id !== word.id && p.category === word.category), random);
  const others = shuffle(pool.filter((p) => p.id !== word.id && p.category !== word.category), random);
  const wrong: string[] = [];
  for (const p of [...sameCategory, ...others]) {
    const k = key(p);
    if (seen.has(k)) continue;
    seen.add(k);
    wrong.push(p[field]);
    if (wrong.length >= count - 1) break;
  }
  return shuffle([word[field], ...wrong], random);
}

/** Alternates "what does it mean?" and "how do you say…?" questions. */
export function speedQuestion(word: VocabLike, pool: VocabLike[], random: Random, index: number): ChoiceQuestion {
  const recall = index % 2 === 1;
  return recall
    ? { word, prompt: word.english, promptLang: 'en', options: optionsFor(word, pool, 'es', random, 4), optionsLang: 'es', answer: word.spanish }
    : { word, prompt: word.spanish, promptLang: 'es', options: optionsFor(word, pool, 'en', random, 4), optionsLang: 'en', answer: word.english };
}

/** Emma says a Spanish word; pick what it means. */
export function listenQuestion(word: VocabLike, pool: VocabLike[], random: Random): ChoiceQuestion {
  return { word, prompt: word.spanish, promptLang: 'es', options: optionsFor(word, pool, 'en', random, 4), optionsLang: 'en', answer: word.english };
}

export interface BlastCard {
  word: VocabLike;
  spanish: string;
  /** Either the real meaning or a convincing wrong one. */
  english: string;
  isMatch: boolean;
}

/** "Does this Spanish word mean this?" — true about half the time. */
export function blastCard(word: VocabLike, pool: VocabLike[], random: Random): BlastCard {
  const decoys = pool.filter((p) => p.id !== word.id && keyEn(p) !== keyEn(word));
  const isMatch = decoys.length === 0 || random() < 0.5;
  if (isMatch) return { word, spanish: word.spanish, english: word.english, isMatch: true };
  const same = decoys.filter((p) => p.category === word.category);
  const from = same.length > 0 && random() < 0.7 ? same : decoys;
  const decoy = from[Math.floor(random() * from.length)];
  return { word, spanish: word.spanish, english: decoy.english, isMatch: false };
}

/** Endless word order for timed games: shuffled, never the same word twice in a row. */
export function wordStream(pool: VocabLike[], random: Random): () => VocabLike {
  let queue: VocabLike[] = [];
  let last: VocabLike | null = null;
  return () => {
    if (queue.length === 0) {
      queue = shuffle(pool, random);
      if (last && queue.length > 1 && queue[0].id === last.id) queue.push(queue.shift()!);
    }
    last = queue.shift()!;
    return last;
  };
}
