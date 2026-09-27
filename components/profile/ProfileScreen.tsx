'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { SceneBackdrop, sceneFor, useEquipped } from '@/components/cosmetics/cosmetics';
import { EmmaAvatar } from '@/components/emma/EmmaAvatar';
import { CoinIcon, FlameIcon, XpIcon } from '@/components/game-ui/icons';
import { LevelBadge, XpBar } from '@/components/game-ui/parts';
import { PageHeader } from '@/components/layout/AppShell';
import { ItemPreview } from '@/components/shop/ItemPreview';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { AnimatedNumber, Card, ProgressBar } from '@/components/ui/primitives';
import { Sheet } from '@/components/ui/Sheet';
import { ACHIEVEMENT_GROUPS, type AchievementGroup } from '@/data/achievements';
import { REGIONS } from '@/data/regions';
import { SHOP_ITEMS } from '@/data/shop';
import { ACHIEVEMENT_COINS } from '@/lib/game/economy';
import { playerLevelFromXp } from '@/lib/game/levels';
import { useNow } from '@/lib/hooks/useNow';
import { achievementStatuses, type AchievementStatus } from '@/lib/progress/achievements';
import { lastDays, localDateKey } from '@/lib/progress/dates';
import { computeJourney } from '@/lib/progress/journey';
import { isLearned, isMastered } from '@/lib/progress/srs';
import { streakStatus } from '@/lib/progress/streak';
import { cn, formatNumber } from '@/lib/utils';
import { achievementContext, useGameStore } from '@/store/gameStore';
import type { LessonSummary, LevelMeta } from '@/types/curriculum';
import type { LessonHistoryEntry } from '@/types/progress';
import { WeekChart, type DayBar } from './WeekChart';

function formatDuration(seconds: number) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

const KIND_ICON: Record<LessonHistoryEntry['kind'], string> = { lesson: '📘', review: '🔁', game: '🎮', conversation: '💬' };

/** Bronze, silver and gold medals. */
const MEDAL = {
  1: { ring: 'from-[#e8b48a] via-[#c77f4a] to-[#8f5327]', label: 'Bronze' },
  2: { ring: 'from-[#f4f7f9] via-[#b9c6cf] to-[#7d8e9a]', label: 'Silver' },
  3: { ring: 'from-[#fff1bf] via-[#f2c14e] to-[#b68520]', label: 'Gold' },
} as const;

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-2xl bg-paper px-3.5 py-3 shadow-card">
      <p className="flex items-center gap-1.5 text-[11px] font-extrabold tracking-wide text-ink-soft uppercase">
        {icon} {label}
      </p>
      <p className="mt-1 text-[22px] leading-tight font-black">{value}</p>
      {sub && <p className="truncate text-xs font-bold text-ink-faint">{sub}</p>}
    </div>
  );
}

function Medal({ status, onOpen }: { status: AchievementStatus; onOpen: () => void }) {
  const unlocked = status.unlockedAt !== null;
  const medal = MEDAL[status.def.tier];
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${unlocked ? status.def.title : 'Locked achievement'}${unlocked ? `, ${medal.label.toLowerCase()}, unlocked` : `, ${Math.round(status.progress * 100)}% done`}`}
      className="flex flex-col items-center gap-1.5 rounded-2xl p-1.5 text-center transition-transform active:scale-95"
      data-achievement={status.def.id}
      data-unlocked={unlocked || undefined}
    >
      <span className={cn('relative grid h-[66px] w-[66px] place-items-center rounded-full p-[4px]', unlocked ? `bg-gradient-to-br shadow-card ${medal.ring}` : 'bg-cream-deep')} aria-hidden>
        <span className={cn('grid h-full w-full place-items-center rounded-full text-[30px]', unlocked ? 'bg-paper' : 'bg-cream-deep')}>
          <span className={cn(!unlocked && '[filter:brightness(0)] opacity-20')}>{status.def.emoji}</span>
        </span>
        {!unlocked && (
          <span className="absolute -right-0.5 -bottom-0.5 grid h-6 w-6 place-items-center rounded-full bg-paper text-ink-faint shadow-card">
            <Icon name="lock" size={12} />
          </span>
        )}
        {!unlocked && status.progress > 0 && (
          <span className="absolute inset-x-3 -bottom-1 h-1.5 overflow-hidden rounded-full bg-sand">
            <span className="block h-full rounded-full bg-honey" style={{ width: `${status.progress * 100}%` }} />
          </span>
        )}
      </span>
      <span className={cn('text-[11px] leading-tight font-extrabold', unlocked ? 'text-ink' : 'text-ink-faint')}>{unlocked ? status.def.title : '???'}</span>
    </button>
  );
}

export function ProfileScreen({ lessons, levels }: { lessons: LessonSummary[]; levels: LevelMeta[] }) {
  const data = useGameStore((s) => s);
  const setName = useGameStore((s) => s.setName);
  const equipped = useEquipped();
  const now = useNow();
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [openBadge, setOpenBadge] = useState<AchievementStatus | null>(null);

  const { profile, stats, streak, vocab, activity, history, xp, completedLessons, coins, inventory } = data;
  const player = playerLevelFromXp(xp);
  const journey = useMemo(() => computeJourney(lessons, completedLessons, profile.placementLevel), [lessons, completedLessons, profile.placementLevel]);
  const meta = levels.find((l) => l.id === journey.currentLevel);
  const region = REGIONS[journey.currentLevel];
  const words = useMemo(() => Object.values(vocab), [vocab]);
  const learned = words.filter(isLearned).length;
  const mastered = words.filter(isMastered).length;
  const accuracy = stats.answers ? Math.round((stats.correct / stats.answers) * 100) : null;
  const stars = Object.values(completedLessons).reduce((n, r) => n + (r.stars ?? (r.perfect ? 3 : r.bestAccuracy >= 0.8 ? 2 : 1)), 0);
  const statuses = useMemo(() => achievementStatuses(achievementContext(data), data.achievements), [data]);
  const unlockedCount = statuses.filter((s) => s.unlockedAt !== null).length;
  const groups = useMemo(() => {
    const map = new Map<AchievementGroup, AchievementStatus[]>();
    for (const s of statuses) map.set(s.def.group, [...(map.get(s.def.group) ?? []), s]);
    return [...map.entries()];
  }, [statuses]);
  const collectable = SHOP_ITEMS.filter((i) => !i.consumable && !i.isDefault);
  const owned = collectable.filter((i) => inventory.owned[i.id]);
  const dark = sceneFor(equipped.background).tone === 'dark';

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
  const activeDays = week.filter((d) => d.minutes > 0 || d.xp > 0).length;
  const since = profile.startedAt ? new Date(profile.startedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
  const sentences = stats.speakingPassed + stats.speakingTyped + stats.conversationTurns;

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

      {/* Player card */}
      <section className="relative isolate mt-3 animate-enter overflow-hidden rounded-[2rem] px-5 pt-5 pb-5 shadow-lift">
        <SceneBackdrop id={equipped.background} />
        <div className="relative flex items-center gap-4">
          <EmmaAvatar framed size={92} state="proud" priority />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <h2 className={cn('truncate font-display text-[28px] leading-tight font-semibold', dark ? 'text-cream' : 'text-ink')}>{profile.name || 'Amigo'}</h2>
              <button
                type="button"
                onClick={() => {
                  setDraftName(profile.name);
                  setEditing(true);
                }}
                aria-label="Change your name"
                className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-full', dark ? 'text-cream/80 hover:bg-white/10' : 'text-ink-soft hover:bg-paper/60')}
              >
                <Icon name="pencil" size={18} />
              </button>
            </div>
            <p className={cn('text-xs font-bold', dark ? 'text-cream/75' : 'text-ink-soft')}>
              {region.landmark} {region.name} · Spanish {meta?.cefr ?? 'A1'}
              {since ? ` · since ${since}` : ''}
            </p>
          </div>
        </div>
        <div className="relative mt-4 flex items-center gap-3 rounded-2xl bg-paper/90 px-3 py-2.5 shadow-card backdrop-blur">
          <LevelBadge level={player.level} progress={player.progress} size={48} />
          <div className="min-w-0 flex-1">
            <p className="flex items-baseline justify-between text-sm font-extrabold">
              <span>Player level {player.level}</span>
              <span className="text-xs tabular-nums text-ink-soft">{player.maxed ? 'MAX' : `${formatNumber(player.xpInto)} / ${formatNumber(player.xpForNext)} XP`}</span>
            </p>
            <XpBar progress={player.progress} className="mt-1.5 h-2.5" />
          </div>
        </div>
        <div className="relative mt-2 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-paper/90 px-2 py-2 shadow-card">
            <p className="flex items-center justify-center gap-1 text-lg font-black">
              <XpIcon size={18} /> <AnimatedNumber value={xp} />
            </p>
            <p className="text-[11px] font-extrabold text-ink-soft uppercase">Total XP</p>
          </div>
          <Link href="/shop" className="rounded-2xl bg-paper/90 px-2 py-2 shadow-card">
            <p className="flex items-center justify-center gap-1 text-lg font-black">
              <CoinIcon size={18} /> <AnimatedNumber value={coins} />
            </p>
            <p className="text-[11px] font-extrabold text-ink-soft uppercase">Coins</p>
          </Link>
          <Link href="/quests#streak" className="rounded-2xl bg-paper/90 px-2 py-2 shadow-card">
            <p className="flex items-center justify-center gap-1 text-lg font-black">
              <FlameIcon size={18} lit={Boolean(status?.activeToday)} /> {status?.display ?? 0}
            </p>
            <p className="text-[11px] font-extrabold text-ink-soft uppercase">Streak · best {streak.longest}</p>
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="mt-4 grid animate-enter grid-cols-2 gap-3 [animation-delay:60ms] sm:grid-cols-3" aria-label="Your stats">
        <Stat icon={<span aria-hidden>📘</span>} label="Lessons" value={stats.lessonsCompleted} sub={`${journey.lessons.filter((l) => l.status === 'completed').length} of ${journey.lessons.length} on the map`} />
        <Stat icon={<span aria-hidden>⭐</span>} label="Perfect lessons" value={stats.perfectLessons} sub={`${stars} stars collected`} />
        <Stat icon={<span aria-hidden>🧠</span>} label="Words" value={learned} sub={`${mastered} mastered`} />
        <Stat icon={<span aria-hidden>🗣️</span>} label="Sentences said" value={formatNumber(sentences)} sub={`${formatDuration(stats.speakingSeconds)} at the mic`} />
        <Stat icon={<span aria-hidden>🎮</span>} label="Games played" value={stats.gamesPlayed} sub={stats.bestSpeedRound ? `Speed Round best: ${stats.bestSpeedRound}` : 'Six to choose from'} />
        <Stat icon={<span aria-hidden>🔥</span>} label="Best combo" value={stats.bestCombo} sub="right in a row" />
        <Stat icon={<span aria-hidden>💬</span>} label="Conversations" value={stats.conversations} sub={`${stats.conversationTurns} replies to Emma`} />
        <Stat icon={<span aria-hidden>🎯</span>} label="Accuracy" value={accuracy === null ? '—' : `${accuracy}%`} sub={stats.answers ? `${formatNumber(stats.answers)} answers` : 'No answers yet'} />
        <Stat icon={<span aria-hidden>📜</span>} label="Quests" value={stats.questsCompleted} sub={`${stats.chestsOpened} chests opened`} />
        <Stat icon={<span aria-hidden>⏱️</span>} label="Time learning" value={formatDuration(stats.learningSeconds)} sub={`${stats.dailyGoalsMet} daily goals hit`} />
      </section>

      {/* This week */}
      {today && (
        <Card className="mt-4 animate-enter p-5 [animation-delay:120ms]">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-xl font-semibold">This week</h2>
            <p className="text-sm font-bold text-ink-soft">
              {weekMinutes} min · {activeDays}/7 days
            </p>
          </div>
          <WeekChart days={week} goal={data.settings.dailyGoalMinutes} />
        </Card>
      )}

      {/* Achievement cabinet */}
      <section className="mt-7 animate-enter [animation-delay:180ms]" aria-labelledby="achievements">
        <div className="flex items-baseline justify-between px-1">
          <h2 id="achievements" className="font-display text-xl font-semibold">
            Achievements
          </h2>
          <span className="text-sm font-bold text-ink-soft">
            {unlockedCount} of {statuses.length}
          </span>
        </div>
        <div className="mt-3 space-y-3 rounded-[var(--radius-card)] bg-gradient-to-b from-[#3a302b] to-ink p-3 shadow-lift">
          {groups.map(([group, list]) => (
            <div key={group} className="rounded-2xl bg-paper/95 px-2 pt-2 pb-1">
              <p className="px-2 text-[11px] font-extrabold tracking-[0.14em] text-ink-soft uppercase">
                {ACHIEVEMENT_GROUPS[group]} · {list.filter((s) => s.unlockedAt).length}/{list.length}
              </p>
              <div className="mt-1 grid grid-cols-4 gap-1 sm:grid-cols-6">
                {[...list]
                  .sort((a, b) => Number(b.unlockedAt !== null) - Number(a.unlockedAt !== null) || b.progress - a.progress)
                  .map((s) => (
                    <Medal key={s.def.id} status={s} onOpen={() => setOpenBadge(s)} />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Collection */}
      <section className="mt-7 animate-enter [animation-delay:220ms]" aria-labelledby="collection">
        <div className="flex items-baseline justify-between px-1">
          <h2 id="collection" className="font-display text-xl font-semibold">
            Collection
          </h2>
          <Link href="/shop" className="inline-flex min-h-11 items-center gap-1 text-sm font-extrabold text-terracotta">
            {owned.length} of {collectable.length} · Shop <Icon name="chevronRight" size={16} />
          </Link>
        </div>
        <Card className="mt-2 p-3">
          {owned.length === 0 ? (
            <p className="px-1 py-2 text-sm text-ink-soft">Outfits, backgrounds, frames and more — earn them by levelling up, keeping streaks and winning weekly challenges, or buy them with coins.</p>
          ) : (
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1">
              {owned.map((item) => (
                <Link key={item.id} href="/shop" className="shrink-0" aria-label={item.name}>
                  <ItemPreview item={item} size={64} />
                </Link>
              ))}
            </div>
          )}
        </Card>
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
                'mx-auto grid h-28 w-28 place-items-center rounded-full p-[6px]',
                openBadge.unlockedAt ? `bg-gradient-to-br shadow-lift ${MEDAL[openBadge.def.tier].ring}` : 'bg-cream-deep',
              )}
              aria-hidden
            >
              <span className="grid h-full w-full place-items-center rounded-full bg-paper text-5xl">
                <span className={cn(!openBadge.unlockedAt && '[filter:brightness(0)] opacity-20')}>{openBadge.def.emoji}</span>
              </span>
            </span>
            <p className="mt-3 text-xs font-extrabold tracking-[0.16em] text-ink-soft uppercase">
              {MEDAL[openBadge.def.tier].label} · +{ACHIEVEMENT_COINS[openBadge.def.tier]} coins
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold">{openBadge.unlockedAt ? openBadge.def.title : 'Locked'}</h2>
            <p className="mt-1 text-ink-soft">{openBadge.def.description}</p>
            {openBadge.unlockedAt ? (
              <p className="mt-4 inline-flex rounded-full bg-sage-light px-4 py-1.5 text-sm font-extrabold text-sage-dark">
                Unlocked {new Date(openBadge.unlockedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
              </p>
            ) : (
              <div className="mx-auto mt-4 max-w-xs">
                <ProgressBar value={Math.min(openBadge.value, openBadge.def.target)} max={openBadge.def.target} label="Progress" />
                <p className="mt-2 text-sm font-bold text-ink-soft">
                  {formatNumber(Math.min(openBadge.value, openBadge.def.target))} / {formatNumber(openBadge.def.target)}
                </p>
              </div>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}
