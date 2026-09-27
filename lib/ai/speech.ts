import 'server-only';
import { serverConfig, ttsProvider } from '@/lib/server/config';

/**
 * Cloud voices for Emma. The accent is steered by instructions (OpenAI) or by
 * choosing voices from the ElevenLabs library — never a caricature.
 */
const OPENAI_INSTRUCTIONS = {
  es: 'You are Emma, a warm, friendly young woman from Spain. Speak natural Castilian Spanish with a Madrid accent (use the Spanish "th" sound for c and z), at a relaxed, clear pace for someone learning Spanish. Warm and encouraging, never robotic.',
  en: 'You are Emma, a warm, friendly young woman from Edinburgh, Scotland. Speak English with a natural, gentle Scottish accent — authentic, not exaggerated and never a caricature. Relaxed, clear and encouraging, like a kind teacher chatting with a friend.',
} as const;

export class SpeechError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function openaiSpeech(text: string, lang: 'es' | 'en'): Promise<Response> {
  return fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${serverConfig.openaiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: serverConfig.openaiTtsModel,
      voice: serverConfig.openaiTtsVoice,
      input: text,
      instructions: OPENAI_INSTRUCTIONS[lang],
      response_format: 'mp3',
    }),
  });
}

async function elevenLabsSpeech(text: string, lang: 'es' | 'en'): Promise<Response> {
  const voice =
    lang === 'es'
      ? (serverConfig.elevenLabsVoiceSpanish ?? serverConfig.elevenLabsVoiceEnglish)
      : (serverConfig.elevenLabsVoiceEnglish ?? serverConfig.elevenLabsVoiceSpanish);
  return fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice ?? '')}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: {
      'xi-api-key': serverConfig.elevenLabsKey ?? '',
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: serverConfig.elevenLabsModel,
      voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.15 },
    }),
  });
}

export async function synthesise(text: string, lang: 'es' | 'en'): Promise<ReadableStream<Uint8Array>> {
  const provider = ttsProvider();
  if (!provider) throw new SpeechError(503, 'No cloud voice is configured.');
  const res = provider === 'openai' ? await openaiSpeech(text, lang) : await elevenLabsSpeech(text, lang);
  if (!res.ok || !res.body) {
    console.error(`${provider} TTS failed`, res.status, await res.text().catch(() => ''));
    throw new SpeechError(502, 'The voice service had a problem.');
  }
  return res.body;
}

export async function transcribe(audio: File, lang: 'es' | 'en'): Promise<string> {
  const form = new FormData();
  form.append('file', audio, audio.name || 'speech.webm');
  form.append('model', serverConfig.openaiSttModel);
  form.append('language', lang);
  form.append('response_format', 'json');
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${serverConfig.openaiKey}` },
    body: form,
  });
  if (!res.ok) {
    console.error('OpenAI transcription failed', res.status, await res.text().catch(() => ''));
    throw new SpeechError(502, 'The speech recognition service had a problem.');
  }
  const data = (await res.json()) as { text?: string };
  return data.text?.trim() ?? '';
}
