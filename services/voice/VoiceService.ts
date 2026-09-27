import { parseMarkup, speakableSegments, type Segment } from '@/lib/text/markup';
import { chunkForSpeech, hasSpeech, prepareForSpeech, type VoiceStyle } from '@/lib/voice/prepare';
import { bestUtteranceMatch, type WordResult } from '@/lib/text/match';
import type { EnginePreference } from '@/types/settings';
import { cloudStt } from './cloudStt';
import { cloudTts } from './cloudTts';
import { deviceStt } from './deviceStt';
import { deviceTts } from './deviceTts';
import { toVoiceError } from './errors';
import {
  VoiceError,
  type ListenOptions,
  type ListenSession,
  type ProviderContext,
  type ProviderId,
  type RecognitionLang,
  type RecognitionResult,
  type SpeechLang,
  type SttProvider,
  type TtsProvider,
} from './types';

/**
 * VoiceService — the single entry point for everything Emma says and hears.
 *
 *   speechToText()   → listen()          (device SpeechRecognition or cloud STT)
 *   evaluateSpeech() → evaluateSpeech()  (fuzzy, word-aligned scoring)
 *   speak()          → say()             (device SpeechSynthesis or cloud TTS)
 *
 * Providers are chosen from the player's settings and what the server has
 * configured, with automatic fallback, so the rest of the app never cares
 * which engine is in use.
 */

export interface VoiceSettings {
  /** Effective mode ("auto" is resolved by the app from the player's level). */
  mode: 'spanish' | 'scottish';
  rate: number;
  sttEngine: EnginePreference;
  ttsEngine: EnginePreference;
  spanishVoiceURI: string | null;
  englishVoiceURI: string | null;
  cloudTts: boolean;
  cloudStt: boolean;
  accessCode: string;
  /** An access code has to be sent with each request (so audio can't stream straight into the player). */
  accessCodeRequired: boolean;
  /** Emma's delivery follows the moment (Settings → Expressive voice). */
  expressive: boolean;
}

export interface VoiceStatus {
  speaking: boolean;
  listening: boolean;
  /** Speech is paused part-way through. */
  paused: boolean;
  /** Emma is about to speak — her audio is loading. */
  preparing: boolean;
}

export interface SpeechEvaluation {
  passed: boolean;
  great: boolean;
  score: number;
  heard: string;
  target: string;
  words: WordResult[];
}

export interface SayOptions {
  /** Language of text outside *asterisks* (default English). */
  lang?: SpeechLang;
  /** Multiplies the configured speech rate — e.g. 0.7 for the slow button. */
  rateFactor?: number;
  /** Voice English parts even in Spanish-only mode (explicit replay). */
  includeEnglish?: boolean;
  /** How Emma delivers it (only when expressive voice is on). */
  style?: VoiceStyle;
}

export interface VoiceCapabilities {
  canSpeak: boolean;
  speakProvider: ProviderId | null;
  canListen: boolean;
  listenProvider: ProviderId | null;
}

const DEFAULT_SETTINGS: VoiceSettings = {
  mode: 'scottish',
  rate: 0.9,
  sttEngine: 'auto',
  ttsEngine: 'auto',
  spanishVoiceURI: null,
  englishVoiceURI: null,
  cloudTts: false,
  cloudStt: false,
  accessCode: '',
  accessCodeRequired: false,
  expressive: true,
};

/** One piece of speech: a sentence or two in one language. */
interface Chunk {
  text: string;
  lang: SpeechLang;
}

class VoiceService {
  private settings: VoiceSettings = DEFAULT_SETTINGS;
  private status: VoiceStatus = { speaking: false, listening: false, paused: false, preparing: false };
  /** The last thing said (for replay). */
  private last: { text: string; options: SayOptions } | null = null;
  private listeners = new Set<() => void>();
  private currentSpeech: AbortController | null = null;
  private currentListen: ListenSession | null = null;
  /** Consecutive device-recogniser service failures (triggers cloud fallback). */
  private deviceFailures = 0;

  configure(patch: Partial<VoiceSettings>): void {
    this.settings = { ...this.settings, ...patch };
  }

  getSettings(): VoiceSettings {
    return this.settings;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getStatus = (): VoiceStatus => this.status;

  private setStatus(patch: Partial<VoiceStatus>) {
    const next = { ...this.status, ...patch };
    if (
      next.speaking === this.status.speaking &&
      next.listening === this.status.listening &&
      next.paused === this.status.paused &&
      next.preparing === this.status.preparing
    )
      return;
    this.status = next;
    this.listeners.forEach((l) => l());
  }

  private context(): ProviderContext {
    return { accessCode: this.settings.accessCode, stream: !this.settings.accessCodeRequired };
  }

  private ttsProviders(): TtsProvider[] {
    const cloud = this.settings.cloudTts && cloudTts.isSupported() ? [cloudTts] : [];
    const device = deviceTts.isSupported() ? [deviceTts] : [];
    return this.settings.ttsEngine === 'device' ? [...device, ...cloud] : [...cloud, ...device];
  }

  private sttProvider(): SttProvider | null {
    const cloud = this.settings.cloudStt && cloudStt.isSupported() ? cloudStt : null;
    const device = deviceStt.isSupported() ? deviceStt : null;
    if (this.settings.sttEngine === 'cloud') return cloud ?? device;
    if (this.settings.sttEngine === 'device') return device ?? cloud;
    if (device && (this.deviceFailures < 2 || !cloud)) return device;
    return cloud ?? device;
  }

  capabilities(): VoiceCapabilities {
    const tts = this.ttsProviders();
    const stt = this.sttProvider();
    return {
      canSpeak: tts.length > 0,
      speakProvider: tts[0]?.id ?? null,
      canListen: stt !== null,
      listenProvider: stt?.id ?? null,
    };
  }

  /** Call from a user gesture (first tap) so iOS allows audio. */
  unlock(): void {
    deviceTts.unlock();
    cloudTts.unlock();
  }

  /** Stops anything Emma is saying. */
  stop(): void {
    this.currentSpeech?.abort();
    this.currentSpeech = null;
    deviceTts.cancel();
    cloudTts.cancel();
    this.setStatus({ speaking: false, paused: false, preparing: false });
  }

  /** Pauses Emma mid-sentence (resume carries on from the same spot). */
  pause(): void {
    if (!this.status.speaking || this.status.paused) return;
    cloudTts.pause();
    deviceTts.pause();
    this.setStatus({ paused: true });
  }

  resume(): void {
    if (!this.status.paused) return;
    cloudTts.resume();
    deviceTts.resume();
    this.setStatus({ paused: false });
  }

  togglePause(): void {
    if (this.status.paused) this.resume();
    else this.pause();
  }

  /** Says the last line again (optionally slower). */
  replay(rateFactor?: number): Promise<boolean> {
    if (!this.last) return Promise.resolve(false);
    return this.say(this.last.text, { ...this.last.options, rateFactor: rateFactor ?? this.last.options.rateFactor });
  }

  hasReplay(): boolean {
    return this.last !== null;
  }

  segmentsFor(text: string, options: SayOptions = {}): Segment[] {
    const segments = speakableSegments(parseMarkup(text, options.lang ?? 'en'));
    if (this.settings.mode === 'spanish' && !options.includeEnglish) return segments.filter((s) => s.lang === 'es');
    return segments;
  }

  /** What will actually be spoken: prepared text, cut into sentence-sized chunks. */
  chunksFor(text: string, options: SayOptions = {}): Chunk[] {
    const chunks: Chunk[] = [];
    for (const segment of this.segmentsFor(text, options)) {
      const prepared = prepareForSpeech(segment.text, segment.lang);
      if (!hasSpeech(prepared)) continue;
      for (const piece of chunkForSpeech(prepared)) chunks.push({ text: piece, lang: segment.lang });
    }
    return chunks;
  }

  private styleFor(options: SayOptions): VoiceStyle {
    return this.settings.expressive ? (options.style ?? 'neutral') : 'neutral';
  }

  /**
   * Speaks Emma-markup text ("*¡Hola!* That means hello."), switching voices per
   * language. Never throws — resolves `false` if nothing could be played, so the
   * UI can keep the text on screen with a replay button.
   */
  async say(text: string, options: SayOptions = {}): Promise<boolean> {
    const chunks = this.chunksFor(text, options);
    if (chunks.length === 0) return true;
    this.stop();
    const providers = this.ttsProviders();
    if (providers.length === 0) return false;
    this.last = { text, options };
    const style = this.styleFor(options);
    const controller = new AbortController();
    this.currentSpeech = controller;
    this.setStatus({ speaking: true, paused: false, preparing: true });
    let ok = true;
    try {
      for (let i = 0; i < chunks.length; i++) {
        if (controller.signal.aborted) break;
        // Fetch the next chunk while this one plays.
        const next = chunks[i + 1];
        if (next && providers[0] === cloudTts) cloudTts.prefetch(next.text, next.lang, this.context(), style);
        if (!(await this.speakChunk(chunks[i], providers, controller.signal, options, style))) ok = false;
      }
    } finally {
      if (this.currentSpeech === controller) {
        this.currentSpeech = null;
        this.setStatus({ speaking: false, paused: false, preparing: false });
      }
    }
    return ok;
  }

  /** Speaks Spanish text directly (no markup). */
  saySpanish(text: string, options: Omit<SayOptions, 'lang'> = {}): Promise<boolean> {
    return this.say(text.replace(/\*/g, ''), { ...options, lang: 'es' });
  }

  private async speakChunk(chunk: Chunk, providers: TtsProvider[], signal: AbortSignal, options: SayOptions, style: VoiceStyle): Promise<boolean> {
    const rate = this.settings.rate * (options.rateFactor ?? 1);
    const voiceURI = chunk.lang === 'es' ? this.settings.spanishVoiceURI : this.settings.englishVoiceURI;
    const onStart = () => this.setStatus({ preparing: false });
    for (const provider of providers) {
      try {
        await provider.speak({ text: chunk.text, lang: chunk.lang, rate, voiceURI, signal, style, onStart }, this.context());
        return true;
      } catch {
        if (signal.aborted) return true;
        // Try the next provider (e.g. cloud → device).
      }
    }
    return false;
  }

  /** Warms the cloud audio cache for something Emma is about to say (the first two chunks). */
  prefetch(text: string, options: SayOptions | SpeechLang = 'en'): void {
    if (!this.settings.cloudTts || this.settings.ttsEngine === 'device' || !cloudTts.isSupported()) return;
    const opts = typeof options === 'string' ? { lang: options } : options;
    const style = this.styleFor(opts);
    for (const chunk of this.chunksFor(text, opts).slice(0, 2)) cloudTts.prefetch(chunk.text, chunk.lang, this.context(), style);
  }

  /**
   * Starts listening. The returned session resolves with transcripts, or
   * rejects with a VoiceError whose message can be shown to the player.
   */
  listen(options: Omit<ListenOptions, 'lang'> & { lang?: RecognitionLang } = {}): ListenSession {
    this.stop();
    this.currentListen?.abort();
    const provider = this.sttProvider();
    if (!provider) {
      return { result: Promise.reject(new VoiceError('not-supported')), stop() {}, abort() {} };
    }
    this.setStatus({ listening: true });
    const session = provider.listen({ ...options, lang: options.lang ?? 'es-ES' }, this.context());
    this.currentListen = session;
    const result = session.result
      .then(
        (r) => {
          if (provider.id === 'device') this.deviceFailures = 0;
          return r;
        },
        (err: unknown) => {
          const error = toVoiceError(err);
          if (provider.id === 'device' && ['network', 'service-unavailable'].includes(error.code)) this.deviceFailures++;
          throw error;
        },
      )
      .finally(() => {
        if (this.currentListen === session) this.currentListen = null;
        this.setStatus({ listening: false });
      });
    return { result, stop: () => session.stop(), abort: () => session.abort() };
  }

  /** Scores what the player said against the accepted phrases. */
  evaluateSpeech(result: RecognitionResult, accepted: string[], { name = '' }: { name?: string } = {}): SpeechEvaluation {
    const best = bestUtteranceMatch(result.transcripts, accepted, { name });
    const threshold = best.words.length <= 1 ? 0.7 : 0.75;
    return {
      passed: best.score >= threshold,
      great: best.score >= 0.9,
      score: best.score,
      heard: best.heard || result.transcripts[0] || '',
      target: best.pattern,
      words: best.words,
    };
  }
}

export const voiceService = new VoiceService();

export { deviceTts, VoiceError };
