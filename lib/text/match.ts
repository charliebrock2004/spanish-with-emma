import type { Lang } from '@/types/curriculum';
import { normalizeText } from './normalize';
import { similarity } from './similarity';

/**
 * Fuzzy, word-aligned matching of something the player *said* (or typed in a
 * conversation) against an expected phrase. Used for speaking exercises,
 * conversation replies and the microphone test.
 *
 * Patterns may contain wildcards:
 *   {name}    the player's name (matched leniently — recognisers mangle names)
 *   {any}     any words, including none (free content, e.g. "Soy de {any}")
 *   {number}  any words (numbers are spelled out before matching)
 */

export type WordStatus = 'ok' | 'close' | 'missed';

export interface WordResult {
  word: string;
  status: WordStatus;
}

export interface UtteranceMatch {
  /** 0 … 1 */
  score: number;
  pattern: string;
  words: WordResult[];
}

const ANY = '\u0001any';
const NAME = '\u0001name';

/** Extra words the player says cost a little, not a lot. */
const INSERT_COST = 0.25;

const EQUIVALENTS: string[][] = [
  ['un', 'una', 'uno'],
  ['vale', 'bale'],
  ['y', 'e'],
  ['o', 'u'],
];

function tokenSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  for (const group of EQUIVALENTS) if (group.includes(a) && group.includes(b)) return 1;
  return similarity(a, b);
}

interface PatternToken {
  kind: 'word' | 'name' | 'any';
  value: string;
  display: string;
}

function patternTokens(pattern: string, name: string, lang: Lang): PatternToken[] {
  const marked = pattern
    .replace(/\{name\}/g, ' zzqname ')
    .replace(/\{any\}|\{number\}/g, ' zzqany ');
  const plain = normalizeText(marked, { lang, accents: false }).split(' ').filter(Boolean);
  const display = normalizeText(marked, { lang, accents: true }).split(' ').filter(Boolean);
  const nameTokens = normalizeText(name || '', { lang, accents: false }).split(' ').filter(Boolean);
  const out: PatternToken[] = [];
  plain.forEach((token, i) => {
    if (token === 'zzqname') {
      if (nameTokens.length === 0) out.push({ kind: 'any', value: ANY, display: name || '…' });
      else nameTokens.forEach((n) => out.push({ kind: 'name', value: n, display: name }));
    } else if (token === 'zzqany') {
      out.push({ kind: 'any', value: ANY, display: '…' });
    } else {
      out.push({ kind: 'word', value: token, display: display[i] ?? token });
    }
  });
  return out;
}

type Step = 'match' | 'delete' | 'insert' | 'absorb' | 'skip';

export function matchUtterance(
  heard: string,
  pattern: string,
  { name = '', lang = 'es' }: { name?: string; lang?: Lang } = {},
): UtteranceMatch {
  const target = patternTokens(pattern, name, lang);
  const said = normalizeText(heard.replace(NAME, '').replace(ANY, ''), { lang, accents: false })
    .split(' ')
    .filter(Boolean);
  const T = target.length;
  const H = said.length;

  const cost: number[][] = Array.from({ length: T + 1 }, () => new Array<number>(H + 1).fill(Infinity));
  const step: Step[][] = Array.from({ length: T + 1 }, () => new Array<Step>(H + 1).fill('match'));
  cost[0][0] = 0;
  for (let j = 1; j <= H; j++) {
    cost[0][j] = j * INSERT_COST;
    step[0][j] = 'insert';
  }
  for (let i = 1; i <= T; i++) {
    const t = target[i - 1];
    const deleteCost = t.kind === 'any' ? 0 : 1;
    cost[i][0] = cost[i - 1][0] + deleteCost;
    step[i][0] = t.kind === 'any' ? 'skip' : 'delete';
    for (let j = 1; j <= H; j++) {
      if (t.kind === 'any') {
        // A wildcard matches nothing (skip) or swallows heard words (absorb) at no cost.
        const skip = cost[i - 1][j];
        const absorb = cost[i][j - 1];
        const take = cost[i - 1][j - 1];
        const best = Math.min(skip, absorb, take);
        cost[i][j] = best;
        step[i][j] = best === take ? 'match' : best === absorb ? 'absorb' : 'skip';
        continue;
      }
      let sim = tokenSimilarity(t.value, said[j - 1]);
      if (t.kind === 'name' && sim >= 0.4) sim = 1;
      const subCost = sim >= 0.5 ? 1 - sim : 1;
      const options: Array<[number, Step]> = [
        [cost[i - 1][j - 1] + subCost, 'match'],
        [cost[i - 1][j] + deleteCost, 'delete'],
        [cost[i][j - 1] + INSERT_COST, 'insert'],
      ];
      options.sort((a, b) => a[0] - b[0]);
      cost[i][j] = options[0][0];
      step[i][j] = options[0][1];
    }
  }

  // Walk back through the alignment to label each expected word.
  const words: WordResult[] = [];
  let i = T;
  let j = H;
  while (i > 0 || j > 0) {
    const s = i === 0 ? 'insert' : j === 0 ? step[i][0] : step[i][j];
    if (s === 'insert' || s === 'absorb') {
      j--;
      continue;
    }
    const t = target[i - 1];
    if (s === 'match' && j > 0) {
      if (t.kind !== 'any') {
        let sim = tokenSimilarity(t.value, said[j - 1]);
        if (t.kind === 'name' && sim >= 0.4) sim = 1;
        words.push({ word: t.display, status: sim >= 0.85 ? 'ok' : sim >= 0.5 ? 'close' : 'missed' });
      }
      i--;
      j--;
    } else {
      if (t.kind === 'word' || t.kind === 'name') words.push({ word: t.display, status: 'missed' });
      i--;
    }
  }
  words.reverse();
  // Collapse multi-token names back into one display word.
  const collapsed: WordResult[] = [];
  for (const w of words) {
    const last = collapsed[collapsed.length - 1];
    if (last && name && w.word === name && last.word === name) {
      if (w.status === 'missed' || last.status === 'missed') last.status = 'close';
      continue;
    }
    collapsed.push(w);
  }

  const scored = target.filter((t) => t.kind !== 'any').length;
  const score = scored === 0 ? (H > 0 ? 1 : 0) : Math.max(0, Math.min(1, 1 - cost[T][H] / scored));
  return { score, pattern, words: collapsed };
}

/** Best match of any of the player's transcripts against any accepted pattern. */
export function bestUtteranceMatch(
  transcripts: string[],
  patterns: string[],
  options: { name?: string; lang?: Lang } = {},
): UtteranceMatch & { heard: string } {
  let best: (UtteranceMatch & { heard: string }) | null = null;
  for (const heard of transcripts) {
    if (!heard.trim()) continue;
    for (const pattern of patterns) {
      const result = matchUtterance(heard, pattern, options);
      if (!best || result.score > best.score) best = { ...result, heard };
    }
  }
  if (best) return best;
  const fallback = matchUtterance('', patterns[0] ?? '', options);
  return { ...fallback, heard: '' };
}
