import type { UiEvent } from '@/types/game';

/**
 * Keeps celebrations from flooding the screen. Rewards that land together are
 * shown together: several level-ups in one go become one level-up moment (at
 * the highest level, with everything they paid), and achievements unlocked at
 * the same moment share one toast.
 */

type LevelUp = Extract<UiEvent, { kind: 'level-up' }>;

/** At most this many achievements in one toast — beyond that the titles stop being readable. */
export const MAX_GROUPED_ACHIEVEMENTS = 3;

/**
 * The next thing to celebrate, and everything waiting in the queue that
 * should be celebrated with it. Rewards pile up while a lesson is on (they
 * wait for the results screen), so a level reached halfway through and
 * another at the end are one "you reached level 3", not two takeovers.
 */
export function leadingGroup(events: UiEvent[]): UiEvent[] {
  const head = events[0];
  if (!head) return [];
  if (head.kind !== 'level-up' && head.kind !== 'achievement') return [head];
  const limit = head.kind === 'achievement' ? MAX_GROUPED_ACHIEVEMENTS : Infinity;
  return events.filter((e) => e.kind === head.kind).slice(0, limit);
}

/** Several level-ups as one: the level reached, all the coins, every item, the first chest. */
export function mergeLevelUps(group: LevelUp[]): LevelUp {
  const last = group[group.length - 1];
  return {
    ...last,
    coins: group.reduce((n, e) => n + e.coins, 0),
    items: group.flatMap((e) => e.items),
    chestId: group.find((e) => e.chestId)?.chestId ?? null,
  };
}
