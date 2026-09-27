import { ACHIEVEMENTS_BY_ID } from '@/data/achievements';
import { droppableByRarity, ITEMS_BY_ID, LEVEL_UNLOCKS, SLOT_FOR } from '@/data/shop';
import { newlyUnlocked } from '@/lib/progress/achievements';
import { addDays } from '@/lib/progress/dates';
import { MAX_FREEZES, recordStreakDay, type StreakUpdate } from '@/lib/progress/streak';
import { MIN_GAME_WORDS } from '@/lib/review/build';
import { uid } from '@/lib/utils';
import type { Chest, GameData, GrantSource, UiEvent } from '@/types/game';
import type { DayActivity, PlayerStats } from '@/types/progress';
import { FREEZE_FALLBACK_COINS, resolveChest, type ChestKind, type ResolvedPrize } from './chests';
import { ACHIEVEMENT_COINS, BOOST_MINUTES, boostedXp, lessonStars, levelUpReward, WELCOME_BACK_REWARD } from './economy';
import { playerLevelFromXp } from './levels';
import { allQuestsDone, generateDailyQuests, progressQuests, type QuestContext, type QuestMetric } from './quests';
import { buyCheck, canEquip, isOwned, type BuyBlock } from './shop';
import { initialData, initialInventory, initialStats, achievementContext, boostActive, wordsMet } from './state';
import { STREAK_MILESTONES, milestonesReached } from './streakRewards';
import { generateWeekly, progressWeekly, weekKey, weeklyComplete } from './weekly';

/**
 * The game engine: every change to XP, coins, items, quests, chests and
 * streaks goes through here. It's pure — the store opens a transaction, calls
 * these functions and commits the result — so it's easy to test and the rules
 * live in one place.
 *
 * Exploit-safety comes from the reward ledger (`data.claimed`): every one-off
 * reward has a key, and a key can only ever be claimed once. Replays, reloads,
 * double taps and duplicate calls all hit the same key and get nothing.
 */

export interface Tx {
  data: GameData;
  /** Things to celebrate, in the order they happened. */
  events: UiEvent[];
  now: number;
  /** Local date (YYYY-MM-DD). */
  today: string;
}

/** Starts a transaction. `data` is copied shallowly; nested objects are replaced, never mutated. */
export function begin(data: GameData, now: number, today: string): Tx {
  return { data: { ...data }, events: [], now, today };
}

type NewEvent = UiEvent extends infer E ? (E extends UiEvent ? Omit<E, 'id'> : never) : never;
const event = (e: NewEvent): UiEvent => ({ ...e, id: uid('evt') }) as UiEvent;

export function addStats(tx: Tx, increments: Partial<PlayerStats>) {
  const stats = { ...tx.data.stats };
  for (const [key, value] of Object.entries(increments) as Array<[keyof PlayerStats, number]>) stats[key] += value;
  tx.data.stats = stats;
}

export function bumpActivity(activity: Record<string, DayActivity>, today: string, patch: Partial<DayActivity>): Record<string, DayActivity> {
  const day = activity[today] ?? { seconds: 0, xp: 0, sessions: 0 };
  const next = {
    ...activity,
    [today]: {
      seconds: day.seconds + (patch.seconds ?? 0),
      xp: day.xp + (patch.xp ?? 0),
      sessions: day.sessions + (patch.sessions ?? 0),
    },
  };
  // Keep ~3 months of history.
  const keys = Object.keys(next).sort();
  if (keys.length > 100) for (const k of keys.slice(0, keys.length - 100)) delete next[k];
  return next;
}

// ─── Day rollover ──────────────────────────────────────────────────────────

/** Ledger keys that only guard against duplicate submissions — safe to forget after a while. */
const SHORT_LIVED = /^(lesson|review|game|conversation|chest-prize):/;
const LEDGER_MEMORY_MS = 14 * 86_400_000;

export function questContext(data: GameData): QuestContext {
  const met = wordsMet(data);
  return { level: playerLevelFromXp(data.xp).level, canPlayGames: met >= MIN_GAME_WORDS, canReview: met > 0 };
}

/** Makes sure today's quests, this week's challenge and today's game-coin counter exist. */
export function ensureDay(tx: Tx) {
  const d = tx.data;
  const tomorrow = addDays(tx.today, 1);
  if (d.quests?.date !== tx.today) {
    d.quests = d.questsTomorrow?.date === tx.today ? d.questsTomorrow : generateDailyQuests(tx.today, questContext(d));
    // A new day is a good moment to tidy the ledger.
    const claimed: Record<string, number> = {};
    for (const [key, at] of Object.entries(d.claimed)) if (!SHORT_LIVED.test(key) || tx.now - at < LEDGER_MEMORY_MS) claimed[key] = at;
    d.claimed = claimed;
  }
  if (d.questsTomorrow?.date !== tomorrow) d.questsTomorrow = generateDailyQuests(tomorrow, questContext(d));
  const week = weekKey(tx.today);
  if (d.weekly?.week !== week) d.weekly = generateWeekly(week);
  if (d.gameCoins.date !== tx.today) d.gameCoins = { date: tx.today, coins: 0 };
}

// ─── Granting rewards ──────────────────────────────────────────────────────

export interface GrantSpec {
  /** Ledger key. A reward with a key is granted at most once, ever. */
  key?: string;
  source: GrantSource;
  xp?: number;
  coins?: number;
  /** Cosmetics to unlock. One already owned turns into coins instead. */
  items?: string[];
  chest?: { kind: ChestKind; source: string };
  freezes?: number;
  boostMinutes?: number;
}

export interface Granted {
  granted: boolean;
  /** XP actually added (including any boost). */
  xp: number;
  /** The part of `xp` that came from an XP boost. */
  boostXp: number;
  coins: number;
  items: string[];
  chestId: string | null;
}

const NOTHING: Granted = { granted: false, xp: 0, boostXp: 0, coins: 0, items: [], chestId: null };

/** XP from playing is doubled by an XP boost; fixed rewards (quests, chests…) aren't. */
const BOOSTABLE = new Set<GrantSource>(['answer', 'lesson', 'review', 'game', 'conversation']);
/** XP that counts towards "Earn N XP" quests. */
const PLAY_XP = new Set<GrantSource>(['answer', 'lesson', 'review', 'game', 'conversation', 'daily-goal']);
/** Coins given for an exclusive item the player already owns (e.g. a second weekly win). */
export const DUPLICATE_ITEM_COINS = 150;

export function grant(tx: Tx, spec: GrantSpec): Granted {
  if (spec.key) {
    if (tx.data.claimed[spec.key]) return NOTHING;
    tx.data.claimed = { ...tx.data.claimed, [spec.key]: tx.now };
  }
  const baseXp = Math.max(0, Math.round(spec.xp ?? 0));
  const xp = BOOSTABLE.has(spec.source) ? boostedXp(baseXp, boostActive(tx.data, tx.now)) : baseXp;
  let coins = Math.max(0, Math.round(spec.coins ?? 0));

  const items: string[] = [];
  for (const id of new Set(spec.items ?? [])) {
    if (!ITEMS_BY_ID.has(id)) continue;
    if (isOwned(id, tx.data.inventory.owned)) coins += DUPLICATE_ITEM_COINS;
    else {
      unlockItem(tx, id);
      items.push(id);
    }
  }
  if (spec.freezes) {
    const room = Math.max(0, MAX_FREEZES - tx.data.streak.freezes);
    const give = Math.min(spec.freezes, room);
    if (give) tx.data.streak = { ...tx.data.streak, freezes: tx.data.streak.freezes + give };
    coins += (spec.freezes - give) * FREEZE_FALLBACK_COINS;
  }
  if (spec.boostMinutes) extendBoost(tx, spec.boostMinutes);
  const chestId = spec.chest ? addChest(tx, spec.chest.kind, spec.chest.source, spec.key) : null;
  if (coins) addCoins(tx, coins);
  // XP last: level-ups grant their own rewards.
  if (xp) addXp(tx, xp, spec.source);
  return { granted: true, xp, boostXp: xp - baseXp, coins, items, chestId };
}

function addCoins(tx: Tx, coins: number) {
  if (!(coins > 0)) return;
  tx.data.coins = Math.max(0, tx.data.coins) + coins;
  addStats(tx, { coinsEarned: coins });
}

function unlockItem(tx: Tx, id: string) {
  tx.data.inventory = { ...tx.data.inventory, owned: { ...tx.data.inventory.owned, [id]: tx.now } };
}

function extendBoost(tx: Tx, minutes: number) {
  const from = Math.max(tx.now, tx.data.inventory.boostUntil ?? 0);
  tx.data.inventory = { ...tx.data.inventory, boostUntil: from + minutes * 60_000 };
}

function addChest(tx: Tx, kind: ChestKind, source: string, key?: string): string {
  const id = key ? `chest:${key}` : uid('chest');
  if (tx.data.chests.some((c) => c.id === id)) return id;
  const chest: Chest = { id, kind, source, earnedAt: tx.now, openedAt: null, prizes: null };
  // Unopened chests are never dropped; keep the 20 most recent opened ones for the record.
  let opened = 0;
  tx.data.chests = [chest, ...tx.data.chests].filter((c) => !c.openedAt || ++opened <= 20);
  return id;
}

function addXp(tx: Tx, xp: number, source: GrantSource) {
  const before = playerLevelFromXp(tx.data.xp).level;
  tx.data.xp += xp;
  tx.data.activity = bumpActivity(tx.data.activity, tx.today, { xp });
  const after = playerLevelFromXp(tx.data.xp).level;
  for (let level = before + 1; level <= after; level++) levelUp(tx, level);
  if (PLAY_XP.has(source)) bump(tx, 'xp', xp);
}

function levelUp(tx: Tx, level: number) {
  const reward = levelUpReward(level);
  const unlock = LEVEL_UNLOCKS[level];
  const g = grant(tx, {
    key: `level:${level}`,
    source: 'level',
    coins: reward.coins,
    items: unlock ? [unlock] : [],
    chest: reward.chest ? { kind: reward.chest, source: `Reached level ${level}` } : undefined,
  });
  if (g.granted) tx.events.push(event({ kind: 'level-up', level, coins: g.coins, items: g.items, chestId: g.chestId }));
}

// ─── Quests & the weekly challenge ─────────────────────────────────────────

/** Records progress towards daily quests and the weekly challenge, paying out anything completed. */
export function bump(tx: Tx, metric: QuestMetric, amount: number) {
  if (!(amount > 0)) return;
  ensureDay(tx);
  const { daily, completed } = progressQuests(tx.data.quests!, metric, amount);
  tx.data.quests = daily;
  for (const quest of completed) {
    const g = grant(tx, { key: `quest:${quest.id}`, source: 'quest', xp: quest.reward.xp, coins: quest.reward.coins });
    if (!g.granted) continue;
    addStats(tx, { questsCompleted: 1 });
    tx.events.push(event({ kind: 'quest', quest }));
  }
  if (completed.length && allQuestsDone(tx.data.quests)) {
    const g = grant(tx, { key: `daily-chest:${tx.data.quests!.date}`, source: 'quest', chest: { kind: 'daily', source: 'All daily quests done' } });
    if (g.granted && g.chestId) {
      addStats(tx, { dailyChests: 1 });
      tx.events.push(event({ kind: 'chest', chestId: g.chestId, chestKind: 'daily' }));
    }
  }

  const weekly = progressWeekly(tx.data.weekly!, metric, amount);
  if (weekly === tx.data.weekly) return;
  tx.data.weekly = weekly;
  if (weeklyComplete(weekly) && !weekly.claimed) {
    tx.data.weekly = { ...weekly, claimed: true };
    const g = grant(tx, { key: `weekly:${weekly.week}`, source: 'weekly', xp: weekly.reward.xp, coins: weekly.reward.coins, items: [weekly.reward.item] });
    if (g.granted) {
      addStats(tx, { weeklyChallenges: 1 });
      tx.events.push(event({ kind: 'weekly', title: weekly.title, reward: { xp: g.xp, coins: g.coins }, item: g.items[0] ?? null }));
    }
  }
}

// ─── Achievements ──────────────────────────────────────────────────────────

export function checkAchievements(tx: Tx): string[] {
  const unlocked: string[] = [];
  // Coins from one achievement can unlock another (Coin Collector) — a few rounds settle it.
  for (let round = 0; round < 4; round++) {
    const ids = newlyUnlocked(achievementContext(tx.data), tx.data.achievements);
    if (ids.length === 0) break;
    tx.data.achievements = { ...tx.data.achievements };
    for (const id of ids) {
      tx.data.achievements[id] = tx.now;
      const def = ACHIEVEMENTS_BY_ID.get(id)!;
      const g = grant(tx, { key: `achievement:${id}`, source: 'achievement', coins: ACHIEVEMENT_COINS[def.tier] });
      tx.events.push(event({ kind: 'achievement', achievementId: id, coins: g.coins }));
      unlocked.push(id);
    }
  }
  return unlocked;
}

// ─── Streak ────────────────────────────────────────────────────────────────

/** Counts today towards the streak and pays out milestones (once per streak run). */
export function recordStreak(tx: Tx): StreakUpdate {
  const prev = tx.data.streak;
  const update = recordStreakDay(prev, tx.today);
  if (update.event === 'same-day') return update;
  const fresh = update.event === 'started' || update.event === 'restarted';
  const runStart = fresh || !prev.runStart ? addDays(tx.today, -(update.state.current - 1)) : prev.runStart;
  const state = { ...update.state, runStart };
  tx.data.streak = state;
  const result = { ...update, state };
  tx.events.push(event({ kind: 'streak', update: result }));

  for (const milestone of milestonesReached(fresh ? 0 : prev.current, state.current)) {
    const g = grant(tx, {
      key: `streak:${runStart}:${milestone.days}`,
      source: 'streak',
      xp: milestone.xp,
      coins: milestone.coins,
      items: milestone.item ? [milestone.item] : [],
      chest: milestone.chest ? { kind: milestone.chest, source: milestone.title } : undefined,
    });
    if (g.granted) tx.events.push(event({ kind: 'streak-milestone', milestone, items: g.items, chestId: g.chestId }));
  }

  // Coming back after a break is celebrated, never punished.
  if (update.event === 'restarted') {
    const g = grant(tx, { key: `welcome-back:${tx.today}`, source: 'welcome', ...WELCOME_BACK_REWARD });
    if (g.granted) tx.events.push(event({ kind: 'welcome-back', reward: { xp: g.xp, coins: g.coins } }));
  }
  return result;
}

// ─── Shop, wardrobe & chests ───────────────────────────────────────────────

export const boostMinutesLeft = (data: GameData, now: number) =>
  data.inventory.boostUntil && data.inventory.boostUntil > now ? Math.ceil((data.inventory.boostUntil - now) / 60_000) : 0;

export function purchase(tx: Tx, itemId: string): { ok: true } | { ok: false; reason: BuyBlock } {
  const item = ITEMS_BY_ID.get(itemId);
  const check = buyCheck(item, {
    coins: tx.data.coins,
    owned: tx.data.inventory.owned,
    freezes: tx.data.streak.freezes,
    boostMinutesLeft: boostMinutesLeft(tx.data, tx.now),
  });
  if (!check.ok || !item || item.price === undefined) return check.ok ? { ok: false, reason: 'unknown' } : check;
  tx.data.coins -= item.price;
  addStats(tx, { coinsSpent: item.price, itemsBought: 1 });
  if (item.category === 'boost') extendBoost(tx, BOOST_MINUTES);
  else if (item.category === 'freeze') tx.data.streak = { ...tx.data.streak, freezes: Math.min(MAX_FREEZES, tx.data.streak.freezes + 1) };
  else unlockItem(tx, item.id);
  return { ok: true };
}

export function equip(tx: Tx, itemId: string): boolean {
  const item = ITEMS_BY_ID.get(itemId);
  const slot = item && SLOT_FOR[item.category];
  if (!slot || !canEquip(itemId, tx.data.inventory.owned)) return false;
  tx.data.inventory = { ...tx.data.inventory, equipped: { ...tx.data.inventory.equipped, [slot]: itemId } };
  return true;
}

/**
 * Opens a chest. Prizes are decided from the chest's id and saved with it, so
 * opening twice (or reloading mid-animation) always shows the same prizes and
 * never pays out twice.
 */
export function openChest(tx: Tx, chestId: string): ResolvedPrize[] | null {
  const chest = tx.data.chests.find((c) => c.id === chestId);
  if (!chest) return null;
  if (chest.openedAt && chest.prizes) return chest.prizes;
  const prizes = resolveChest(chest.id, chest.kind, {
    itemsByRarity: droppableByRarity(tx.data.inventory.owned),
    canHoldFreeze: tx.data.streak.freezes < MAX_FREEZES,
  });
  prizes.forEach((prize, i) => {
    const key = `chest-prize:${chest.id}:${i}`;
    if (prize.type === 'coins') grant(tx, { key, source: 'chest', coins: prize.amount });
    else if (prize.type === 'xp') grant(tx, { key, source: 'chest', xp: prize.amount });
    else if (prize.type === 'boost') grant(tx, { key, source: 'chest', boostMinutes: prize.minutes });
    else if (prize.type === 'freeze') grant(tx, { key, source: 'chest', freezes: 1 });
    else grant(tx, { key, source: 'chest', items: [prize.itemId] });
  });
  tx.data.chests = tx.data.chests.map((c) => (c.id === chest.id ? { ...c, openedAt: tx.now, prizes } : c));
  addStats(tx, { chestsOpened: 1 });
  return prizes;
}

/** The welcome gift for a new player. */
export function grantWelcomeChest(tx: Tx): string | null {
  const g = grant(tx, { key: 'welcome-chest', source: 'welcome', chest: { kind: 'welcome', source: 'A welcome gift from Emma' } });
  if (g.granted && g.chestId) tx.events.push(event({ kind: 'chest', chestId: g.chestId, chestKind: 'welcome' }));
  return g.chestId;
}

// ─── Saved data ────────────────────────────────────────────────────────────

const finiteCoins = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0);

/** Fills in anything missing from saved data (fields added since it was saved) and repairs bad values. */
export function mergeSaved(saved: Partial<GameData> | null | undefined, current: GameData = initialData()): GameData {
  const s = saved ?? {};
  const inventory = { ...initialInventory(), ...s.inventory };
  return {
    ...current,
    ...s,
    profile: { ...current.profile, ...s.profile },
    stats: { ...initialStats(), ...current.stats, ...s.stats },
    streak: { ...current.streak, ...s.streak },
    settings: { ...current.settings, ...s.settings },
    adaptive: { ...current.adaptive, ...s.adaptive },
    gameBests: { ...current.gameBests, ...s.gameBests },
    coins: finiteCoins(s.coins ?? current.coins),
    inventory: {
      owned: { ...inventory.owned },
      equipped: { ...initialInventory().equipped, ...inventory.equipped },
      boostUntil: typeof inventory.boostUntil === 'number' ? inventory.boostUntil : null,
    },
    chests: Array.isArray(s.chests) ? s.chests : current.chests,
    claimed: { ...current.claimed, ...s.claimed },
    gameCoins: { ...current.gameCoins, ...s.gameCoins },
  };
}

/**
 * Upgrades a save from before the game economy (version 1). Players keep
 * everything and are paid for what they've already done: coins for their XP,
 * the unlocks for the levels and streaks they've reached, and a welcome chest.
 * Rewards already covered are claimed quietly so nothing pays out twice.
 */
export function migrateToV2(saved: Partial<GameData>, now: number, today: string): GameData {
  const data = mergeSaved(saved);
  data.completedLessons = Object.fromEntries(
    Object.entries(data.completedLessons).map(([id, r]) => [id, { ...r, stars: r.stars ?? lessonStars(r.bestAccuracy, r.perfect) }]),
  );
  const tx = begin(data, now, today);
  const claimed = { ...tx.data.claimed };
  const owned = { ...tx.data.inventory.owned };
  let coins = Math.floor(data.xp / 10);

  const level = playerLevelFromXp(data.xp).level;
  for (let l = 2; l <= level; l++) {
    claimed[`level:${l}`] = now;
    if (LEVEL_UNLOCKS[l]) owned[LEVEL_UNLOCKS[l]] = now;
  }

  const { current, longest, lastActiveDate } = data.streak;
  const runStart = current > 0 ? addDays(lastActiveDate ?? today, -(current - 1)) : null;
  for (const m of STREAK_MILESTONES) {
    if (runStart && m.days <= current) claimed[`streak:${runStart}:${m.days}`] = now;
    if (m.item && m.days <= Math.max(current, longest)) owned[m.item] = now;
  }
  tx.data.streak = { ...data.streak, runStart };

  // Achievements (already earned, or newly reachable under the new list) are paid in coins, quietly.
  tx.data.achievements = { ...data.achievements };
  for (const id of newlyUnlocked(achievementContext({ ...tx.data, inventory: { ...tx.data.inventory, owned } }), data.achievements)) {
    tx.data.achievements[id] = now;
  }
  for (const id of Object.keys(tx.data.achievements)) {
    if (claimed[`achievement:${id}`]) continue;
    claimed[`achievement:${id}`] = now;
    if (!data.achievements[id]) coins += ACHIEVEMENT_COINS[ACHIEVEMENTS_BY_ID.get(id)?.tier ?? 1];
  }

  tx.data.claimed = claimed;
  tx.data.inventory = { ...tx.data.inventory, owned };
  addCoins(tx, coins);
  grantWelcomeChest(tx);
  return tx.data;
}
