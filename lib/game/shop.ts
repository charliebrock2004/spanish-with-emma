import { ITEMS_BY_ID, SLOT_FOR, type ShopItem } from '@/data/shop';
import { MAX_FREEZES } from '@/lib/progress/streak';
import { BOOST_MINUTES, MAX_BOOST_MINUTES } from './economy';

export type BuyBlock = 'unknown' | 'not-for-sale' | 'owned' | 'coins' | 'max-freezes' | 'max-boost';

export interface BuyContext {
  coins: number;
  owned: Record<string, number>;
  freezes: number;
  /** Minutes left on an active XP boost. */
  boostMinutesLeft: number;
}

export function buyCheck(item: ShopItem | undefined, ctx: BuyContext): { ok: true } | { ok: false; reason: BuyBlock } {
  if (!item) return { ok: false, reason: 'unknown' };
  if (item.price === undefined) return { ok: false, reason: 'not-for-sale' };
  if (!item.consumable && (ctx.owned[item.id] || item.isDefault)) return { ok: false, reason: 'owned' };
  if (item.category === 'freeze' && ctx.freezes >= MAX_FREEZES) return { ok: false, reason: 'max-freezes' };
  if (item.category === 'boost' && ctx.boostMinutesLeft + BOOST_MINUTES > MAX_BOOST_MINUTES) return { ok: false, reason: 'max-boost' };
  if (ctx.coins < item.price) return { ok: false, reason: 'coins' };
  return { ok: true };
}

export const isOwned = (id: string, owned: Record<string, number>) => Boolean(owned[id] || ITEMS_BY_ID.get(id)?.isDefault);

export function canEquip(id: string, owned: Record<string, number>): boolean {
  const item = ITEMS_BY_ID.get(id);
  return Boolean(item && SLOT_FOR[item.category] && isOwned(id, owned));
}

export const BUY_MESSAGES: Record<BuyBlock, string> = {
  unknown: 'That item doesn’t exist.',
  'not-for-sale': 'This one has to be earned.',
  owned: 'You already own this.',
  coins: 'Not enough coins yet — keep playing!',
  'max-freezes': 'You’re already holding the maximum of 2 streak freezes.',
  'max-boost': 'Your XP boost is already stacked up to an hour — use it first!',
};
