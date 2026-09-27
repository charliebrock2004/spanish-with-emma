'use client';

import Link from 'next/link';
import { EmmaAvatar } from '@/components/emma/EmmaAvatar';
import { ChestIcon, CoinIcon, FlameIcon } from '@/components/game-ui/icons';
import { RewardChips } from '@/components/game-ui/parts';
import { PageHeader } from '@/components/layout/AppShell';
import { ItemPreview } from '@/components/shop/ItemPreview';
import { Icon } from '@/components/ui/Icon';
import { Card } from '@/components/ui/primitives';
import { ITEMS_BY_ID } from '@/data/shop';
import { CHESTS } from '@/lib/game/chests';
import { STREAK_MILESTONES } from '@/lib/game/streakRewards';
import { useNow } from '@/lib/hooks/useNow';
import { localDateKey } from '@/lib/progress/dates';
import { MAX_FREEZES, streakStatus } from '@/lib/progress/streak';
import { useGameStore } from '@/store/gameStore';
import { useUiStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import { DailyQuestList, TomorrowPreview, WeeklyCard } from './QuestParts';

function untilMidnight(now: number) {
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  const minutes = Math.max(0, Math.round((end.getTime() - now) / 60_000));
  const h = Math.floor(minutes / 60);
  return h > 0 ? `${h}h ${minutes % 60}m` : `${minutes}m`;
}

function untilMonday(now: number) {
  const d = new Date(now);
  const days = ((8 - d.getDay()) % 7) || 7;
  return days === 1 ? 'Ends tonight' : `${days} days left`;
}

function StreakTrack() {
  const streak = useGameStore((s) => s.streak);
  const claimed = useGameStore((s) => s.claimed);
  const status = streakStatus(streak, localDateKey());
  const current = status.display;
  return (
    <Card className="mt-4 p-4" id="streak">
      <div className="flex items-center gap-3">
        <FlameIcon size={52} lit={status.activeToday} className={cn(status.activeToday && 'animate-flicker')} />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-2xl leading-tight font-semibold">{current} day streak</h2>
          <p className="text-sm text-ink-soft">
            {status.activeToday
              ? 'Done for today — see you tomorrow!'
              : status.atRisk
                ? status.freezesNeeded
                  ? `A streak freeze will cover the missed day when you play today.`
                  : 'Play today to keep it going.'
                : 'Start a new streak today.'}
            {' '}Best: {streak.longest}.
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-2xl bg-sky-light px-3 py-2 text-sm font-bold text-[#2f5f86]">
        <span aria-hidden>❄️</span>
        <span className="flex-1">
          Streak freezes: {streak.freezes}/{MAX_FREEZES} · you earn one every 7 days
        </span>
        {streak.freezes < MAX_FREEZES && (
          <Link href="/shop?tab=boosts" className="font-extrabold text-terracotta underline underline-offset-2">
            Get one
          </Link>
        )}
      </div>
      <ol className="mt-4 space-y-2" aria-label="Streak milestones">
        {STREAK_MILESTONES.map((m) => {
          const reached = current >= m.days;
          const paid = Boolean(streak.runStart && claimed[`streak:${streak.runStart}:${m.days}`]);
          const item = m.item ? ITEMS_BY_ID.get(m.item) : undefined;
          return (
            <li key={m.days} className={cn('flex items-center gap-3 rounded-2xl px-3 py-2', reached ? 'bg-terracotta-light/60' : 'bg-cream')}>
              <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-black', reached ? 'bg-terracotta text-white' : 'bg-paper text-ink-soft shadow-card')}>
                {m.days}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-extrabold">{m.title}</span>
                <RewardChips xp={m.xp} coins={m.coins} size="sm" />
              </span>
              {item && <ItemPreview item={item} size={40} silhouette={!reached && !paid} />}
              {m.chest && <ChestIcon size={36} tone="ember" />}
              {paid && <Icon name="check" size={18} strokeWidth={3} className="shrink-0 text-sage-dark" />}
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-xs text-ink-faint">Milestones pay out once per streak. Missing a day is fine — freezes cover it, and a fresh start is always celebrated.</p>
    </Card>
  );
}

function Chests() {
  const chests = useGameStore((s) => s.chests);
  const openChest = useUiStore((s) => s.openChest);
  const unopened = chests.filter((c) => !c.openedAt);
  const opened = chests.filter((c) => c.openedAt).slice(0, 4);
  return (
    <Card className="mt-4 p-4">
      <h2 className="font-display text-xl font-semibold">Chests</h2>
      {unopened.length === 0 && <p className="mt-1 text-sm text-ink-soft">No chests waiting. Earn them from daily quests, every 5 levels, streaks and finishing a region.</p>}
      <ul className="mt-2 space-y-2">
        {unopened.map((c) => (
          <li key={c.id} className="flex items-center gap-3 rounded-2xl bg-sun-light px-3 py-2">
            <ChestIcon size={42} tone="gold" className="animate-chest-shake" />
            <span className="min-w-0 flex-1">
              <span className="block font-extrabold">{CHESTS[c.kind].name}</span>
              <span className="block truncate text-xs font-bold text-ink-soft">{c.source}</span>
            </span>
            <button
              type="button"
              onClick={() => openChest(c.id)}
              className="min-h-10 rounded-full bg-terracotta px-4 text-sm font-black text-white shadow-[0_3px_0_var(--color-terracotta-dark)] active:translate-y-[2px] active:shadow-none"
            >
              Open
            </button>
          </li>
        ))}
        {opened.map((c) => (
          <li key={c.id} className="flex items-center gap-3 rounded-2xl bg-cream px-3 py-2 opacity-80">
            <ChestIcon size={36} open />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold">{CHESTS[c.kind].name}</span>
              <span className="block truncate text-xs text-ink-soft">
                {c.prizes
                  ?.map((p) => (p.type === 'coins' ? `${p.amount} coins` : p.type === 'xp' ? `${p.amount} XP` : p.type === 'boost' ? `${p.minutes} min boost` : p.type === 'freeze' ? 'streak freeze' : ITEMS_BY_ID.get(p.itemId)?.name))
                  .join(' · ')}
              </span>
            </span>
            <button type="button" onClick={() => openChest(c.id)} className="min-h-10 px-2 text-xs font-extrabold text-ink-soft underline">
              View
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 flex items-center gap-1 text-xs text-ink-faint">
        <CoinIcon size={12} /> Chests are earned, never bought, and their odds are shown before you open them.
      </p>
    </Card>
  );
}

export function QuestsScreen() {
  const quests = useGameStore((s) => s.quests);
  const weekly = useGameStore((s) => s.weekly);
  const now = useNow();
  return (
    <div className="mx-auto w-full max-w-2xl px-4">
      <PageHeader title="Quests" subtitle="Small goals every day, a big one every week." />
      {quests && (
        <Card className="mt-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-xl font-semibold">Today</h2>
            {now > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-extrabold text-ink-soft">
                <Icon name="clock" size={14} /> New quests in {untilMidnight(now)}
              </span>
            )}
          </div>
          <DailyQuestList daily={quests} />
          <TomorrowPreview className="mt-3" />
        </Card>
      )}
      {weekly && (
        <Card className="mt-4 p-4">
          <div className="mb-3 flex justify-end">{now > 0 && <span className="text-xs font-extrabold text-ink-soft">{untilMonday(now)}</span>}</div>
          <WeeklyCard weekly={weekly} />
        </Card>
      )}
      <StreakTrack />
      <Chests />
      <div className="mt-5 flex items-center gap-3 px-1 pb-4 text-sm text-ink-soft">
        <EmmaAvatar state="encouraging" size={40} animated={false} decorative />
        <p>Quests fit into about ten minutes a day. There&rsquo;s no penalty for skipping one — tomorrow&rsquo;s are already waiting.</p>
      </div>
    </div>
  );
}
