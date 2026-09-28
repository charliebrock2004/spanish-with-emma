import { beforeEach, describe, expect, it } from 'vitest';
import { SHOP_ITEMS } from '@/data/shop';
import { chestOdds, CHESTS, resolveChest, type ChestKind } from '@/lib/game/chests';
import {
  answerReward,
  comboMultiplier,
  conversationReward,
  GAME_COIN_DAILY_CAP,
  gameReward,
  lessonReward,
  lessonStars,
  nextComboStep,
} from '@/lib/game/economy';
import {
  backfillUnlocks,
  begin,
  bump,
  checkAchievements,
  DUPLICATE_ITEM_COINS,
  equip,
  grant,
  mergeSaved,
  migrateToV2,
  openChest,
  purchase,
  recordStreak,
  type Tx,
} from '@/lib/game/engine';
import { leadingGroup, MAX_GROUPED_ACHIEVEMENTS, mergeLevelUps } from '@/lib/game/celebrations';
import { MAX_PLAYER_LEVEL, playerLevelFromXp, totalXpForLevel, xpToNext } from '@/lib/game/levels';
import { allQuestsDone, generateDailyQuests, progressQuests } from '@/lib/game/quests';
import { buyCheck } from '@/lib/game/shop';
import { initialData } from '@/lib/game/state';
import { milestonesReached, nextMilestone } from '@/lib/game/streakRewards';
import { generateWeekly, progressWeekly, weekKey, WEEKLY_ITEMS, weeklyComplete } from '@/lib/game/weekly';
import { addDays } from '@/lib/progress/dates';
import { useGameStore } from '@/store/gameStore';
import type { GameData } from '@/types/game';

const DAY = '2026-09-28';
const NOW = Date.UTC(2026, 8, 28, 12);

function tx(data: Partial<GameData> = {}, today = DAY, now = NOW): Tx {
  return begin({ ...initialData(), ...data }, now, today);
}

/** Save → reload, like a page refresh. */
const reload = (data: GameData): GameData => mergeSaved(JSON.parse(JSON.stringify(data)));

describe('player levels', () => {
  it('starts at level 1 and needs a little more XP each level', () => {
    expect(playerLevelFromXp(0).level).toBe(1);
    expect(xpToNext(1)).toBe(150);
    expect(xpToNext(2)).toBe(210);
    expect(playerLevelFromXp(149).level).toBe(1);
    expect(playerLevelFromXp(150).level).toBe(2);
    expect(playerLevelFromXp(totalXpForLevel(10)).level).toBe(10);
    expect(playerLevelFromXp(totalXpForLevel(10) - 1).level).toBe(9);
  });
  it('reports progress inside a level and caps at the maximum', () => {
    const p = playerLevelFromXp(150 + 105);
    expect(p.level).toBe(2);
    expect(p.xpInto).toBe(105);
    expect(p.progress).toBeCloseTo(0.5);
    const max = playerLevelFromXp(10_000_000);
    expect(max.level).toBe(MAX_PLAYER_LEVEL);
    expect(max.maxed).toBe(true);
  });
  it('puts level 100 around a year of regular play', () => {
    expect(totalXpForLevel(100)).toBeGreaterThan(250_000);
    expect(totalXpForLevel(100)).toBeLessThan(400_000);
  });
});

describe('economy', () => {
  it('uses the combo ladder x1 → x2 at 3 → x3 at 5 → x5 at 10', () => {
    expect([1, 2, 3, 4, 5, 9, 10, 25].map(comboMultiplier)).toEqual([1, 1, 2, 2, 3, 3, 5, 5]);
    expect(nextComboStep(0)).toBe(3);
    expect(nextComboStep(4)).toBe(5);
    expect(nextComboStep(12)).toBeNull();
  });
  it('prices answers: speaking is worth more, retries are not multiplied', () => {
    expect(answerReward('normal', 1)).toEqual({ xp: 10, coins: 0 });
    expect(answerReward('normal', 3)).toEqual({ xp: 20, coins: 0 });
    expect(answerReward('speaking', 10)).toEqual({ xp: 75, coins: 1 });
    expect(answerReward('retry', 10)).toEqual({ xp: 5, coins: 0 });
  });
  it('rates lessons with stars', () => {
    expect(lessonStars(1, true)).toBe(3);
    expect(lessonStars(0.85, false)).toBe(2);
    expect(lessonStars(0.5, false)).toBe(1);
  });
  it('pays the perfect-lesson bonus of +50 XP and +20 coins the first time', () => {
    const first = lessonReward({ firstCompletion: true, perfect: true, firstPerfect: true, levelCompleted: false });
    expect(first.lines.find((l) => l.label === 'Perfect lesson')).toMatchObject({ xp: 50, coins: 20 });
    expect(first.total).toEqual({ xp: 75, coins: 30 });
    const replay = lessonReward({ firstCompletion: false, perfect: true, firstPerfect: false, levelCompleted: false });
    expect(replay.total.coins).toBeLessThan(first.total.coins);
    const milestone = lessonReward({ firstCompletion: true, perfect: false, firstPerfect: false, levelCompleted: true });
    expect(milestone.chest).toBe('milestone');
  });
  it('caps game coins per day but keeps the XP', () => {
    const fresh = gameReward({ correct: 10, answered: 10, newBest: true, coinsToday: 0 });
    expect(fresh.total.coins).toBe(25);
    const capped = gameReward({ correct: 10, answered: 10, newBest: true, coinsToday: GAME_COIN_DAILY_CAP - 5 });
    expect(capped.total.coins).toBe(5);
    expect(capped.total.xp).toBe(fresh.total.xp);
    expect(gameReward({ correct: 10, answered: 10, newBest: false, coinsToday: 999 }).total.coins).toBe(0);
  });
  it('rewards longer conversations', () => {
    expect(conversationReward(2).total).toEqual({ xp: 10, coins: 3 });
    expect(conversationReward(6).total).toEqual({ xp: 60, coins: 10 });
    expect(conversationReward(40).total.xp).toBe(80);
  });
});

describe('daily quests', () => {
  const ctx = { level: 1, canPlayGames: true, canReview: true };
  it('are the same all day (a reload never rerolls them)', () => {
    expect(generateDailyQuests(DAY, ctx)).toEqual(generateDailyQuests(DAY, ctx));
  });
  it('always start with a lesson and have three quests', () => {
    for (let i = 0; i < 20; i++) {
      const q = generateDailyQuests(addDays(DAY, i), ctx);
      expect(q.quests).toHaveLength(3);
      expect(q.quests[0].metric).toBe('lessons');
      expect(new Set(q.quests.map((x) => x.metric)).size).toBe(3);
    }
  });
  it('skip games and reviews until the player has words for them', () => {
    for (let i = 0; i < 30; i++) {
      const q = generateDailyQuests(addDays(DAY, i), { level: 1, canPlayGames: false, canReview: false });
      expect(q.quests.some((x) => x.metric === 'games' || x.metric === 'reviews')).toBe(false);
    }
  });
  it('never go past the target or complete twice', () => {
    let daily = generateDailyQuests(DAY, ctx);
    const r1 = progressQuests(daily, 'lessons', 5);
    expect(r1.completed).toHaveLength(1);
    expect(r1.daily.quests[0].progress).toBe(r1.daily.quests[0].target);
    daily = r1.daily;
    expect(progressQuests(daily, 'lessons', 1).completed).toHaveLength(0);
  });
});

describe('weekly challenge', () => {
  it('uses ISO weeks', () => {
    expect(weekKey('2026-01-01')).toBe('2026-W01');
    expect(weekKey('2024-12-30')).toBe('2025-W01');
    expect(weekKey('2026-09-28')).toBe('2026-W40');
    expect(weekKey('2026-10-04')).toBe('2026-W40');
    expect(weekKey('2026-10-05')).toBe('2026-W41');
  });
  it('offers a badge-worthy reward with an exclusive cosmetic', () => {
    const w = generateWeekly('2026-W40');
    expect(w.reward.xp).toBe(1000);
    expect(w.reward.coins).toBe(300);
    expect(WEEKLY_ITEMS).toContain(w.reward.item);
    expect(w.objectives).toHaveLength(4);
  });
  it('tracks objectives up to their targets', () => {
    let w = generateWeekly('2026-W40');
    for (const o of w.objectives) w = progressWeekly(w, o.metric, o.target + 10);
    expect(weeklyComplete(w)).toBe(true);
    expect(w.objectives.every((o) => o.progress === o.target)).toBe(true);
  });
});

describe('streak milestones', () => {
  it('are reached when the streak passes them', () => {
    expect(milestonesReached(2, 3).map((m) => m.days)).toEqual([3]);
    expect(milestonesReached(6, 8).map((m) => m.days)).toEqual([7]);
    expect(milestonesReached(0, 1)).toEqual([]);
    expect(nextMilestone(8)?.days).toBe(14);
  });
});

describe('chests', () => {
  const ctx = { itemsByRarity: { common: ['bg-glasgow'], rare: ['bg-madrid'], epic: ['bg-alhambra'] }, canHoldFreeze: true };
  it('are deterministic — the same chest always holds the same prizes', () => {
    expect(resolveChest('chest-1', 'daily', ctx)).toEqual(resolveChest('chest-1', 'daily', ctx));
  });
  it('publish odds that add up to 100%', () => {
    for (const kind of Object.keys(CHESTS) as ChestKind[]) {
      const total = chestOdds(kind).reduce((n, o) => n + o.percent, 0);
      expect(total).toBeGreaterThan(99.5);
      expect(total).toBeLessThan(100.5);
    }
  });
  it('always include the guaranteed prizes', () => {
    for (let i = 0; i < 50; i++) {
      const prizes = resolveChest(`c${i}`, 'daily', ctx);
      expect(prizes[0]).toEqual({ type: 'coins', amount: 40 });
      expect(prizes).toHaveLength(2);
    }
  });
  it('turn items into coins when there is nothing left to unlock', () => {
    const empty = { itemsByRarity: { common: [], rare: [], epic: [] }, canHoldFreeze: false };
    for (let i = 0; i < 30; i++) {
      for (const prize of resolveChest(`e${i}`, 'milestone', empty)) expect(prize.type).toBe('coins');
    }
  });
});

describe('shop rules', () => {
  const item = (id: string) => SHOP_ITEMS.find((i) => i.id === id);
  const base = { coins: 1000, owned: {}, freezes: 0, boostMinutesLeft: 0 };
  it('checks price, ownership and limits', () => {
    expect(buyCheck(item('bg-madrid'), base)).toEqual({ ok: true });
    expect(buyCheck(item('bg-madrid'), { ...base, coins: 10 })).toEqual({ ok: false, reason: 'coins' });
    expect(buyCheck(item('bg-madrid'), { ...base, owned: { 'bg-madrid': 1 } })).toEqual({ ok: false, reason: 'owned' });
    expect(buyCheck(item('outfit-gold'), base)).toEqual({ ok: false, reason: 'not-for-sale' });
    expect(buyCheck(item('bg-cream'), base)).toEqual({ ok: false, reason: 'not-for-sale' });
    expect(buyCheck(item('streak-freeze'), { ...base, freezes: 2 })).toEqual({ ok: false, reason: 'max-freezes' });
    expect(buyCheck(item('boost-xp'), { ...base, boostMinutesLeft: 50 })).toEqual({ ok: false, reason: 'max-boost' });
    expect(buyCheck(undefined, base)).toEqual({ ok: false, reason: 'unknown' });
  });
  it('sells only cosmetics and conveniences', () => {
    for (const i of SHOP_ITEMS) expect(['outfit', 'background', 'frame', 'bubble', 'theme', 'scene', 'boost', 'freeze']).toContain(i.category);
  });
});

describe('reward ledger', () => {
  it('grants a keyed reward only once', () => {
    const t = tx();
    expect(grant(t, { key: 'quest:x', source: 'quest', coins: 50 }).granted).toBe(true);
    expect(grant(t, { key: 'quest:x', source: 'quest', coins: 50 }).granted).toBe(false);
    expect(t.data.coins).toBe(50);
  });
  it('survives a reload — replaying the same reward after a refresh pays nothing', () => {
    const t = tx();
    grant(t, { key: 'daily-chest:2026-09-28', source: 'quest', coins: 40 });
    const t2 = begin(reload(t.data), NOW + 1000, DAY);
    expect(grant(t2, { key: 'daily-chest:2026-09-28', source: 'quest', coins: 40 }).granted).toBe(false);
    expect(t2.data.coins).toBe(40);
  });
  it('never lets coins go negative', () => {
    const t = tx({ coins: 100 });
    expect(purchase(t, 'bg-madrid')).toEqual({ ok: false, reason: 'coins' });
    expect(t.data.coins).toBe(100);
    grant(t, { source: 'quest', coins: -500 });
    expect(t.data.coins).toBe(100);
    expect(mergeSaved({ coins: -40 }).coins).toBe(0);
    expect(mergeSaved({ coins: Number.NaN }).coins).toBe(0);
  });
  it('doubles play XP during a boost, but not fixed rewards', () => {
    const t = tx({ inventory: { owned: {}, equipped: initialData().inventory.equipped, boostUntil: NOW + 60_000 } });
    expect(grant(t, { source: 'answer', xp: 10 }).xp).toBe(20);
    expect(grant(t, { source: 'quest', xp: 50 }).xp).toBe(50);
    const later = tx({ inventory: { owned: {}, equipped: initialData().inventory.equipped, boostUntil: NOW - 1 } });
    expect(grant(later, { source: 'answer', xp: 10 }).xp).toBe(10);
  });
  it('turns an exclusive the player already owns into coins', () => {
    const t = tx();
    grant(t, { key: 'a', source: 'weekly', items: ['frame-explorer'] });
    expect(t.data.inventory.owned['frame-explorer']).toBeTruthy();
    const g = grant(t, { key: 'b', source: 'weekly', items: ['frame-explorer'] });
    expect(g.items).toEqual([]);
    expect(g.coins).toBe(DUPLICATE_ITEM_COINS);
  });
});

describe('levelling up', () => {
  it('pays each level once, with a chest every 5 levels and unlocks', () => {
    const t = tx();
    grant(t, { source: 'lesson', xp: totalXpForLevel(5) });
    const ups = t.events.filter((e) => e.kind === 'level-up');
    expect(ups.map((e) => e.kind === 'level-up' && e.level)).toEqual([2, 3, 4, 5]);
    expect(t.data.inventory.owned['bubble-sunset']).toBeTruthy(); // level 3
    expect(t.data.inventory.owned['outfit-rose']).toBeTruthy(); // level 5
    expect(t.data.chests.filter((c) => c.kind === 'level')).toHaveLength(1);
    const coins = t.data.coins;
    // The same levels can't pay out again.
    t.data.xp = 0;
    grant(t, { source: 'lesson', xp: totalXpForLevel(5) });
    expect(t.data.coins).toBe(coins);
  });
});

describe('quests and chests in the engine', () => {
  it('pays each quest once and gives the daily chest when all three are done', () => {
    const t = tx({ vocab: {} });
    bump(t, 'lessons', 1);
    const quests = t.data.quests!;
    expect(quests.quests[0].done).toBe(true);
    const questEvents = t.events.filter((e) => e.kind === 'quest');
    expect(questEvents).toHaveLength(1);
    bump(t, 'lessons', 1);
    expect(t.events.filter((e) => e.kind === 'quest')).toHaveLength(1);
    for (const q of t.data.quests!.quests) bump(t, q.metric, q.target);
    expect(allQuestsDone(t.data.quests)).toBe(true);
    const chests = t.events.filter((e) => e.kind === 'chest');
    expect(chests).toHaveLength(1);
    expect(t.data.stats.dailyChests).toBe(1);
    for (const q of t.data.quests!.quests) bump(t, q.metric, q.target);
    expect(t.events.filter((e) => e.kind === 'chest')).toHaveLength(1);
  });
  it('keeps tomorrow’s preview as a promise', () => {
    const t = tx();
    bump(t, 'lessons', 1);
    const preview = t.data.questsTomorrow!;
    expect(preview.date).toBe(addDays(DAY, 1));
    const next = begin(t.data, NOW + 86_400_000, addDays(DAY, 1));
    bump(next, 'lessons', 1);
    expect(next.data.quests!.quests.map((q) => q.id)).toEqual(preview.quests.map((q) => q.id));
  });
  it('pays the weekly challenge once, with its exclusive', () => {
    const t = tx();
    bump(t, 'lessons', 1);
    const weekly = t.data.weekly!;
    for (const o of weekly.objectives) bump(t, o.metric, o.target);
    const done = t.events.filter((e) => e.kind === 'weekly');
    expect(done).toHaveLength(1);
    expect(t.data.weekly!.claimed).toBe(true);
    expect(t.data.inventory.owned[weekly.reward.item]).toBeTruthy();
    for (const o of weekly.objectives) bump(t, o.metric, o.target);
    expect(t.events.filter((e) => e.kind === 'weekly')).toHaveLength(1);
  });
  it('opens a chest once — reopening shows the same prizes and pays nothing', () => {
    const t = tx();
    const id = grant(t, { key: 'welcome-chest', source: 'welcome', chest: { kind: 'welcome', source: 'test' } }).chestId!;
    const prizes = openChest(t, id);
    const coins = t.data.coins;
    expect(coins).toBeGreaterThanOrEqual(100);
    expect(openChest(t, id)).toEqual(prizes);
    const after = begin(reload(t.data), NOW + 5000, DAY);
    expect(openChest(after, id)).toEqual(prizes);
    expect(after.data.coins).toBe(coins);
    expect(after.data.stats.chestsOpened).toBe(1);
  });
});

describe('achievements in the engine', () => {
  it('unlock once and pay coins by tier', () => {
    const t = tx();
    t.data.stats = { ...t.data.stats, lessonsCompleted: 1 };
    expect(checkAchievements(t)).toContain('getting-started');
    const coins = t.data.coins;
    expect(coins).toBeGreaterThan(0);
    expect(checkAchievements(t)).toEqual([]);
    expect(t.data.coins).toBe(coins);
  });
});

describe('streak in the engine', () => {
  it('pays milestones once per run and treats replays on the same day as nothing', () => {
    let data = initialData();
    for (let i = 0; i < 3; i++) {
      const t = begin(data, NOW + i * 86_400_000, addDays(DAY, i));
      recordStreak(t);
      recordStreak(t); // a second session the same day
      data = t.data;
    }
    expect(data.streak.current).toBe(3);
    expect(Object.keys(data.claimed).filter((k) => k.startsWith('streak:'))).toHaveLength(1);
    const coins = data.coins;
    const again = begin(reload(data), NOW + 2 * 86_400_000 + 1, addDays(DAY, 2));
    recordStreak(again);
    expect(again.data.coins).toBe(coins);
  });
  it('gives exclusive streak items only once, even over two runs', () => {
    let data = initialData();
    const play = (start: number, days: number) => {
      const events: Tx['events'] = [];
      for (let i = 0; i < days; i++) {
        const t = begin(data, NOW + (start + i) * 86_400_000, addDays(DAY, start + i));
        recordStreak(t);
        events.push(...t.events);
        data = t.data;
      }
      return events.filter((e) => e.kind === 'streak-milestone').map((e) => e.kind === 'streak-milestone' && e);
    };
    const first = play(0, 7);
    expect(first.map((m) => m && m.milestone.days)).toEqual([3, 7]);
    expect(first[1] && first[1].items).toEqual(['frame-flame']);
    const second = play(20, 7); // a break, then a new 7 day run
    expect(second.map((m) => m && m.milestone.days)).toEqual([3, 7]);
    expect(second[1] && second[1].items).toEqual([]);
    expect(data.streak.current).toBe(7);
  });
  it('celebrates the cause before the effect (milestone, then the level-up it caused)', () => {
    let data = { ...initialData(), xp: 140 };
    for (let i = 0; i < 3; i++) {
      const t = begin(data, NOW + i * 86_400_000, addDays(DAY, i));
      recordStreak(t);
      if (i === 2) {
        const kinds = t.events.map((e) => e.kind).filter((k) => k !== 'streak');
        expect(kinds.slice(0, 2)).toEqual(['streak-milestone', 'level-up']);
      }
      data = t.data;
    }
  });

  it('welcomes the player back after a break', () => {
    let t = tx();
    recordStreak(t);
    t = begin(t.data, NOW + 10 * 86_400_000, addDays(DAY, 10));
    recordStreak(t);
    expect(t.events.some((e) => e.kind === 'welcome-back')).toBe(true);
  });
});

describe('shop in the engine', () => {
  it('buys, equips and never double-buys', () => {
    const t = tx({ coins: 600 });
    expect(purchase(t, 'bg-madrid')).toEqual({ ok: true });
    expect(t.data.coins).toBe(100);
    expect(purchase(t, 'bg-madrid')).toEqual({ ok: false, reason: 'owned' });
    expect(t.data.coins).toBe(100);
    expect(equip(t, 'bg-madrid')).toBe(true);
    expect(t.data.inventory.equipped.background).toBe('bg-madrid');
    expect(equip(t, 'bg-beach')).toBe(false);
    expect(t.data.stats.coinsSpent).toBe(500);
  });
  it('sells boosts and freezes as consumables within their limits', () => {
    const t = tx({ coins: 2000 });
    t.data.streak = { ...t.data.streak, freezes: 1 };
    expect(purchase(t, 'streak-freeze').ok).toBe(true);
    expect(purchase(t, 'streak-freeze')).toEqual({ ok: false, reason: 'max-freezes' });
    expect(purchase(t, 'boost-xp').ok).toBe(true);
    expect(t.data.inventory.boostUntil).toBe(NOW + 15 * 60_000);
  });
});

describe('game store', () => {
  beforeEach(() => {
    useGameStore.setState({ ...initialData(), events: [], hydrated: true });
  });

  const lesson = (sessionId: string, perfect = true) => ({
    lessonId: 'l1-hola',
    sessionId,
    title: '¡Hola!',
    level: 1 as const,
    accuracy: perfect ? 1 : 0.7,
    perfect,
    seconds: 120,
    answers: { xp: 100, coins: 0 },
    levelCompleted: null,
    xpBefore: 0,
  });

  it('records a lesson once, however many times it is reported', () => {
    const store = useGameStore.getState();
    const first = store.completeLesson(lesson('s1'));
    expect(first.stars).toBe(3);
    expect(first.firstPerfect).toBe(true);
    expect(first.total.coins).toBeGreaterThan(0);
    const again = useGameStore.getState().completeLesson(lesson('s1'));
    expect(again.total).toEqual({ xp: 0, coins: 0 });
    const s = useGameStore.getState();
    expect(s.stats.lessonsCompleted).toBe(1);
    expect(s.completedLessons['l1-hola'].stars).toBe(3);
  });

  it('earns less for replays, keeps the best stars', () => {
    const first = useGameStore.getState().completeLesson(lesson('s1'));
    const replay = useGameStore.getState().completeLesson(lesson('s2', false));
    expect(replay.total.coins).toBeLessThan(first.total.coins);
    expect(replay.bestStars).toBe(3);
    expect(replay.stars).toBe(1);
  });

  it('earns XP and coins for answers, with combos', () => {
    const answer = (combo: number) =>
      useGameStore.getState().recordAnswer({ correct: true, vocab: [], skill: 'speaking', reward: answerReward('speaking', combo), combo, speaking: { passed: true, score: 1 } });
    expect(answer(1)).toMatchObject({ xp: 15, coins: 1 });
    expect(answer(10)).toMatchObject({ xp: 75, coins: 1 });
    const s = useGameStore.getState();
    expect(s.xp).toBeGreaterThanOrEqual(90);
    expect(s.stats.bestCombo).toBe(10);
  });

  it('pays a game once per session and caps game coins for the day', () => {
    const play = (id: string) =>
      useGameStore.getState().completeSession(
        { kind: 'game', id: 'word-match', sessionId: id, title: 'Word Match', accuracy: 1, seconds: 60, xpBefore: 0 },
        { score: 100, correct: 10, answered: 10 },
      );
    const first = play('g1');
    expect(first.total.coins).toBeGreaterThan(0);
    expect(play('g1').total).toEqual({ xp: 0, coins: 0 });
    for (let i = 2; i < 10; i++) play(`g${i}`);
    expect(useGameStore.getState().gameCoins.coins).toBeLessThanOrEqual(GAME_COIN_DAILY_CAP);
    expect(useGameStore.getState().stats.gamesPlayed).toBe(9);
  });

  it('buys and equips from the store', () => {
    useGameStore.setState({ coins: 500 });
    expect(useGameStore.getState().purchase('bg-madrid')).toEqual({ ok: true });
    expect(useGameStore.getState().equip('bg-madrid')).toBe(true);
    // 500 spent, then 25 back for the "Treat Yourself" achievement.
    expect(useGameStore.getState().achievements['first-purchase']).toBeTruthy();
    expect(useGameStore.getState().coins).toBe(25);
    expect(useGameStore.getState().purchase('bg-beach')).toEqual({ ok: false, reason: 'coins' });
    expect(useGameStore.getState().coins).toBe(25);
  });

  it('gives a new player a welcome chest once', () => {
    useGameStore.getState().completeOnboarding('Alex', 'new');
    useGameStore.getState().completeOnboarding('Alex', 'new');
    const chests = useGameStore.getState().chests;
    expect(chests).toHaveLength(1);
    expect(chests[0].kind).toBe('welcome');
  });
});

describe('upgrading an old save', () => {
  it('never upgrades (or pays) a current save twice, even if it is labelled as old', () => {
    const migrate = useGameStore.persist.getOptions().migrate!;
    const current = { ...initialData(), xp: 5000, coins: 42, claimed: { 'welcome-chest': 1 } };
    const again = migrate(current, 1) as GameData;
    expect(again.coins).toBe(42);
    const old = { ...initialData(), xp: 5000 } as Partial<GameData>;
    delete old.inventory;
    delete old.claimed;
    delete old.coins;
    expect((migrate(old, 1) as GameData).coins).toBeGreaterThanOrEqual(500);
  });

  it('pays coins for past XP, hands over earned unlocks and never double-pays levels', () => {
    const old = {
      ...initialData(),
      xp: 2000,
      streak: { current: 8, longest: 8, lastActiveDate: DAY, freezes: 1, frozenDates: [] },
      completedLessons: { 'l1-hola': { level: 1 as const, completedAt: 1, bestAccuracy: 1, perfect: true, attempts: 1, xpEarned: 100 } },
    } as Partial<GameData>;
    delete (old as Record<string, unknown>).coins;
    delete (old as Record<string, unknown>).inventory;
    const data = migrateToV2(old, NOW, DAY);
    expect(data.coins).toBeGreaterThanOrEqual(200);
    expect(data.inventory.owned['outfit-rose']).toBeTruthy(); // level 5+
    expect(data.inventory.owned['frame-flame']).toBeTruthy(); // 7 day streak
    expect(data.completedLessons['l1-hola'].stars).toBe(3);
    expect(data.chests.some((c) => c.kind === 'welcome')).toBe(true);
    // The next session doesn't re-pay levels or the 3 and 7 day milestones.
    const t = begin(data, NOW + 86_400_000, addDays(DAY, 1));
    recordStreak(t);
    grant(t, { source: 'lesson', xp: 1 });
    expect(t.events.filter((e) => e.kind === 'level-up' || e.kind === 'streak-milestone')).toHaveLength(0);
  });

  it('hands over unlocks added to the game after the player passed them — quietly, and only those earned', () => {
    const t = tx({ xp: totalXpForLevel(16), streak: { ...initialData().streak, current: 2, longest: 9, lastActiveDate: DAY } });
    backfillUnlocks(t);
    expect(t.data.inventory.owned['bg-starry']).toBeTruthy(); // level 15
    expect(t.data.inventory.owned['frame-flame']).toBeTruthy(); // best streak 9 ≥ 7
    expect(t.data.inventory.owned['outfit-gold']).toBeFalsy(); // level 20 — not yet
    expect(t.data.inventory.owned['outfit-emerald']).toBeFalsy(); // 30 day streak — not yet
    expect(t.data.coins).toBe(0);
    expect(t.events).toHaveLength(0);
  });

  it('backfills when the game loads', () => {
    useGameStore.setState({ ...initialData(), xp: totalXpForLevel(16), events: [], hydrated: true });
    useGameStore.getState().refreshDay();
    const s = useGameStore.getState();
    expect(s.inventory.owned['bg-starry']).toBeTruthy();
    expect(s.coins).toBe(0);
  });
});

describe('celebrations', () => {
  const up = (level: number, coins: number, items: string[] = [], chestId: string | null = null) => ({ id: `u${level}`, kind: 'level-up' as const, level, coins, items, chestId });
  const ach = (id: string) => ({ id: `a-${id}`, kind: 'achievement' as const, achievementId: id, coins: 25 });

  it('shows level-ups that land together as one moment, with everything they paid', () => {
    // Level 2 mid-lesson, an achievement, then levels 3 and 4 at the end: one moment for all three levels.
    const queue = [up(2, 25), ach('first-word'), up(3, 25, ['bubble-sunset']), up(4, 25, [], 'chest:level:5')];
    const group = leadingGroup(queue);
    expect(group.map((e) => e.id)).toEqual(['u2', 'u3', 'u4']);
    const merged = mergeLevelUps(group as ReturnType<typeof up>[]);
    expect(merged).toMatchObject({ level: 4, coins: 75, items: ['bubble-sunset'], chestId: 'chest:level:5' });
  });

  it('groups a few achievements into one toast, and leaves everything else alone', () => {
    const many = ['a', 'b', 'c', 'd', 'e'].map(ach);
    expect(leadingGroup(many)).toHaveLength(MAX_GROUPED_ACHIEVEMENTS);
    expect(leadingGroup([ach('a'), up(2, 25), ach('b')]).map((e) => e.id)).toEqual(['a-a', 'a-b']);
    const quest = { id: 'q', kind: 'daily-goal' as const, reward: { xp: 20, coins: 10 } };
    expect(leadingGroup([quest, quest])).toHaveLength(1);
    expect(leadingGroup([])).toHaveLength(0);
  });
});

describe('mini-game medals', () => {
  it('awards bronze, silver and gold by score, and says what the next one needs', async () => {
    const { GAME_BY_ID, GAMES } = await import('@/components/games/catalog');
    const { medalFor, nextMedal } = await import('@/components/games/medals');
    const game = GAME_BY_ID.get('listen-pick')!;
    const [bronze, silver, gold] = game.medals;
    expect(medalFor(game, bronze - 1)).toBeNull();
    expect(medalFor(game, bronze)).toBe('bronze');
    expect(medalFor(game, silver)).toBe('silver');
    expect(medalFor(game, gold + 50)).toBe('gold');
    expect(nextMedal(game, silver)).toMatchObject({ medal: 'gold', toGo: gold - silver });
    expect(nextMedal(game, gold)).toBeNull();
    // Every game's thresholds climb.
    for (const g of GAMES) expect(g.medals[0] < g.medals[1] && g.medals[1] < g.medals[2]).toBe(true);
  });
});
