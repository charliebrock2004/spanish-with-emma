'use client';

import { ChestIcon } from '@/components/game-ui/icons';
import { RewardChips } from '@/components/game-ui/parts';
import { Icon } from '@/components/ui/Icon';
import { CHESTS } from '@/lib/game/chests';
import { allQuestsDone, type DailyQuests, type Quest } from '@/lib/game/quests';
import type { WeeklyChallenge } from '@/lib/game/weekly';
import { useGameStore } from '@/store/gameStore';
import { useUiStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';

export function QuestRow({ quest, compact = false }: { quest: Quest; compact?: boolean }) {
  const pct = Math.min(1, quest.progress / quest.target);
  return (
    <li className={cn('flex items-center gap-3', compact ? 'py-2' : 'py-3')} data-quest={quest.metric} data-done={quest.done || undefined}>
      <span
        className={cn('grid shrink-0 place-items-center rounded-xl text-xl', compact ? 'h-9 w-9' : 'h-11 w-11', quest.done ? 'bg-sage-light' : 'bg-cream-deep')}
        aria-hidden
      >
        {quest.done ? <Icon name="check" size={20} strokeWidth={3} className="text-sage-dark" /> : quest.emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block leading-tight font-extrabold', quest.done && 'text-ink-soft line-through decoration-2')}>{quest.title}</span>
        <span className="mt-1.5 flex items-center gap-2">
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-cream-deep">
            <span
              className={cn('block h-full rounded-full transition-[width] duration-700', quest.done ? 'bg-sage' : 'bg-gradient-to-r from-sun to-terracotta')}
              style={{ width: `${Math.max(4, pct * 100)}%` }}
            />
          </span>
          <span className="shrink-0 text-xs font-extrabold tabular-nums text-ink-soft">
            {quest.progress}/{quest.target}
          </span>
        </span>
      </span>
      {!compact && <RewardChips xp={quest.reward.xp} coins={quest.reward.coins} size="sm" className="shrink-0 flex-col items-end" />}
    </li>
  );
}

/** Today's quests, with the daily chest at the end. */
export function DailyQuestList({ daily, compact = false }: { daily: DailyQuests; compact?: boolean }) {
  const done = daily.quests.filter((q) => q.done).length;
  const chest = useGameStore((s) => s.chests.find((c) => c.id === `chest:daily-chest:${daily.date}`));
  const openChest = useUiStore((s) => s.openChest);
  const complete = allQuestsDone(daily);
  return (
    <div>
      <ul className="divide-y divide-sand/50">
        {daily.quests.map((q) => (
          <QuestRow key={q.id} quest={q} compact={compact} />
        ))}
      </ul>
      <div className={cn('mt-2 flex items-center gap-3 rounded-2xl px-3 py-2.5', complete ? 'bg-sun-light' : 'bg-cream')}>
        <ChestIcon size={40} open={Boolean(chest?.openedAt)} className={cn(complete && !chest?.openedAt && 'animate-chest-shake')} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-extrabold">{CHESTS.daily.name}</span>
          <span className="block text-xs font-bold text-ink-soft">
            {chest?.openedAt ? 'Opened — see you tomorrow!' : complete ? 'Ready to open!' : `Finish all ${daily.quests.length} quests · ${done}/${daily.quests.length}`}
          </span>
        </span>
        {chest && !chest.openedAt && (
          <button type="button" onClick={() => openChest(chest.id)} className="min-h-10 rounded-full bg-terracotta px-4 text-sm font-black text-white shadow-[0_3px_0_var(--color-terracotta-dark)] active:translate-y-[2px] active:shadow-none">
            Open
          </button>
        )}
      </div>
    </div>
  );
}

/** Tomorrow's featured quest — decided today, so it's a real promise. */
export function TomorrowPreview({ className }: { className?: string }) {
  const tomorrow = useGameStore((s) => s.questsTomorrow);
  if (!tomorrow) return null;
  const featured = tomorrow.quests[1] ?? tomorrow.quests[0];
  if (!featured) return null;
  return (
    <div className={cn('flex items-center gap-3 rounded-2xl border-2 border-dashed border-sand px-3 py-3', className)}>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-paper text-2xl shadow-card" aria-hidden>
        {featured.emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-extrabold tracking-wide text-terracotta uppercase">Tomorrow&rsquo;s challenge</span>
        <span className="block leading-tight font-extrabold">{featured.title}</span>
        <RewardChips xp={featured.reward.xp} coins={featured.reward.coins} size="sm" className="mt-1" />
      </span>
    </div>
  );
}

export function WeeklyCard({ weekly, compact = false }: { weekly: WeeklyChallenge; compact?: boolean }) {
  const done = weekly.objectives.filter((o) => o.progress >= o.target).length;
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#dcefe6] text-2xl" aria-hidden>
          {weekly.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-extrabold tracking-wide text-[#2f6b58] uppercase">Weekly challenge</span>
          <span className="block font-display text-lg leading-tight font-semibold">{weekly.title}</span>
        </span>
        <span className="text-sm font-black tabular-nums text-ink-soft">
          {done}/{weekly.objectives.length}
        </span>
      </div>
      <ul className={cn('grid grid-cols-2 gap-2', compact ? 'mt-3' : 'mt-4')}>
        {weekly.objectives.map((o) => {
          const complete = o.progress >= o.target;
          return (
            <li key={o.metric} className={cn('rounded-xl px-3 py-2', complete ? 'bg-sage-light' : 'bg-cream')}>
              <span className="flex items-center justify-between gap-2 text-sm font-extrabold">
                <span className="truncate">{o.label}</span>
                {complete && <Icon name="check" size={14} strokeWidth={3} className="shrink-0 text-sage-dark" />}
              </span>
              <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-paper">
                <span className={cn('block h-full rounded-full', complete ? 'bg-sage' : 'bg-[#2f8a6f]')} style={{ width: `${Math.max(4, Math.min(1, o.progress / o.target) * 100)}%` }} />
              </span>
              <span className="mt-0.5 block text-[11px] font-bold tabular-nums text-ink-soft">
                {o.progress}/{o.target}
              </span>
            </li>
          );
        })}
      </ul>
      {!compact && (
        <p className="mt-3 text-sm text-ink-soft">
          {weekly.claimed ? 'Complete! Your reward is in the bag.' : 'Reward: a badge, 1,000 XP, 300 coins and an exclusive cosmetic.'}
        </p>
      )}
    </div>
  );
}
