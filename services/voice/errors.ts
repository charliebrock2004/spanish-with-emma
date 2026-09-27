import { VoiceError, type VoiceErrorCode } from './types';

/** Friendly, actionable messages — never a bare "error". */
export const VOICE_ERROR_MESSAGES: Record<VoiceErrorCode, string> = {
  'not-supported': "This browser can't listen yet — you can type your answers instead ✍️",
  'permission-denied':
    'I need your microphone to hear you. Allow microphone access for this site in your browser settings — or type instead.',
  'no-microphone': "I can't find a microphone. You can type your answers instead.",
  'no-speech': "Couldn't hear you there — try again 🎙️",
  network: 'Speech recognition needs an internet connection. Check your connection and try again.',
  aborted: 'Listening stopped.',
  'service-unavailable': "Speech recognition isn't available right now. Try again in a moment, or type instead.",
  'dictation-disabled':
    'Speech recognition is switched off on this device. On iPhone, turn on Dictation (Settings → General → Keyboard), then try again — or type instead.',
  'audio-busy': 'Your microphone is being used by another app. Close it and try again.',
  unauthorized: 'This app needs its access code for cloud voice. Add it in Settings.',
  'tts-failed': "I couldn't play that out loud — the text is on screen, and you can tap replay.",
  unknown: 'Something went wrong with the microphone. Try again, or type instead.',
};

export function voiceErrorMessage(error: unknown): string {
  if (error instanceof VoiceError) return VOICE_ERROR_MESSAGES[error.code];
  return VOICE_ERROR_MESSAGES.unknown;
}

export function toVoiceError(error: unknown): VoiceError {
  if (error instanceof VoiceError) return error;
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') return new VoiceError('permission-denied');
    if (error.name === 'NotFoundError' || error.name === 'OverconstrainedError') return new VoiceError('no-microphone');
    if (error.name === 'NotReadableError' || error.name === 'AbortError') return new VoiceError('audio-busy');
  }
  if (error instanceof TypeError) return new VoiceError('network');
  return new VoiceError('unknown', error instanceof Error ? error.message : String(error));
}

/** Errors worth offering the keyboard for straight away (retrying won't help). */
export function isPermanent(error: VoiceError): boolean {
  return ['not-supported', 'permission-denied', 'no-microphone', 'dictation-disabled'].includes(error.code);
}
