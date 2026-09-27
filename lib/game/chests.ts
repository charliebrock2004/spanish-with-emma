import { hashString, seededRandom } from '@/lib/utils';

/**
 * Reward chests. They're earned, never bought, and their odds are published
 * in the UI. Contents are decided by a seed from the chest's id, so opening is
 * deterministic: reloading mid-animation can't reroll or duplicate anything.
 */

export type ChestKind = 'daily' | 'level' | 'milestone' | 'streak' | 'welcome';

export type ChestPrize =
  | { type: 'coins'; amount: number }
  | { type: 'xp'; amount: number }
  | { type: 'boost'; minutes: number }
  | { type: 'freeze' }
  | { type: 'item'; rarity: 'common' | 'rare' | 'epic' };

/** A prize after resolution: items become concrete item ids (or coins). */
export type ResolvedPrize =
  | { type: 'coins'; amount: number }
  | { type: 'xp'; amount: number }
  | { type: 'boost'; minutes: number }
  | { type: 'freeze' }
  | { type: 'item'; itemId: string };

interface ChestTable {
  name: string;
  emoji: string;
  guaranteed: ChestPrize[];
  roll: Array<{ weight: number; prize: ChestPrize }>;
}

export const CHESTS: Record<ChestKind, ChestTable> = {
  daily: {
    name: 'Daily chest',
    emoji: '🎁',
    guaranteed: [{ type: 'coins', amount: 40 }],
    roll: [
      { weight: 50, prize: { type: 'coins', amount: 30 } },
      { weight: 22, prize: { type: 'coins', amount: 60 } },
      { weight: 12, prize: { type: 'xp', amount: 100 } },
      { weight: 8, prize: { type: 'boost', minutes: 15 } },
      { weight: 5, prize: { type: 'freeze' } },
      { weight: 3, prize: { type: 'item', rarity: 'common' } },
    ],
  },
  level: {
    name: 'Level chest',
    emoji: '🎁',
    guaranteed: [{ type: 'coins', amount: 75 }],
    roll: [
      { weight: 40, prize: { type: 'coins', amount: 50 } },
      { weight: 20, prize: { type: 'boost', minutes: 15 } },
      { weight: 10, prize: { type: 'freeze' } },
      { weight: 20, prize: { type: 'item', rarity: 'common' } },
      { weight: 10, prize: { type: 'item', rarity: 'rare' } },
    ],
  },
  milestone: {
    name: 'Milestone chest',
    emoji: '🏆',
    guaranteed: [{ type: 'coins', amount: 150 }],
    roll: [
      { weight: 50, prize: { type: 'item', rarity: 'rare' } },
      { weight: 20, prize: { type: 'item', rarity: 'epic' } },
      { weight: 30, prize: { type: 'coins', amount: 150 } },
    ],
  },
  streak: {
    name: 'Streak chest',
    emoji: '🔥',
    guaranteed: [{ type: 'coins', amount: 100 }],
    roll: [
      { weight: 30, prize: { type: 'freeze' } },
      { weight: 30, prize: { type: 'boost', minutes: 30 } },
      { weight: 25, prize: { type: 'item', rarity: 'rare' } },
      { weight: 15, prize: { type: 'coins', amount: 100 } },
    ],
  },
  welcome: {
    name: 'Welcome chest',
    emoji: '🎉',
    guaranteed: [{ type: 'coins', amount: 100 }, { type: 'boost', minutes: 15 }],
    roll: [{ weight: 100, prize: { type: 'item', rarity: 'common' } }],
  },
};

/** Published odds for the UI, as percentages of the random roll. */
export function chestOdds(kind: ChestKind): Array<{ prize: ChestPrize; percent: number }> {
  const table = CHESTS[kind].roll;
  const total = table.reduce((n, r) => n + r.weight, 0);
  return table.map((r) => ({ prize: r.prize, percent: Math.round((r.weight / total) * 1000) / 10 }));
}

/** Coins given instead of an item when there's nothing left to unlock. */
export const ITEM_FALLBACK_COINS = { common: 150, rare: 250, epic: 400 } as const;
/** Coins given instead of a freeze when the player already holds the maximum. */
export const FREEZE_FALLBACK_COINS = 100;

export interface ResolveContext {
  /** Unowned, droppable items by rarity. */
  itemsByRarity: Record<'common' | 'rare' | 'epic', string[]>;
  canHoldFreeze: boolean;
}

export function resolveChest(chestId: string, kind: ChestKind, ctx: ResolveContext): ResolvedPrize[] {
  const random = seededRandom(hashString(`chest:${chestId}`));
  const table = CHESTS[kind];
  const total = table.roll.reduce((n, r) => n + r.weight, 0);
  let pick = random() * total;
  let rolled = table.roll[table.roll.length - 1].prize;
  for (const r of table.roll) {
    pick -= r.weight;
    if (pick < 0) {
      rolled = r.prize;
      break;
    }
  }
  const taken = new Set<string>();
  const resolve = (prize: ChestPrize): ResolvedPrize => {
    if (prize.type === 'item') {
      const pool = ctx.itemsByRarity[prize.rarity].filter((id) => !taken.has(id));
      if (pool.length === 0) return { type: 'coins', amount: ITEM_FALLBACK_COINS[prize.rarity] };
      const itemId = pool[Math.floor(random() * pool.length)];
      taken.add(itemId);
      return { type: 'item', itemId };
    }
    if (prize.type === 'freeze' && !ctx.canHoldFreeze) return { type: 'coins', amount: FREEZE_FALLBACK_COINS };
    return prize;
  };
  return [...table.guaranteed.map(resolve), resolve(rolled)];
}
