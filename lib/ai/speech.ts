import 'server-only';
import { serverConfig, ttsProviders, type TtsProviderName } from '@/lib/server/config';
import { prepareForSpeech, type SpeechLang, type VoiceStyle } from '@/lib/voice/prepare';

/**
 * Cloud voices for Emma.
 *
 * ElevenLabs is the primary provider: a young, warm, natural Scottish voice
 * for her English and a Castilian voice for her Spanish (both configurable —
 * see config.ts). Audio is streamed as it's generated. OpenAI's
 * instruction-steered voice is the fallback; if both fail, the browser falls
 * back to the device's own voices.
 */

export class SpeechError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// ─── ElevenLabs ────────────────────────────────────────────────────────────

/**
 * Delivery per style. Lower stability = livelier; `style` adds the voice's own
 * character. Kept moderate so Emma is expressive but never over the top.
 */
const ELEVEN_SETTINGS: Record<VoiceStyle, { stability: number; similarity_boost: number; style: number; use_speaker_boost: boolean }> = {
  neutral: { stability: 0.5, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true },
  cheerful: { stability: 0.4, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true },
  excited: { stability: 0.32, similarity_boost: 0.8, style: 0.42, use_speaker_boost: true },
  gentle: { stability: 0.62, similarity_boost: 0.8, style: 0.12, use_speaker_boost: true },
  calm: { stability: 0.7, similarity_boost: 0.8, style: 0.05, use_speaker_boost: true },
};

/** Models that accept `language_code` to pin the language (multilingual v2 detects it itself). */
const LANGUAGE_CODE_MODELS = /(turbo|flash)_v2_5/;

async function elevenLabsSpeech(text: string, lang: SpeechLang, style: VoiceStyle): Promise<Response> {
  const voice = lang === 'es' ? serverConfig.elevenLabsVoiceSpanish : serverConfig.elevenLabsVoiceEnglish;
  const model = serverConfig.elevenLabsModel;
  return fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}/stream?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: {
      'xi-api-key': serverConfig.elevenLabsKey ?? '',
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: model,
      voice_settings: ELEVEN_SETTINGS[style],
      ...(LANGUAGE_CODE_MODELS.test(model) ? { language_code: lang } : {}),
    }),
  });
}

// ─── OpenAI ────────────────────────────────────────────────────────────────

const OPENAI_VOICE = {
  es: 'You are Emma, a warm, friendly young woman in her twenties. Speak natural Castilian Spanish with a Madrid accent (use the Spanish "th" sound for c and z), at a relaxed, clear pace for someone learning Spanish. Warm and encouraging, never robotic.',
  en: 'You are Emma, a warm, friendly young woman in her twenties from Edinburgh, Scotland. Speak English with a natural, gentle Scottish accent — authentic, not exaggerated and never a caricature. Relaxed, clear and encouraging, like a kind teacher chatting with a friend.',
} as const;

const OPENAI_STYLE: Record<VoiceStyle, string> = {
  neutral: '',
  cheerful: ' Sound genuinely pleased and upbeat.',
  excited: ' Sound delighted and celebratory — the learner just did something great — but keep it natural.',
  gentle: ' Sound gentle, patient and reassuring — the learner made a small mistake and should feel encouraged.',
  calm: ' Sound calm and clear, like explaining something to a friend.',
};

async function openaiSpeech(text: string, lang: SpeechLang, style: VoiceStyle): Promise<Response> {
  return fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${serverConfig.openaiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: serverConfig.openaiTtsModel,
      voice: serverConfig.openaiTtsVoice,
      input: text,
      instructions: OPENAI_VOICE[lang] + OPENAI_STYLE[style],
      response_format: 'mp3',
    }),
  });
}

// ─── Synthesis ─────────────────────────────────────────────────────────────

export interface Speech {
  audio: ReadableStream<Uint8Array>;
  provider: TtsProviderName;
}

/**
 * Speaks `text` with the first provider that answers. The text is prepared
 * again here (the browser prepares it too) so nothing unspeakable ever
 * reaches a provider.
 */
export async function synthesise(text: string, lang: SpeechLang, style: VoiceStyle = 'neutral'): Promise<Speech> {
  const providers = ttsProviders();
  if (providers.length === 0) throw new SpeechError(503, 'No cloud voice is configured.');
  const spoken = prepareForSpeech(text, lang);
  if (!spoken) throw new SpeechError(400, 'Nothing to say.');
  for (const provider of providers) {
    try {
      const res = provider === 'elevenlabs' ? await elevenLabsSpeech(spoken, lang, style) : await openaiSpeech(spoken, lang, style);
      if (res.ok && res.body) return { audio: res.body, provider };
      console.error(`${provider} TTS failed`, res.status, await res.text().catch(() => ''));
    } catch (error) {
      console.error(`${provider} TTS error`, error);
    }
  }
  throw new SpeechError(502, 'The voice service had a problem.');
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
