import type { SpeechLang } from './types';

/**
 * Picks the most natural device voice for each of Emma's two voices:
 *  - Spanish: a female Castilian (es-ES) voice.
 *  - English: a Scottish voice (Apple's "Fiona") where the device has one,
 *    otherwise a natural British/Irish female voice.
 */

const SCOTTISH = [/\bfiona\b/i, /scot/i, /gbsct/i];

const FEMALE_ES = [/m[oó]nica/i, /marisol/i, /helena/i, /laura/i, /elvira/i, /luc[ií]a/i, /paloma/i, /esperanza/i, /isabel/i, /conchita/i, /ximena/i, /paulina/i, /dalia/i, /google espa[nñ]ol/i];
const FEMALE_EN = [/\bkate\b/i, /serena/i, /stephanie/i, /martha/i, /libby/i, /sonia/i, /hazel/i, /susan/i, /maisie/i, /\bmia\b/i, /moira/i, /emily/i, /google uk english female/i, /samantha/i, /karen/i, /tessa/i];
const MALE = [/jorge/i, /diego/i, /\bjuan\b/i, /carlos/i, /pablo/i, /daniel/i, /arthur/i, /oliver/i, /george/i, /\bmale\b/i, /\bryan\b/i, /\balvaro\b/i, /\braul\b/i, /thomas/i, /\baaron\b/i, /\bfred\b/i, /\balex\b/i];
const HIGH_QUALITY = [/enhanced/i, /premium/i, /natural/i, /neural/i, /online/i, /siri/i];
// Novelty / robotic voices shipped on Apple and some Android devices.
const NOVELTY = [/bad news/i, /bahh/i, /bells/i, /boing/i, /bubbles/i, /cellos/i, /good news/i, /jester/i, /organ/i, /superstar/i, /trinoids/i, /whisper/i, /wobble/i, /zarvox/i, /albert/i, /junior/i, /ralph/i, /kathy/i, /\beddy\b/i, /\bflo\b/i, /grandma/i, /grandpa/i, /\breed\b/i, /rocko/i, /sandy/i, /shelley/i];

const matches = (patterns: RegExp[], text: string) => patterns.some((p) => p.test(text));

export function isScottishVoice(voice: Pick<SpeechSynthesisVoice, 'name' | 'lang'>): boolean {
  return matches(SCOTTISH, `${voice.name} ${voice.lang}`) || /en[-_]scotland|gbsct/i.test(voice.lang);
}

export function scoreVoice(voice: SpeechSynthesisVoice, lang: SpeechLang): number {
  const name = voice.name;
  const tag = voice.lang.toLowerCase().replace('_', '-');
  if (matches(NOVELTY, name)) return -1000;
  let score = 0;
  if (lang === 'es') {
    if (!tag.startsWith('es')) return -1000;
    score += 50;
    if (tag === 'es-es') score += 30;
    if (matches(FEMALE_ES, name)) score += 20;
  } else {
    if (!tag.startsWith('en')) return -1000;
    score += 10;
    if (isScottishVoice(voice)) score += 120;
    else if (tag === 'en-gb') score += 40;
    else if (tag === 'en-ie') score += 30;
    else if (tag === 'en-au' || tag === 'en-nz') score += 12;
    if (matches(FEMALE_EN, name)) score += 20;
  }
  if (matches(MALE, name)) score -= 15;
  if (matches(HIGH_QUALITY, name)) score += 15;
  if (voice.localService) score += 3;
  return score;
}

export function rankVoices(voices: SpeechSynthesisVoice[], lang: SpeechLang): SpeechSynthesisVoice[] {
  return voices
    .map((voice) => ({ voice, score: scoreVoice(voice, lang) }))
    .filter((v) => v.score > -1000)
    .sort((a, b) => b.score - a.score)
    .map((v) => v.voice);
}
