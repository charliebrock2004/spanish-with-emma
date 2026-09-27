/**
 * Voice layer contracts. The app only ever talks to `VoiceService`; providers
 * (device speech APIs, cloud STT/TTS through our API routes, or anything added
 * later) implement these interfaces and can be swapped freely.
 */

export type SpeechLang = 'es' | 'en';

export type RecognitionLang = 'es-ES' | 'en-GB';

export type ProviderId = 'device' | 'cloud';

export type VoiceErrorCode =
  | 'not-supported'
  | 'permission-denied'
  | 'no-microphone'
  | 'no-speech'
  | 'network'
  | 'aborted'
  | 'service-unavailable'
  | 'dictation-disabled'
  | 'audio-busy'
  | 'unauthorized'
  | 'tts-failed'
  | 'unknown';

export class VoiceError extends Error {
  readonly code: VoiceErrorCode;
  constructor(code: VoiceErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'VoiceError';
    this.code = code;
  }
}

export interface RecognitionResult {
  /** Best transcript first, then alternatives. */
  transcripts: string[];
  provider: ProviderId;
}

export interface ListenOptions {
  lang: RecognitionLang;
  onStart?: () => void;
  onInterim?: (text: string) => void;
  /** 0…1 microphone level (only providers that record audio report it). */
  onLevel?: (level: number) => void;
  /** Recording finished and the audio is being transcribed. */
  onProcessing?: () => void;
  maxDurationMs?: number;
}

export interface ListenSession {
  result: Promise<RecognitionResult>;
  /** Stop listening and use what was heard so far. */
  stop(): void;
  /** Cancel without a result. */
  abort(): void;
}

export interface SttProvider {
  id: ProviderId;
  isSupported(): boolean;
  listen(options: ListenOptions, context: ProviderContext): ListenSession;
}

export interface SpeakRequest {
  text: string;
  lang: SpeechLang;
  rate: number;
  voiceURI: string | null;
  signal: AbortSignal;
}

export interface TtsProvider {
  id: ProviderId;
  isSupported(): boolean;
  speak(request: SpeakRequest, context: ProviderContext): Promise<void>;
  cancel(): void;
  /** Called from a user gesture so iOS allows audio later. */
  unlock?(): void;
  prefetch?(text: string, lang: SpeechLang, context: ProviderContext): void;
}

/** Things providers need from the app (e.g. the access code for API routes). */
export interface ProviderContext {
  accessCode: string;
}

export interface DeviceVoice {
  uri: string;
  name: string;
  lang: string;
  scottish: boolean;
}
