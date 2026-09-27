import { rankVoices, isScottishVoice } from './voiceSelection';
import { VoiceError, type DeviceVoice, type SpeakRequest, type SpeechLang, type TtsProvider } from './types';

/**
 * Text-to-speech with the browser's SpeechSynthesis API. Works offline on
 * iPhone (Mónica for Spanish, Fiona for Scottish English when installed).
 * Includes the usual workarounds: voices loading late, Safari not firing
 * `onend`, and Chrome cutting off long utterances.
 */
class DeviceTts implements TtsProvider {
  readonly id = 'device' as const;
  private voices: SpeechSynthesisVoice[] = [];
  private loading: Promise<void> | null = null;
  private listeners = new Set<() => void>();

  isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
  }

  /** Voices arrive asynchronously (and on Safari, sometimes only after polling). */
  loadVoices(): Promise<void> {
    if (!this.isSupported()) return Promise.resolve();
    if (this.voices.length) return Promise.resolve();
    this.loading ??= new Promise<void>((resolve) => {
      const synth = window.speechSynthesis;
      let tries = 0;
      const done = () => {
        this.voices = synth.getVoices();
        if (this.voices.length || tries > 20) {
          this.listeners.forEach((l) => l());
          resolve();
          return true;
        }
        return false;
      };
      if (done()) return;
      synth.addEventListener?.('voiceschanged', () => done());
      const poll = window.setInterval(() => {
        tries++;
        if (done()) window.clearInterval(poll);
      }, 150);
    });
    return this.loading;
  }

  onVoicesChanged(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  listVoices(lang: SpeechLang): DeviceVoice[] {
    return rankVoices(this.voices, lang).map((v) => ({
      uri: v.voiceURI,
      name: v.name,
      lang: v.lang,
      scottish: isScottishVoice(v),
    }));
  }

  pickVoice(lang: SpeechLang, preferredURI: string | null): SpeechSynthesisVoice | null {
    if (preferredURI) {
      const preferred = this.voices.find((v) => v.voiceURI === preferredURI);
      if (preferred) return preferred;
    }
    return rankVoices(this.voices, lang)[0] ?? null;
  }

  unlock(): void {
    if (!this.isSupported()) return;
    // iOS only lets speech start from a user gesture the first time.
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    window.speechSynthesis.speak(u);
    void this.loadVoices();
  }

  cancel(): void {
    if (this.isSupported()) window.speechSynthesis.cancel();
  }

  async speak({ text, lang, rate, voiceURI, signal }: SpeakRequest): Promise<void> {
    if (!this.isSupported()) throw new VoiceError('not-supported');
    await this.loadVoices();
    if (signal.aborted) return;
    // Long passages are split into sentences — Chrome stops speaking after ~15s.
    const chunks = text.match(/[^.!?¡¿]+[.!?]*|[¡¿][^.!?]+[.!?]*/g)?.map((c) => c.trim()).filter(Boolean) ?? [text];
    const merged: string[] = [];
    for (const chunk of chunks) {
      const last = merged[merged.length - 1];
      if (last && last.length + chunk.length < 160) merged[merged.length - 1] = `${last} ${chunk}`;
      else merged.push(chunk);
    }
    for (const chunk of merged) {
      if (signal.aborted) return;
      await this.speakOne(chunk, lang, rate, voiceURI, signal);
    }
  }

  private speakOne(text: string, lang: SpeechLang, rate: number, voiceURI: string | null, signal: AbortSignal): Promise<void> {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = this.pickVoice(lang, voiceURI);
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? (lang === 'es' ? 'es-ES' : 'en-GB');
    utterance.rate = Math.min(1.4, Math.max(0.5, rate));
    utterance.pitch = 1;

    return new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = (error?: VoiceError) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(fallback);
        signal.removeEventListener('abort', onAbort);
        if (error) reject(error);
        else resolve();
      };
      const onAbort = () => {
        synth.cancel();
        finish();
      };
      // Safari occasionally never fires `onend`; don't hang the lesson.
      const fallback = window.setTimeout(() => finish(), 2500 + (text.length * 110) / utterance.rate);
      utterance.onend = () => finish();
      utterance.onerror = (event) => {
        if (event.error === 'interrupted' || event.error === 'canceled') finish();
        else finish(new VoiceError('tts-failed', event.error));
      };
      signal.addEventListener('abort', onAbort);
      synth.speak(utterance);
      // Chrome can leave the queue paused after a tab switch.
      if (synth.paused) synth.resume();
    });
  }
}

export const deviceTts = new DeviceTts();
