import type { AchievementTier } from '@/data/achievements';
import type { ChestKind } from './chests';

/**
 * The one place rewards are defined. Components never invent XP or coin
 * amounts — they describe what happened and the economy prices it.
 *
 * Balancing notes:
 *  - A typical day (a lesson, a game, a chat, daily quests) earns ~150–200 coins.
 *  - Cosmetics cost 300–1,500 coins, so a new outfit is a few days of play.
 *  - Coins reward *first* completions and quality; replays still earn XP (for
 *    practice) but only a trickle of coins, so there's nothing to farm.
 */

export interface Reward {
  xp: number;
  coins: number;
}

export interface RewardLine extends Reward {
  label: string;
}

export const ZERO: Reward = { xp: 0, coins: 0 };

export const add = (a: Reward, b: Partial<Reward>): Reward => ({ xp: a.xp + (b.xp ?? 0), coins: a.coins + (b.coins ?? 0) });

export const sum = (lines: Array<Partial<Reward>>): Reward => lines.reduce<Reward>((acc, l) => add(acc, l), { ...ZERO });

// ─── Combos ────────────────────────────────────────────────────────────────

/** 1 → x1, 3 → x2, 5 → x3, 10 → x5 (consecutive correct answers). */
export function comboMultiplier(combo: number): 1 | 2 | 3 | 5 {
  if (combo >= 10) return 5;
  if (combo >= 5) return 3;
  if (combo >= 3) return 2;
  return 1;
}

/** The next combo count that raises the multiplier (for "2 more for x3"). */
export function nextComboStep(combo: number): number | null {
  for (const step of [3, 5, 10]) if (combo < step) return step;
  return null;
}

// ─── Answers ───────────────────────────────────────────────────────────────

export type AnswerKind = 'normal' | 'speaking' | 'retry' | 'typed-speaking';

/**
 * XP for one correct answer. `combo` counts this answer (the 1st correct in a
 * row is combo 1). Speaking out loud is worth more — and a coin — because it's
 * the hardest and most valuable thing to practise.
 */
export function answerReward(kind: AnswerKind, combo: number): Reward {
  const base = kind === 'speaking' ? 15 : kind === 'retry' ? 5 : 10;
  const multiplier = kind === 'retry' ? 1 : comboMultiplier(combo);
  return { xp: base * multiplier, coins: kind === 'speaking' ? 1 : 0 };
}

// ─── Lessons ───────────────────────────────────────────────────────────────

export type Stars = 1 | 2 | 3;

/** ⭐ finished · ⭐⭐ 80%+ right first time · ⭐⭐⭐ perfect (no mistakes at all). */
export function lessonStars(accuracy: number, perfect: boolean): Stars {
  if (perfect) return 3;
  return accuracy >= 0.8 ? 2 : 1;
}

export interface LessonRewardInput {
  firstCompletion: boolean;
  perfect: boolean;
  /** First time this lesson has been completed perfectly. */
  firstPerfect: boolean;
  /** The lesson finished off a curriculum level for the first time. */
  levelCompleted: boolean;
}

export function lessonReward(input: LessonRewardInput): { lines: RewardLine[]; total: Reward; chest: ChestKind | null } {
  const lines: RewardLine[] = [
    input.firstCompletion ? { label: 'Lesson complete', xp: 25, coins: 10 } : { label: 'Lesson replayed', xp: 25, coins: 3 },
  ];
  if (input.perfect) {
    lines.push(input.firstPerfect ? { label: 'Perfect lesson', xp: 50, coins: 20 } : { label: 'Perfect again', xp: 25, coins: 5 });
  }
  if (input.levelCompleted) lines.push({ label: 'Level milestone', xp: 100, coins: 100 });
  return { lines, total: sum(lines), chest: input.levelCompleted ? 'milestone' : null };
}

// ─── Sessions ──────────────────────────────────────────────────────────────

export const REVIEW_REWARD: Reward = { xp: 20, coins: 5 };

export function conversationReward(turns: number): { lines: RewardLine[]; total: Reward } {
  const lines: RewardLine[] = [{ label: 'Replies', xp: Math.min(50, turns * 5), coins: 0 }];
  if (turns >= 4) lines.push({ label: 'Conversation complete', xp: 30, coins: 10 });
  else if (turns > 0) lines.push({ label: 'Nice chat', xp: 0, coins: 3 });
  return { lines, total: sum(lines) };
}

/** Coins from games are capped per day — games are for fun and practice, not farming. */
export const GAME_COIN_DAILY_CAP = 60;

export interface GameRewardInput {
  correct: number;
  answered: number;
  newBest: boolean;
  /** Coins already earned from games today. */
  coinsToday: number;
}

export function gameReward(input: GameRewardInput): { lines: RewardLine[]; total: Reward } {
  const accuracy = input.answered ? input.correct / input.answered : 0;
  const lines: RewardLine[] = [
    { label: 'Game complete', xp: 10, coins: 5 },
    { label: 'Correct answers', xp: Math.min(60, input.correct * 3), coins: Math.round(accuracy * 10) },
  ];
  if (input.newBest) lines.push({ label: 'New record', xp: 25, coins: 10 });
  const coins = lines.reduce((n, l) => n + l.coins, 0);
  const allowed = Math.max(0, Math.min(coins, GAME_COIN_DAILY_CAP - input.coinsToday));
  if (allowed < coins) {
    // Scale the coin lines down to the cap, keep XP.
    let left = allowed;
    for (const line of lines) {
      const take = Math.min(line.coins, left);
      line.coins = take;
      left -= take;
    }
  }
  return { lines, total: sum(lines) };
}

export const DAILY_GOAL_REWARD: Reward = { xp: 20, coins: 10 };

/** Coming back after missing days is celebrated, never punished. */
export const WELCOME_BACK_REWARD: Reward = { xp: 50, coins: 20 };

// ─── Achievements ──────────────────────────────────────────────────────────

export const ACHIEVEMENT_COINS: Record<AchievementTier, number> = { 1: 25, 2: 50, 3: 100 };

// ─── Player levels ─────────────────────────────────────────────────────────

/** Coins for reaching a player level; every 5th level also gives a chest. */
export function levelUpReward(level: number): { coins: number; chest: ChestKind | null } {
  return { coins: 25 + 5 * Math.floor(level / 5), chest: level % 5 === 0 ? 'level' : null };
}

/** One XP boost lasts this long; boosts stack up to an hour. */
export const BOOST_MINUTES = 15;
export const MAX_BOOST_MINUTES = 60;

/** XP gains (not coins) are doubled while an XP boost is active. */
export function boostedXp(xp: number, boostActive: boolean): number {
  return boostActive ? xp * 2 : xp;
}
