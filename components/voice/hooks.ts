'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { haptics } from '@/services/haptics';
import { voiceService, type SayOptions, type VoiceCapabilities, type VoiceStatus } from '@/services/voice/VoiceService';
import { useGameStore } from '@/store/gameStore';
import { toVoiceError } from '@/services/voice/errors';
import type { ListenSession, RecognitionLang, RecognitionResult, VoiceError } from '@/services/voice/types';

const SERVER_STATUS: VoiceStatus = { speaking: false, listening: false, paused: false, preparing: false };

/** Whether Emma is currently speaking or listening (drives her animation). */
export function useVoiceStatus(): VoiceStatus {
  return useSyncExternalStore(voiceService.subscribe, voiceService.getStatus, () => SERVER_STATUS);
}

const UNKNOWN_CAPS: VoiceCapabilities & { ready: boolean } = {
  canSpeak: true,
  speakProvider: null,
  canListen: false,
  listenProvider: null,
  ready: false,
};

/**
 * What this device can do right now. Reads after a tick so the voice service
 * has picked up the player's settings (the settings bridge is a parent effect).
 */
export function useVoiceCapabilities(): VoiceCapabilities & { ready: boolean } {
  const sttEngine = useGameStore((s) => s.settings.sttEngine);
  const ttsEngine = useGameStore((s) => s.settings.ttsEngine);
  const [caps, setCaps] = useState(UNKNOWN_CAPS);
  useEffect(() => {
    const t = window.setTimeout(() => setCaps({ ...voiceService.capabilities(), ready: true }), 0);
    return () => window.clearTimeout(t);
  }, [sttEngine, ttsEngine]);
  return caps;
}

/** Speak helper that also tracks whether *this* line is the one playing. */
export function useSpeaker() {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const say = useCallback(async (text: string, options: SayOptions & { key?: string } = {}) => {
    const key = options.key ?? text;
    setActiveKey(key);
    const ok = await voiceService.say(text, options);
    if (!mounted.current) return ok;
    setActiveKey((current) => (current === key ? null : current));
    setFailed(!ok);
    return ok;
  }, []);

  const stop = useCallback(() => {
    voiceService.stop();
    setActiveKey(null);
  }, []);

  return { say, stop, activeKey, failed };
}

export type ListenState = 'idle' | 'listening' | 'processing' | 'error';

/** State machine behind every microphone button. */
export function useListener(lang: RecognitionLang = 'es-ES') {
  const [state, setState] = useState<ListenState>('idle');
  const [interim, setInterim] = useState('');
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<VoiceError | null>(null);
  const session = useRef<ListenSession | null>(null);

  useEffect(() => () => session.current?.abort(), []);

  const start = useCallback(async (): Promise<RecognitionResult | null> => {
    session.current?.abort();
    setError(null);
    setInterim('');
    setState('listening');
    haptics.play('tap');
    const current = voiceService.listen({
      lang,
      onInterim: setInterim,
      onLevel: setLevel,
      onProcessing: () => setState('processing'),
    });
    session.current = current;
    const startedAt = Date.now();
    try {
      const result = await current.result;
      if (session.current === current) setState('idle');
      // Time at the microphone counts towards the profile's speaking time.
      if (result) useGameStore.getState().addSpeakingTime(Math.round((Date.now() - startedAt) / 1000));
      return result;
    } catch (err) {
      const voiceError = toVoiceError(err);
      if (session.current === current) {
        if (voiceError.code === 'aborted') setState('idle');
        else {
          setError(voiceError);
          setState('error');
        }
      }
      return null;
    } finally {
      if (session.current === current) session.current = null;
      setLevel(0);
    }
  }, [lang]);

  const stop = useCallback(() => {
    if (!session.current) return;
    setState('processing');
    session.current.stop();
  }, []);

  const cancel = useCallback(() => {
    session.current?.abort();
    session.current = null;
    setState('idle');
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setInterim('');
    setState('idle');
  }, []);

  return { state, interim, level, error, start, stop, cancel, reset };
}
