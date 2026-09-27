import type { NextRequest } from 'next/server';
import { SpeechError, synthesise } from '@/lib/ai/speech';
import { ttsProvider } from '@/lib/server/config';
import { guard, jsonError } from '@/lib/server/guard';

export const maxDuration = 30;

/** GET /api/tts?lang=es&text=… → audio/mpeg (cached at the edge per phrase). */
export async function GET(request: NextRequest) {
  if (!ttsProvider()) return jsonError(503, 'not-configured', 'No cloud voice is configured on the server.');
  const blocked = guard(request, { bucket: 'tts', limit: 120 });
  if (blocked) return blocked;

  const text = request.nextUrl.searchParams.get('text')?.trim() ?? '';
  const lang = request.nextUrl.searchParams.get('lang') === 'en' ? 'en' : 'es';
  if (!text) return jsonError(400, 'bad-request', 'Nothing to say.');
  if (text.length > 400) return jsonError(413, 'too-long', 'That text is too long to speak.');

  try {
    const audio = await synthesise(text, lang);
    return new Response(audio, {
      headers: {
        'Content-Type': 'audio/mpeg',
        // The same phrase always sounds the same — let browsers and the CDN keep it.
        'Cache-Control': 'public, max-age=604800, s-maxage=2592000, immutable',
      },
    });
  } catch (error) {
    if (error instanceof SpeechError) return jsonError(error.status, 'unavailable', error.message);
    console.error('tts route failed', error);
    return jsonError(500, 'unavailable', 'Something went wrong.');
  }
}
