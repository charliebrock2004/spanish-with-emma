import type { Page } from '@playwright/test';

/**
 * Replaces the Web Speech API with a fake: recognition "hears" whatever the
 * test puts in `window.__nextTranscript`, and speech synthesis finishes
 * instantly while logging what Emma said to `window.__spoken`.
 */
export async function mockSpeech(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>;
    w.__nextTranscript = 'hola';
    w.__spoken = [] as string[];

    class FakeRecognition {
      lang = 'es-ES';
      interimResults = false;
      continuous = false;
      maxAlternatives = 1;
      onstart: (() => void) | null = null;
      onresult: ((e: unknown) => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        setTimeout(() => this.onstart?.(), 20);
        setTimeout(() => {
          const transcript = String(w.__nextTranscript);
          if (transcript === '__denied__') {
            this.onerror?.({ error: 'not-allowed' });
            this.onend?.();
            return;
          }
          const alternative = { transcript, confidence: 0.9 };
          const result = Object.assign([alternative], { isFinal: true });
          this.onresult?.({ resultIndex: 0, results: Object.assign([result], { length: 1 }) });
          setTimeout(() => this.onend?.(), 30);
        }, 200);
      }
      stop() {}
      abort() {
        this.onend?.();
      }
    }
    w.SpeechRecognition = FakeRecognition;
    w.webkitSpeechRecognition = FakeRecognition;

    const voices = [
      { name: 'Mónica', lang: 'es-ES', voiceURI: 'monica', localService: true, default: false },
      { name: 'Fiona', lang: 'en-GB-u-sd-gbsct', voiceURI: 'fiona', localService: true, default: false },
    ];
    const synth = {
      speaking: false,
      paused: false,
      pending: false,
      getVoices: () => voices,
      speak(u: { text: string; voice?: { name: string }; lang: string; onend?: (e: unknown) => void }) {
        (w.__spoken as string[]).push(`[${u.voice ? u.voice.name : u.lang}] ${u.text}`);
        setTimeout(() => u.onend?.({}), 20);
      },
      cancel() {},
      pause() {},
      resume() {},
      addEventListener() {},
      removeEventListener() {},
    };
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
    w.SpeechSynthesisUtterance = class {
      text: string;
      lang = '';
      voice = null;
      rate = 1;
      pitch = 1;
      volume = 1;
      constructor(text: string) {
        this.text = text;
      }
    };
  });
}

/** What the fake recogniser will hear next. */
export async function willHear(page: Page, transcript: string) {
  await page.evaluate((t) => ((window as unknown as Record<string, unknown>).__nextTranscript = t), transcript);
}

export async function spoken(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken);
}
