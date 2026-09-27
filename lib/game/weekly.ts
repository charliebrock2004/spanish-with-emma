import type { Reward } from './economy';
import type { QuestMetric } from './quests';

/**
 * A weekly challenge with four objectives. The theme and the exclusive
 * cosmetic rotate each week; the reward can be claimed once per week.
 */

export interface WeeklyObjective {
  metric: QuestMetric;
  target: number;
  progress: number;
  label: string;
}

export interface WeeklyChallenge {
  week: string;
  title: string;
  emoji: string;
  objectives: WeeklyObjective[];
  reward: Reward & { item: string };
  claimed: boolean;
}

const LABELS: Partial<Record<QuestMetric, (n: number) => string>> = {
  lessons: (n) => `${n} lessons`,
  conversations: (n) => `${n} conversations`,
  speaking: (n) => `${n} sentences`,
  games: (n) => `${n} games`,
  reviews: (n) => `${n} smart reviews`,
  perfect: (n) => `${n} perfect lessons`,
};

const THEMES: Array<{ title: string; emoji: string; objectives: Array<[QuestMetric, number]> }> = [
  { title: 'Spanish Explorer', emoji: '🧭', objectives: [['lessons', 5], ['conversations', 3], ['speaking', 50], ['games', 3]] },
  { title: 'Chatterbox Week', emoji: '💬', objectives: [['conversations', 5], ['speaking', 60], ['lessons', 3], ['reviews', 2]] },
  { title: 'The Perfectionist', emoji: '💎', objectives: [['perfect', 3], ['lessons', 5], ['reviews', 3], ['games', 2]] },
  { title: 'Arcade Week', emoji: '🎮', objectives: [['games', 6], ['lessons', 4], ['speaking', 40], ['conversations', 2]] },
];

/** Weekly exclusives — only obtainable by finishing a weekly challenge. */
export const WEEKLY_ITEMS = ['frame-explorer', 'bg-fiesta', 'bubble-confetti', 'theme-midnight'];

export const WEEKLY_REWARD: Reward = { xp: 1000, coins: 300 };

/** ISO-8601 week key, e.g. 2026-W39 (weeks start on Monday). */
export function weekKey(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(utc.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((utc.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function weekIndex(week: string): number {
  const [year, w] = week.split('-W').map(Number);
  return year * 53 + w;
}

export function generateWeekly(week: string): WeeklyChallenge {
  const index = weekIndex(week);
  const theme = THEMES[index % THEMES.length];
  return {
    week,
    title: theme.title,
    emoji: theme.emoji,
    objectives: theme.objectives.map(([metric, target]) => ({ metric, target, progress: 0, label: LABELS[metric]!(target) })),
    reward: { ...WEEKLY_REWARD, item: WEEKLY_ITEMS[index % WEEKLY_ITEMS.length] },
    claimed: false,
  };
}

export function progressWeekly(weekly: WeeklyChallenge, metric: QuestMetric, amount: number): WeeklyChallenge {
  if (amount <= 0 || !weekly.objectives.some((o) => o.metric === metric)) return weekly;
  return {
    ...weekly,
    objectives: weekly.objectives.map((o) => (o.metric === metric ? { ...o, progress: Math.min(o.target, o.progress + amount) } : o)),
  };
}

export const weeklyComplete = (weekly: WeeklyChallenge | null) => Boolean(weekly && weekly.objectives.every((o) => o.progress >= o.target));

export const weeklyProgress = (weekly: WeeklyChallenge) =>
  weekly.objectives.reduce((n, o) => n + Math.min(1, o.progress / o.target), 0) / weekly.objectives.length;
