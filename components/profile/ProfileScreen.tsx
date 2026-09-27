'use client';

import { useMemo, useState } from 'react';
import { EmmaPortrait } from '@/components/emma/EmmaFigure';
import { PageHeader } from '@/components/layout/AppShell';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { AnimatedNumber, Card, Chip, ProgressBar } from '@/components/ui/primitives';
import { Sheet } from '@/components/ui/Sheet';
import { useNow } from '@/lib/hooks/useNow';
import { achievementStatuses, type AchievementStatus } from '@/lib/progress/achievements';
import { lastDays, localDateKey } from '@/lib/progress/dates';
import { computeJourney } from '@/lib/progress/journey';
import { isLearned, isMastered } from '@/lib/progress/srs';
import { streakStatus } from '@/lib/progress/streak';
import { cn } from '@/lib/utils';
import { achievementContext, useGameStore } from '@/store/gameStore';
import type { LessonSummary, LevelMeta } from '@/types/curriculum';
import type { LessonHistoryEntry } from '@/types/progress';
import { WeekChart, type DayBar } from './WeekChart';

function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

const KIND_ICON: Record<LessonHistoryEntry['kind'], string> = { lesson: '📘', review: '🔁', game: '🎮', conversation: '💬' };

function emmaGreeting(streak: number, words: number, lessons: number): string {
  if (lessons === 0) return 'Your Spanish story starts here. I’m excited!';
  if (streak >= 7) return `${streak} days in a row. That’s real commitment — ¡enhorabuena!`;
  if (streak >= 3) return `${streak} days in a row — I love to see it.`;
  if (words >= 100) return `Over ${Math.floor(words / 50) * 50} words already. You’re flying.`;
  return 'Look how far you’ve come. Every word counts.';
}

function Stat({ emoji, label, value, sub }: { emoji: string; label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-2xl bg-paper px-4 py-3 shadow-card">
      <p className="flex items-center gap-1.5 text-xs font-extrabold tracking-wide text-ink-soft uppercase">
        <span aria-hidden>{emoji}</span> {label}
      </p>
      <p className="mt-1 text-2xl leading-tight font-black">{value}</p>
      {sub && <p className="text-xs font-bold text-ink-faint">{sub}</p>}
    </div>
  );
}

function Badge({ status, onOpen }: { status: AchievementStatus; onOpen: () => void }) {
  const unlocked = status.unlockedAt !== null;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${status.def.title}${unlocked ? ', unlocked' : `, ${Math.round(status.progress * 100)}% done`}`}
      className="flex flex-col items-center gap-1.5 rounded-2xl p-1.5 text-center transition-transform active:scale-95"
    >
      <span
        className={cn(
          'relative grid h-16 w-16 place-items-center rounded-[1.4rem] text-3xl',
          unlocked ? 'bg-sun-light shadow-card' : 'bg-cream-deep grayscale',
        )}
        aria-hidden
      >
        <span className={cn(!unlocked && 'opacity-40')}>{status.def.emoji}</span>
        {!unlocked && status.progress > 0 && (
          <span className="absolute inset-x-2 bottom-1.5 h-1 overflow-hidden rounded-full bg-sand">
            <span className="block h-full rounded-full bg-honey" style={{ width: `${status.progress * 100}%` }} />
          </span>
        )}
      </span>
      <span className={cn('text-[11px] leading-tight font-extrabold', unlocked ? 'text-ink' : 'text-ink-faint')}>{status.def.title}</span>
    </button>
  );
}

export function ProfileScreen({ lessons, levels }: { lessons: LessonSummary[]; levels: LevelMeta[] }) {
  const data = useGameStore((s) => s);
  const setName = useGameStore((s) => s.setName);
  const now = useNow();
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [openBadge, setOpenBadge] = useState<AchievementStatus | null>(null);

  const { profile, stats, streak, vocab, activity, history, xp, completedLessons } = data;
  const journey = useMemo(() => computeJourney(lessons, completedLessons, profile.placementLevel), [lessons, completedLessons, profile.placementLevel]);
  const level = journey.levels.find((l) => l.level === journey.currentLevel) ?? journey.levels[0];
  const meta = levels.find((l) => l.id === journey.currentLevel);
  const words = useMemo(() => Object.values(vocab), [vocab]);
  const learned = words.filter(isLearned).length;
  const mastered = words.filter(isMastered).length;
  const accuracy = stats.answers ? Math.round((stats.correct / stats.answers) * 100) : null;
  const statuses = useMemo(() => achievementStatuses(achievementContext(data), data.achievements), [data]);
  const unlockedCount = statuses.filter((s) => s.unlockedAt !== null).length;
  const sortedBadges = useMemo(
    () => [...statuses].sort((a, b) => Number(b.unlockedAt !== null) - Number(a.unlockedAt !== null) || b.progress - a.progress),
    [statuses],
  );

  const today = now ? localDateKey(new Date(now)) : null;
  const status = today ? streakStatus(streak, today) : null;
  const week: DayBar[] = today
    ? lastDays(7, today).map((key) => {
        const date = new Date(`${key}T12:00:00`);
        return {
          key,
          label: date.toLocaleDateString('en-GB', { weekday: 'narrow' }),
          full: date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }),
          minutes: Math.round((activity[key]?.seconds ?? 0) / 60),
          xp: activity[key]?.xp ?? 0,
          today: key === today,
        };
      })
    : [];
  const weekMinutes = week.reduce((n, d) => n + d.minutes, 0);
  const weekXp = week.reduce((n, d) => n + d.xp, 0);
  const activeDays = week.filter((d) => d.minutes > 0 || d.xp > 0).length;
  const since = profile.startedAt ? new Date(profile.startedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

  const saveName = () => {
    const name = draftName.trim();
    if (name) setName(name.slice(0, 30));
    setEditing(false);
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4">
      <PageHeader
        title="Profile"
        action={
          <ButtonLink href="/settings" variant="ghost" size="sm" icon={<Icon name="settings" size={20} />} aria-label="Settings">
            <span className="hidden sm:inline">Settings</span>
          </ButtonLink>
        }
      />

      {/* Hero */}
      <section className="relative mt-3 min-h-[200px] animate-enter overflow-hidden rounded-[2rem] bg-gradient-to-br from-terracotta-light via-[#fbeede] to-sun-light px-5 pt-5 pb-5">
        <div className="relative z-10 max-w-[60%]">
          <div className="flex items-center gap-1">
            <h2 className="truncate font-display text-[30px] leading-tight font-semibold">{profile.name || 'Amigo'}</h2>
            <button
              type="button"
              onClick={() => {
                setDraftName(profile.name);
                setEditing(true);
              }}
              aria-label="Change your name"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-paper/60"
            >
              <Icon name="pencil" size={18} />
            </button>
          </div>
          {since && <p className="text-xs font-bold text-ink-soft">Learning since {since}</p>}
          <div className="mt-3 rounded-2xl rounded-tl-md bg-paper/85 px-3 py-2 shadow-card">
            <p className="text-sm leading-snug font-bold">{emmaGreeting(status?.display ?? 0, learned, stats.lessonsCompleted)}</p>
          </div>
        </div>
        <EmmaPortrait state="happy" width={180} className="pointer-events-none absolute -right-3 -bottom-24 w-[44%] max-w-[210px]" />
      </section>

      {/* Level */}
      <Card className="mt-4 animate-enter p-5 [animation-delay:60ms]">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-cream-deep text-2xl" aria-hidden>
            {meta?.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold tracking-[0.12em] text-terracotta uppercase">Level {journey.currentLevel}</p>
            <p className="font-display text-lg leading-tight font-semibold">{meta?.title}</p>
          </div>
          {meta && <Chip>{meta.cefr}</Chip>}
        </div>
        <ProgressBar value={level.done} max={level.total} label={`Level ${journey.currentLevel} progress`} className="mt-3" />
        <p className="mt-2 text-sm text-ink-soft">
          {journey.finished
            ? 'You’ve finished the whole journey. ¡Increíble!'
            : `${level.done} of ${level.total} lessons done in this level.`}
        </p>
      </Card>

      {/* Stats */}
      <section className="mt-4 grid animate-enter grid-cols-2 gap-3 [animation-delay:120ms]" aria-label="Your stats">
        <Stat emoji="🔥" label="Streak" value={`${status?.display ?? 0} day${status?.display === 1 ? '' : 's'}`} sub={`Best: ${streak.longest}`} />
        <Stat emoji="⭐" label="XP" value={<AnimatedNumber value={xp} />} sub={weekXp ? `+${weekXp} this week` : undefined} />
        <Stat emoji="📘" label="Lessons" value={stats.lessonsCompleted} sub={`${Object.keys(completedLessons).length} different`} />
        <Stat emoji="🧠" label="Words" value={learned} sub={`${mastered} mastered`} />
        <Stat emoji="🎙️" label="Speaking" value={stats.speakingPassed} sub="phrases said out loud" />
        <Stat emoji="🎯" label="Accuracy" value={accuracy === null ? '—' : `${accuracy}%`} sub={stats.answers ? `${stats.answers} answers` : 'No answers yet'} />
        <Stat emoji="💬" label="Chats" value={stats.conversations} sub={`${stats.conversationTurns} replies to Emma`} />
        <Stat emoji="⏱️" label="Time" value={formatDuration(stats.learningSeconds)} sub="learning Spanish" />
      </section>

      {/* This week */}
      {today && (
        <Card className="mt-4 animate-enter p-5 [animation-delay:180ms]">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-xl font-semibold">This week</h2>
            <p className="text-sm font-bold text-ink-soft">
              {weekMinutes} min · {activeDays}/7 days
            </p>
          </div>
          <WeekChart days={week} goal={data.settings.dailyGoalMinutes} />
        </Card>
      )}

      {/* Achievements */}
      <section className="mt-7 animate-enter [animation-delay:220ms]" aria-labelledby="achievements">
        <div className="flex items-baseline justify-between px-1">
          <h2 id="achievements" className="font-display text-xl font-semibold">
            Achievements
          </h2>
          <span className="text-sm font-bold text-ink-soft">
            {unlockedCount} of {statuses.length}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-1 rounded-[var(--radius-card)] bg-paper p-3 shadow-card sm:grid-cols-5">
          {sortedBadges.map((s) => (
            <Badge key={s.def.id} status={s} onOpen={() => setOpenBadge(s)} />
          ))}
        </div>
      </section>

      {/* History */}
      {history.length > 0 && (
        <section className="mt-7 animate-enter [animation-delay:260ms]" aria-labelledby="history">
          <h2 id="history" className="px-1 font-display text-xl font-semibold">
            Recent activity
          </h2>
          <ul className="mt-3 divide-y divide-sand/60 overflow-hidden rounded-[var(--radius-card)] bg-paper shadow-card">
            {history.slice(0, 8).map((h, i) => (
              <li key={`${h.lessonId}-${h.completedAt}-${i}`} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xl" aria-hidden>
                  {KIND_ICON[h.kind]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{h.title}</p>
                  <p className="text-xs text-ink-soft">
                    {new Date(h.completedAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} ·{' '}
                    {Math.round(h.accuracy * 100)}% · {formatDuration(h.seconds)}
                  </p>
                </div>
                <span className="text-sm font-black text-honey-dark">+{h.xp}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Sheet open={editing} onClose={() => setEditing(false)} label="Change your name">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveName();
          }}
        >
          <h2 className="font-display text-2xl font-semibold">What should Emma call you?</h2>
          <label htmlFor="profile-name" className="sr-only">
            Your name
          </label>
          <input
            id="profile-name"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            maxLength={30}
            autoComplete="given-name"
            className="mt-4 h-14 w-full rounded-2xl border-2 border-sand bg-paper px-4 text-lg font-bold outline-none focus:border-terracotta"
          />
          <Button type="submit" size="lg" block className="mt-4" disabled={!draftName.trim()}>
            Save
          </Button>
        </form>
      </Sheet>

      <Sheet open={openBadge !== null} onClose={() => setOpenBadge(null)} label="Achievement">
        {openBadge && (
          <div className="text-center">
            <span
              className={cn(
                'mx-auto grid h-24 w-24 place-items-center rounded-[2rem] text-5xl',
                openBadge.unlockedAt ? 'bg-sun-light shadow-card' : 'bg-cream-deep grayscale',
              )}
              aria-hidden
            >
              {openBadge.def.emoji}
            </span>
            <h2 className="mt-4 font-display text-2xl font-semibold">{openBadge.def.title}</h2>
            <p className="mt-1 text-ink-soft">{openBadge.def.description}</p>
            {openBadge.unlockedAt ? (
              <p className="mt-4 inline-flex rounded-full bg-sage-light px-4 py-1.5 text-sm font-extrabold text-sage-dark">
                Unlocked {new Date(openBadge.unlockedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
              </p>
            ) : (
              <div className="mx-auto mt-4 max-w-xs">
                <ProgressBar value={Math.min(openBadge.value, openBadge.def.target)} max={openBadge.def.target} label="Progress" />
                <p className="mt-2 text-sm font-bold text-ink-soft">
                  {Math.min(openBadge.value, openBadge.def.target)} / {openBadge.def.target}
                </p>
              </div>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}
