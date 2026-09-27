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

export const serverConfig = {
  anthropicKey: env('ANTHROPIC_API_KEY'),
  anthropicModel: env('ANTHROPIC_MODEL') ?? 'claude-opus-5',
  openaiKey: env('OPENAI_API_KEY'),
  openaiTtsModel: env('OPENAI_TTS_MODEL') ?? 'gpt-4o-mini-tts',
  openaiTtsVoice: env('OPENAI_TTS_VOICE') ?? 'coral',
  openaiSttModel: env('OPENAI_STT_MODEL') ?? 'gpt-4o-mini-transcribe',
  elevenLabsKey: env('ELEVENLABS_API_KEY'),
  elevenLabsVoiceEnglish: env('ELEVENLABS_VOICE_ID_EN'),
  elevenLabsVoiceSpanish: env('ELEVENLABS_VOICE_ID_ES'),
  elevenLabsModel: env('ELEVENLABS_MODEL') ?? 'eleven_multilingual_v2',
  accessCode: env('APP_ACCESS_CODE'),
  ttsPreference: env('TTS_PROVIDER') as TtsProviderName | 'none' | undefined,
  sttPreference: env('STT_PROVIDER') as SttProviderName | 'none' | undefined,
};

export function ttsProvider(): TtsProviderName | null {
  const pref = serverConfig.ttsPreference;
  if (pref === 'none') return null;
  const elevenReady = Boolean(serverConfig.elevenLabsKey && (serverConfig.elevenLabsVoiceEnglish || serverConfig.elevenLabsVoiceSpanish));
  if (pref === 'elevenlabs') return elevenReady ? 'elevenlabs' : null;
  if (pref === 'openai') return serverConfig.openaiKey ? 'openai' : null;
  if (elevenReady) return 'elevenlabs';
  if (serverConfig.openaiKey) return 'openai';
  return null;
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
  };
}
