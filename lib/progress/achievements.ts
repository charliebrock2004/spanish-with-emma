import { ACHIEVEMENTS, type AchievementContext, type AchievementDef } from '@/data/achievements';

export interface AchievementStatus {
  def: AchievementDef;
  unlockedAt: number | null;
  value: number;
  progress: number;
}

/** Achievements newly earned in `ctx` that aren't in `unlocked` yet. */
export function newlyUnlocked(ctx: AchievementContext, unlocked: Record<string, number>): string[] {
  return ACHIEVEMENTS.filter((a) => !unlocked[a.id] && a.value(ctx) >= a.target).map((a) => a.id);
}

export function achievementStatuses(
  ctx: AchievementContext,
  unlocked: Record<string, number>,
): AchievementStatus[] {
  return ACHIEVEMENTS.map((def) => {
    const value = def.value(ctx);
    return {
      def,
      unlockedAt: unlocked[def.id] ?? null,
      value,
      progress: Math.min(1, value / def.target),
    };
  });
}
