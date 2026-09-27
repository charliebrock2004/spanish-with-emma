'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { EmmaPortrait } from '@/components/emma/EmmaFigure';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { AnimatedNumber, Card, ProgressBar, ProgressRing } from '@/components/ui/primitives';
import { computeJourney } from '@/lib/progress/journey';
import { localDateKey } from '@/lib/progress/dates';
import { reviewQueue } from '@/lib/progress/srs';
import { streakStatus } from '@/lib/progress/streak';
import { useGameStore } from '@/store/gameStore';
import { useNow } from '@/lib/hooks/useNow';
import type { LessonSummary, LevelMeta } from '@/types/curriculum';
import { cn } from '@/lib/utils';

function greetingForHour(hour: number) {
  if (hour >= 5 && hour < 13) return { es: '¡Buenos días!', en: 'Ready for a little Spanish before the day gets going?' };
  if (hour >= 13 && hour < 20) return { es: '¡Buenas tardes!', en: "Perfect time for a quick lesson — I'll keep it fun." };
  return { es: '¡Buenas noches!', en: 'One more lesson before bed? Your brain will thank you.' };
}

function StatTile({ emoji, value, label, tone }: { emoji: string; value: React.ReactNode; label: string; tone: string }) {
  return (
    <div className={cn('flex flex-col items-start rounded-2xl px-3 py-3', tone)}>
      <span className="text-xl leading-none" aria-hidden>
        {emoji}
      </span>
      <span className="mt-2 text-2xl leading-none font-black tabular-nums">{value}</span>
      <span className="mt-1 text-xs leading-tight font-bold text-ink-soft">{label}</span>
    </div>
  );
}

export function HomeScreen({ lessons, levels }: { lessons: LessonSummary[]; levels: LevelMeta[] }) {
  const name = useGameStore((s) => s.profile.name);
  const placement = useGameStore((s) => s.profile.placementLevel);
  const completed = useGameStore((s) => s.completedLessons);
  const xp = useGameStore((s) => s.xp);
  const streak = useGameStore((s) => s.streak);
  const activity = useGameStore((s) => s.activity);
  const goalMinutes = useGameStore((s) => s.settings.dailyGoalMinutes);
  const vocab = useGameStore((s) => s.vocab);

  const today = localDateKey();
  const journey = useMemo(() => computeJourney(lessons, completed, placement), [lessons, completed, placement]);
  const status = streakStatus(streak, today);
  const minutesToday = Math.floor((activity[today]?.seconds ?? 0) / 60);
  const now = useNow();
  const dueCount = useMemo(() => (now ? reviewQueue(vocab, now, { limit: 99 }).length : 0), [vocab, now]);
  const greeting = greetingForHour(new Date().getHours());

  const level = journey.levels.find((l) => l.level === journey.currentLevel) ?? journey.levels[0];
  const meta = levels.find((l) => l.id === journey.currentLevel);
  const lessonsLeft = Math.max(0, level.total - level.done);
  const pct = level.total ? Math.round((level.done / level.total) * 100) : 0;
  const next = journey.current;

  const streakMessage = status.activeToday
    ? "You've practised today — ¡genial!"
    : status.lapsed || status.display === 0
      ? 'Start a new streak today 🔥'
      : 'Keep your streak alive!';

  return (
    <div className="mx-auto w-full max-w-2xl px-4 safe-top md:pt-8">
      {/* Top bar */}
      <div className="flex items-center justify-between py-3 md:hidden">
        <p className="font-display text-lg font-semibold">
          Spanish <span className="text-terracotta italic">with</span> Emma
        </p>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-paper px-3 py-1.5 text-sm font-extrabold shadow-card">
            <span aria-hidden>🔥</span>
            <span className="tabular-nums">{status.display}</span>
            <span className="sr-only">day streak</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-paper px-3 py-1.5 text-sm font-extrabold shadow-card">
            <span aria-hidden>⭐</span>
            <AnimatedNumber value={xp} />
            <span className="sr-only">XP</span>
          </span>
        </div>
      </div>

      {/* Emma greeting */}
      <section className="relative mt-1 min-h-[212px] animate-enter overflow-hidden rounded-[2rem] bg-gradient-to-br from-sun-light via-[#fbeede] to-terracotta-light px-5 pt-6 pb-5">
        <div className="relative z-10 max-w-[58%]">
          <h1 className="font-display text-[34px] leading-[1.05] font-semibold tracking-tight">
            Hola {name || 'amigo'} <span className="inline-block origin-bottom-right animate-tilt">👋</span>
          </h1>
          <p className="mt-3 text-[15px] leading-snug text-ink-soft">
            <span lang="es" className="spanish">
              {greeting.es}
            </span>{' '}
            {greeting.en}
          </p>
        </div>
        <EmmaPortrait state="happy" width={190} priority className="pointer-events-none absolute -right-3 -bottom-24 w-[46%] max-w-[220px]" />
      </section>

      {/* Today */}
      <Card className="mt-4 animate-enter p-5 [animation-delay:60ms]">
        <h2 className="font-display text-xl font-semibold">Today&rsquo;s Spanish</h2>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <StatTile emoji="🔥" value={status.display} label={status.display === 1 ? 'day streak' : 'day streak'} tone="bg-terracotta-light/70" />
          <StatTile emoji="⭐" value={<AnimatedNumber value={xp} />} label="XP earned" tone="bg-sun-light" />
          <StatTile
            emoji="🎯"
            value={journey.finished ? '✓' : lessonsLeft}
            label={journey.finished ? 'journey done' : lessonsLeft === 1 ? `lesson to Level ${Math.min(6, journey.currentLevel + 1)}` : `lessons to Level ${Math.min(6, journey.currentLevel + 1)}`}
            tone="bg-sage-light"
          />
        </div>

        <div className="mt-4 flex items-center gap-4 rounded-2xl bg-cream px-4 py-3">
          <ProgressRing value={minutesToday / goalMinutes} size={58} stroke={7} label="Daily goal progress" tone="var(--color-sage)">
            <span className="text-sm font-black tabular-nums">{Math.min(minutesToday, 99)}</span>
          </ProgressRing>
          <div className="min-w-0">
            <p className="font-extrabold">
              {Math.min(minutesToday, goalMinutes)} / {goalMinutes} min today
            </p>
            <p className="text-sm text-ink-soft">{minutesToday >= goalMinutes ? 'Daily goal done — ¡fenomenal!' : streakMessage}</p>
          </div>
        </div>

        {next ? (
          <ButtonLink href={`/lesson/${next.id}`} size="lg" block className="mt-5" icon={<Icon name="play" size={18} filled strokeWidth={0} />}>
            {Object.keys(completed).length === 0 ? 'Start learning' : 'Continue lesson'}
          </ButtonLink>
        ) : (
          <ButtonLink href="/emma" size="lg" block className="mt-5">
            Talk to Emma
          </ButtonLink>
        )}
      </Card>

      {/* Journey */}
      <Card className="mt-4 animate-enter p-5 [animation-delay:120ms]">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Your journey</h2>
          <Link href="/learn" className="inline-flex min-h-11 items-center gap-1 text-sm font-extrabold text-terracotta">
            Map <Icon name="chevronRight" size={16} />
          </Link>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-cream-deep text-2xl" aria-hidden>
            {meta?.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold tracking-[0.12em] text-terracotta uppercase">Level {journey.currentLevel}</p>
            <p className="font-display text-lg leading-tight font-semibold">{meta?.title}</p>
          </div>
          <span className="text-lg font-black tabular-nums">{pct}%</span>
        </div>
        <ProgressBar value={level.done} max={level.total} label={`Level ${journey.currentLevel} progress`} className="mt-3" />

        {next && (
          <Link
            href={`/lesson/${next.id}`}
            className="mt-4 flex items-center gap-3 rounded-2xl border-2 border-sand px-3 py-3 transition-colors hover:bg-cream active:bg-cream"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-terracotta-light text-2xl" aria-hidden>
              {next.emoji}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold text-ink-soft">Next lesson</span>
              <span className="block truncate font-extrabold">{next.title}</span>
              <span className="block text-xs text-ink-faint">
                {next.estimatedMinutes} min · up to {next.xpReward} XP
              </span>
            </span>
            <Icon name="chevronRight" className="text-ink-faint" />
          </Link>
        )}
      </Card>

      {/* Quick actions */}
      <div className="mt-4 grid animate-enter grid-cols-2 gap-3 [animation-delay:180ms]">
        <Link href="/emma" className="group rounded-[var(--radius-card)] bg-ink p-4 text-cream shadow-card transition-transform active:scale-[0.98]">
          <span className="text-2xl" aria-hidden>
            💬
          </span>
          <span className="mt-3 block font-extrabold">Talk to Emma</span>
          <span className="block text-sm text-cream/70">Practise real conversation</span>
        </Link>
        <Link href="/review" className="group rounded-[var(--radius-card)] border border-sand/70 bg-paper p-4 shadow-card transition-transform active:scale-[0.98]">
          <span className="text-2xl" aria-hidden>
            📚
          </span>
          <span className="mt-3 block font-extrabold">Review</span>
          <span className="block text-sm text-ink-soft">
            {dueCount > 0 ? `${dueCount} word${dueCount === 1 ? '' : 's'} to refresh` : 'Games & practice'}
          </span>
        </Link>
      </div>
    </div>
  );
}
