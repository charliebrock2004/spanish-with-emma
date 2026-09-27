import type { Exercise, LevelId, MistakeType, VocabCategory } from './curriculum';

export type Experience = 'new' | 'little' | 'lots';

export interface PlayerProfile {
  name: string;
  experience: Experience;
  startedAt: number;
  onboarded: boolean;
  /** Highest level unlocked by the onboarding placement. */
  placementLevel: LevelId;
}

export interface LessonRecord {
  level: LevelId;
  completedAt: number;
  bestAccuracy: number;
  perfect: boolean;
  attempts: number;
  xpEarned: number;
  /** Best rating: ⭐ done · ⭐⭐ 80%+ first time · ⭐⭐⭐ perfect. */
  stars?: 1 | 2 | 3;
}

export interface LessonHistoryEntry {
  lessonId: string;
  title: string;
  kind: 'lesson' | 'review' | 'game' | 'conversation';
  completedAt: number;
  xp: number;
  accuracy: number;
  seconds: number;
}

/** Spaced-review record for one word. */
export interface VocabProgress {
  id: string;
  spanish: string;
  english: string;
  category: VocabCategory;
  difficulty: number;
  timesSeen: number;
  timesCorrect: number;
  timesIncorrect: number;
  /** Epoch ms of the last answer involving this word. */
  lastReviewed: number | null;
  /** Epoch ms when the word is next due for review. */
  nextReview: number | null;
  /** 0 (new) … 5 (mastered). */
  mastery: number;
  /** Consecutive correct answers. */
  streak: number;
  /** Local date (YYYY-MM-DD) mastery last went up — at most once a day. */
  masteryDate: string | null;
}

export interface MistakeRecord {
  id: string;
  at: number;
  type: MistakeType;
  prompt: string;
  expected: string;
  given: string;
  lessonId?: string;
  vocabIds: string[];
  /** Snapshot so the exact exercise can be replayed in a review session. */
  exercise?: Exercise;
  resolved: boolean;
}

export interface StreakState {
  current: number;
  longest: number;
  /** Local date (YYYY-MM-DD) of the last day with a completed session. */
  lastActiveDate: string | null;
  /** Streak freezes protect the streak for one missed day each. */
  freezes: number;
  /** Dates a freeze was used on, most recent last. */
  frozenDates: string[];
  /** First day of the current run (milestone rewards are once per run). */
  runStart?: string | null;
}

export interface DayActivity {
  seconds: number;
  xp: number;
  sessions: number;
}

export interface PlayerStats {
  answers: number;
  correct: number;
  speakingAttempts: number;
  /** Speaking exercises passed with the microphone. */
  speakingPassed: number;
  /** Speaking exercises completed by typing (no microphone available). */
  speakingTyped: number;
  /** Consecutive speaking exercises passed with a high score. */
  pronunciationRun: number;
  bestPronunciationRun: number;
  listeningCorrect: number;
  lessonsCompleted: number;
  perfectLessons: number;
  reviewSessions: number;
  conversations: number;
  conversationTurns: number;
  gamesPlayed: number;
  bestSpeedRound: number;
  learningSeconds: number;
  dailyGoalsMet: number;
  lateNightSessions: number;
  earlySessions: number;
  /** Longest run of correct answers in a row. */
  bestCombo: number;
  /** Time spent speaking Spanish into the microphone. */
  speakingSeconds: number;
  coinsEarned: number;
  coinsSpent: number;
  itemsBought: number;
  questsCompleted: number;
  dailyChests: number;
  weeklyChallenges: number;
  chestsOpened: number;
}

export interface ConversationMessage {
  role: 'emma' | 'player';
  text: string;
  translation?: string;
}

export interface ConversationRecord {
  id: string;
  mode: 'ai' | 'guided';
  scenarioId: string;
  title: string;
  startedAt: number;
  messages: ConversationMessage[];
}

export interface AdaptiveState {
  /** Most recent answers, 1 = correct, oldest first (max 20). */
  recent: number[];
  /** Last difficulty shift announced to the player (-1 easier, 0, +1 harder). */
  announced: -1 | 0 | 1;
}
