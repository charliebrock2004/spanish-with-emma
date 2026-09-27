'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { EmmaAvatar } from '@/components/emma/EmmaAvatar';
import { CoinIcon, FlameIcon } from '@/components/game-ui/icons';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { comboMultiplier, GAME_COIN_DAILY_CAP } from '@/lib/game/economy';
import { localDateKey } from '@/lib/progress/dates';
import { soundService } from '@/services/sound/SoundService';
import { useGameStore } from '@/store/gameStore';
import { cn } from '@/lib/utils';
import type { GameDef } from './catalog';

/** "+30" floating up from the score whenever it goes up. */
function ScorePop({ score }: { score: number }) {
  const [pop, setPop] = useState<{ id: number; delta: number } | null>(null);
  const previous = useRef(score);
  useEffect(() => {
    const delta = score - previous.current;
    previous.current = score;
    if (delta > 0) setPop((p) => ({ id: (p?.id ?? 0) + 1, delta }));
  }, [score]);
  if (!pop) return null;
  return (
    <span key={pop.id} className="pointer-events-none absolute -top-5 right-1 animate-rise text-sm font-black text-sage-dark" aria-hidden>
      +{pop.delta}
    </span>
  );
}

/** Frame for the arcade-style games: close button, progress/timer and score. */
export function GameShell({
  game,
  progress,
  timeLeft,
  score,
  combo,
  onClose,
  children,
}: {
  game: GameDef;
  /** 0–1: how far through the game (or how much time is left). */
  progress: number;
  /** Seconds left, for timed games. */
  timeLeft?: number;
  score: number;
  combo?: number;
  onClose: () => void;
  children: ReactNode;
}) {
  const urgent = timeLeft !== undefined && timeLeft <= 10;
  return (
    <div className="paper flex h-dvh flex-col overflow-hidden">
      <header className="safe-top">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="Leave game"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-cream-deep"
          >
            <Icon name="x" />
          </button>
          <div
            className="relative h-4 flex-1 overflow-hidden rounded-full bg-cream-deep"
            role="progressbar"
            aria-label={timeLeft !== undefined ? 'Time left' : 'Progress'}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
          >
            <div
              className={cn('h-full rounded-full transition-[width] duration-300 ease-out', urgent ? 'bg-brick' : 'bg-terracotta')}
              style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }}
            />
          </div>
          {timeLeft !== undefined && (
            <span className={cn('w-10 text-right text-sm font-black tabular-nums', urgent ? 'text-brick' : 'text-ink-soft')} aria-live="off">
              {Math.ceil(timeLeft)}s
            </span>
          )}
        </div>
        <div className="mx-auto flex max-w-xl items-center justify-between px-5 pt-3">
          <p className="flex items-center gap-2 font-extrabold">
            <span aria-hidden>{game.emoji}</span> {game.title}
          </p>
          <div className="flex items-center gap-2">
            {combo !== undefined && combo >= 3 && (
              <span
                className={cn(
                  'inline-flex animate-pop items-center gap-0.5 rounded-full px-2.5 py-1 text-xs font-black',
                  comboMultiplier(combo) >= 5 ? 'bg-terracotta text-white' : 'bg-sun text-ink',
                )}
                key={comboMultiplier(combo)}
                aria-label={`${combo} in a row: ${comboMultiplier(combo)} times points`}
              >
                <FlameIcon size={14} className="animate-flicker" /> ×{comboMultiplier(combo)}
              </span>
            )}
            <span className="relative rounded-full bg-paper px-3 py-1 text-sm font-black tabular-nums shadow-card" aria-live="polite">
              {score} <span className="sr-only">points</span>
              <ScorePop score={score} />
            </span>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-xl min-h-0 flex-1 flex-col px-5 pt-4 pb-6 safe-bottom">{children}</main>
    </div>
  );
}

/** 3 · 2 · 1 · ¡YA! before the game starts. */
export function CountdownScreen({ game, onDone }: { game: GameDef; onDone: () => void }) {
  const [step, setStep] = useState(3);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  useEffect(() => {
    soundService.play(step > 0 ? 'countdown' : 'go');
    const t = window.setTimeout(() => (step > 0 ? setStep(step - 1) : done.current()), step > 0 ? 650 : 450);
    return () => window.clearTimeout(t);
  }, [step]);
  return (
    <div className="paper grid min-h-dvh place-items-center safe-top safe-bottom" role="timer" aria-live="assertive">
      <div className="text-center">
        <p className="flex items-center justify-center gap-2 text-sm font-extrabold tracking-[0.2em] text-ink-soft uppercase">
          <span aria-hidden>{game.emoji}</span> {game.title}
        </p>
        <p key={step} className={cn('mt-4 animate-slam font-display leading-none font-semibold', step > 0 ? 'text-[120px] text-ink' : 'text-[88px] text-terracotta')}>
          {step > 0 ? step : '¡Ya!'}
        </p>
      </div>
    </div>
  );
}

/** "How to play" card with a big start button (also unlocks audio on iOS). */
export function GameIntro({ game, best, onStart, note }: { game: GameDef; best?: number; onStart: () => void; note?: ReactNode }) {
  const gameCoins = useGameStore((s) => (s.gameCoins.date === localDateKey() ? s.gameCoins.coins : 0));
  return (
    <div className="paper flex min-h-dvh flex-col safe-top safe-bottom">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pt-4">
        <ButtonLink href="/review" variant="ghost" size="sm" className="-ml-2 self-start" icon={<Icon name="arrowLeft" size={18} />}>
          Review
        </ButtonLink>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <span className={cn('grid h-24 w-24 animate-pop place-items-center rounded-[2rem] text-5xl shadow-card', game.tone)} aria-hidden>
            {game.emoji}
          </span>
          <h1 className="mt-5 font-display text-[34px] leading-tight font-semibold">{game.title}</h1>
          <p className="mt-2 max-w-xs text-ink-soft">{game.howTo}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {best !== undefined && best > 0 && (
              <span className="rounded-full bg-sun-light px-3.5 py-1.5 text-sm font-extrabold text-honey-dark">🏆 Your best: {best}</span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-cream-deep px-3.5 py-1.5 text-sm font-extrabold text-ink-soft">
              ×2 at 3 in a row · ×5 at 10
            </span>
          </div>
          <p className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-ink-faint">
            <CoinIcon size={14} /> Game coins today: {gameCoins}/{GAME_COIN_DAILY_CAP} — XP has no limit
          </p>
          {note}
        </div>
      </div>
      <div className="mx-auto w-full max-w-md px-6 pb-6">
        <Button size="lg" block onClick={onStart} icon={<Icon name="play" size={18} filled strokeWidth={0} />}>
          Start
        </Button>
      </div>
    </div>
  );
}

/** Honest "not yet" screen when there isn't enough to play with. */
export function GameLocked({ game, message, cta }: { game: GameDef; message: string; cta: { href: string; label: string } }) {
  return (
    <div className="paper flex min-h-dvh flex-col items-center justify-center px-6 text-center safe-top safe-bottom">
      <span className={cn('grid h-20 w-20 place-items-center rounded-[1.75rem] text-4xl grayscale', game.tone)} aria-hidden>
        {game.emoji}
      </span>
      <h1 className="mt-4 font-display text-[28px] leading-tight font-semibold">{game.title}</h1>
      <div className="mt-3 flex max-w-sm items-start gap-3 rounded-2xl bg-paper px-4 py-3 text-left shadow-card">
        <EmmaAvatar state="encouraging" size={40} animated={false} />
        <p className="text-[15px] text-ink-soft">{message}</p>
      </div>
      <div className="mt-6 w-full max-w-xs space-y-3">
        <ButtonLink href={cta.href} size="lg" block>
          {cta.label}
        </ButtonLink>
        <ButtonLink href="/review" size="md" variant="ghost" block>
          Back to review
        </ButtonLink>
      </div>
    </div>
  );
}
