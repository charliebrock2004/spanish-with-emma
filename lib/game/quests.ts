import { hashString, seededRandom, shuffle } from '@/lib/utils';
import type { Reward } from './economy';

/**
 * Daily quests: three small, achievable goals a day (about ten minutes of
 * play), chosen deterministically from the date so every device agrees and a
 * reload never rerolls them. Finish all three for the daily chest.
 */

export type QuestMetric = 'lessons' | 'speaking' | 'games' | 'conversations' | 'dailyGoal' | 'perfect' | 'reviews' | 'xp' | 'combo' | 'listening';

export interface Quest {
  id: string;
  metric: QuestMetric;
  target: number;
  progress: number;
  title: string;
  emoji: string;
  reward: Reward;
  done: boolean;
}

export interface DailyQuests {
  date: string;
  quests: Quest[];
}

interface Template {
  metric: QuestMetric;
  emoji: string;
  targets: number[];
  title: (n: number) => string;
  reward: (n: number) => Reward;
  /** Progress is the best value reached rather than a running total. */
  max?: boolean;
}

const TEMPLATES: Template[] = [
  { metric: 'lessons', emoji: '🎯', targets: [1, 1, 2], title: (n) => (n === 1 ? 'Complete a lesson' : `Complete ${n} lessons`), reward: (n) => ({ xp: 50 * n, coins: 10 * n }) },
  { metric: 'speaking', emoji: '🎙️', targets: [5, 8, 10], title: (n) => `Say ${n} sentences in Spanish`, reward: (n) => ({ xp: 10 * n, coins: 2 * n }) },
  { metric: 'games', emoji: '🎮', targets: [1, 2, 2], title: (n) => (n === 1 ? 'Play a game' : `Play ${n} games`), reward: (n) => ({ xp: 40 * n, coins: 10 * n }) },
  { metric: 'conversations', emoji: '💬', targets: [1], title: () => 'Have a conversation with Emma', reward: () => ({ xp: 75, coins: 15 }) },
  { metric: 'dailyGoal', emoji: '🔥', targets: [1], title: () => 'Hit your daily goal', reward: () => ({ xp: 100, coins: 20 }) },
  { metric: 'perfect', emoji: '⭐', targets: [1], title: () => 'Finish a lesson with no mistakes', reward: () => ({ xp: 100, coins: 20 }) },
  { metric: 'reviews', emoji: '🔁', targets: [1], title: () => 'Finish a review session', reward: () => ({ xp: 60, coins: 15 }) },
  { metric: 'xp', emoji: '✨', targets: [150, 250, 400], title: (n) => `Earn ${n} XP`, reward: (n) => ({ xp: 50, coins: Math.round(n / 20) }) },
  { metric: 'combo', emoji: '⚡', targets: [5, 8, 10], title: (n) => `Get ${n} right in a row`, reward: (n) => ({ xp: 10 * n, coins: 2 * n }), max: true },
  { metric: 'listening', emoji: '👂', targets: [5, 8, 10], title: (n) => `Get ${n} listening questions right`, reward: (n) => ({ xp: 10 * n, coins: 2 * n }) },
];

export const QUEST_METRICS_MAX = new Set(TEMPLATES.filter((t) => t.max).map((t) => t.metric));

export interface QuestContext {
  /** Player level (quests get a little bigger as you grow). */
  level: number;
  /** Enough known words for games and reviews. */
  canPlayGames: boolean;
  canReview: boolean;
}

export const DAILY_QUEST_COUNT = 3;

export function generateDailyQuests(date: string, ctx: QuestContext): DailyQuests {
  const random = seededRandom(hashString(`quests:${date}`));
  const tier = Math.min(2, Math.floor((ctx.level - 1) / 10));
  const available = TEMPLATES.filter((t) => {
    if (t.metric === 'lessons') return false; // always first
    if (t.metric === 'games' && !ctx.canPlayGames) return false;
    if (t.metric === 'reviews' && !ctx.canReview) return false;
    return true;
  });
  const picks = [TEMPLATES[0], ...shuffle(available, random).slice(0, DAILY_QUEST_COUNT - 1)];
  const quests = picks.map((t) => {
    const target = t.targets[Math.min(tier, t.targets.length - 1)];
    return {
      id: `${date}:${t.metric}`,
      metric: t.metric,
      target,
      progress: 0,
      title: t.title(target),
      emoji: t.emoji,
      reward: t.reward(target),
      done: false,
    };
  });
  return { date, quests };
}

/**
 * Adds progress. Returns the updated quests and the ones that just completed.
 * Never goes past the target and never completes a quest twice.
 */
export function progressQuests(daily: DailyQuests, metric: QuestMetric, amount: number): { daily: DailyQuests; completed: Quest[] } {
  if (amount <= 0) return { daily, completed: [] };
  const completed: Quest[] = [];
  const quests = daily.quests.map((q) => {
    if (q.metric !== metric || q.done) return q;
    const progress = QUEST_METRICS_MAX.has(metric) ? Math.max(q.progress, amount) : q.progress + amount;
    const next = { ...q, progress: Math.min(q.target, progress) };
    if (next.progress >= q.target) {
      next.done = true;
      completed.push(next);
    }
    return next;
  });
  return { daily: { ...daily, quests }, completed };
}

export const allQuestsDone = (daily: DailyQuests | null) => Boolean(daily && daily.quests.length > 0 && daily.quests.every((q) => q.done));
