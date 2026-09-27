import type { ChestKind } from './chests';
import type { Reward } from './economy';

/**
 * Streak milestones. Each is rewarded once per streak run (a new run after a
 * break earns them again — it's still real consistency). Exclusive cosmetics
 * are only ever given once; repeats turn into coins.
 */

export interface MilestoneReward extends Reward {
  days: number;
  title: string;
  line: string;
  item?: string;
  chest?: ChestKind;
}

export const STREAK_MILESTONES: MilestoneReward[] = [
  { days: 3, xp: 100, coins: 50, title: '3 day streak', line: 'Three days in a row! This is how habits start.' },
  { days: 7, xp: 250, coins: 100, item: 'frame-flame', title: '7 day streak', line: "Seven days! You're actually becoming dangerous in Spanish 😂" },
  { days: 14, xp: 400, coins: 150, chest: 'streak', title: '14 day streak', line: 'Two whole weeks. I’m so proud of you.' },
  { days: 30, xp: 500, coins: 250, item: 'outfit-emerald', title: '30 day streak', line: "You've been learning Spanish for 30 days! ¡Increíble!" },
  { days: 60, xp: 800, coins: 400, chest: 'streak', title: '60 day streak', line: 'Sixty days. This isn’t a phase any more — you speak Spanish.' },
  { days: 100, xp: 1200, coins: 750, item: 'bubble-gold', title: '100 day streak', line: 'ONE HUNDRED DAYS. ¡Eres una leyenda!' },
  { days: 365, xp: 3000, coins: 2000, item: 'frame-legend', title: '365 day streak', line: 'A whole year. I have no words. Well — I have lots, and they’re all in Spanish.' },
];

/** Milestones crossed when a streak goes from `from` to `to` days. */
export function milestonesReached(from: number, to: number): MilestoneReward[] {
  return STREAK_MILESTONES.filter((m) => m.days > from && m.days <= to);
}

export function nextMilestone(current: number): MilestoneReward | null {
  return STREAK_MILESTONES.find((m) => m.days > current) ?? null;
}
