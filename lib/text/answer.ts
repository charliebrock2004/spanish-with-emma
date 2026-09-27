import type { Lang, MistakeType } from '@/types/curriculum';
import { normalizeText, stripAccents } from './normalize';
import { levenshtein, similarity } from './similarity';

export interface AnswerCheck {
  correct: boolean;
  /** Accepted, but worth a gentle note. */
  nearMiss?: 'accents' | 'typo';
  /** The accepted answer closest to what the player wrote. */
  expected: string;
  similarity: number;
  mistakeType?: MistakeType;
}

const SPANISH_SUBJECTS = ['yo', 'tu', 'tú'];
const ENGLISH_ARTICLES = new Set(['the', 'a', 'an']);

function withoutLeadingSubject(normal: string): string {
  const [first, ...rest] = normal.split(' ');
  return rest.length && SPANISH_SUBJECTS.includes(first) ? rest.join(' ') : normal;
}

function withoutArticles(normal: string): string {
  return normal
    .split(' ')
    .filter((w) => !ENGLISH_ARTICLES.has(w))
    .join(' ');
}

/** Every token equal, or within a small edit distance for longer words. */
function isTypo(input: string, answer: string): boolean {
  const a = input.split(' ');
  const b = answer.split(' ');
  if (a.length !== b.length) return false;
  let edits = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    const d = levenshtein(a[i], b[i]);
    const allowed = b[i].length >= 8 ? 2 : b[i].length >= 4 ? 1 : 0;
    if (d > allowed) return false;
    edits += d;
  }
  return edits > 0 && edits <= Math.max(1, Math.floor(answer.length / 6));
}

/** Short words whose misuse is a grammar slip rather than missing vocabulary. */
const FUNCTION_WORDS = new Set([
  'me', 'te', 'se', 'le', 'les', 'lo', 'la', 'los', 'las', 'el', 'un', 'una', 'unos', 'unas', 'yo', 'tu', 'mi',
  'su', 'de', 'a', 'al', 'del', 'en', 'por', 'para', 'que', 'con', 'nos', 'os', 'the', 'a', 'an', 'to', 'of', 'is',
  'are', 'am', 'do', 'does',
]);

const sameStem = (x: string, y: string) => x.length >= 3 && y.length >= 3 && x.slice(0, 3) === y.slice(0, 3);

/** Rough classification of why an answer was wrong — used for personalised review. */
export function classifyMistake(input: string, expected: string, lang: Lang): MistakeType {
  const a = normalizeText(input, { lang, accents: false }).split(' ').filter(Boolean);
  const b = normalizeText(expected, { lang, accents: false }).split(' ').filter(Boolean);
  if (a.length > 1 && a.length === b.length && [...a].sort().join(' ') === [...b].sort().join(' ')) {
    if (a.join(' ') !== b.join(' ')) return 'word-order';
  }
  const missing = b.filter((w) => !a.includes(w));
  const extra = a.filter((w) => !b.includes(w));
  if (missing.length === 0 && extra.length === 0) return 'grammar';
  // Right words in the wrong form (conjugation, gender, articles, pronouns) → grammar.
  const formSlips = missing.every((m) => FUNCTION_WORDS.has(m) || extra.some((e) => sameStem(e, m)));
  if (formSlips && b.length - missing.length >= Math.ceil(b.length * 0.5)) return 'grammar';
  return 'vocabulary';
}

/**
 * Checks a typed answer against the accepted answers. Accents and small typos
 * are accepted (with a note) — this is a game, not a spelling test.
 */
export function checkTypedAnswer(
  input: string,
  answers: string[],
  { lang, name = '' }: { lang: Lang; name?: string },
): AnswerCheck {
  const accepted = answers.map((a) => a.replace(/\{name\}/g, name || ''));
  const given = normalizeText(input, { lang });
  const givenPlain = stripAccents(given);

  let best = { expected: accepted[0] ?? '', similarity: -1 };

  for (const answer of accepted) {
    const normal = normalizeText(answer, { lang });
    const plain = stripAccents(normal);

    const variants: Array<[string, string]> = [[given, normal]];
    if (lang === 'es') variants.push([withoutLeadingSubject(given), withoutLeadingSubject(normal)]);
    if (lang === 'en') variants.push([withoutArticles(given), withoutArticles(normal)]);

    for (const [g, n] of variants) {
      if (g && g === n) return { correct: true, expected: answer, similarity: 1 };
    }
    const plainVariants: Array<[string, string]> = [[givenPlain, plain]];
    if (lang === 'es') plainVariants.push([withoutLeadingSubject(givenPlain), withoutLeadingSubject(plain)]);
    if (lang === 'en') plainVariants.push([withoutArticles(givenPlain), withoutArticles(plain)]);

    for (const [g, n] of plainVariants) {
      if (g && g === n) {
        return { correct: true, nearMiss: lang === 'es' && given !== normal ? 'accents' : undefined, expected: answer, similarity: 1 };
      }
    }
    for (const [g, n] of plainVariants) {
      if (g && isTypo(g, n)) return { correct: true, nearMiss: 'typo', expected: answer, similarity: similarity(g, n) };
    }
    const sim = similarity(givenPlain, plain);
    if (sim > best.similarity) best = { expected: answer, similarity: sim };
  }

  return {
    correct: false,
    expected: best.expected,
    similarity: Math.max(0, best.similarity),
    mistakeType: classifyMistake(input, best.expected, lang),
  };
}
