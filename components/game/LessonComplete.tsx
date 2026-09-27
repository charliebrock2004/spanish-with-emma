'use client';

import { useEffect, useState } from 'react';
import { EmmaBubble, SceneBackdrop, sceneFor, useEquipped } from '@/components/cosmetics/cosmetics';
import { EmmaFullBody } from '@/components/emma/EmmaFigure';
import { emmaLine } from '@/components/emma/lines';
import { ChestIcon, CoinIcon, FlameIcon, XpIcon } from '@/components/game-ui/icons';
import { LevelBadge, StarRating, XpBar } from '@/components/game-ui/parts';
import { DailyQuestList, TomorrowPreview } from '@/components/quests/QuestParts';
import { Button } from '@/components/ui/Button';
import { Confetti } from '@/components/ui/Confetti';
import { AnimatedNumber } from '@/components/ui/primitives';
import { REGIONS } from '@/data/regions';
import type { Reward, RewardLine, Stars } from '@/lib/game/economy';
import { playerLevelFromXp } from '@/lib/game/levels';
import { allQuestsDone } from '@/lib/game/quests';
import type { StreakUpdate } from '@/lib/progress/streak';
import { soundService } from '@/services/sound/SoundService';
import { voiceService } from '@/services/voice/VoiceService';
import { useGameStore } from '@/store/gameStore';
import { useUiStore } from '@/store/uiStore';
import type { LevelMeta } from '@/types/curriculum';
import { cn, formatNumber } from '@/lib/utils';

export interface CompletionSummary {
  title: string;
  heading?: string;
  lines: RewardLine[];
  total: Reward;
  accuracy: number;
  seconds: number;
  perfect: boolean;
  /** Lessons only. */
  stars?: Stars;
  firstPerfect?: boolean;
  streak?: StreakUpdate;
  words: Array<{ spanish: string; english: string }>;
  xpBefore: number;
  xpAfter: number;
  chestId?: string | null;
  bestCombo?: number;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
}

function streakText(update: StreakUpdate) {
  const n = update.state.current;
  switch (update.event) {
    case 'started':
      return 'Your streak starts today!';
    case 'restarted':
      return 'A fresh streak — day one. Welcome back!';
    case 'saved':
      return 'Saved by a streak freeze — phew!';
    case 'extended':
      return n >= 7 ? 'Incredible consistency.' : 'Come back tomorrow to keep it going.';
    default:
      return "You've already practised today.";
  }
}

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('reduce-motion'));

/** The level bar fills from where the session started to where it ended — through any level-ups. */
export function LevelProgressBar({ from, to, delay = 500, className }: { from: number; to: number; delay?: number; className?: string }) {
  const [xp, setXp] = useState(from);
  useEffect(() => {
    let frame = 0;
    const start = performance.now() + delay;
    const duration = 1500;
    const step = (now: number) => {
      if (reducedMotion()) {
        setXp(to);
        return;
      }
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      setXp(Math.round(from + (to - from) * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [from, to, delay]);
  const level = playerLevelFromXp(xp);
  const levelsGained = playerLevelFromXp(to).level - playerLevelFromXp(from).level;
  return (
    <div className={cn('flex items-center gap-3 rounded-2xl bg-paper px-4 py-3 shadow-card', className)}>
      <LevelBadge key={level.level} level={level.level} progress={level.progress} size={46} className={cn(xp !== from && 'animate-pop')} />
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline justify-between text-sm font-extrabold">
          <span>{levelsGained > 0 ? `Level up! ${playerLevelFromXp(from).level} → ${playerLevelFromXp(to).level}` : `Level ${level.level}`}</span>
          <span className="text-xs tabular-nums text-ink-soft">{level.maxed ? 'MAX' : `${formatNumber(level.xpInto)} / ${formatNumber(level.xpForNext)} XP`}</span>
        </p>
        <XpBar progress={level.progress} className="mt-2 h-3 [&>div]:transition-none" />
      </div>
    </div>
  );
}

/** Region complete: a new city opens on the map. */
export function LevelUpCelebration({ completed, next, onContinue }: { completed: LevelMeta; next: LevelMeta | null; onContinue: () => void }) {
  const done = REGIONS[completed.id];
  const opened = next ? REGIONS[next.id] : null;
  useEffect(() => {
    soundService.play('levelUp');
    const line = opened ? `*¡Enhorabuena!* You've finished ${done.name}. ${opened.welcome}` : "*¡Enhorabuena!* You've finished the whole journey. I'm so proud of you.";
    const t = window.setTimeout(() => void voiceService.say(line, { style: 'excited' }), 600);
    return () => window.clearTimeout(t);
  }, [done, opened]);

  return (
    <div className="fixed inset-0 z-40 flex animate-fade flex-col items-center justify-between overflow-hidden bg-gradient-to-b from-terracotta to-brick px-6 pt-12 pb-8 text-center text-white safe-top safe-bottom">
      <Confetti intensity={170} origin={0.3} />
      <div className="animate-pop">
        <p className="text-sm font-extrabold tracking-[0.22em] text-white/80 uppercase">
          Level {completed.id} complete · {done.name}
        </p>
        <p className="mt-3 text-6xl" aria-hidden>
          {done.landmark}
          {opened && <span className="mx-3 text-4xl text-white/70">→</span>}
          {opened?.landmark}
        </p>
        <h1 className="mt-4 font-display text-[40px] leading-[1.05] font-semibold">¡Enhorabuena!</h1>
        <p className="mx-auto mt-3 max-w-xs text-lg text-white/90">
          {next && opened ? (
            <>
              <strong>{opened.name}</strong> is open on your map — Level {next.id}: {next.title}.
            </>
          ) : (
            <>You&rsquo;ve completed the whole journey — from ¡hola! in Madrid to Santiago.</>
          )}
        </p>
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-sun px-4 py-1.5 font-black text-ink">
          +100 <XpIcon size={18} /> +100 <CoinIcon size={18} /> + a milestone chest
        </p>
      </div>
      <EmmaFullBody height={260} celebrating className="relative my-4 max-h-[36dvh] w-auto drop-shadow-xl" />
      <Button variant="secondary" size="lg" block className="max-w-sm" onClick={onContinue}>
        Continue
      </Button>
    </div>
  );
}

/** Results for a lesson or a review: stars, rewards, level progress, streak and today's quests. */
export function LessonComplete({
  summary,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  emmaSays,
}: {
  summary: CompletionSummary;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Emma's line (defaults to a lesson-complete line). */
  emmaSays?: string;
}) {
  const [line] = useState(() => emmaSays ?? (summary.perfect ? emmaLine('perfectLesson') : emmaLine('lessonDone')));
  const [doneLine] = useState(() => emmaLine('todayDone'));
  const setToastsPaused = useGameStore((s) => s.setToastsPaused);
  const quests = useGameStore((s) => s.quests);
  const chest = useGameStore((s) => (summary.chestId ? s.chests.find((c) => c.id === summary.chestId) : undefined));
  const openChest = useUiStore((s) => s.openChest);
  const equipped = useEquipped();
  const dark = sceneFor(equipped.background).tone === 'dark';
  const todayDone = allQuestsDone(quests);

  useEffect(() => {
    soundService.play(summary.perfect ? 'record' : 'complete');
    const coin = window.setTimeout(() => soundService.play('coin'), 900);
    const s = window.setTimeout(() => void voiceService.say(line.replace(/¡[^!]*!/, (m) => `*${m}*`), { style: summary.perfect ? 'excited' : 'cheerful' }), 900);
    // Let the results land before quest toasts and level-ups join in.
    setToastsPaused(true);
    const resume = window.setTimeout(() => setToastsPaused(false), 2600);
    return () => {
      window.clearTimeout(coin);
      window.clearTimeout(s);
      window.clearTimeout(resume);
      setToastsPaused(false);
    };
  }, [line, summary.perfect, setToastsPaused]);

  const accuracy = Math.round(summary.accuracy * 100);

  return (
    <div className="paper flex min-h-dvh flex-col">
      <Confetti intensity={summary.perfect ? 160 : 90} />
      {/* Stage */}
      <section className="relative overflow-hidden px-5 pt-4 pb-5 safe-top">
        <SceneBackdrop id={equipped.background} />
        <div className="relative mx-auto flex max-w-xl items-end gap-3">
          <EmmaFullBody height={200} celebrating priority className="w-auto shrink-0 drop-shadow-lg" />
          <div className="mb-8 min-w-0 flex-1">
            <EmmaBubble className="animate-pop">
              <p className="text-[17px] leading-snug font-bold">{line}</p>
            </EmmaBubble>
            {summary.stars && (
              <div className="mt-3 flex justify-center">
                <StarRating stars={summary.stars} size={36} animated className="drop-shadow" />
              </div>
            )}
          </div>
        </div>
        {summary.perfect && summary.stars === 3 && (
          <span className={cn('absolute top-4 right-4 animate-slam rounded-xl border-4 px-3 py-1 font-display text-xl font-semibold tracking-wider uppercase [animation-delay:1.2s] rotate-[8deg]', dark ? 'border-sun text-sun' : 'border-terracotta text-terracotta')}>
            Perfect
          </span>
        )}
      </section>

      <div className="mx-auto w-full max-w-xl flex-1 px-5 pt-4 pb-4">
        <h1 className="font-display text-[32px] leading-tight font-semibold">{summary.heading ?? (summary.perfect ? 'Perfect lesson!' : 'Lesson complete!')}</h1>
        <p className="text-ink-soft">{summary.title}</p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-sun-light px-2 py-3 text-center">
            <p className="flex items-center justify-center gap-1 text-xs font-extrabold tracking-wide text-honey-dark uppercase">
              <XpIcon size={14} /> XP
            </p>
            <p className="mt-1 text-2xl font-black">
              +<AnimatedNumber value={summary.total.xp} duration={1400} />
            </p>
          </div>
          <div className="rounded-2xl bg-[#fff4d6] px-2 py-3 text-center">
            <p className="flex items-center justify-center gap-1 text-xs font-extrabold tracking-wide text-[#8f5d0f] uppercase">
              <CoinIcon size={14} /> Coins
            </p>
            <p className="mt-1 text-2xl font-black">
              +<AnimatedNumber value={summary.total.coins} duration={1400} />
            </p>
          </div>
          <div className="rounded-2xl bg-sage-light px-2 py-3 text-center">
            <p className="text-xs font-extrabold tracking-wide text-sage-dark uppercase">Accuracy</p>
            <p className="mt-1 text-2xl font-black">{accuracy}%</p>
          </div>
        </div>

        <ul className="mt-3 divide-y divide-sand/60 rounded-2xl bg-paper px-4 shadow-card" aria-label="Rewards">
          {summary.lines.map((row, i) => (
            <li key={row.label} className="flex animate-enter items-center justify-between gap-3 py-2.5" style={{ animationDelay: `${300 + i * 140}ms` }}>
              <span className="font-bold text-ink-soft">{row.label}</span>
              <span className="flex items-center gap-2 font-black">
                {row.xp > 0 && <span className="text-honey-dark">+{row.xp} XP</span>}
                {row.coins > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[#8f5d0f]">
                    +{row.coins} <CoinIcon size={15} />
                  </span>
                )}
              </span>
            </li>
          ))}
          <li className="flex items-center justify-between gap-3 py-2.5 text-sm text-ink-soft">
            <span>
              ⏱ {formatTime(summary.seconds)}
              {summary.bestCombo && summary.bestCombo >= 3 ? ` · best combo ${summary.bestCombo} in a row` : ''}
            </span>
          </li>
        </ul>

        <LevelProgressBar from={summary.xpBefore} to={summary.xpAfter} className="mt-3" />

        {chest && !chest.openedAt && (
          <div className="mt-3 flex items-center gap-3 rounded-2xl bg-sun-light px-4 py-3">
            <ChestIcon size={44} tone="gold" className="animate-chest-shake" />
            <span className="min-w-0 flex-1 font-extrabold">You earned a chest!</span>
            <Button size="sm" onClick={() => openChest(chest.id)}>
              Open
            </Button>
          </div>
        )}

        {summary.streak && (
          <div className="mt-3 flex items-center gap-3 rounded-2xl bg-terracotta-light/70 px-4 py-3">
            <FlameIcon size={34} className={cn(summary.streak.event === 'extended' && 'animate-flicker')} />
            <div>
              <p className="font-extrabold">{summary.streak.state.current} day streak</p>
              <p className="text-sm text-ink-soft">{streakText(summary.streak)}</p>
            </div>
          </div>
        )}

        {quests && (
          <section className="mt-4 rounded-2xl bg-paper px-4 py-3 shadow-card" aria-label="Today's quests">
            {todayDone ? (
              <>
                <p className="text-center font-display text-2xl font-semibold text-sage-dark">Today complete ✓</p>
                <p className="mt-1 text-center text-sm text-ink-soft">{doneLine}</p>
                <TomorrowPreview className="mt-3" />
              </>
            ) : (
              <>
                <p className="text-xs font-extrabold tracking-[0.14em] text-ink-soft uppercase">Today&rsquo;s quests</p>
                <DailyQuestList daily={quests} compact />
              </>
            )}
          </section>
        )}

        {summary.words.length > 0 && (
          <div className="mt-5">
            <p className="text-sm font-extrabold text-ink-soft">Words you practised</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {summary.words.slice(0, 12).map((w) => (
                <span key={w.spanish} className="rounded-full bg-paper px-3 py-1.5 text-sm shadow-card" title={w.english}>
                  <span lang="es" className="font-bold text-brick">
                    {w.spanish}
                  </span>{' '}
                  <span className="text-ink-faint">· {w.english}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="sticky bottom-0 mx-auto w-full max-w-xl space-y-2 bg-cream/95 px-5 pt-3 backdrop-blur safe-bottom">
        <Button size="lg" block onClick={onPrimary}>
          {primaryLabel}
        </Button>
        {secondaryLabel && onSecondary && (
          <Button variant="ghost" size="md" block onClick={onSecondary}>
            {secondaryLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
