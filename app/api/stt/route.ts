import { SpeechError, transcribe } from '@/lib/ai/speech';
import { sttProvider } from '@/lib/server/config';
import { guard, jsonError } from '@/lib/server/guard';

export const maxDuration = 30;

const MAX_BYTES = 4_000_000;

/** POST /api/stt (multipart: audio, lang) → { text } */
export async function POST(request: Request) {
  if (!sttProvider()) return jsonError(503, 'not-configured', 'Cloud speech recognition is not configured on the server.');
  const blocked = guard(request, { bucket: 'stt', limit: 40 });
  if (blocked) return blocked;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError(400, 'bad-request', 'Expected multipart form data.');
  }
  const audio = form.get('audio');
  if (!(audio instanceof File) || audio.size === 0) return jsonError(400, 'bad-request', 'No audio received.');
  if (audio.size > MAX_BYTES) return jsonError(413, 'too-long', 'That recording is too long.');
  const lang = form.get('lang') === 'en' ? 'en' : 'es';

  try {
    const text = await transcribe(audio, lang);
    return Response.json({ text }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof SpeechError) return jsonError(error.status, 'unavailable', error.message);
    console.error('stt route failed', error);
    return jsonError(500, 'unavailable', 'Something went wrong.');
  }
}
