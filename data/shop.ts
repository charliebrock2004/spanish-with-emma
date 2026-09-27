/**
 * Everything coins can buy — cosmetics and conveniences only, nothing that
 * makes learning easier to skip. Exclusive items are earned (player level,
 * streaks, weekly challenges) and appear in the shop as locked teasers.
 */

export type ItemCategory = 'outfit' | 'background' | 'frame' | 'bubble' | 'theme' | 'scene' | 'boost' | 'freeze';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type EquipSlot = 'outfit' | 'background' | 'frame' | 'bubble' | 'theme';

export interface ShopItem {
  id: string;
  category: ItemCategory;
  name: string;
  emoji: string;
  description: string;
  rarity: Rarity;
  /** Coin price. Items without a price can only be earned. */
  price?: number;
  /** How an exclusive is earned. */
  unlock?: { level?: number; streak?: number; weekly?: boolean };
  /** Owned from the start. */
  isDefault?: boolean;
  consumable?: boolean;
  /** Preview colours: [main, accent]. */
  swatch?: [string, string];
}

export const SLOT_FOR: Partial<Record<ItemCategory, EquipSlot>> = {
  outfit: 'outfit',
  background: 'background',
  frame: 'frame',
  bubble: 'bubble',
  theme: 'theme',
};

export const SHOP_ITEMS: ShopItem[] = [
  // ─── Emma's outfits (recoloured from the original art) ─────────────────────
  { id: 'outfit-classic', category: 'outfit', name: 'Classic Polka', emoji: '🖤', description: 'Emma’s signature black polka-dot look.', rarity: 'common', isDefault: true, swatch: ['#161616', '#f7f2ea'] },
  { id: 'outfit-flamenco', category: 'outfit', name: 'Flamenco Red', emoji: '💃', description: 'Straight from a tablao in Seville.', rarity: 'rare', price: 500, swatch: ['#a8231c', '#fff5ec'] },
  { id: 'outfit-mediterraneo', category: 'outfit', name: 'Mediterranean Blue', emoji: '🌊', description: 'Summer on the Costa Brava.', rarity: 'rare', price: 750, swatch: ['#1d3f78', '#f4f8ff'] },
  { id: 'outfit-thistle', category: 'outfit', name: 'Scottish Thistle', emoji: '🪻', description: 'A wee nod to home.', rarity: 'epic', price: 900, swatch: ['#5b3a8c', '#f5eeff'] },
  { id: 'outfit-rose', category: 'outfit', name: 'Rosé', emoji: '🌸', description: 'Unlocked at player level 5.', rarity: 'rare', unlock: { level: 5 }, swatch: ['#b04a6a', '#fff4f6'] },
  { id: 'outfit-gold', category: 'outfit', name: 'Seville Gold', emoji: '✨', description: 'Unlocked at player level 20.', rarity: 'epic', unlock: { level: 20 }, swatch: ['#b68520', '#fffaee'] },
  { id: 'outfit-emerald', category: 'outfit', name: 'Emerald Night', emoji: '💚', description: 'Only for a 30 day streak.', rarity: 'legendary', unlock: { streak: 30 }, swatch: ['#155641', '#effaf4'] },

  // ─── Backgrounds behind Emma ───────────────────────────────────────────────
  { id: 'bg-cream', category: 'background', name: 'Warm Cream', emoji: '🤍', description: 'Soft and simple.', rarity: 'common', isDefault: true, swatch: ['#fcefc7', '#f7e0d5'] },
  { id: 'bg-madrid', category: 'background', name: 'Madrid Sunset', emoji: '🌇', description: 'Golden hour over the rooftops.', rarity: 'rare', price: 500, swatch: ['#f2a65a', '#8a2f22'] },
  { id: 'bg-beach', category: 'background', name: 'Cádiz Beach', emoji: '🏖️', description: 'Atlantic blue and warm sand.', rarity: 'rare', price: 750, swatch: ['#7cc4e4', '#f5d9a6'] },
  { id: 'bg-glasgow', category: 'background', name: 'Glasgow Drizzle', emoji: '🌧️', description: 'Emma feels right at home.', rarity: 'common', price: 400, swatch: ['#8fa3b3', '#dfe7ec'] },
  { id: 'bg-tapas', category: 'background', name: 'Tapas Bar', emoji: '🍷', description: 'Warm lights, cañas and chatter.', rarity: 'rare', price: 600, swatch: ['#6b2d1f', '#e9a94b'] },
  { id: 'bg-alhambra', category: 'background', name: 'Alhambra Night', emoji: '🕌', description: 'Granada under the stars.', rarity: 'epic', price: 1000, swatch: ['#1b2440', '#c98a4b'] },
  { id: 'bg-starry', category: 'background', name: 'Camino Stars', emoji: '🌌', description: 'Unlocked at player level 15.', rarity: 'epic', unlock: { level: 15 }, swatch: ['#141a33', '#7b6cd9'] },
  { id: 'bg-fiesta', category: 'background', name: 'Fiesta', emoji: '🎊', description: 'A weekly challenge exclusive.', rarity: 'epic', unlock: { weekly: true }, swatch: ['#f2c14e', '#c65d3b'] },

  // ─── Avatar frames ─────────────────────────────────────────────────────────
  { id: 'frame-none', category: 'frame', name: 'No frame', emoji: '⚪', description: 'Clean and classic.', rarity: 'common', isDefault: true, swatch: ['#fffcf7', '#eadbc6'] },
  { id: 'frame-terracotta', category: 'frame', name: 'Terracotta Ring', emoji: '🟠', description: 'The colour of Spanish rooftops.', rarity: 'common', price: 300, swatch: ['#c65d3b', '#f7e0d5'] },
  { id: 'frame-thistle', category: 'frame', name: 'Thistle Ring', emoji: '🟣', description: 'Purple, proud and Scottish.', rarity: 'rare', price: 800, swatch: ['#5b3a8c', '#c9b4ea'] },
  { id: 'frame-gold', category: 'frame', name: 'Golden Frame', emoji: '🥇', description: 'For the serious learner.', rarity: 'epic', price: 1000, swatch: ['#f2c14e', '#b68520'] },
  { id: 'frame-laurel', category: 'frame', name: 'Laurel Wreath', emoji: '🌿', description: 'Unlocked at player level 10.', rarity: 'rare', unlock: { level: 10 }, swatch: ['#4f8a5b', '#e2efdc'] },
  { id: 'frame-flame', category: 'frame', name: 'On Fire', emoji: '🔥', description: 'Earned with a 7 day streak.', rarity: 'epic', unlock: { streak: 7 }, swatch: ['#f2c14e', '#c65d3b'] },
  { id: 'frame-explorer', category: 'frame', name: 'Explorer', emoji: '🧭', description: 'A weekly challenge exclusive.', rarity: 'epic', unlock: { weekly: true }, swatch: ['#2f8a6f', '#f2c14e'] },
  { id: 'frame-diamond', category: 'frame', name: 'Diamond', emoji: '💎', description: 'Unlocked at player level 30.', rarity: 'legendary', unlock: { level: 30 }, swatch: ['#9fd8f2', '#e9f7ff'] },
  { id: 'frame-legend', category: 'frame', name: 'Legend', emoji: '👑', description: 'Only for a 365 day streak.', rarity: 'legendary', unlock: { streak: 365 }, swatch: ['#b68520', '#fff1bf'] },

  // ─── Chat bubbles ──────────────────────────────────────────────────────────
  { id: 'bubble-classic', category: 'bubble', name: 'Classic', emoji: '💬', description: 'Emma’s paper-white bubbles.', rarity: 'common', isDefault: true, swatch: ['#fffcf7', '#eadbc6'] },
  { id: 'bubble-sunset', category: 'bubble', name: 'Sunset', emoji: '🌅', description: 'Unlocked at player level 3.', rarity: 'common', unlock: { level: 3 }, swatch: ['#fcefc7', '#f7e0d5'] },
  { id: 'bubble-midnight', category: 'bubble', name: 'Midnight', emoji: '🌙', description: 'Cream on charcoal.', rarity: 'common', price: 400, swatch: ['#2a2320', '#fbf3e8'] },
  { id: 'bubble-azulejo', category: 'bubble', name: 'Azulejo', emoji: '🔷', description: 'Painted tiles from Lisbon to Seville.', rarity: 'rare', price: 500, swatch: ['#e3eef6', '#1d3f78'] },
  { id: 'bubble-confetti', category: 'bubble', name: 'Confetti', emoji: '🎉', description: 'A weekly challenge exclusive.', rarity: 'epic', unlock: { weekly: true }, swatch: ['#fff5d6', '#c65d3b'] },
  { id: 'bubble-gold', category: 'bubble', name: 'Gold Leaf', emoji: '🏅', description: 'Only for a 100 day streak.', rarity: 'legendary', unlock: { streak: 100 }, swatch: ['#fff1bf', '#b68520'] },

  // ─── App themes ────────────────────────────────────────────────────────────
  { id: 'theme-terracotta', category: 'theme', name: 'Terracotta', emoji: '🧱', description: 'The original.', rarity: 'common', isDefault: true, swatch: ['#c65d3b', '#f7e0d5'] },
  { id: 'theme-sea', category: 'theme', name: 'Mediterranean', emoji: '🐚', description: 'Deep sea blue accents.', rarity: 'common', price: 400, swatch: ['#2a6f97', '#dcebf5'] },
  { id: 'theme-olive', category: 'theme', name: 'Olive Grove', emoji: '🫒', description: 'Andalusian olive green.', rarity: 'common', price: 400, swatch: ['#5c7a2e', '#e6efd5'] },
  { id: 'theme-plum', category: 'theme', name: 'Heather', emoji: '🪻', description: 'Highland heather purple.', rarity: 'rare', price: 400, swatch: ['#7a3f86', '#efe0f2'] },
  { id: 'theme-midnight', category: 'theme', name: 'Midnight Gold', emoji: '🌃', description: 'A weekly challenge exclusive.', rarity: 'epic', unlock: { weekly: true }, swatch: ['#9a6b12', '#f6ead0'] },

  // ─── Special conversation scenes ───────────────────────────────────────────
  { id: 'scene-flamenco', category: 'scene', name: 'Flamenco Night', emoji: '💃', description: 'A new guided conversation: a night out in Seville.', rarity: 'rare', price: 800, swatch: ['#a8231c', '#f2c14e'] },
  { id: 'scene-navidad', category: 'scene', name: 'Navidad in Madrid', emoji: '🎄', description: 'A new guided conversation: Christmas traditions.', rarity: 'rare', price: 600, swatch: ['#155641', '#c65d3b'] },

  // ─── Conveniences ──────────────────────────────────────────────────────────
  { id: 'boost-xp', category: 'boost', name: 'XP Boost', emoji: '⚡', description: 'Double XP for 15 minutes.', rarity: 'common', price: 200, consumable: true, swatch: ['#f2c14e', '#fcefc7'] },
  { id: 'streak-freeze', category: 'freeze', name: 'Streak Freeze', emoji: '❄️', description: 'Protects your streak for one missed day. Hold up to 2.', rarity: 'common', price: 250, consumable: true, swatch: ['#6f9fc4', '#e3eef6'] },
];

export const ITEMS_BY_ID = new Map(SHOP_ITEMS.map((i) => [i.id, i]));

export const DEFAULT_EQUIPPED: Record<EquipSlot, string> = {
  outfit: 'outfit-classic',
  background: 'bg-cream',
  frame: 'frame-none',
  bubble: 'bubble-classic',
  theme: 'theme-terracotta',
};

/** Items unlocked for free on reaching a player level. */
export const LEVEL_UNLOCKS: Record<number, string> = Object.fromEntries(
  SHOP_ITEMS.filter((i) => i.unlock?.level).map((i) => [i.unlock!.level!, i.id]),
);

/** Purchasable cosmetics that chests can also drop (never exclusives). */
export function droppableByRarity(owned: Record<string, number>): Record<'common' | 'rare' | 'epic', string[]> {
  const pool = SHOP_ITEMS.filter((i) => i.price && !i.consumable && i.category !== 'scene' && !owned[i.id]);
  return {
    common: pool.filter((i) => i.rarity === 'common').map((i) => i.id),
    rare: pool.filter((i) => i.rarity === 'rare').map((i) => i.id),
    epic: pool.filter((i) => i.rarity === 'epic').map((i) => i.id),
  };
}
