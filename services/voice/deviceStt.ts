import { toVoiceError } from './errors';
import { VoiceError, type ListenOptions, type ListenSession, type SttProvider } from './types';

/**
 * Speech-to-text with the browser's SpeechRecognition API (Safari on iPhone,
 * Chrome, Edge). No audio leaves our servers — the browser handles it.
 */

interface RecognitionAlternative {
  transcript: string;
}
interface RecognitionResultItem {
  isFinal: boolean;
  length: number;
  [index: number]: RecognitionAlternative;
}
interface RecognitionEvent {
  results: { length: number; [index: number]: RecognitionResultItem };
}
interface RecognitionErrorEvent {
  error: string;
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

function mapError(code: string): VoiceError {
  switch (code) {
    case 'not-allowed':
      return new VoiceError('permission-denied');
    case 'service-not-allowed':
      return new VoiceError('dictation-disabled');
    case 'no-speech':
      return new VoiceError('no-speech');
    case 'audio-capture':
      return new VoiceError('no-microphone');
    case 'network':
      return new VoiceError('network');
    case 'aborted':
      return new VoiceError('aborted');
    case 'language-not-supported':
    case 'bad-grammar':
      return new VoiceError('service-unavailable');
    default:
      return new VoiceError('unknown', code);
  }
}

/** Ends the session after this much quiet once speech has started. */
const SILENCE_MS = 1600;

export const deviceStt: SttProvider = {
  id: 'device',

  isSupported: () => Boolean(getCtor()),

  listen(options: ListenOptions): ListenSession {
    const Ctor = getCtor();
    if (!Ctor) {
      return { result: Promise.reject(new VoiceError('not-supported')), stop() {}, abort() {} };
    }
    const rec = new Ctor();
    rec.lang = options.lang;
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 5;

    let aborted = false;
    let error: VoiceError | null = null;
    let finals: string[] = [];
    let interim = '';
    let silenceTimer = 0;
    let maxTimer = 0;

    const armSilence = () => {
      window.clearTimeout(silenceTimer);
      silenceTimer = window.setTimeout(() => {
        try {
          rec.stop();
        } catch {
          /* already stopped */
        }
      }, SILENCE_MS);
    };

    const result = new Promise<{ transcripts: string[]; provider: 'device' }>((resolve, reject) => {
      rec.onstart = () => {
        options.onStart?.();
        maxTimer = window.setTimeout(() => {
          try {
            rec.stop();
          } catch {
            /* ignore */
          }
        }, options.maxDurationMs ?? 12_000);
      };
      rec.onresult = (event) => {
        const primary: string[] = [];
        const alternatives: string[] = [];
        let live = '';
        for (let i = 0; i < event.results.length; i++) {
          const r = event.results[i];
          if (r.isFinal) {
            primary.push(r[0]?.transcript ?? '');
            if (event.results.length === 1) for (let j = 1; j < r.length; j++) alternatives.push(r[j].transcript);
          } else {
            live += r[0]?.transcript ?? '';
          }
        }
        if (primary.length) finals = [primary.join(' ').trim(), ...alternatives.map((a) => a.trim())].filter(Boolean);
        interim = `${primary.join(' ')} ${live}`.trim();
        if (interim) options.onInterim?.(interim);
        armSilence();
      };
      rec.onerror = (event) => {
        error = mapError(event.error);
      };
      rec.onend = () => {
        window.clearTimeout(silenceTimer);
        window.clearTimeout(maxTimer);
        if (aborted) return reject(new VoiceError('aborted'));
        // Safari sometimes ends without marking results final — use what we heard.
        const transcripts = finals.length ? finals : interim ? [interim] : [];
        if (transcripts.length) return resolve({ transcripts, provider: 'device' });
        reject(error ?? new VoiceError('no-speech'));
      };
    });

    try {
      rec.start();
    } catch (err) {
      return { result: Promise.reject(toVoiceError(err)), stop() {}, abort() {} };
    }

    return {
      result,
      stop() {
        try {
          rec.stop();
        } catch {
          /* ignore */
        }
      },
      abort() {
        aborted = true;
        try {
          rec.abort();
        } catch {
          /* ignore */
        }
      },
    };
  },
};
