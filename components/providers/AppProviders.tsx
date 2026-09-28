'use client';

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import type { Capabilities } from '@/types/capabilities';
import { curriculumLevel, useGameStore } from '@/store/gameStore';
import { voiceService } from '@/services/voice/VoiceService';
import { haptics } from '@/services/haptics';
import { soundService } from '@/services/sound/SoundService';
import { musicService } from '@/services/sound/MusicService';
import { useVoiceStatus } from '@/components/voice/hooks';
import { CelebrationHost } from '@/components/celebrate/CelebrationHost';
import { ChestOverlay } from '@/components/celebrate/ChestOverlay';

const CapabilitiesContext = createContext<Capabilities>({
  aiChat: false,
  cloudTts: false,
  cloudStt: false,
  accessCodeRequired: false,
  ttsProvider: null,
});

export const useCapabilities = () => useContext(CapabilitiesContext);

/** Loads saved progress from the device once the app is running in the browser. */
function StoreHydrator() {
  useEffect(() => {
    void useGameStore.persist.rehydrate();
  }, []);
  return null;
}

/** Keeps the voice + sound services in step with the player's settings. */
function ServicesBridge({ capabilities }: { capabilities: Capabilities }) {
  const settings = useGameStore((s) => s.settings);
  const level = useGameStore(curriculumLevel);

  useEffect(() => {
    const mode = settings.voiceMode === 'auto' ? (level <= 3 ? 'scottish' : 'spanish') : settings.voiceMode;
    voiceService.configure({
      mode,
      rate: settings.speechRate,
      sttEngine: settings.sttEngine,
      ttsEngine: settings.ttsEngine,
      spanishVoiceURI: settings.spanishVoiceURI,
      englishVoiceURI: settings.englishVoiceURI,
      cloudTts: capabilities.cloudTts,
      cloudStt: capabilities.cloudStt,
      accessCode: settings.accessCode,
      accessCodeRequired: capabilities.accessCodeRequired,
      expressive: settings.expressiveVoice,
    });
    soundService.setEnabled(settings.soundEffects);
    soundService.setVolume(settings.soundVolume);
    haptics.setEnabled(settings.haptics);
  }, [settings, level, capabilities]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', settings.reduceMotion);
  }, [settings.reduceMotion]);

  // The equipped colour theme re-points the accent colours (see globals.css).
  const theme = useGameStore((s) => s.inventory.equipped.theme);
  useEffect(() => {
    if (theme && theme !== 'theme-terracotta') document.documentElement.dataset.theme = theme;
    else delete document.documentElement.dataset.theme;
  }, [theme]);

  return null;
}

/** New daily quests (and a new weekly challenge) appear when the app comes back on a new day. */
function DayWatcher() {
  const refreshDay = useGameStore((s) => s.refreshDay);
  const hydrated = useGameStore((s) => s.hydrated);
  useEffect(() => {
    if (!hydrated) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshDay();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [hydrated, refreshDay]);
  return null;
}

/** iOS only allows audio after a user gesture — unlock everything on the first tap. */
function AudioUnlocker() {
  useEffect(() => {
    const unlock = () => {
      voiceService.unlock();
      soundService.unlock();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock, { once: false });
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);
  return null;
}

const QUIET_ROUTES = [/^\/lesson\//, /^\/review\/practice/, /^\/play\//, /^\/emma\/.+/, /^\/welcome/];

/** Background music: menu screens only, ducked whenever Emma speaks or listens. */
function MusicDirector() {
  const enabled = useGameStore((s) => s.settings.music && s.hydrated);
  const pathname = usePathname();
  const { speaking, listening } = useVoiceStatus();
  const quiet = QUIET_ROUTES.some((r) => r.test(pathname));

  useEffect(() => {
    if (!enabled || quiet) {
      musicService.stop();
      return;
    }
    // Needs a user gesture on iOS; the first tap anywhere starts it.
    const start = () => musicService.start();
    start();
    window.addEventListener('pointerdown', start, { once: true });
    return () => window.removeEventListener('pointerdown', start);
  }, [enabled, quiet]);

  useEffect(() => {
    musicService.setDucked(speaking || listening);
  }, [speaking, listening]);

  useEffect(() => () => musicService.stop(), []);
  return null;
}

export function AppProviders({ capabilities, children }: { capabilities: Capabilities; children: ReactNode }) {
  return (
    <CapabilitiesContext.Provider value={capabilities}>
      <StoreHydrator />
      <ServicesBridge capabilities={capabilities} />
      <AudioUnlocker />
      <MusicDirector />
      <DayWatcher />
      {children}
      <CelebrationHost />
      <ChestOverlay />
    </CapabilitiesContext.Provider>
  );
}
