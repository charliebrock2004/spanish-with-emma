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
}

export interface AchievementDef {
  id: string;
  emoji: string;
  title: string;
  description: string;
  /** Target for count-based achievements (progress bar). */
  target: number;
  value: (ctx: AchievementContext) => number;
}

const levelDone = (level: LevelId) => (ctx: AchievementContext) => (ctx.completedLevels.includes(level) ? 1 : 0);

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first-hola',
    emoji: '👋',
    title: 'First Hola',
    description: 'Say your first Spanish phrase.',
    target: 1,
    value: (c) => c.stats.speakingPassed + c.stats.speakingTyped,
  },
  {
    id: 'getting-started',
    emoji: '🌱',
    title: 'Getting Started',
    description: 'Complete your first lesson.',
    target: 1,
    value: (c) => c.stats.lessonsCompleted,
  },
  {
    id: 'perfect-lesson',
    emoji: '⭐',
    title: 'Perfect Lesson',
    description: 'Finish a lesson without a single mistake.',
    target: 1,
    value: (c) => c.stats.perfectLessons,
  },
  {
    id: 'on-a-roll',
    emoji: '🔥',
    title: 'On a Roll',
    description: 'Keep a 3 day streak.',
    target: 3,
    value: (c) => Math.max(c.streak, c.longestStreak),
  },
  {
    id: 'conversational',
    emoji: '💬',
    title: 'Conversational',
    description: 'Have your first conversation with Emma.',
    target: 1,
    value: (c) => c.stats.conversations,
  },
  {
    id: 'word-collector',
    emoji: '🧺',
    title: 'Word Collector',
    description: 'Learn 25 words.',
    target: 25,
    value: (c) => c.wordsLearned,
  },
  {
    id: 'first-words',
    emoji: '🌱',
    title: 'First Words',
    description: 'Complete Level 1.',
    target: 1,
    value: levelDone(1),
  },
  {
    id: 'chatterbox',
    emoji: '🗣️',
    title: 'Chatterbox',
    description: 'Complete 10 speaking exercises.',
    target: 10,
    value: (c) => c.stats.speakingPassed,
  },
  {
    id: 'week-streak',
    emoji: '📆',
    title: '7 Day Streak',
    description: 'Learn with Emma seven days in a row.',
    target: 7,
    value: (c) => Math.max(c.streak, c.longestStreak),
  },
  {
    id: 'good-ear',
    emoji: '👂',
    title: 'Good Ear',
    description: 'Get 25 listening questions right.',
    target: 25,
    value: (c) => c.stats.listeningCorrect,
  },
  {
    id: 'game-on',
    emoji: '🎮',
    title: 'Game On',
    description: 'Play a mini-game.',
    target: 1,
    value: (c) => c.stats.gamesPlayed,
  },
  {
    id: 'back-to-basics',
    emoji: '🔁',
    title: 'Back to Basics',
    description: 'Complete 5 review sessions.',
    target: 5,
    value: (c) => c.stats.reviewSessions,
  },
  {
    id: 'goal-getter',
    emoji: '🎯',
    title: 'Goal Getter',
    description: 'Hit your daily goal 5 times.',
    target: 5,
    value: (c) => c.stats.dailyGoalsMet,
  },
  {
    id: 'hundred-words',
    emoji: '📚',
    title: '100 Words',
    description: 'Learn 100 words.',
    target: 100,
    value: (c) => c.wordsLearned,
  },
  {
    id: 'everyday-basics',
    emoji: '☀️',
    title: 'Everyday Basics',
    description: 'Complete Level 2.',
    target: 1,
    value: levelDone(2),
  },
  {
    id: 'pronunciation-pro',
    emoji: '🎙️',
    title: 'Pronunciation Pro',
    description: 'Nail 5 speaking exercises in a row.',
    target: 5,
    value: (c) => c.stats.bestPronunciationRun,
  },
  {
    id: 'speed-demon',
    emoji: '⚡',
    title: 'Speed Demon',
    description: 'Get 20 right in one Speed Round.',
    target: 20,
    value: (c) => c.stats.bestSpeedRound,
  },
  {
    id: 'xp-1000',
    emoji: '✨',
    title: '1,000 XP',
    description: 'Earn 1,000 XP.',
    target: 1000,
    value: (c) => c.xp,
  },
  {
    id: 'deep-talk',
    emoji: '☕',
    title: 'Deep Talk',
    description: 'Have 10 conversations with Emma.',
    target: 10,
    value: (c) => c.stats.conversations,
  },
  {
    id: 'real-life',
    emoji: '🌴',
    title: 'Real Life Ready',
    description: 'Complete Level 3.',
    target: 1,
    value: levelDone(3),
  },
  {
    id: 'night-owl',
    emoji: '🦉',
    title: 'Night Owl',
    description: 'Finish a session after 10pm.',
    target: 1,
    value: (c) => c.stats.lateNightSessions,
  },
  {
    id: 'early-bird',
    emoji: '🌅',
    title: 'Early Bird',
    description: 'Finish a session before 8am.',
    target: 1,
    value: (c) => c.stats.earlySessions,
  },
  {
    id: 'perfectionist',
    emoji: '💎',
    title: 'Perfectionist',
    description: 'Finish 10 lessons without a mistake.',
    target: 10,
    value: (c) => c.stats.perfectLessons,
  },
  {
    id: 'word-master',
    emoji: '🧠',
    title: 'Word Master',
    description: 'Master 50 words through review.',
    target: 50,
    value: (c) => c.wordsMastered,
  },
  {
    id: 'traveller',
    emoji: '✈️',
    title: 'Traveller',
    description: 'Complete Level 4.',
    target: 1,
    value: levelDone(4),
  },
  {
    id: 'month-streak',
    emoji: '🗓️',
    title: '30 Day Streak',
    description: 'Learn every day for a month.',
    target: 30,
    value: (c) => Math.max(c.streak, c.longestStreak),
  },
  {
    id: 'conversation-level',
    emoji: '💬',
    title: 'Real Conversations',
    description: 'Complete Level 5.',
    target: 1,
    value: levelDone(5),
  },
  {
    id: 'fluent-foundations',
    emoji: '🏆',
    title: 'Fluent Foundations',
    description: 'Complete Level 6 — the whole journey.',
    target: 1,
    value: levelDone(6),
  },
];

export const ACHIEVEMENTS_BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));
