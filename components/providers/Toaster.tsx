'use client';

import { useEffect } from 'react';
import { ACHIEVEMENTS_BY_ID } from '@/data/achievements';
import { useGameStore, type UiEvent } from '@/store/gameStore';
import { soundService } from '@/services/sound/SoundService';
import { XP } from '@/lib/progress/xp';

interface ToastContent {
  emoji: string;
  eyebrow: string;
  title: string;
  sound: 'achievement' | 'xp' | 'streak' | null;
}

function describe(event: UiEvent): ToastContent | null {
  switch (event.kind) {
    case 'achievement': {
      const def = ACHIEVEMENTS_BY_ID.get(event.achievementId);
      if (!def) return null;
      return { emoji: def.emoji, eyebrow: 'Achievement unlocked', title: def.title, sound: 'achievement' };
    }
    case 'daily-goal':
      return { emoji: '🎯', eyebrow: `Daily goal reached · +${XP.dailyGoal} XP`, title: '¡Objetivo cumplido! Lovely work today.', sound: 'xp' };
    case 'streak': {
      const { update } = event;
      if (update.event === 'saved') {
        return {
          emoji: '❄️',
          eyebrow: 'Streak saved',
          title: `A streak freeze kept your ${update.state.current}-day streak alive.`,
          sound: 'streak',
        };
      }
      if (update.earnedFreeze) {
        return { emoji: '❄️', eyebrow: 'Streak freeze earned', title: 'Miss a day and it keeps your streak safe.', sound: 'streak' };
      }
      // Starting/extending a streak is shown on the completion screen itself.
      return null;
    }
  }
}

export function Toaster() {
  const event = useGameStore((s) => (s.toastsPaused ? undefined : s.events[0]));
  const shiftEvent = useGameStore((s) => s.shiftEvent);
  const content = event ? describe(event) : null;

  useEffect(() => {
    if (!event) return;
    if (!content) {
      shiftEvent();
      return;
    }
    if (content.sound) soundService.play(content.sound);
    const t = window.setTimeout(shiftEvent, 3400);
    return () => window.clearTimeout(t);
  }, [event, content, shiftEvent]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex justify-center px-4 safe-top" aria-live="polite">
      {event && content && (
        <button
          key={event.id}
          type="button"
          onClick={shiftEvent}
          className="pointer-events-auto mt-2 flex w-full max-w-sm animate-pop items-center gap-3 rounded-2xl border border-sun/60 bg-paper px-4 py-3 text-left shadow-lift"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sun-light text-2xl" aria-hidden>
            {content.emoji}
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-extrabold tracking-wide text-honey-dark uppercase">{content.eyebrow}</span>
            <span className="block font-bold text-ink">{content.title}</span>
          </span>
        </button>
      )}
    </div>
  );
}
