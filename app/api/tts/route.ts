import type { NextRequest } from 'next/server';
import { SpeechError, synthesise } from '@/lib/ai/speech';
import { ttsProvider } from '@/lib/server/config';
import { guard, jsonError } from '@/lib/server/guard';
import { isVoiceStyle } from '@/lib/voice/prepare';

export const maxDuration = 30;

/**
 * GET /api/tts?lang=es&style=cheerful&text=… → audio/mpeg, streamed as it's
 * generated so playback can start before the whole line is ready. The same
 * phrase and style always sound the same, so browsers and the CDN cache it.
 *
 * X-Voice-* headers say what actually spoke: provider, model, voice ID and
 * which preferred provider failed first, if any (`X-Voice-Fallback`). A
 * fallback isn't cached, so Emma's own voice returns as soon as it recovers.
 */
export async function GET(request: NextRequest) {
  if (!ttsProvider()) return jsonError(503, 'not-configured', 'No cloud voice is configured on the server.');
  const blocked = guard(request, { bucket: 'tts', limit: 150 });
  if (blocked) return blocked;

  const params = request.nextUrl.searchParams;
  const text = params.get('text')?.trim() ?? '';
  const lang = params.get('lang') === 'en' ? 'en' : 'es';
  const styleParam = params.get('style');
  const style = isVoiceStyle(styleParam) ? styleParam : 'neutral';
  if (!text) return jsonError(400, 'bad-request', 'Nothing to say.');
  if (text.length > 600) return jsonError(413, 'too-long', 'That text is too long to speak.');

  try {
    const speech = await synthesise(text, lang, style);
    const fellBack = speech.failed.length > 0;
    return new Response(speech.audio, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': fellBack ? 'no-store' : 'public, max-age=604800, s-maxage=2592000, immutable',
        'X-Voice-Provider': speech.provider,
        'X-Voice-Model': speech.model,
        'X-Voice-Id': speech.voice,
        'X-Voice-Fallback': fellBack ? speech.failed.join(',') : 'none',
      },
    });
  } catch (error) {
    if (error instanceof SpeechError) return jsonError(error.status, 'unavailable', error.message);
    console.error('tts route failed', error);
    return jsonError(500, 'unavailable', 'Something went wrong.');
  }
}
