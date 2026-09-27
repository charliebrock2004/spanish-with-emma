import { VoiceError, type ProviderContext, type SpeakRequest, type SpeechLang, type TtsProvider } from './types';

/**
 * Text-to-speech through our own `/api/tts` route (OpenAI or ElevenLabs on the
 * server — keys never reach the browser). Audio is cached per phrase, and a
 * single <audio> element is reused because iOS only lets an element play after
 * it has been "unlocked" by a user gesture.
 */

const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

const MAX_CACHE = 80;

class CloudTts implements TtsProvider {
  readonly id = 'cloud' as const;
  private audio: HTMLAudioElement | null = null;
  private cache = new Map<string, Promise<string>>();
  private failingUntil = 0;

  isSupported(): boolean {
    return typeof window !== 'undefined' && typeof Audio !== 'undefined' && Date.now() > this.failingUntil;
  }

  private element(): HTMLAudioElement {
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.preload = 'auto';
    }
    return this.audio;
  }

  unlock(): void {
    if (typeof window === 'undefined') return;
    const el = this.element();
    if (el.src) return;
    el.src = SILENT_WAV;
    el.play().catch(() => {
      /* not a gesture yet — we'll try again next tap */
    });
  }

  private fetchAudio(text: string, lang: SpeechLang, context: ProviderContext): Promise<string> {
    const cacheKey = `${lang}:${text}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;
    const request = (async () => {
      const params = new URLSearchParams({ lang, text });
      const res = await fetch(`/api/tts?${params}`, {
        headers: context.accessCode ? { 'x-access-code': context.accessCode } : undefined,
      });
      if (res.status === 401) throw new VoiceError('unauthorized');
      if (!res.ok) throw new VoiceError('tts-failed', `status ${res.status}`);
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    })();
    this.cache.set(cacheKey, request);
    request.catch(() => this.cache.delete(cacheKey));
    if (this.cache.size > MAX_CACHE) {
      const oldest = this.cache.keys().next().value;
      if (oldest) {
        const url = this.cache.get(oldest);
        this.cache.delete(oldest);
        url?.then((u) => URL.revokeObjectURL(u)).catch(() => {});
      }
    }
    return request;
  }

  prefetch(text: string, lang: SpeechLang, context: ProviderContext): void {
    if (!this.isSupported()) return;
    this.fetchAudio(text, lang, context).catch(() => {});
  }

  cancel(): void {
    if (this.audio) this.audio.pause();
  }

  async speak({ text, lang, rate, signal }: SpeakRequest, context: ProviderContext): Promise<void> {
    let url: string;
    try {
      url = await this.fetchAudio(text, lang, context);
    } catch (err) {
      // Back off for a minute so the device voice takes over smoothly.
      this.failingUntil = Date.now() + 60_000;
      throw err instanceof VoiceError ? err : new VoiceError('tts-failed');
    }
    if (signal.aborted) return;
    const el = this.element();
    el.pause();
    el.src = url;
    el.playbackRate = Math.min(1.3, Math.max(0.6, rate));
    (el as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = true;
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        el.onended = null;
        el.onerror = null;
        signal.removeEventListener('abort', onAbort);
      };
      const onAbort = () => {
        el.pause();
        cleanup();
        resolve();
      };
      el.onended = () => {
        cleanup();
        resolve();
      };
      el.onerror = () => {
        cleanup();
        reject(new VoiceError('tts-failed'));
      };
      signal.addEventListener('abort', onAbort);
      el.play().catch((err: unknown) => {
        cleanup();
        reject(new VoiceError('tts-failed', err instanceof Error ? err.message : undefined));
      });
    });
  }
}

export const cloudTts = new CloudTts();
