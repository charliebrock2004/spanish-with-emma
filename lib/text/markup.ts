import type { Lang } from '@/types/curriculum';

/**
 * Emma-markup: plain text is English, text inside *asterisks* is Spanish.
 *   "*¡Hola!* That means hello."
 * The UI styles Spanish segments, and the voice layer speaks each segment in
 * the right language/voice.
 */
export interface Segment {
  text: string;
  lang: Lang;
}

export function parseMarkup(text: string, defaultLang: Lang = 'en'): Segment[] {
  const segments: Segment[] = [];
  const other: Lang = defaultLang === 'en' ? 'es' : 'en';
  const parts = text.split('*');
  parts.forEach((part, i) => {
    if (!part) return;
    segments.push({ text: part, lang: i % 2 === 1 ? other : defaultLang });
  });
  return segments;
}

/** Plain text without markup asterisks. */
export function stripMarkup(text: string): string {
  return text.replace(/\*/g, '');
}

/** Merges neighbouring segments of the same language and drops empty ones. */
export function speakableSegments(segments: Segment[]): Segment[] {
  const out: Segment[] = [];
  for (const seg of segments) {
    const text = seg.text.replace(/\s+/g, ' ').trim();
    if (!text || !/[\p{L}\p{N}]/u.test(text)) continue;
    const last = out[out.length - 1];
    if (last && last.lang === seg.lang) last.text = `${last.text} ${text}`;
    else out.push({ text, lang: seg.lang });
  }
  return out;
}
