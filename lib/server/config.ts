import 'server-only';
import type { Capabilities } from '@/types/capabilities';

/**
 * Server-only configuration from environment variables. Secrets stay here —
 * the browser only ever learns *whether* a feature is available.
 * See `.env.example` for every variable.
 */

export type TtsProviderName = 'openai' | 'elevenlabs';
export type SttProviderName = 'openai';

const env = (name: string) => process.env[name]?.trim() || undefined;

/**
 * The ElevenLabs voice used when no voice ID is configured: the premade
 * voice "Lily" — warm, young-sounding, British female. It is NOT Scottish;
 * it's only here so an ElevenLabs key works straight away. For Emma's real
 * voice, pick (or design) a Scottish voice in ElevenLabs and set
 * EMMA_VOICE_ID — see "Choosing Emma's voice" in the README.
 */
export const ELEVENLABS_FALLBACK_VOICE = { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily (premade, British)' } as const;

const elevenLabsEnglish = env('EMMA_ENGLISH_VOICE_ID') ?? env('EMMA_VOICE_ID') ?? env('ELEVENLABS_VOICE_ID_EN');
const elevenLabsSpanish = env('EMMA_SPANISH_VOICE_ID') ?? env('ELEVENLABS_VOICE_ID_ES');

export const serverConfig = {
  anthropicKey: env('ANTHROPIC_API_KEY'),
  anthropicModel: env('ANTHROPIC_MODEL') ?? 'claude-opus-5',
  openaiKey: env('OPENAI_API_KEY'),
  openaiTtsModel: env('OPENAI_TTS_MODEL') ?? 'gpt-4o-mini-tts',
  openaiTtsVoice: env('OPENAI_TTS_VOICE') ?? 'coral',
  openaiSttModel: env('OPENAI_STT_MODEL') ?? 'gpt-4o-mini-transcribe',
  elevenLabsKey: env('ELEVENLABS_API_KEY'),
  /** Emma's English (Scottish) voice. */
  elevenLabsVoiceEnglish: elevenLabsEnglish ?? ELEVENLABS_FALLBACK_VOICE.id,
  /** Emma's Spanish voice — falls back to her English voice speaking Spanish (multilingual model). */
  elevenLabsVoiceSpanish: elevenLabsSpanish ?? elevenLabsEnglish ?? ELEVENLABS_FALLBACK_VOICE.id,
  /** A voice ID was set, rather than relying on the documented fallback. */
  elevenLabsVoiceConfigured: Boolean(elevenLabsEnglish),
  elevenLabsModel: env('ELEVENLABS_MODEL') ?? 'eleven_multilingual_v2',
  accessCode: env('APP_ACCESS_CODE'),
  ttsPreference: (env('EMMA_TTS_PROVIDER') ?? env('TTS_PROVIDER')) as TtsProviderName | 'none' | undefined,
  sttPreference: env('STT_PROVIDER') as SttProviderName | 'none' | undefined,
};

/** Cloud voices in the order to try them: the preferred one first, then any other configured one. */
export function ttsProviders(): TtsProviderName[] {
  const pref = serverConfig.ttsPreference;
  if (pref === 'none') return [];
  const available: TtsProviderName[] = [];
  if (serverConfig.elevenLabsKey) available.push('elevenlabs');
  if (serverConfig.openaiKey) available.push('openai');
  // The preferred voice first; anything else configured is a fallback.
  if (pref === 'openai' || pref === 'elevenlabs') return [...available.filter((p) => p === pref), ...available.filter((p) => p !== pref)];
  return available;
}

/** The primary cloud voice (ElevenLabs by default when its key is set). */
export function ttsProvider(): TtsProviderName | null {
  return ttsProviders()[0] ?? null;
}

export function sttProvider(): SttProviderName | null {
  if (serverConfig.sttPreference === 'none') return null;
  return serverConfig.openaiKey ? 'openai' : null;
}

export function getCapabilities(): Capabilities {
  const tts = ttsProvider();
  return {
    aiChat: Boolean(serverConfig.anthropicKey),
    cloudTts: tts !== null,
    cloudStt: sttProvider() !== null,
    accessCodeRequired: Boolean(serverConfig.accessCode),
    ttsProvider: tts,
    ttsVoice: tts === 'elevenlabs' ? (serverConfig.elevenLabsVoiceConfigured ? 'custom' : 'fallback') : tts ? 'custom' : null,
  };
}
