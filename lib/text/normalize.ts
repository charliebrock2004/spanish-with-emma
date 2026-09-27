import type { Lang } from '@/types/curriculum';
import { digitsToSpanish } from './numbers';

/** Removes diacritics: "adiós" → "adios", "niño" → "nino". */
export function stripAccents(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');
}

const ENGLISH_CONTRACTIONS: Array<[RegExp, string]> = [
  [/\bi'm\b/g, 'i am'],
  [/\byou're\b/g, 'you are'],
  [/\bwe're\b/g, 'we are'],
  [/\bthey're\b/g, 'they are'],
  [/\b(he|she|it|that|what|there|who|where|how)'s\b/g, '$1 is'],
  [/\blet's\b/g, 'let us'],
  [/\bcan't\b/g, 'cannot'],
  [/\bwon't\b/g, 'will not'],
  [/\b(\w+)n't\b/g, '$1 not'],
  [/\b(i|you|we|they)'ve\b/g, '$1 have'],
  [/\b(i|you|he|she|we|they)'ll\b/g, '$1 will'],
  [/\b(i|you|he|she|we|they)'d\b/g, '$1 would'],
];

export interface NormalizeOptions {
  lang?: Lang;
  /** Keep accents (default true). */
  accents?: boolean;
}

/**
 * Canonical form for comparing answers: lower case, no punctuation, single
 * spaces, digits spelled out (Spanish), English contractions expanded.
 */
export function normalizeText(input: string, { lang = 'es', accents = true }: NormalizeOptions = {}): string {
  let text = input.normalize('NFC').toLowerCase();
  text = text.replace(/[’‘´`]/g, "'").replace(/[“”«»„]/g, '"');
  if (lang === 'en') {
    for (const [pattern, replacement] of ENGLISH_CONTRACTIONS) text = text.replace(pattern, replacement);
  } else {
    text = digitsToSpanish(text);
  }
  text = text
    .replace(/[¿?¡!.,;:"()[\]{}…–—\-_/\\*]/g, ' ')
    .replace(/'/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return accents ? text : stripAccents(text);
}

export function tokenize(text: string, options?: NormalizeOptions): string[] {
  const normal = normalizeText(text, options);
  return normal ? normal.split(' ') : [];
}

/** Splits a sentence into word tiles, keeping each word's own spelling. */
export function toTiles(sentence: string): string[] {
  return sentence
    .replace(/[¿?¡!.,;:"()…]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}
