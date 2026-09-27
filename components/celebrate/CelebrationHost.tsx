'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { EmmaAvatar } from '@/components/emma/EmmaAvatar';
import { EmmaFullBody } from '@/components/emma/EmmaFigure';
import { emmaLine } from '@/components/emma/lines';
import { ChestIcon, FlameIcon } from '@/components/game-ui/icons';
import { LevelBadge, RewardChips } from '@/components/game-ui/parts';
import { ItemPreview } from '@/components/shop/ItemPreview';
import { Button } from '@/components/ui/Button';
import { Confetti } from '@/components/ui/Confetti';
import { ACHIEVEMENTS_BY_ID } from '@/data/achievements';
import { ITEMS_BY_ID } from '@/data/shop';
import { CHESTS } from '@/lib/game/chests';
import { soundService, type SoundName } from '@/services/sound/SoundService';
import { voiceService } from '@/services/voice/VoiceService';
import { useGameStore, type UiEvent } from '@/store/gameStore';
import { useUiStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';

// ─── Toasts ────────────────────────────────────────────────────────────────

interface ToastContent {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  reward?: { xp?: number; coins?: number };
  sound: SoundName | null;
  action?: { label: string; run: () => void };
  /** Stays up longer (has an action). */
  long?: boolean;
}

const TIER_MEDAL = { 1: 'from-[#e8b48a] to-[#b0602e]', 2: 'from-[#eef2f5] to-[#9fb0bd]', 3: 'from-[#ffe08a] to-[#c9962a]' } as const;

function emojiIcon(emoji: string, tone = 'bg-sun-light') {
  return (
    <span className={cn('grid h-11 w-11 place-items-center rounded-xl text-2xl', tone)} aria-hidden>
      {emoji}
    </span>
  );
}

function describe(event: UiEvent): ToastContent | null {
  switch (event.kind) {
    case 'achievement': {
      const def = ACHIEVEMENTS_BY_ID.get(event.achievementId);
      if (!def) return null;
      return {
        icon: (
          <span className={cn('grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br text-2xl shadow-card', TIER_MEDAL[def.tier])} aria-hidden>
            {def.emoji}
          </span>
        ),
        eyebrow: 'Achievement unlocked',
        title: def.title,
        reward: { coins: event.coins },
        sound: 'achievement',
      };
    }
    case 'daily-goal':
      return { icon: emojiIcon('🎯', 'bg-sage-light'), eyebrow: 'Daily goal reached', title: '¡Objetivo cumplido! Lovely work today.', reward: event.reward, sound: 'reward' };
    case 'quest':
      return { icon: emojiIcon(event.quest.emoji), eyebrow: 'Quest complete', title: event.quest.title, reward: event.quest.reward, sound: 'quest' };
    case 'chest':
      return {
        icon: <ChestIcon size={44} />,
        eyebrow: 'Chest earned',
        title: `${CHESTS[event.chestKind].name} — tap to open`,
        sound: 'reward',
        long: true,
        action: { label: 'Open', run: () => useUiStore.getState().openChest(event.chestId) },
      };
    case 'item': {
      const item = ITEMS_BY_ID.get(event.itemId);
      if (!item) return null;
      return { icon: <ItemPreview item={item} size={44} />, eyebrow: 'New item unlocked', title: item.name, sound: 'reward' };
    }
    case 'welcome-back':
      return { icon: <EmmaAvatar state="happy" size={44} animated={false} decorative />, eyebrow: 'Welcome back', title: emmaLine('welcomeBack'), reward: event.reward, sound: 'reward' };
    case 'streak': {
      const { update } = event;
      if (update.event === 'saved') {
        return { icon: emojiIcon('❄️', 'bg-sky-light'), eyebrow: 'Streak saved', title: `A streak freeze kept your ${update.state.current}-day streak alive.`, sound: 'streak' };
      }
      if (update.earnedFreeze) {
        return { icon: emojiIcon('❄️', 'bg-sky-light'), eyebrow: 'Streak freeze earned', title: 'Miss a day and it keeps your streak safe.', sound: 'streak' };
      }
      return null;
    }
    default:
      return null;
  }
}

function Toast({ content, queued, onDone }: { content: ToastContent; queued: number; onDone: () => void }) {
  // A busy queue moves along a little faster.
  const [ms] = useState(() => (content.long ? 5200 : queued > 3 ? 2200 : 3400));
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  useEffect(() => {
    if (content.sound) soundService.play(content.sound);
    const t = window.setTimeout(() => done.current(), ms);
    return () => window.clearTimeout(t);
  }, [content, ms]);

  return (
    <div className="pointer-events-auto mt-2 flex w-full max-w-sm animate-pop items-center gap-3 rounded-2xl border border-sun/60 bg-paper px-3.5 py-3 text-left shadow-lift" data-testid="toast">
      <button type="button" onClick={onDone} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`${content.eyebrow}: ${content.title}. Dismiss`}>
        <span className="shrink-0">{content.icon}</span>
        <span className="min-w-0">
          <span className="block text-xs font-extrabold tracking-wide text-honey-dark uppercase">{content.eyebrow}</span>
          <span className="block leading-snug font-bold text-ink">{content.title}</span>
          {content.reward && (content.reward.xp || content.reward.coins) ? <RewardChips {...content.reward} size="sm" className="mt-1" /> : null}
        </span>
      </button>
      {content.action && (
        <Button
          size="sm"
          onClick={() => {
            content.action!.run();
            onDone();
          }}
        >
          {content.action.label}
        </Button>
      )}
    </div>
  );
}

// ─── Big moments ───────────────────────────────────────────────────────────

type MomentEvent = Extract<UiEvent, { kind: 'level-up' | 'streak-milestone' | 'weekly' }>;

const isMoment = (e: UiEvent): e is MomentEvent => e.kind === 'level-up' || e.kind === 'streak-milestone' || e.kind === 'weekly';

function UnlockedItems({ ids }: { ids: string[] }) {
  const items = ids.map((id) => ITEMS_BY_ID.get(id)).filter((i) => i !== undefined);
  if (items.length === 0) return null;
  return (
    <div className="mt-4 space-y-2">
      {items.map((item) => (
        <div key={item.id} className="mx-auto flex max-w-xs animate-pop items-center gap-3 rounded-2xl bg-white/15 px-3 py-2.5 text-left [animation-delay:500ms]">
          <ItemPreview item={item} size={52} />
          <span>
            <span className="block text-xs font-extrabold tracking-wide text-sun uppercase">Unlocked</span>
            <span className="block font-extrabold">{item.name}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function Moment({ event, onDone }: { event: MomentEvent; onDone: () => void }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [line] = useState(() => (event.kind === 'level-up' ? emmaLine('levelUp') : event.kind === 'streak-milestone' ? event.milestone.line : emmaLine('todayDone')));
  const chestId = event.kind === 'weekly' ? null : event.chestId;

  useEffect(() => {
    soundService.play(event.kind === 'level-up' ? 'levelUp' : 'record');
    const focus = window.setTimeout(() => buttonRef.current?.focus({ preventScroll: true }), 400);
    // Emma says the big ones out loud.
    const say = event.kind === 'level-up' ? null : window.setTimeout(() => void voiceService.say(line.replace(/¡[^!]*!/, (m) => `*${m}*`), { style: 'excited' }), 700);
    return () => {
      window.clearTimeout(focus);
      if (say) window.clearTimeout(say);
    };
  }, [event, line]);

  let eyebrow: string;
  let hero: ReactNode;
  let title: string;
  let reward: { xp?: number; coins?: number };
  let items: string[] = [];
  let background = 'from-terracotta to-brick';
  if (event.kind === 'level-up') {
    eyebrow = 'Level up!';
    hero = <LevelBadge level={event.level} progress={1} size={132} className="animate-slam shadow-lift" />;
    title = `You reached level ${event.level}`;
    reward = { coins: event.coins };
    items = event.items;
  } else if (event.kind === 'streak-milestone') {
    eyebrow = `${event.milestone.days} day streak`;
    hero = <FlameIcon size={132} className="animate-slam drop-shadow-xl" />;
    title = event.milestone.title;
    reward = { xp: event.milestone.xp, coins: event.milestone.coins };
    items = event.items;
    background = 'from-[#e2552f] to-[#8a2f22]';
  } else {
    eyebrow = 'Weekly challenge complete';
    hero = <span className="animate-slam text-[112px] leading-none drop-shadow-xl">🏅</span>;
    title = event.title;
    reward = event.reward;
    items = event.item ? [event.item] : [];
    background = 'from-[#2f8a6f] to-[#1b4f40]';
  }

  return (
    <div
      className={cn('fixed inset-0 z-[75] flex animate-fade flex-col items-center overflow-y-auto bg-gradient-to-b px-6 pt-10 pb-8 text-center text-white safe-top safe-bottom', background)}
      role="dialog"
      aria-modal="true"
      aria-label={`${eyebrow}. ${title}`}
    >
      <Confetti intensity={160} origin={0.28} className="z-[76]" />
      <p className="text-sm font-extrabold tracking-[0.24em] text-white/85 uppercase">{eyebrow}</p>
      <div className="mt-5 grid place-items-center">{hero}</div>
      <h1 className="mt-5 font-display text-[34px] leading-[1.05] font-semibold">{title}</h1>
      <RewardChips {...reward} size="lg" className="mt-4 justify-center" />
      <UnlockedItems ids={items} />
      {chestId && (
        <p className="mx-auto mt-4 flex max-w-xs items-center justify-center gap-2 rounded-2xl bg-white/15 px-3 py-2 font-extrabold">
          <ChestIcon size={36} tone="gold" /> + a chest to open
        </p>
      )}
      <div className="mt-auto flex w-full max-w-sm flex-col items-center pt-6">
        <div className="flex items-end gap-3">
          <EmmaFullBody height={240} celebrating className="max-h-[32dvh] w-auto drop-shadow-xl" />
          <p className="mb-8 max-w-[12rem] rounded-3xl rounded-bl-md bg-paper px-4 py-3 text-left text-[15px] leading-snug font-bold text-ink shadow-card">{line}</p>
        </div>
        {chestId ? (
          <div className="mt-4 w-full space-y-2">
            <Button
              ref={buttonRef}
              variant="secondary"
              size="lg"
              block
              onClick={() => {
                useUiStore.getState().openChest(chestId);
                onDone();
              }}
            >
              Open the chest
            </Button>
            <Button variant="ghost" size="md" block className="!text-white/80" onClick={onDone}>
              Later
            </Button>
          </div>
        ) : (
          <Button ref={buttonRef} variant="secondary" size="lg" block className="mt-4" onClick={onDone}>
            ¡Vamos!
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Host ──────────────────────────────────────────────────────────────────

/** Shows queued rewards one at a time: small ones as toasts, big ones full screen. */
export function CelebrationHost() {
  const paused = useGameStore((s) => s.toastsPaused);
  const event = useGameStore((s) => s.events[0]);
  const queued = useGameStore((s) => s.events.length);
  const shiftEvent = useGameStore((s) => s.shiftEvent);
  const chestOpen = useUiStore((s) => s.chestId !== null);
  const active = event && !paused && !chestOpen ? event : undefined;
  const content = useMemo(() => (active && !isMoment(active) ? describe(active) : null), [active]);

  useEffect(() => {
    // Nothing to show for this event (e.g. an ordinary streak extension) — move on.
    if (active && !isMoment(active) && !content) shiftEvent();
  }, [active, content, shiftEvent]);

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex justify-center px-4 safe-top" aria-live="polite">
        {active && content && <Toast key={active.id} content={content} queued={queued} onDone={shiftEvent} />}
      </div>
      {active && isMoment(active) && <Moment key={active.id} event={active} onDone={shiftEvent} />}
    </>
  );
}
