/**
 * Speech preparation: turns what Emma *writes* into what she should *say*.
 *
 * Runs before every voice (cloud or device) so she never reads out markup,
 * emoji, UI instructions or abbreviations letter by letter, and so long
 * replies are cut into natural sentence-sized chunks that can start playing
 * straight away. Pure and shared by the server and the browser.
 */

export type SpeechLang = 'es' | 'en';

/** How Emma delivers a line. Expressive delivery is optional (Settings). */
export type VoiceStyle = 'neutral' | 'cheerful' | 'excited' | 'gentle' | 'calm';

export const VOICE_STYLES: VoiceStyle[] = ['neutral', 'cheerful', 'excited', 'gentle', 'calm'];

export const isVoiceStyle = (value: unknown): value is VoiceStyle => typeof value === 'string' && (VOICE_STYLES as string[]).includes(value);

// Emoji, flags (including the Scottish flag's tag characters), keycaps, joiners.
const EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{E0020}-\u{E007F}\u{FE0F}\u{200D}\u{20E3}]/gu;

const ABBREVIATIONS: Record<SpeechLang, Array<[RegExp, string]>> = {
  es: [
    [/\bEE\.\s?UU\./g, 'Estados Unidos'],
    [/\bp\.\s?ej\./gi, 'por ejemplo'],
    [/\bSrta\./g, 'señorita'],
    [/\bSra\./g, 'señora'],
    [/\bSr\./g, 'señor'],
    [/\bDra\./g, 'doctora'],
    [/\bDr\./g, 'doctor'],
    [/\bUds\./g, 'ustedes'],
    [/\bUd\./g, 'usted'],
    [/\bAvda\./g, 'avenida'],
    [/\bn\.?º/g, 'número'],
    [/\betc\./g, 'etcétera'],
    [/(\d)\s?km\b/g, '$1 kilómetros'],
    [/(\d)\s?€/g, '$1 euros'],
    [/€\s?(\d[\d.,]*)/g, '$1 euros'],
    [/(\d)\s?%/g, '$1 por ciento'],
  ],
  en: [
    [/\be\.g\./gi, 'for example'],
    [/\bi\.e\./gi, 'that is'],
    [/\betc\./gi, 'et cetera'],
    [/\bvs\.?\s/gi, 'versus '],
    [/\bapprox\./gi, 'approximately'],
    [/\bXP\b/g, 'X P'],
    [/(\d)\s?mins?\b/g, '$1 minutes'],
    [/(\d)\s?%/g, '$1 percent'],
    [/(\d)\s?€/g, '$1 euros'],
    [/€\s?(\d[\d.,]*)/g, '$1 euros'],
    [/\s&\s/g, ' and '],
  ],
};

/** Stage directions and UI hints that shouldn't be read aloud. */
const UI_HINTS = [/\[[^\]]*\]/g, /\((?:tap|type|press|click|swipe|hold)\b[^)]*\)/gi, /\{[a-z]+\}/gi];

/**
 * Cleans one line for speech in `lang`. Markup asterisks, emoji, markdown,
 * bracketed UI hints and pronunciation guides are removed; abbreviations
 * are expanded; dashes and line breaks become natural pauses.
 */
export function prepareForSpeech(text: string, lang: SpeechLang): string {
  let out = text.normalize('NFC');
  // Markdown: links, emphasis, code, headings and list bullets.
  out = out.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  for (const pattern of UI_HINTS) out = out.replace(pattern, ' ');
  out = out.replace(/[*_`~]+/g, '');
  out = out.replace(/^\s{0,3}#{1,6}\s+/gm, '');
  out = out.replace(/^\s*(?:[-•·]|\d+[.)])\s+/gm, '');
  // Emoji carry tone on screen, not in the voice.
  out = out.replace(EMOJI, '');
  for (const [pattern, replacement] of ABBREVIATIONS[lang]) out = out.replace(pattern, replacement);
  // Pauses: dashes, ellipses and line breaks.
  out = out.replace(/\s*[—–]\s*/g, ', ');
  out = out.replace(/\s*…\s*/g, '... ');
  out = out.replace(/([^\s.!?…,;:])\s*\n+\s*/g, '$1. ');
  out = out.replace(/\s*\n+\s*/g, ' ');
  // Quotes and guillemets aren't spoken.
  out = out.replace(/[«»“”"]/g, '');
  // Spanish punctuation: no space after ¿ ¡, none before ? !, and no orphans.
  out = out.replace(/([¿¡])\s+/g, '$1');
  out = out.replace(/\s+([?!.,;:])/g, '$1');
  out = out.replace(/[¿¡]+(?=\s*$)/g, '');
  out = out.replace(/(^|\s)[¿¡]+(?=\s|$)/g, '$1');
  out = out.replace(/,\s*,/g, ',').replace(/^[\s,;:]+/, '');
  out = out.replace(/\s{2,}/g, ' ').trim();
  return out;
}

/** True when there's something left to say. */
export const hasSpeech = (text: string) => /[\p{L}\p{N}]/u.test(text);

/**
 * Splits prepared text into chunks of whole sentences, each short enough to
 * synthesise quickly (the first one starts playing while the rest load).
 * Very long sentences are split at commas or semicolons.
 */
export function chunkForSpeech(text: string, maxLength = 220): string[] {
  const sentences = text.match(/[^.!?…]+(?:[.!?…]+|$)/g)?.map((s) => s.trim()).filter(hasSpeech) ?? [];
  const pieces: string[] = [];
  for (const sentence of sentences) {
    if (sentence.length <= maxLength) {
      pieces.push(sentence);
      continue;
    }
    let current = '';
    for (const part of sentence.split(/(?<=[,;:])\s+/)) {
      if (current && current.length + part.length + 1 > maxLength) {
        pieces.push(current);
        current = part;
      } else current = current ? `${current} ${part}` : part;
    }
    if (current) pieces.push(current);
  }
  // Keep the first chunk short so audio starts fast; merge the rest up to the limit.
  const chunks: string[] = [];
  for (const piece of pieces) {
    const last = chunks[chunks.length - 1];
    if (last && chunks.length > 1 && last.length + piece.length + 1 <= maxLength) chunks[chunks.length - 1] = `${last} ${piece}`;
    else if (last && chunks.length === 1 && last.length < 40 && last.length + piece.length + 1 <= maxLength) chunks[0] = `${last} ${piece}`;
    else chunks.push(piece);
  }
  return chunks;
}

/** A style for common moments, so callers don't have to think about it. */
export function styleForMoment(moment: 'celebrate' | 'correct' | 'mistake' | 'explain' | 'chat' | 'greet'): VoiceStyle {
  switch (moment) {
    case 'celebrate':
      return 'excited';
    case 'correct':
    case 'greet':
      return 'cheerful';
    case 'mistake':
      return 'gentle';
    case 'explain':
      return 'calm';
    default:
      return 'neutral';
  }
}
