import { toVoiceError } from './errors';
import {
  VoiceError,
  type ListenOptions,
  type ListenSession,
  type ProviderContext,
  type RecognitionResult,
  type SttProvider,
} from './types';

/**
 * Speech-to-text by recording the microphone (MediaRecorder) and sending the
 * clip to our `/api/stt` route. Works in browsers without SpeechRecognition
 * (e.g. Firefox) and is often more accurate with learner accents.
 * A tiny voice-activity detector stops recording once the player goes quiet.
 */

const MIME_TYPES = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/aac'];

function pickMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return undefined;
  return MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
}

function extensionFor(mime: string): string {
  if (mime.includes('mp4') || mime.includes('aac')) return 'm4a';
  if (mime.includes('ogg')) return 'ogg';
  return 'webm';
}

const SILENCE_AFTER_SPEECH_MS = 1300;
const GIVE_UP_WITHOUT_SPEECH_MS = 7000;

export const cloudStt: SttProvider = {
  id: 'cloud',

  isSupported: () =>
    typeof window !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== 'undefined',

  listen(options: ListenOptions, context: ProviderContext): ListenSession {
    let stopRequested = false;
    let aborted = false;

    const result = (async (): Promise<RecognitionResult> => {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      } catch (err) {
        throw toVoiceError(err);
      }

      const mime = pickMime();
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };

      const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      audioCtx.createMediaStreamSource(stream).connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);

      let spoke = false;
      let noiseFloor = 0.01;
      const started = performance.now();
      let lastVoice = started;

      await new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
        recorder.start(250);
        options.onStart?.();
        const tick = () => {
          if (recorder.state !== 'recording') return;
          analyser.getByteTimeDomainData(samples);
          let sum = 0;
          for (let i = 0; i < samples.length; i++) {
            const v = (samples[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / samples.length);
          const now = performance.now();
          if (now - started < 350) noiseFloor = Math.max(noiseFloor, rms);
          const threshold = Math.max(0.03, noiseFloor * 2.2);
          options.onLevel?.(Math.min(1, rms * 5));
          if (rms > threshold) {
            spoke = true;
            lastVoice = now;
          }
          const quietTooLong = spoke && now - lastVoice > SILENCE_AFTER_SPEECH_MS;
          const nothingSaid = !spoke && now - started > GIVE_UP_WITHOUT_SPEECH_MS;
          const tooLong = now - started > (options.maxDurationMs ?? 12_000);
          if (stopRequested || quietTooLong || nothingSaid || tooLong) {
            recorder.stop();
            return;
          }
          window.setTimeout(tick, 60);
        };
        tick();
      });

      stream.getTracks().forEach((t) => t.stop());
      options.onLevel?.(0);
      audioCtx.close().catch(() => {});

      if (aborted) throw new VoiceError('aborted');
      if (!spoke && !stopRequested) throw new VoiceError('no-speech');

      const type = recorder.mimeType || mime || 'audio/webm';
      const blob = new Blob(chunks, { type });
      if (blob.size < 800) throw new VoiceError('no-speech');

      options.onProcessing?.();
      const form = new FormData();
      form.append('audio', blob, `speech.${extensionFor(type)}`);
      form.append('lang', options.lang.slice(0, 2));
      let res: Response;
      try {
        res = await fetch('/api/stt', {
          method: 'POST',
          body: form,
          headers: context.accessCode ? { 'x-access-code': context.accessCode } : undefined,
        });
      } catch {
        throw new VoiceError('network');
      }
      if (res.status === 401) throw new VoiceError('unauthorized');
      if (!res.ok) throw new VoiceError('service-unavailable');
      const data = (await res.json()) as { text?: string };
      const text = data.text?.trim();
      if (!text) throw new VoiceError('no-speech');
      return { transcripts: [text], provider: 'cloud' };
    })();

    return {
      result,
      stop() {
        stopRequested = true;
      },
      abort() {
        aborted = true;
        stopRequested = true;
      },
    };
  },
};
