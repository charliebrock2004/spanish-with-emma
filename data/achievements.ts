import type { LevelId } from '@/types/curriculum';
import type { PlayerStats } from '@/types/progress';

export interface AchievementContext {
  stats: PlayerStats;
  streak: number;
  longestStreak: number;
  wordsLearned: number;
  wordsMastered: number;
  xp: number;
  completedLevels: LevelId[];
  /** Ids of every lesson finished at least once. */
  completedLessons: string[];
  /** Game level (1 → 120), not the language level. */
  playerLevel: number;
  /** Cosmetics unlocked (bought, earned or found in chests). */
  itemsOwned: number;
}

/** Bronze, silver, gold — decides the coin reward and the medal in the cabinet. */
export type AchievementTier = 1 | 2 | 3;

export type AchievementGroup = 'firsts' | 'speaking' | 'journey' | 'dedication' | 'mastery' | 'play';

export interface AchievementDef {
  id: string;
  emoji: string;
  title: string;
  description: string;
  /** Target for count-based achievements (progress bar). */
  target: number;
  tier: AchievementTier;
  group: AchievementGroup;
  value: (ctx: AchievementContext) => number;
}

export const ACHIEVEMENT_GROUPS: Record<AchievementGroup, string> = {
  firsts: 'First steps',
  speaking: 'Speaking',
  journey: 'The journey',
  dedication: 'Dedication',
  mastery: 'Mastery',
  play: 'Games & collecting',
};

const levelDone = (level: LevelId) => (ctx: AchievementContext) => (ctx.completedLevels.includes(level) ? 1 : 0);
const bestStreak = (c: AchievementContext) => Math.max(c.streak, c.longestStreak);
/** Spanish sentences said: speaking exercises plus replies in conversations. */
const sentences = (c: AchievementContext) => c.stats.speakingPassed + c.stats.speakingTyped + c.stats.conversationTurns;
const CAFE_LESSONS = ['l2-drinks', 'l3-cafe', 'l3-restaurant'];

export const ACHIEVEMENTS: AchievementDef[] = [
  // ─── First steps ─────────────────────────────────────────────────────────
  { id: 'first-hola', emoji: '👋', title: 'First Word', description: 'Say your first Spanish phrase.', target: 1, tier: 1, group: 'firsts', value: (c) => c.stats.speakingPassed + c.stats.speakingTyped },
  { id: 'getting-started', emoji: '🌱', title: 'Getting Started', description: 'Complete your first lesson.', target: 1, tier: 1, group: 'firsts', value: (c) => c.stats.lessonsCompleted },
  { id: 'perfect-lesson', emoji: '⭐', title: 'Flawless', description: 'Finish a lesson without a single mistake.', target: 1, tier: 1, group: 'firsts', value: (c) => c.stats.perfectLessons },
  { id: 'conversational', emoji: '☕', title: 'First Chat', description: 'Have your first conversation with Emma.', target: 1, tier: 1, group: 'firsts', value: (c) => c.stats.conversations },
  { id: 'game-on', emoji: '🎮', title: 'Game On', description: 'Play a mini-game.', target: 1, tier: 1, group: 'firsts', value: (c) => c.stats.gamesPlayed },
  { id: 'first-purchase', emoji: '🛍️', title: 'Treat Yourself', description: 'Buy something in the shop.', target: 1, tier: 1, group: 'firsts', value: (c) => c.stats.itemsBought },
  { id: 'first-quest', emoji: '📜', title: 'Quest Accepted', description: 'Complete a daily quest.', target: 1, tier: 1, group: 'firsts', value: (c) => c.stats.questsCompleted },

  // ─── Speaking ────────────────────────────────────────────────────────────
  { id: 'chatterbox', emoji: '🗣️', title: 'Chatterbox', description: 'Say 100 sentences in Spanish.', target: 100, tier: 2, group: 'speaking', value: sentences },
  { id: 'pronunciation-pro', emoji: '🎙️', title: 'Pronunciation Pro', description: 'Nail 5 speaking exercises in a row.', target: 5, tier: 2, group: 'speaking', value: (c) => c.stats.bestPronunciationRun },
  { id: 'good-ear', emoji: '👂', title: 'Good Ear', description: 'Get 25 listening questions right.', target: 25, tier: 1, group: 'speaking', value: (c) => c.stats.listeningCorrect },
  { id: 'deep-talk', emoji: '💬', title: 'Deep Talk', description: 'Have 10 conversations with Emma.', target: 10, tier: 2, group: 'speaking', value: (c) => c.stats.conversations },
  { id: 'conversational-25', emoji: '🎤', title: 'Conversational', description: 'Have 25 conversations with Emma.', target: 25, tier: 3, group: 'speaking', value: (c) => c.stats.conversations },
  { id: 'cafe-master', emoji: '🥐', title: 'Café Master', description: 'Finish the Drinks, Café and Restaurant lessons.', target: CAFE_LESSONS.length, tier: 2, group: 'speaking', value: (c) => CAFE_LESSONS.filter((id) => c.completedLessons.includes(id)).length },

  // ─── The journey ─────────────────────────────────────────────────────────
  { id: 'first-words', emoji: '🌱', title: 'First Words', description: 'Complete Level 1.', target: 1, tier: 1, group: 'journey', value: levelDone(1) },
  { id: 'everyday-basics', emoji: '☀️', title: 'Everyday Basics', description: 'Complete Level 2.', target: 1, tier: 2, group: 'journey', value: levelDone(2) },
  { id: 'real-life', emoji: '🌴', title: 'Real Life Ready', description: 'Complete Level 3.', target: 1, tier: 2, group: 'journey', value: levelDone(3) },
  { id: 'traveller', emoji: '✈️', title: 'Traveller', description: 'Complete Level 4.', target: 1, tier: 3, group: 'journey', value: levelDone(4) },
  { id: 'conversation-level', emoji: '🗨️', title: 'Real Conversations', description: 'Complete Level 5.', target: 1, tier: 3, group: 'journey', value: levelDone(5) },
  { id: 'fluent-foundations', emoji: '🏆', title: 'Fluent Foundations', description: 'Complete Level 6 — the whole journey.', target: 1, tier: 3, group: 'journey', value: levelDone(6) },

  // ─── Dedication ──────────────────────────────────────────────────────────
  { id: 'on-a-roll', emoji: '🔥', title: 'On a Roll', description: 'Keep a 3 day streak.', target: 3, tier: 1, group: 'dedication', value: bestStreak },
  { id: 'week-streak', emoji: '📆', title: '7 Day Streak', description: 'Learn with Emma seven days in a row.', target: 7, tier: 2, group: 'dedication', value: bestStreak },
  { id: 'month-streak', emoji: '🗓️', title: '30 Day Streak', description: 'Learn every day for a month.', target: 30, tier: 3, group: 'dedication', value: bestStreak },
  { id: 'goal-getter', emoji: '🎯', title: 'Goal Getter', description: 'Hit your daily goal 5 times.', target: 5, tier: 1, group: 'dedication', value: (c) => c.stats.dailyGoalsMet },
  { id: 'back-to-basics', emoji: '🔁', title: 'Back to Basics', description: 'Complete 5 review sessions.', target: 5, tier: 1, group: 'dedication', value: (c) => c.stats.reviewSessions },
  { id: 'quest-master', emoji: '🗺️', title: 'Quest Master', description: 'Complete 30 daily quests.', target: 30, tier: 2, group: 'dedication', value: (c) => c.stats.questsCompleted },
  { id: 'weekly-champion', emoji: '🏅', title: 'Weekly Champion', description: 'Finish a weekly challenge.', target: 1, tier: 3, group: 'dedication', value: (c) => c.stats.weeklyChallenges },
  { id: 'night-owl', emoji: '🦉', title: 'Night Owl', description: 'Finish a session after 10pm.', target: 1, tier: 1, group: 'dedication', value: (c) => c.stats.lateNightSessions },
  { id: 'early-bird', emoji: '🌅', title: 'Early Bird', description: 'Finish a session before 8am.', target: 1, tier: 1, group: 'dedication', value: (c) => c.stats.earlySessions },

  // ─── Mastery ─────────────────────────────────────────────────────────────
  { id: 'perfectionist', emoji: '💎', title: 'Perfect', description: 'Finish 10 lessons without a mistake.', target: 10, tier: 3, group: 'mastery', value: (c) => c.stats.perfectLessons },
  { id: 'on-fire', emoji: '⚡', title: 'On Fire', description: 'Get 10 right in a row for a ×5 combo.', target: 10, tier: 2, group: 'mastery', value: (c) => c.stats.bestCombo },
  { id: 'word-collector', emoji: '🧺', title: 'Word Collector', description: 'Learn 25 words.', target: 25, tier: 1, group: 'mastery', value: (c) => c.wordsLearned },
  { id: 'hundred-words', emoji: '📚', title: '100 Words', description: 'Learn 100 words.', target: 100, tier: 2, group: 'mastery', value: (c) => c.wordsLearned },
  { id: 'word-master', emoji: '🧠', title: 'Word Master', description: 'Master 50 words through review.', target: 50, tier: 3, group: 'mastery', value: (c) => c.wordsMastered },
  { id: 'xp-1000', emoji: '✨', title: '1,000 XP', description: 'Earn 1,000 XP.', target: 1000, tier: 1, group: 'mastery', value: (c) => c.xp },
  { id: 'level-10', emoji: '🔟', title: 'Double Digits', description: 'Reach player level 10.', target: 10, tier: 2, group: 'mastery', value: (c) => c.playerLevel },
  { id: 'level-25', emoji: '🌟', title: 'Rising Star', description: 'Reach player level 25.', target: 25, tier: 3, group: 'mastery', value: (c) => c.playerLevel },

  // ─── Games & collecting ──────────────────────────────────────────────────
  { id: 'speed-demon', emoji: '🏎️', title: 'Speed Demon', description: 'Get 20 right in one Speed Round.', target: 20, tier: 2, group: 'play', value: (c) => c.stats.bestSpeedRound },
  { id: 'arcade-regular', emoji: '🕹️', title: 'Arcade Regular', description: 'Play 25 mini-games.', target: 25, tier: 2, group: 'play', value: (c) => c.stats.gamesPlayed },
  { id: 'coin-collector', emoji: '🪙', title: 'Coin Collector', description: 'Earn 1,000 coins.', target: 1000, tier: 2, group: 'play', value: (c) => c.stats.coinsEarned },
  { id: 'chest-hunter', emoji: '🎁', title: 'Chest Hunter', description: 'Open 10 chests.', target: 10, tier: 2, group: 'play', value: (c) => c.stats.chestsOpened },
  { id: 'fashionista', emoji: '👗', title: 'Wardrobe', description: 'Collect 5 cosmetics.', target: 5, tier: 2, group: 'play', value: (c) => c.itemsOwned },
];

export const ACHIEVEMENTS_BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));
