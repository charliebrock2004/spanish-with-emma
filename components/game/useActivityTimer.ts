'use client';

import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';

const TICK_SECONDS = 5;
const IDLE_AFTER_MS = 60_000;

/**
 * Counts genuine learning time towards the daily goal: only while the screen
 * is visible and the player has interacted in the last minute.
 */
export function useActivityTimer(active: boolean) {
  const addLearningTime = useGameStore((s) => s.addLearningTime);
  const lastInteraction = useRef(0);

  useEffect(() => {
    if (!active) return;
    lastInteraction.current = Date.now();
    const mark = () => {
      lastInteraction.current = Date.now();
    };
    const events = ['pointerdown', 'keydown', 'touchstart'] as const;
    events.forEach((e) => window.addEventListener(e, mark, { passive: true }));
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastInteraction.current > IDLE_AFTER_MS) return;
      addLearningTime(TICK_SECONDS);
    }, TICK_SECONDS * 1000);
    return () => {
      window.clearInterval(timer);
      events.forEach((e) => window.removeEventListener(e, mark));
    };
  }, [active, addLearningTime]);
}
