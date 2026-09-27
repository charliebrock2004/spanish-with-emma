import { describe, expect, it } from 'vitest';
import { checkTypedAnswer, classifyMistake } from '@/lib/text/answer';
import { bestUtteranceMatch, matchUtterance } from '@/lib/text/match';
import { detectCommonMistake } from '@/lib/text/mistakes';
import { normalizeText } from '@/lib/text/normalize';
import { digitsToSpanish, numberToSpanish } from '@/lib/text/numbers';
import { parseMarkup, speakableSegments } from '@/lib/text/markup';

describe('numbers', () => {
  it('spells Spanish numbers', () => {
    expect(numberToSpanish(0)).toBe('cero');
    expect(numberToSpanish(16)).toBe('dieciséis');
    expect(numberToSpanish(21)).toBe('veintiuno');
    expect(numberToSpanish(32)).toBe('treinta y dos');
    expect(numberToSpanish(100)).toBe('cien');
    expect(numberToSpanish(115)).toBe('ciento quince');
    expect(numberToSpanish(2026)).toBe('dos mil veintiséis');
    expect(digitsToSpanish('tengo 30 años')).toBe('tengo treinta años');
  });
});

describe('normalizeText', () => {
  it('strips punctuation and expands English contractions', () => {
    expect(normalizeText('¡Hola, ¿qué tal?')).toBe('hola qué tal');
    expect(normalizeText("I'm tired", { lang: 'en' })).toBe('i am tired');
    expect(normalizeText('Adiós', { accents: false })).toBe('adios');
  });
});

describe('checkTypedAnswer', () => {
  it('accepts exact answers and ignores punctuation/case', () => {
    expect(checkTypedAnswer('soy charlie', ['Soy {name}'], { lang: 'es', name: 'Charlie' }).correct).toBe(true);
  });
  it('accepts missing accents with a note', () => {
    const r = checkTypedAnswer('adios', ['Adiós'], { lang: 'es' });
    expect(r.correct).toBe(true);
    expect(r.nearMiss).toBe('accents');
  });
  it('accepts small typos with a note', () => {
    const r = checkTypedAnswer('grasias', ['gracias'], { lang: 'es' });
    expect(r.correct).toBe(true);
    expect(r.nearMiss).toBe('typo');
  });
  it('allows an optional subject pronoun', () => {
    expect(checkTypedAnswer('Yo soy Charlie', ['Soy Charlie'], { lang: 'es' }).correct).toBe(true);
    expect(checkTypedAnswer('estoy cansado', ['Yo estoy cansado'], { lang: 'es' }).correct).toBe(true);
  });
  it('allows optional English articles and contractions', () => {
    expect(checkTypedAnswer('I am from Spain', ["I'm from Spain"], { lang: 'en' }).correct).toBe(true);
    expect(checkTypedAnswer('bread', ['the bread'], { lang: 'en' }).correct).toBe(true);
  });
  it('rejects wrong answers and classifies the mistake', () => {
    const r = checkTypedAnswer('Charlie me llamo', ['Me llamo Charlie'], { lang: 'es' });
    expect(r.correct).toBe(false);
    expect(r.mistakeType).toBe('word-order');
    expect(checkTypedAnswer('hola', ['adiós'], { lang: 'es' }).correct).toBe(false);
  });
  it('classifies conjugation slips as grammar', () => {
    expect(classifyMistake('Yo gusta la pizza', 'Me gusta la pizza', 'es')).toBe('grammar');
    expect(classifyMistake('Tengo quince anos', 'Tengo quince años', 'es')).not.toBe('vocabulary');
  });
});

describe('matchUtterance', () => {
  it('scores a perfect utterance at 1', () => {
    expect(matchUtterance('Buenos días', 'buenos días').score).toBe(1);
  });
  it('treats digits from the recogniser as number words', () => {
    expect(matchUtterance('tengo 20 años', 'Tengo veinte años').score).toBe(1);
  });
  it('is lenient with the player name', () => {
    expect(matchUtterance('me llamo charly', 'Me llamo {name}', { name: 'Charlie' }).score).toBeGreaterThanOrEqual(0.95);
  });
  it('supports wildcards', () => {
    expect(matchUtterance('soy de Nueva Zelanda', 'Soy de {any}').score).toBe(1);
    expect(matchUtterance('adiós', 'Soy de {any}').score).toBeLessThan(0.5);
  });
  it('marks missed words', () => {
    const r = matchUtterance('buenas', 'buenas noches');
    expect(r.score).toBeLessThan(0.75);
    expect(r.words.map((w) => w.status)).toEqual(['ok', 'missed']);
  });
  it('picks the best transcript', () => {
    const r = bestUtteranceMatch(['ola', 'hola'], ['hola']);
    expect(r.score).toBe(1);
    expect(r.heard).toBe('hola');
  });
});

describe('detectCommonMistake', () => {
  it('corrects "yo gusto"', () => {
    const hint = detectCommonMistake('Yo gusto pizza');
    expect(hint?.id).toBe('yo-gusto');
    expect(hint?.corrected).toBe('Me gusta la pizza.');
  });
  it('corrects ser/estar and tener mix-ups', () => {
    expect(detectCommonMistake('soy bien')?.corrected).toBe('Estoy bien.');
    expect(detectCommonMistake('Estoy de España')?.corrected).toBe('Soy de España.');
    expect(detectCommonMistake('soy treinta años')?.corrected).toBe('Tengo treinta años.');
    expect(detectCommonMistake('estoy hambre')?.corrected).toBe('Tengo hambre.');
  });
  it('leaves correct Spanish alone', () => {
    expect(detectCommonMistake('Me gusta la pizza')).toBeNull();
    expect(detectCommonMistake('Mucho gusto')).toBeNull();
    expect(detectCommonMistake('Estoy de acuerdo')).toBeNull();
  });
});

describe('markup', () => {
  it('splits English and Spanish segments', () => {
    expect(parseMarkup('That means *hola*.')).toEqual([
      { text: 'That means ', lang: 'en' },
      { text: 'hola', lang: 'es' },
      { text: '.', lang: 'en' },
    ]);
    expect(speakableSegments(parseMarkup('*¡Hola!* That means hello.'))).toEqual([
      { text: '¡Hola!', lang: 'es' },
      { text: 'That means hello.', lang: 'en' },
    ]);
  });
});
