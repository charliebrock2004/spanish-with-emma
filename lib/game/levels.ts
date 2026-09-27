/**
 * Player level (1 → 120) — separate from the language level (A1 → B2).
 *
 * Each level needs a little more XP than the last: 150 XP for level 2, then
 * +60 per level. A first lesson levels you up straight away; level 100 takes
 * around a year of regular play (~300k XP).
 */
export const MAX_PLAYER_LEVEL = 120;

/** XP needed to go from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  return 150 + 60 * (Math.max(1, level) - 1);
}

/** Total XP needed to *reach* `level`. */
export function totalXpForLevel(level: number): number {
  const n = Math.max(1, Math.min(MAX_PLAYER_LEVEL, level)) - 1;
  // Sum of 150 + 60k for k = 0 … n-1.
  return 150 * n + 30 * n * (n - 1);
}

export interface PlayerLevel {
  level: number;
  /** XP earned inside the current level. */
  xpInto: number;
  /** XP the current level needs in total. */
  xpForNext: number;
  /** 0–1 through the current level. */
  progress: number;
  totalXp: number;
  maxed: boolean;
}

export function playerLevelFromXp(totalXp: number): PlayerLevel {
  const xp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  // Closed form would work, but a loop is clearer and bounded.
  while (level < MAX_PLAYER_LEVEL && xp >= totalXpForLevel(level + 1)) level += 1;
  const maxed = level >= MAX_PLAYER_LEVEL;
  const xpInto = xp - totalXpForLevel(level);
  const xpForNext = maxed ? 0 : xpToNext(level);
  return { level, xpInto, xpForNext, progress: maxed ? 1 : xpInto / xpForNext, totalXp: xp, maxed };
}
